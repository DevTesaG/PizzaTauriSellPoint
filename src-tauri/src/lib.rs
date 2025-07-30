use rusqlite::{Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use chrono::{DateTime, Utc};
use anyhow::Result;
use tauri::Manager;


// Database connection wrapper
pub struct Database(Mutex<Connection>);

// Data models
#[derive(Debug, Serialize, Deserialize)]
pub struct Product {
    pub id: Option<i32>,
    pub name: String,
    pub description: String,
    pub price: f64,
    pub image_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrderItem {
    pub product_id: i32,
    pub quantity: i32,
    pub product: Product,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Order {
    pub id: Option<i32>,
    pub created_at: Option<String>,
    pub buyer: String,
    pub products: Vec<OrderItem>,
    pub payment_method: String,
    pub delivery_service: String,
    pub coupon_code: Option<String>,
    pub subtotal: f64,
    pub tax: f64,
    pub total: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Coupon {
    pub id: Option<i32>,
    pub code: String,
    pub discount_percentage: f64,
    pub expiration_date: String,
}

// Database initialization
fn init_database() -> Result<Connection> {
    let conn = Connection::open("pizza_pos.db")?;
    
    // Create tables
    conn.execute(
        "CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            image_path TEXT
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            buyer TEXT NOT NULL,
            products TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            delivery_service TEXT NOT NULL,
            coupon_code TEXT,
            subtotal REAL NOT NULL,
            tax REAL NOT NULL,
            total REAL NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS coupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            discount_percentage REAL NOT NULL,
            expiration_date TEXT NOT NULL
        )",
        [],
    )?;

    // Insert sample products if table is empty
    let count: i32 = conn.query_row("SELECT COUNT(*) FROM products", [], |row| row.get(0))?;
    if count == 0 {
        let sample_products = vec![
            ("Margherita Hardcore", "Classic tomato and mozzarella", 12.99, "🍕"),
            ("Pepperoni Remaster", "Spicy pepperoni with cheese", 14.99, "🍕"),
            ("Hawaiian Remaster", "Ham and pineapple", 13.99, "🍕"),
            ("Supreme Remaster", "All toppings included", 16.99, "🍕"),
            ("BBQ Chicken Remaster", "BBQ sauce with chicken", 15.99, "🍕"),
            ("Veggie Delight Remaster", "Fresh vegetables only", 13.99, "🍕"),
        ];

        for (name, description, price, image_path) in sample_products {
            conn.execute(
                "INSERT INTO products (name, description, price, image_path) VALUES (?, ?, ?, ?)",
                [&name, &description, &price.to_string().as_str(), &image_path],
            )?;
        }
    }

    Ok(conn)
}

// Tauri commands
#[tauri::command]
fn get_products(db: State<Database>) -> Result<Vec<Product>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare("SELECT id, name, description, price, image_path FROM products ORDER BY name")
        .map_err(|e| e.to_string())?;
    
    let products = stmt.query_map([], |row| {
        Ok(Product {
            id: Some(row.get(0)?),
            name: row.get(1)?,
            description: row.get(2)?,
            price: row.get(3)?,
            image_path: row.get(4)?,
        })
    })
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(products)
}

#[tauri::command]
fn create_product(db: State<Database>, product: Product) -> Result<Product, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let id = conn.execute(
        "INSERT INTO products (name, description, price, image_path) VALUES (?, ?, ?, ?)",
        rusqlite::params![
            &product.name,
            &product.description,
            &product.price.to_string(),
            &product.image_path,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Product {
        id: Some(id as i32),
        ..product
    })
}

#[tauri::command]
fn update_product(db: State<Database>, product: Product) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let id = product.id.ok_or("Product ID is required")?;
    
    conn.execute(
        "UPDATE products SET name = ?, description = ?, price = ?, image_path = ? WHERE id = ?",
        rusqlite::params![
            &product.name,
            &product.description,
            &product.price.to_string(),
            &product.image_path,
            &id.to_string(),
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn delete_product(db: State<Database>, id: i32) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    conn.execute("DELETE FROM products WHERE id = ?", [id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn get_orders(db: State<Database>) -> Result<Vec<Order>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare("SELECT id, created_at, buyer, products, payment_method, delivery_service, coupon_code, subtotal, tax, total FROM orders ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    
    let orders = stmt.query_map([], |row| {
        let products_json: String = row.get(3)?;
        let products: Vec<OrderItem> = serde_json::from_str(&products_json)
            .unwrap_or_default();
        
        Ok(Order {
            id: Some(row.get(0)?),
            created_at: Some(row.get(1)?),
            buyer: row.get(2)?,
            products,
            payment_method: row.get(4)?,
            delivery_service: row.get(5)?,
            coupon_code: row.get(6)?,
            subtotal: row.get(7)?,
            tax: row.get(8)?,
            total: row.get(9)?,
        })
    })
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(orders)
}

#[tauri::command]
fn create_order(db: State<Database>, order: Order) -> Result<Order, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let now = Utc::now().to_rfc3339();
    let products_json = serde_json::to_string(&order.products)
        .map_err(|e| e.to_string())?;
    
    let id = conn.execute(
        "INSERT INTO orders (created_at, buyer, products, payment_method, delivery_service, coupon_code, subtotal, tax, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        rusqlite::params![
            &now,
            &order.buyer,
            &products_json,
            &order.payment_method,
            &order.delivery_service,
            &order.coupon_code,
            &order.subtotal.to_string(),
            &order.tax.to_string(),
            &order.total.to_string(),
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Order {
        id: Some(id as i32),
        created_at: Some(now),
        ..order
    })
}

#[tauri::command]
fn get_coupons(db: State<Database>) -> Result<Vec<Coupon>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare("SELECT id, code, discount_percentage, expiration_date FROM coupons ORDER BY code")
        .map_err(|e| e.to_string())?;
    
    let coupons = stmt.query_map([], |row| {
        Ok(Coupon {
            id: Some(row.get(0)?),
            code: row.get(1)?,
            discount_percentage: row.get(2)?,
            expiration_date: row.get(3)?,
        })
    })
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    Ok(coupons)
}

#[tauri::command]
fn create_coupon(db: State<Database>, coupon: Coupon) -> Result<Coupon, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    
    let id = conn.execute(
        "INSERT INTO coupons (code, discount_percentage, expiration_date) VALUES (?, ?, ?)",
        [
            &coupon.code,
            &coupon.discount_percentage.to_string(),
            &coupon.expiration_date,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Coupon {
        id: Some(id as i32),
        ..coupon
    })
}

#[tauri::command]
fn print_receipt(order: Order) -> Result<(), String> {
    // Simple receipt printing simulation
    let receipt = format!(
        "🍕 PIZZA POS RECEIPT 🍕\n\
        =========================\n\
        Order #: {}\n\
        Date: {}\n\
        Customer: {}\n\
        Payment: {}\n\
        Delivery: {}\n\
        \n\
        ITEMS:\n\
        {}\
        \n\
        =========================\n\
        Subtotal: ${:.2}\n\
        Tax (16%): ${:.2}\n\
        Total: ${:.2}\n\
        \n\
        Thank you for your order!\n\
        =========================\n",
        order.id.unwrap_or(0),
        order.created_at.unwrap_or_default(),
        order.buyer,
        order.payment_method,
        order.delivery_service,
        order.products.iter().map(|item| {
            format!("{} x {} - ${:.2}\n", 
                item.quantity, 
                item.product.name, 
                item.product.price * item.quantity as f64)
        }).collect::<String>(),
        order.subtotal,
        order.tax,
        order.total
    );

    println!("{}", receipt);
    Ok(())
}

// pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
//     tauri::plugin::Builder::new("pizza")
//         .invoke_handler(tauri::generate_handler![
//             get_products,
//             create_product,
//             update_product,
//             delete_product,
//             get_orders,
//             create_order,
//             get_coupons,
//             create_coupon,
//             print_receipt,
//         ])
//         .setup(|app, env| {
//             let db = Database(Mutex::new(init_database()?));
//             app.manage(db);
//             Ok(())
//         })
//         .build()
// }
