// Prevents additional console window on Windows in release, do not remove!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(feature = "tauri-app")]
    time_tracker_lib::run();

    #[cfg(not(feature = "tauri-app"))]
    panic!("binary must be built with the `tauri-app` feature");
}
