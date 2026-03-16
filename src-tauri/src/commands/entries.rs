use chrono::{DateTime, Utc};
use sqlx::{QueryBuilder, Sqlite, SqlitePool};
use tauri::State;

use crate::error::AppError;
use crate::models::{EntryWithContext, TimeEntry};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Parse an RFC3339 string supplied by the frontend and reject it when it is
/// in the future (we never trust frontend timestamps as authoritative time,
/// but we allow historical edits).
fn parse_and_validate_timestamp(raw: &str, field: &str) -> Result<DateTime<Utc>, String> {
    let dt = DateTime::parse_from_rfc3339(raw)
        .map_err(|_| {
            AppError::InvalidInput(format!(
                "{field} is not a valid RFC3339 timestamp: '{raw}'"
            ))
            .to_string()
        })?
        .with_timezone(&Utc);

    if dt > Utc::now() {
        return Err(AppError::InvalidInput(format!(
            "{field} must not be in the future"
        ))
        .to_string());
    }

    Ok(dt)
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn get_entries(
    pool: State<'_, SqlitePool>,
    project_id: Option<i64>,
    task_id: Option<i64>,
    date_from: Option<String>,
    date_to: Option<String>,
    show_archived: bool,
    limit: i64,
    offset: i64,
) -> Result<Vec<EntryWithContext>, String> {
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new(
        "SELECT te.id, te.task_id, te.start_time, te.end_time, te.notes,
                te.archived, te.created_at, te.updated_at,
                t.name AS task_name,
                p.id AS project_id, p.name AS project_name, p.color AS project_color
         FROM time_entries te
         JOIN tasks t ON t.id = te.task_id
         JOIN projects p ON p.id = t.project_id
         WHERE 1=1",
    );

    if !show_archived {
        qb.push(" AND te.archived = 0");
    }

    if let Some(pid) = project_id {
        qb.push(" AND p.id = ");
        qb.push_bind(pid);
    }
    if let Some(tid) = task_id {
        qb.push(" AND te.task_id = ");
        qb.push_bind(tid);
    }
    if let Some(df) = date_from {
        qb.push(" AND date(te.start_time) >= ");
        qb.push_bind(df);
    }
    if let Some(dt) = date_to {
        qb.push(" AND date(te.start_time) <= ");
        qb.push_bind(dt);
    }

    qb.push(" ORDER BY te.start_time DESC LIMIT ");
    qb.push_bind(limit);
    qb.push(" OFFSET ");
    qb.push_bind(offset);

    qb.build_query_as::<EntryWithContext>()
        .fetch_all(pool.inner())
        .await
        .map_err(|e| AppError::Database(e).to_string())
}

#[tauri::command]
pub async fn update_entry(
    pool: State<'_, SqlitePool>,
    id: i64,
    notes: Option<String>,
    start_time: Option<String>,
    end_time: Option<String>,
) -> Result<TimeEntry, String> {
    // ------------------------------------------------------------------
    // 1. Validate timestamps supplied by the frontend before touching the DB.
    // ------------------------------------------------------------------
    let validated_start = start_time
        .as_deref()
        .map(|s| parse_and_validate_timestamp(s, "start_time"))
        .transpose()?;

    let validated_end = end_time
        .as_deref()
        .map(|s| parse_and_validate_timestamp(s, "end_time"))
        .transpose()?;

    // ------------------------------------------------------------------
    // 2. When only one boundary is provided we need the other from the DB
    //    to validate the ordering constraint (end_time > start_time).
    // ------------------------------------------------------------------
    let need_existing = (validated_start.is_some() && validated_end.is_none())
        || (validated_end.is_some() && validated_start.is_none());

    let existing: Option<TimeEntry> = if need_existing || (validated_start.is_none() && validated_end.is_none() && notes.is_none()) {
        // Always fetch when we need ordering checks; also handles the
        // "no fields changed" path so we can return NotFound cleanly.
        sqlx::query_as::<_, TimeEntry>(
            "SELECT id, task_id, start_time, end_time, notes, archived, created_at, updated_at
             FROM time_entries WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(pool.inner())
        .await
        .map_err(|e| AppError::Database(e).to_string())?
    } else {
        None
    };

    // If nothing at all is being changed, return early (or surface NotFound).
    if notes.is_none() && validated_start.is_none() && validated_end.is_none() {
        return existing
            .ok_or_else(|| AppError::NotFound(format!("TimeEntry {id}")).to_string());
    }

    // ------------------------------------------------------------------
    // 3. Ordering check: end_time must be after start_time.
    // ------------------------------------------------------------------
    let effective_start: Option<DateTime<Utc>> = validated_start.or_else(|| {
        existing.as_ref().and_then(|e| {
            DateTime::parse_from_rfc3339(&e.start_time)
                .ok()
                .map(|dt| dt.with_timezone(&Utc))
        })
    });

    let effective_end: Option<DateTime<Utc>> = validated_end.or_else(|| {
        existing.as_ref().and_then(|e| {
            e.end_time.as_deref().and_then(|s| {
                DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|dt| dt.with_timezone(&Utc))
            })
        })
    });

    if let (Some(s), Some(e)) = (effective_start, effective_end) {
        if e <= s {
            return Err(AppError::InvalidInput(
                "end_time must be after start_time".to_string(),
            )
            .to_string());
        }
    }

    // ------------------------------------------------------------------
    // 4. Build the UPDATE using QueryBuilder (no format! for SQL strings).
    // ------------------------------------------------------------------
    let now = Utc::now().to_rfc3339();

    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new("UPDATE time_entries SET updated_at = ");
    qb.push_bind(&now);

    if let Some(ref n) = notes {
        qb.push(", notes = ");
        qb.push_bind(n);
    }
    if let Some(ref st) = start_time {
        qb.push(", start_time = ");
        qb.push_bind(st);
    }
    if let Some(ref et) = end_time {
        qb.push(", end_time = ");
        qb.push_bind(et);
    }

    qb.push(" WHERE id = ");
    qb.push_bind(id);

    let rows_affected = qb
        .build()
        .execute(pool.inner())
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .rows_affected();

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!("TimeEntry {id}")).to_string());
    }

    // ------------------------------------------------------------------
    // 5. Return the updated row.
    // ------------------------------------------------------------------
    sqlx::query_as::<_, TimeEntry>(
        "SELECT id, task_id, start_time, end_time, notes, archived, created_at, updated_at
         FROM time_entries WHERE id = ?",
    )
    .bind(id)
    .fetch_optional(pool.inner())
    .await
    .map_err(|e| AppError::Database(e).to_string())?
    .ok_or_else(|| AppError::NotFound(format!("TimeEntry {id}")).to_string())
}

