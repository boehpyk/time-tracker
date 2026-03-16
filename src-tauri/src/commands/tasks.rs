use sqlx::SqlitePool;
use tauri::State;

use crate::error::AppError;
use crate::models::Task;

#[tauri::command]
pub async fn get_tasks(
    pool: State<'_, SqlitePool>,
    project_id: i64,
) -> Result<Vec<Task>, String> {
    sqlx::query_as::<_, Task>(
        "SELECT id, project_id, name, description, archived, created_at, updated_at
         FROM tasks
         WHERE project_id = ? AND archived = 0
         ORDER BY created_at ASC",
    )
    .bind(project_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| AppError::Database(e).to_string())
}

#[tauri::command]
pub async fn create_task(
    pool: State<'_, SqlitePool>,
    project_id: i64,
    name: String,
    description: Option<String>,
) -> Result<Task, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let id = sqlx::query(
        "INSERT INTO tasks (project_id, name, description, archived, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, ?)",
    )
    .bind(project_id)
    .bind(&name)
    .bind(&description)
    .bind(&now)
    .bind(&now)
    .execute(pool.inner())
    .await
    .map_err(|e| AppError::Database(e).to_string())?
    .last_insert_rowid();

    fetch_task(pool.inner(), id).await
}

#[tauri::command]
pub async fn update_task(
    pool: State<'_, SqlitePool>,
    id: i64,
    name: String,
    description: Option<String>,
) -> Result<Task, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let rows_affected = sqlx::query(
        "UPDATE tasks SET name = ?, description = ?, updated_at = ?
         WHERE id = ? AND archived = 0",
    )
    .bind(&name)
    .bind(&description)
    .bind(&now)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| AppError::Database(e).to_string())?
    .rows_affected();

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!("Task {id}")).to_string());
    }

    fetch_task(pool.inner(), id).await
}

#[tauri::command]
pub async fn archive_task(pool: State<'_, SqlitePool>, id: i64) -> Result<Task, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let rows_affected =
        sqlx::query("UPDATE tasks SET archived = 1, updated_at = ? WHERE id = ?")
            .bind(&now)
            .bind(id)
            .execute(pool.inner())
            .await
            .map_err(|e| AppError::Database(e).to_string())?
            .rows_affected();

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!("Task {id}")).to_string());
    }

    fetch_task(pool.inner(), id).await
}

#[tauri::command]
pub async fn delete_task(pool: State<'_, SqlitePool>, id: i64) -> Result<(), String> {
    let rows_affected = sqlx::query("DELETE FROM tasks WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .rows_affected();

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!("Task {id}")).to_string());
    }

    Ok(())
}

async fn fetch_task(pool: &SqlitePool, id: i64) -> Result<Task, String> {
    sqlx::query_as::<_, Task>(
        "SELECT id, project_id, name, description, archived, created_at, updated_at
         FROM tasks WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Database(e).to_string())?
    .ok_or_else(|| AppError::NotFound(format!("Task {id}")).to_string())
}
