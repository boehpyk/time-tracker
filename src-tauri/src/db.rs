use sqlx::SqlitePool;

use crate::error::AppError;

/// Opens (or creates) the SQLite database at `db_url`, applies WAL and foreign-key
/// PRAGMAs, and runs the initial schema migration idempotently.
///
/// Internal functions return `Result<T, AppError>`; callers that expose a Tauri
/// command are responsible for mapping errors to `String` at the IPC boundary.
pub async fn init_db(db_url: &str) -> Result<SqlitePool, AppError> {
    let pool = SqlitePool::connect(db_url).await?;

    sqlx::query("PRAGMA journal_mode=WAL;")
        .execute(&pool)
        .await?;
    sqlx::query("PRAGMA foreign_keys=ON;")
        .execute(&pool)
        .await?;

    // Run initial migration — idempotent: all statements use
    // CREATE TABLE IF NOT EXISTS / INSERT OR IGNORE so re-running is safe.
    sqlx::query(include_str!("../migrations/001_initial.sql"))
        .execute(&pool)
        .await?;

    // Migration 002: adds `archived` column to time_entries.
    // Ignored on fresh installs where 001_initial.sql already creates the column.
    let _ = sqlx::query(include_str!("../migrations/002_add_archived_entries.sql"))
        .execute(&pool)
        .await;

    Ok(pool)
}
