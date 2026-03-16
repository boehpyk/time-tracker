use serde::{Deserialize, Serialize};
use sqlx::{QueryBuilder, Sqlite, SqlitePool};
use tauri::State;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryDetail {
    pub entry_id: i64,
    pub start_time: String,
    pub end_time: String,
    pub duration_seconds: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskReport {
    pub task_id: i64,
    pub task_name: String,
    pub total_seconds: i64,
    pub entry_count: i64,
    pub entries: Vec<EntryDetail>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectReport {
    pub project_id: i64,
    pub project_name: String,
    pub project_color: String,
    pub total_seconds: i64,
    pub tasks: Vec<TaskReport>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportData {
    pub projects: Vec<ProjectReport>,
    pub total_seconds: i64,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
}

// Raw row returned by the per-entry query.
#[derive(sqlx::FromRow)]
struct ReportRow {
    project_id: i64,
    project_name: String,
    project_color: String,
    task_id: i64,
    task_name: String,
    entry_id: i64,
    start_time: String,
    end_time: String,
    duration_seconds: i64,
}

#[tauri::command]
pub async fn get_report(
    pool: State<'_, SqlitePool>,
    project_id: Option<i64>,
    task_id: Option<i64>,
    date_from: Option<String>,
    date_to: Option<String>,
    include_archived: Option<bool>,
) -> Result<ReportData, String> {
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new(
        r#"
        SELECT
            p.id    AS project_id,
            p.name  AS project_name,
            p.color AS project_color,
            t.id    AS task_id,
            t.name  AS task_name,
            te.id   AS entry_id,
            te.start_time,
            te.end_time,
            CAST((julianday(te.end_time) - julianday(te.start_time)) * 86400 AS INTEGER) AS duration_seconds
        FROM time_entries te
        JOIN tasks    t ON t.id = te.task_id
        JOIN projects p ON p.id = t.project_id
        WHERE te.end_time IS NOT NULL"#,
    );

    if !include_archived.unwrap_or(false) {
        qb.push(" AND te.archived = 0");
    }

    if let Some(pid) = project_id {
        qb.push(" AND p.id = ");
        qb.push_bind(pid);
    }
    if let Some(tid) = task_id {
        qb.push(" AND t.id = ");
        qb.push_bind(tid);
    }
    if let Some(ref df) = date_from {
        qb.push(" AND date(te.start_time) >= ");
        qb.push_bind(df);
    }
    if let Some(ref dt) = date_to {
        qb.push(" AND date(te.start_time) <= ");
        qb.push_bind(dt);
    }

    qb.push(" ORDER BY p.name ASC, t.name ASC, te.start_time ASC");

    let rows = qb
        .build_query_as::<ReportRow>()
        .fetch_all(pool.inner())
        .await
        .map_err(|e| AppError::Database(e).to_string())?;

    // Aggregate rows into ProjectReport groups.
    let mut project_map: Vec<ProjectReport> = Vec::new();

    for row in rows {
        let entry = EntryDetail {
            entry_id: row.entry_id,
            start_time: row.start_time,
            end_time: row.end_time,
            duration_seconds: row.duration_seconds,
        };

        if let Some(proj) = project_map
            .iter_mut()
            .find(|p| p.project_id == row.project_id)
        {
            proj.total_seconds += row.duration_seconds;
            if let Some(task) = proj.tasks.iter_mut().find(|t| t.task_id == row.task_id) {
                task.total_seconds += row.duration_seconds;
                task.entry_count += 1;
                task.entries.push(entry);
            } else {
                proj.tasks.push(TaskReport {
                    task_id: row.task_id,
                    task_name: row.task_name,
                    total_seconds: row.duration_seconds,
                    entry_count: 1,
                    entries: vec![entry],
                });
            }
        } else {
            project_map.push(ProjectReport {
                project_id: row.project_id,
                project_name: row.project_name,
                project_color: row.project_color,
                total_seconds: row.duration_seconds,
                tasks: vec![TaskReport {
                    task_id: row.task_id,
                    task_name: row.task_name,
                    total_seconds: row.duration_seconds,
                    entry_count: 1,
                    entries: vec![entry],
                }],
            });
        }
    }

    let total_seconds = project_map.iter().map(|p| p.total_seconds).sum();

    Ok(ReportData {
        projects: project_map,
        total_seconds,
        date_from,
        date_to,
    })
}
