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
mod commands;

fn main() {
    tauri::Builder::default()
      .manage(Database::new("pizza_pos.db").unwrap())
      .invoke_handler(tauri::generate_handler![
        commands::get_products,
        commands::create_product,
        commands::update_product,
        commands::delete_product,
        commands::get_orders,
        commands::create_order,
        commands::get_coupons,
        commands::create_coupon,
        commands::print_receipt
      ])
      .run(tauri::generate_context!())
      .expect("error while running tauri app");
  }