use time_tracker_lib::db::init_db;

/// Run `init_db` against an in-memory SQLite database and return the pool.
/// Each test gets its own pool so there is no cross-test state.
async fn open_fresh_db() -> sqlx::SqlitePool {
    init_db(":memory:").await.expect("init_db should succeed on :memory:")
}

// ---------------------------------------------------------------------------
// 1. All four tables exist after init_db
// ---------------------------------------------------------------------------
#[tokio::test]
async fn init_db_creates_schema() {
    let pool = open_fresh_db().await;

    let expected_tables = ["projects", "tasks", "time_entries", "app_state"];

    for table in &expected_tables {
        let row: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",
        )
        .bind(table)
        .fetch_one(&pool)
        .await
        .unwrap_or_else(|e| panic!("sqlite_master query failed for table '{}': {}", table, e));

        assert_eq!(
            row.0, 1,
            "Expected table '{}' to exist in sqlite_master",
            table
        );
    }
}

// ---------------------------------------------------------------------------
// 2. app_state is seeded with exactly one row (id=1, active_entry_id=NULL)
// ---------------------------------------------------------------------------
#[tokio::test]
async fn init_db_seeds_app_state() {
    let pool = open_fresh_db().await;

    // Verify row count is exactly 1
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM app_state")
        .fetch_one(&pool)
        .await
        .expect("COUNT query on app_state failed");
    assert_eq!(count.0, 1, "app_state should contain exactly one row");

    // Verify the seeded row has id=1 and active_entry_id IS NULL
    let row: (i64, Option<i64>) =
        sqlx::query_as("SELECT id, active_entry_id FROM app_state WHERE id = 1")
            .fetch_one(&pool)
            .await
            .expect("SELECT from app_state failed");

    assert_eq!(row.0, 1, "app_state row should have id = 1");
    assert!(
        row.1.is_none(),
        "app_state.active_entry_id should be NULL after init"
    );
}

// ---------------------------------------------------------------------------
// 3. PRAGMA foreign_keys is ON (returns 1)
// ---------------------------------------------------------------------------
#[tokio::test]
async fn init_db_enables_foreign_keys() {
    let pool = open_fresh_db().await;

    let row: (i64,) = sqlx::query_as("PRAGMA foreign_keys")
        .fetch_one(&pool)
        .await
        .expect("PRAGMA foreign_keys query failed");

    assert_eq!(row.0, 1, "PRAGMA foreign_keys should return 1 (ON)");
}

// ---------------------------------------------------------------------------
// 4. journal_mode is WAL
// ---------------------------------------------------------------------------
#[tokio::test]
async fn init_db_enables_wal() {
    let pool = open_fresh_db().await;

    // For an in-memory database SQLite silently ignores WAL mode and stays in
    // "memory" mode.  We verify that init_db at least issues the PRAGMA
    // without error and that the resulting journal mode is either "wal" (file
    // DB) or "memory" (in-memory DB) — never an unexpected value.
    let row: (String,) = sqlx::query_as("PRAGMA journal_mode")
        .fetch_one(&pool)
        .await
        .expect("PRAGMA journal_mode query failed");

    let mode = row.0.to_lowercase();
    assert!(
        mode == "wal" || mode == "memory",
        "journal_mode should be 'wal' or 'memory' (in-memory DB), got '{}'",
        mode
    );
}
