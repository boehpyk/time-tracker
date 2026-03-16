use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub description: Option<String>,
    pub archived: i64, // SQLite INTEGER; 0 = false, 1 = true
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: i64,
    pub project_id: i64,
    pub name: String,
    pub description: Option<String>,
    pub archived: i64, // SQLite INTEGER; 0 = false, 1 = true
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct TimeEntry {
    pub id: i64,
    pub task_id: i64,
    pub start_time: String,
    pub end_time: Option<String>,
    pub notes: Option<String>,
    pub archived: i64, // 0 = active, 1 = archived
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct AppState {
    pub id: i64,
    pub active_entry_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct EntryWithContext {
    pub id: i64,
    pub task_id: i64,
    pub start_time: String,
    pub end_time: Option<String>,
    pub notes: Option<String>,
    pub archived: i64,
    pub created_at: String,
    pub updated_at: String,
    // Denormalized context from tasks + projects
    pub task_name: String,
    pub project_id: i64,
    pub project_name: String,
    pub project_color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ActiveTimer {
    pub entry_id: i64,
    pub task_id: i64,
    pub task_name: String,
    pub project_id: i64,
    pub project_name: String,
    pub project_color: String,
    pub start_time: String,
    pub notes: Option<String>,
}
