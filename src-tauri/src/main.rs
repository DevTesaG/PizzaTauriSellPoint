// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_app_lib::init;

use tauri_app_lib::{
    get_products,
    create_product,
    update_product,
    delete_product,
    get_orders,
    create_order,
    get_coupons,
    create_coupon,
    print_receipt,
    Database,
    init_database,
};
use std::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_products,
            create_product,
            update_product,
            delete_product,
            get_orders,
            create_order,
            get_coupons,
            create_coupon,
            print_receipt,
        ])
        .setup(|app| {
            let db = Database(Mutex::new(init_database()?));
            app.manage(db);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
