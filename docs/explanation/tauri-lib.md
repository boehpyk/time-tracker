# Rust Library Explanations

A plain-language guide to the key Rust dependencies used in TimeTracker.

---

## serde

**What it is:** The serialization/deserialization framework for Rust. "Serde" is a portmanteau of **Ser**ialize and **De**serialize.

**What it does:** It lets you convert Rust structs and enums to and from external formats (JSON, TOML, YAML, binary, etc.) by simply annotating your types with `#[derive(Serialize, Deserialize)]`. Serde itself is format-agnostic — it defines the traits and the derive macros, but delegates the actual encoding to format-specific crates like `serde_json`.

**Why we use it here:** Every Rust struct that crosses the Tauri IPC boundary (e.g. `Project`, `Task`, `TimeEntry`) needs to be serialized into JSON before it can be sent to the Vue frontend. Serde makes this automatic with a single derive annotation.

```rust
#[derive(Serialize, Deserialize)]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub color: String,
}
```

---

## serde_json

**What it is:** The JSON backend for Serde.

**What it does:** Implements Serde's traits specifically for JSON. It provides functions like `serde_json::to_string()` (Rust → JSON string) and `serde_json::from_str()` (JSON string → Rust), plus a `json!()` macro for constructing JSON values inline.

**Why we use it here:** Tauri's IPC layer communicates with the frontend via JSON. Tauri itself relies on `serde_json` under the hood to encode command return values, so having it as a direct dependency lets us also construct or inspect JSON values manually when needed (e.g. in tests or when building dynamic query results).

---

## chrono

**What it is:** The de-facto date and time library for Rust.

**What it does:** Provides types for dates (`NaiveDate`), times (`NaiveTime`), timestamps (`DateTime<Utc>`, `DateTime<Local>`), durations, and parsing/formatting. It handles timezone awareness, leap seconds, and RFC 3339 / ISO 8601 formatting out of the box.

**Why we use it here:** All timestamps in TimeTracker (`start_time`, `end_time`, `created_at`, `updated_at`) are computed in Rust using `chrono::Utc::now()`. This is an architectural rule — the frontend never supplies timestamps, because the backend clock is the single source of truth. Chrono also handles the arithmetic for idle time adjustment: `Utc::now() - Duration::seconds(idle_seconds)`.

```rust
let end_time = Utc::now() - Duration::seconds(idle_seconds as i64);
```

---

## thiserror

**What it is:** A derive macro that makes writing custom error types ergonomic.

**What it does:** With a single `#[derive(thiserror::Error)]` annotation, you get a fully compliant `std::error::Error` implementation, `Display` formatting via `#[error("...")]` attributes, and automatic `From` conversions between error types via `#[from]`. It eliminates the boilerplate of implementing these traits by hand.

**Why we use it here:** TimeTracker defines a central `AppError` enum in `error.rs` that unifies database errors, IO errors, and domain-level errors (e.g. "timer already running"). `thiserror` keeps this enum concise and readable. At the IPC boundary, `AppError` is then converted to a plain `String` (since Tauri requires `Result<T, String>`) via a blanket `impl From<AppError> for String`.

```rust
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("A timer is already running")]
    TimerAlreadyRunning,
}
```

---

## x11rb

**What it is:** A pure-Rust client library for the X11 windowing system protocol.

**What it does:** Lets Rust code communicate with the X server on Linux (and other Unix systems) using the X11 wire protocol. It provides Rust bindings for all X11 core requests and extensions, including the **MIT-SCREEN-SAVER** extension, which exposes how long the screen has been idle.

**Why we use it here:** On X11 desktop sessions, `x11rb` is how we query the idle time for the idle detection feature. We call the `ScreenSaverQueryInfo` request, which returns the number of milliseconds since the user last moved the mouse or pressed a key. The crate is declared as an optional dependency behind a feature flag, so it only compiles in when the target platform supports it.

---

## zbus

**What it is:** A pure-Rust library for D-Bus communication.

**What it does:** D-Bus is the inter-process communication system used throughout the Linux desktop (GNOME, KDE, systemd, etc.). `zbus` provides an async-first API to connect to the D-Bus session or system bus, call methods on services, and receive signals. It supports both the classic GLib-style D-Bus and the modern async interface.

**Why we use it here:** On Wayland desktop sessions, the X11 screen-saver extension is not available. Instead, idle time is exposed via D-Bus through the `org.freedesktop.ScreenSaver` interface (method: `GetSessionIdleTime`). `zbus` lets us call that interface from Rust. Like `x11rb`, it is an optional dependency — the idle detection code checks Wayland first (via `zbus`), then falls back to X11 (via `x11rb`), and if both fail, it safely returns `0` without crashing.
