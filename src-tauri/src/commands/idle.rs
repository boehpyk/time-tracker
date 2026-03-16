/// Returns the number of seconds the user has been idle.
///
/// Detection order: Wayland (via org.freedesktop.ScreenSaver D-Bus interface)
/// then X11 (via MIT-SCREEN-SAVER extension).  On any error — or when neither
/// display server is available — returns `Ok(0)` so that idle errors never
/// crash the app.
#[tauri::command]
pub async fn get_idle_seconds() -> Result<u64, String> {
    // Wayland check first.
    #[cfg(feature = "wayland-idle")]
    if std::env::var("WAYLAND_DISPLAY").is_ok() {
        match get_idle_wayland().await {
            Ok(secs) => return Ok(secs),
            Err(e) => {
                log::warn!("Wayland idle detection failed, falling through: {e}");
            }
        }
    }

    // X11 fallback.
    #[cfg(feature = "x11-idle")]
    if std::env::var("DISPLAY").is_ok() {
        match get_idle_x11() {
            Ok(secs) => return Ok(secs),
            Err(e) => {
                log::warn!("X11 idle detection failed, falling through: {e}");
            }
        }
    }

    Ok(0)
}

// ---------------------------------------------------------------------------
// Wayland implementation (zbus 5 / tokio)
// ---------------------------------------------------------------------------

#[cfg(feature = "wayland-idle")]
async fn get_idle_wayland() -> Result<u64, Box<dyn std::error::Error>> {
    use zbus::Connection;

    let conn = Connection::session().await?;

    // org.freedesktop.ScreenSaver — GetSessionIdleTime returns milliseconds.
    let idle_ms: u32 = conn
        .call_method(
            Some("org.freedesktop.ScreenSaver"),
            "/org/freedesktop/ScreenSaver",
            Some("org.freedesktop.ScreenSaver"),
            "GetSessionIdleTime",
            &(),
        )
        .await?
        .body()
        .deserialize()?;

    Ok(u64::from(idle_ms) / 1000)
}

// ---------------------------------------------------------------------------
// X11 implementation (x11rb + MIT-SCREEN-SAVER)
// ---------------------------------------------------------------------------

#[cfg(feature = "x11-idle")]
fn get_idle_x11() -> Result<u64, Box<dyn std::error::Error>> {
    use x11rb::connection::Connection as X11Connection;
    use x11rb::protocol::screensaver;
    use x11rb::protocol::xproto::ConnectionExt as XprotoConnectionExt;
    use x11rb::rust_connection::RustConnection;

    let (conn, screen_num) = RustConnection::connect(None)?;

    // Verify that the MIT-SCREEN-SAVER extension is present before using it.
    let ext_reply = conn.query_extension(b"MIT-SCREEN-SAVER")?.reply()?;
    if !ext_reply.present {
        return Ok(0);
    }

    let screen = &conn.setup().roots[screen_num];
    let drawable = screen.root;

    let info = screensaver::query_info(&conn, drawable)?.reply()?;

    // `ms_since_user_input` is milliseconds since last user input.
    Ok(u64::from(info.ms_since_user_input) / 1000)
}
