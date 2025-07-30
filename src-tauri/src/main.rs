// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri_app_lib::init;

// fn main() {
//     tauri::Builder::default()
//         .plugin(tauri_plugin_opener::init())
//         .plugin(init())
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }

fn main() {
    tauri::Builder::default()
      .manage(Database::new("app.db"))
      .invoke_handler(tauri::generate_handler![
         get_products,
         create_product,
         update_product,
         delete_product,
         get_orders,
         create_order,
         get_coupons,
         create_coupon,
         print_receipt
      ])
      .run(tauri::generate_context!())
      .expect("error while running tauri app");
  }