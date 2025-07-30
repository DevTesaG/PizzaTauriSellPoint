use rusqlite::{Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use chrono::{DateTime, Utc};
use anyhow::Result;
use tauri::Manager;


// Database connection wrapper
pub struct Database(Mutex<Connection>);


impl Database {
    pub fn new(path: &str) -> rusqlite::Result<Self> {
      let conn = init_database(path)?;
      Ok(Database(Mutex::new(conn)))
    }

    pub fn get_connection(&self) -> &Mutex<Connection> {
        &self.0
    }
}



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
fn init_database(path: &str) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;
    
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