#[tauri::command]
pub async fn delete_entry(pool: State<'_, SqlitePool>, id: i64) -> Result<(), String> {
    let rows_affected = sqlx::query("DELETE FROM time_entries WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .rows_affected();

    if rows_affected == 0 {
        return Err(AppError::NotFound(format!("TimeEntry {id}")).to_string());
    }

    Ok(())
}

/// Marks all completed, non-archived entries that match the given filters as archived.
/// Returns the count of entries that were archived.
/// Uses the same filter semantics as `get_report`.
#[tauri::command]
pub async fn archive_reported_entries(
    pool: State<'_, SqlitePool>,
    project_id: Option<i64>,
    task_id: Option<i64>,
    date_from: Option<String>,
    date_to: Option<String>,
) -> Result<i64, String> {
    let mut qb: QueryBuilder<Sqlite> = QueryBuilder::new(
        "UPDATE time_entries SET archived = 1
         WHERE end_time IS NOT NULL
           AND archived = 0",
    );

    if let Some(pid) = project_id {
        qb.push(" AND task_id IN (SELECT id FROM tasks WHERE project_id = ");
        qb.push_bind(pid);
        qb.push(")");
    }
    if let Some(tid) = task_id {
        qb.push(" AND task_id = ");
        qb.push_bind(tid);
    }
    if let Some(df) = date_from {
        qb.push(" AND date(start_time) >= ");
        qb.push_bind(df);
    }
    if let Some(dt) = date_to {
        qb.push(" AND date(start_time) <= ");
        qb.push_bind(dt);
    }

    let rows_affected = qb
        .build()
        .execute(pool.inner())
        .await
        .map_err(|e| AppError::Database(e).to_string())?
        .rows_affected();

    Ok(rows_affected as i64)
}
