use sqlx::SqlitePool;
use tauri::State;

use crate::error::AppError;
use crate::models::Project;

#[tauri::command]
pub async fn get_projects(pool: State<'_, SqlitePool>) -> Result<Vec<Project>, String> {
    sqlx::query_as::<_, Project>(
        "SELECT id, name, color, description, archived, created_at, updated_at
         FROM projects
         WHERE archived = 0
         ORDER BY created_at ASC",
    )
    .fetch_all(pool.inner())
    .await
    .map_err(|e| AppError::Database(e).to_string())
}

#[tauri::command]
pub async fn create_project(
    pool: State<'_, SqlitePool>,
    name: String,
    color: String,
    description: Option<String>,
) -> Result<Project, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let id = sqlx::query(
        "INSERT INTO projects (name, color, description, archived, created_at, updated_at)
         VALUES (?, ?, ?, 0, ?, ?)",
    )
    .bind(&name)
    .bind(&color)
    .bind(&description)
    .bind(&now)
    .bind(&now)
    .execute(pool.inner())
    .await
    .map_err(|e| AppError::Database(e).to_string())?
    .last_insert_rowid();

    fetch_project(pool.inner(), id).await
}

#[tauri::command]
pub async fn update_project(
    pool: State<'_, SqlitePool>,
    id: i64,
    name: String,
    color: String,
    description: Option<String>,
) -> Result<Project, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let rows_affected = sqlx::query(
        "UPDATE projects SET name = ?, color = ?, description = ?, updated_at = ?
         WHERE id = ? AND archived = 0",
    )
    .bind(&name)
    .bind(&color)
    .bind(&description)
    .bind(&now)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| AppError::Database(e).to_string())?
    .rows_affected();

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!("Project {id}")).to_string());
    }

    fetch_project(pool.inner(), id).await
}

#[tauri::command]
pub async fn archive_project(pool: State<'_, SqlitePool>, id: i64) -> Result<Project, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let rows_affected = sqlx::query(
        "UPDATE projects SET archived = 1, updated_at = ? WHERE id = ?",
    )
    .bind(&now)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| AppError::Database(e).to_string())?
    .rows_affected();

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!("Project {id}")).to_string());
    }

    fetch_project(pool.inner(), id).await
}

#[tauri::command]
pub async fn delete_project(pool: State<'_, SqlitePool>, id: i64) -> Result<(), String> {
    let rows_affected = sqlx::query("DELETE FROM projects WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .rows_affected();

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!("Project {id}")).to_string());
    }

    Ok(())
}

async fn fetch_project(pool: &SqlitePool, id: i64) -> Result<Project, String> {
    sqlx::query_as::<_, Project>(
        "SELECT id, name, color, description, archived, created_at, updated_at
         FROM projects WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Database(e).to_string())?
    .ok_or_else(|| AppError::NotFound(format!("Project {id}")).to_string())
}
