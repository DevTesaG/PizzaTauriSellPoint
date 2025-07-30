// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// use tauri_app_lib::init;

// fn main() {
//     tauri::Builder::default()
//         .plugin(tauri_plugin_opener::init())
//         .plugin(init())
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }


mod lib;
use lib::Database;

fn main() {
    tauri::Builder::default()
      .manage(Database::new("app.db"))
      .invoke_handler(tauri::generate_handler![
         lib::get_products,
         lib:create_product,
         lib:update_product,
         lib:delete_product,
         lib:get_orders,
         lib:create_order,
         lib:get_coupons,
         lib:create_coupon,
         lib:print_receipt
      ])
      .run(tauri::generate_context!())
      .expect("error while running tauri app");
  }