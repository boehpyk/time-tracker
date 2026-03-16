fn main() {
    // Only invoke tauri_build when the full Tauri runtime is included.
    // Without this guard the build script panics when tests are compiled with
    // --no-default-features (which disables the `tauri-app` feature and
    // therefore GTK / WebKit native dependencies).
    #[cfg(feature = "tauri-app")]
    tauri_build::build()
}
