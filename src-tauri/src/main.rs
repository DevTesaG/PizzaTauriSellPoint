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


use tauri_app_lib::Database;

fn main() {
    tauri::Builder::default()
      .manage(Database::new("pizza_pos.db"))
      .invoke_handler(tauri::generate_handler![
        tauri_app_lib::get_products,
        tauri_app_lib::create_product,
        tauri_app_lib::update_product,
        tauri_app_lib::delete_product,
        tauri_app_lib::get_orders,
        tauri_app_lib::create_order,
        tauri_app_lib::get_coupons,
        tauri_app_lib::create_coupon,
        tauri_app_lib::print_receipt
      ])
      .run(tauri::generate_context!())
      .expect("error while running tauri app");
  }