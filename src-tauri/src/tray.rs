// System tray setup and update command for TimeTracker.
// This entire module is gated behind the `tauri-app` feature so that
// `--no-default-features` test builds compile without GTK/WebKit.
#![cfg(feature = "tauri-app")]

use tauri::{
    menu::{Menu, MenuItem, MenuItemKind, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};

/// App state holding the tray menu so `update_tray_state` can look up items.
pub struct TrayMenuState(pub Menu<tauri::Wry>);

/// Build and register the system tray icon with its menu.
/// Called once from the Tauri `setup` closure in `lib.rs`.
pub fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let toggle_window = MenuItem::with_id(app, "toggle-window", "Show/Hide Window", true, None::<&str>)?;
    let timer_status = MenuItem::with_id(app, "timer-status", "Timer: Stopped", false, None::<&str>)?;
    let toggle_timer = MenuItem::with_id(app, "toggle-timer", "Start Timer", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &toggle_window,
            &timer_status,
            &toggle_timer,
            &separator,
            &quit,
        ],
    )?;

    let icon = app
        .default_window_icon()
        .cloned()
        .unwrap_or_else(|| tauri::image::Image::new(&[], 0, 0));

    // Store menu in app state so update_tray_state can access items by id.
    app.manage(TrayMenuState(menu.clone()));

    TrayIconBuilder::with_id("main")
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app_handle, event| {
            match event.id().as_ref() {
                "toggle-window" => {
                    toggle_main_window(app_handle);
                }
                "toggle-timer" => {
                    if let Err(e) = app_handle.emit("tray-toggle-timer", ()) {
                        eprintln!("tray: failed to emit tray-toggle-timer: {e}");
                    }
                }
                "quit" => {
                    app_handle.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button,
                button_state,
                ..
            } = event
            {
                if button == MouseButton::Left && button_state == MouseButtonState::Up {
                    let app_handle = tray.app_handle();
                    toggle_main_window(app_handle);
                }
            }
        })
        .build(app)?;

    Ok(())
}

/// Toggle the main window between visible and hidden.
fn toggle_main_window(app_handle: &tauri::AppHandle) {
    if let Some(window) = app_handle.get_webview_window("main") {
        match window.is_visible() {
            Ok(true) => {
                if let Err(e) = window.hide() {
                    eprintln!("tray: failed to hide window: {e}");
                }
            }
            Ok(false) | Err(_) => {
                if let Err(e) = window.show() {
                    eprintln!("tray: failed to show window: {e}");
                }
                if let Err(e) = window.set_focus() {
                    eprintln!("tray: failed to focus window: {e}");
                }
            }
        }
    }
}

/// Tauri command: update the tray menu labels to reflect current timer state.
///
/// Called by the frontend on a 60-second interval while the timer is running,
/// and immediately when the timer starts or stops.
/// Returns `Ok(())` silently if the tray or menu is not available.
#[tauri::command]
pub fn update_tray_state(
    app_handle: tauri::AppHandle,
    label: String,
    is_running: bool,
) -> Result<(), String> {
    let Some(menu_state) = app_handle.try_state::<TrayMenuState>() else {
        return Ok(());
    };
    let menu = &menu_state.0;

    // Update the read-only status label.
    if let Some(MenuItemKind::MenuItem(status_item)) = menu.get("timer-status") {
        let status_text = if is_running {
            label.clone()
        } else {
            "Timer: Stopped".to_string()
        };
        status_item
            .set_text(status_text)
            .map_err(|e| format!("tray: failed to set timer-status text: {e}"))?;
    }

    // Update the actionable toggle item.
    if let Some(MenuItemKind::MenuItem(toggle_item)) = menu.get("toggle-timer") {
        let toggle_text = if is_running { "Stop Timer" } else { "Start Timer" };
        toggle_item
            .set_text(toggle_text)
            .map_err(|e| format!("tray: failed to set toggle-timer text: {e}"))?;
    }

    Ok(())
}
