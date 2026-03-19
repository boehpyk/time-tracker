// TimeTracker — Tauri application library root

#[cfg(feature = "tauri-app")]
pub mod commands;
pub mod db;
pub mod error;
pub mod models;
#[cfg(feature = "tauri-app")]
pub mod tray;

/// Entry point for the Tauri application runtime.
/// Gated behind the `tauri-app` feature so that unit/integration tests can
/// compile without the GTK/WebKit system libraries that Tauri requires.
#[cfg(feature = "tauri-app")]
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::Manager;

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;

            let db_path = app_data_dir.join("timetracker.db");
            let db_url = format!(
                "sqlite://{}?mode=rwc",
                db_path.to_string_lossy()
            );

            // init_db is async; run it on a blocking thread available at setup time.
            let pool = tauri::async_runtime::block_on(db::init_db(&db_url))
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;

            app.manage(pool);
            tray::setup_tray(app)?;

            // Close-to-tray: intercept window close and hide instead of quitting.
            // The only true exit path is the "Quit" tray menu item (app_handle.exit(0)).
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        if let Err(e) = window_clone.hide() {
                            eprintln!("close-to-tray: failed to hide window: {e}");
                        }
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Projects
            commands::projects::get_projects,
            commands::projects::create_project,
            commands::projects::update_project,
            commands::projects::archive_project,
            commands::projects::delete_project,
            // Tasks
            commands::tasks::get_tasks,
            commands::tasks::create_task,
            commands::tasks::update_task,
            commands::tasks::archive_task,
            commands::tasks::delete_task,
            // Timer
            commands::timer::get_active_timer,
            commands::timer::start_timer,
            commands::timer::stop_timer,
            commands::timer::discard_idle_time,
            // Entries
            commands::entries::get_entries,
            commands::entries::update_entry,
            commands::entries::delete_entry,
            commands::entries::archive_reported_entries,
            // Reports
            commands::reports::get_report,
            // Idle
            commands::idle::get_idle_seconds,
            // Tray
            tray::update_tray_state,
        ])
        .run(tauri::generate_context!())
        .unwrap_or_else(|e| {
            eprintln!("Fatal: failed to run tauri application: {e}");
            std::process::exit(1);
        });
}
