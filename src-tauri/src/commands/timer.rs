use chrono::Utc;
use sqlx::SqlitePool;
use tauri::State;

use crate::error::AppError;
use crate::models::{ActiveTimer, TimeEntry};

#[tauri::command]
pub async fn get_active_timer(
    pool: State<'_, SqlitePool>,
) -> Result<Option<ActiveTimer>, String> {
    // Read the single app_state row and join through to tasks + projects.
    let row = sqlx::query_as::<_, ActiveTimer>(
        r#"
        SELECT
            te.id          AS entry_id,
            t.id           AS task_id,
            t.name         AS task_name,
            p.id           AS project_id,
            p.name         AS project_name,
            p.color        AS project_color,
            te.start_time  AS start_time,
            te.notes       AS notes
        FROM app_state AS a
        JOIN time_entries AS te ON te.id = a.active_entry_id
        JOIN tasks        AS t  ON t.id  = te.task_id
        JOIN projects     AS p  ON p.id  = t.project_id
        WHERE a.id = 1
        "#,
    )
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| AppError::Database(e).to_string())?;

    Ok(row)
}

#[tauri::command]
pub async fn start_timer(
    pool: State<'_, SqlitePool>,
    task_id: i64,
    notes: Option<String>,
) -> Result<TimeEntry, String> {
    // Guard: error if a timer is already active.
    let active: Option<i64> = sqlx::query_scalar(
        "SELECT active_entry_id FROM app_state WHERE id = 1",
    )
    .fetch_one(pool.inner())
    .await
    .map_err(|e| AppError::Database(e).to_string())?;

    if active.is_some() {
        return Err(AppError::TimerAlreadyRunning.to_string());
    }

    let now = Utc::now().to_rfc3339();

    // Insert the new time entry.
    let entry_id = sqlx::query(
        "INSERT INTO time_entries (task_id, start_time, end_time, notes, created_at, updated_at)
         VALUES (?, ?, NULL, ?, ?, ?)",
    )
    .bind(task_id)
    .bind(&now)
    .bind(&notes)
    .bind(&now)
    .bind(&now)
    .execute(pool.inner())
    .await
    .map_err(|e| AppError::Database(e).to_string())?
    .last_insert_rowid();

    // Update app_state to point at the new entry.
    sqlx::query("UPDATE app_state SET active_entry_id = ? WHERE id = 1")
        .bind(entry_id)
        .execute(pool.inner())
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    fetch_entry(pool.inner(), entry_id).await
}

#[tauri::command]
pub async fn stop_timer(pool: State<'_, SqlitePool>) -> Result<TimeEntry, String> {
    let entry_id: Option<i64> = sqlx::query_scalar(
        "SELECT active_entry_id FROM app_state WHERE id = 1",
    )
    .fetch_one(pool.inner())
    .await
    .map_err(|e| AppError::Database(e).to_string())?;

    let entry_id = entry_id.ok_or_else(|| AppError::NoActiveTimer.to_string())?;

    // Always use server-side time — never accept a timestamp from the frontend.
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "UPDATE time_entries SET end_time = ?, updated_at = ? WHERE id = ?",
    )
    .bind(&now)
    .bind(&now)
    .bind(entry_id)
    .execute(pool.inner())
    .await
    .map_err(|e| AppError::Database(e).to_string())?;

    sqlx::query("UPDATE app_state SET active_entry_id = NULL WHERE id = 1")
        .execute(pool.inner())
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    fetch_entry(pool.inner(), entry_id).await
}

#[tauri::command]
pub async fn discard_idle_time(
    pool: State<'_, SqlitePool>,
    idle_seconds: u64,
) -> Result<TimeEntry, String> {
    let entry_id: Option<i64> = sqlx::query_scalar(
        "SELECT active_entry_id FROM app_state WHERE id = 1",
    )
    .fetch_one(pool.inner())
    .await
    .map_err(|e| AppError::Database(e).to_string())?;

    let entry_id = entry_id.ok_or_else(|| AppError::NoActiveTimer.to_string())?;

    // Compute end_time as now - idle_seconds.
    let adjusted_end = Utc::now()
        - chrono::Duration::seconds(idle_seconds as i64);
    let end_str = adjusted_end.to_rfc3339();
    let updated_at = Utc::now().to_rfc3339();

    sqlx::query(
        "UPDATE time_entries SET end_time = ?, updated_at = ? WHERE id = ?",
    )
    .bind(&end_str)
    .bind(&updated_at)
    .bind(entry_id)
    .execute(pool.inner())
    .await
    .map_err(|e| AppError::Database(e).to_string())?;

    sqlx::query("UPDATE app_state SET active_entry_id = NULL WHERE id = 1")
        .execute(pool.inner())
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    fetch_entry(pool.inner(), entry_id).await
}

async fn fetch_entry(pool: &SqlitePool, id: i64) -> Result<TimeEntry, String> {
    sqlx::query_as::<_, TimeEntry>(
        "SELECT id, task_id, start_time, end_time, notes, created_at, updated_at
         FROM time_entries WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Database(e).to_string())?
    .ok_or_else(|| AppError::NotFound(format!("TimeEntry {id}")).to_string())
}
