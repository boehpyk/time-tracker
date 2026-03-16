use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Timer is already running")]
    TimerAlreadyRunning,

    #[error("No active timer")]
    NoActiveTimer,

    #[error("Invalid input: {0}")]
    InvalidInput(String),
}

impl From<AppError> for String {
    fn from(e: AppError) -> String {
        e.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---------------------------------------------------------------------------
    // 5a. AppError::NotFound displays the contained message and includes it
    //     when converted to String via the Display impl from thiserror.
    // ---------------------------------------------------------------------------
    #[test]
    fn test_app_error_not_found_to_string_contains_key() {
        let err = AppError::NotFound("foo".to_string());
        let s = err.to_string();
        assert!(
            s.contains("foo"),
            "to_string() should include the key; got: '{}'",
            s
        );
    }

    // ---------------------------------------------------------------------------
    // 5b. From<AppError> for String delegates to Display (same text).
    // ---------------------------------------------------------------------------
    #[test]
    fn test_app_error_from_impl_matches_to_string() {
        let err_a = AppError::NotFound("bar".to_string());
        let err_b = AppError::NotFound("bar".to_string());

        let via_to_string = err_a.to_string();
        let via_from: String = err_b.into();

        assert_eq!(
            via_to_string, via_from,
            "From<AppError> for String should produce the same text as to_string()"
        );
    }

    // ---------------------------------------------------------------------------
    // 5c. Unit-less variants also produce non-empty, stable messages.
    // ---------------------------------------------------------------------------
    #[test]
    fn test_app_error_unit_variants_have_messages() {
        let already_running = AppError::TimerAlreadyRunning.to_string();
        assert!(
            !already_running.is_empty(),
            "TimerAlreadyRunning message must not be empty"
        );
        assert!(
            already_running.to_lowercase().contains("running")
                || already_running.to_lowercase().contains("timer"),
            "TimerAlreadyRunning message should mention 'running' or 'timer'; got: '{}'",
            already_running
        );

        let no_timer = AppError::NoActiveTimer.to_string();
        assert!(
            !no_timer.is_empty(),
            "NoActiveTimer message must not be empty"
        );
    }

    // ---------------------------------------------------------------------------
    // 5d. AppError::InvalidInput includes the provided string.
    // ---------------------------------------------------------------------------
    #[test]
    fn test_app_error_invalid_input_contains_detail() {
        let err = AppError::InvalidInput("name too long".to_string());
        let s = err.to_string();
        assert!(
            s.contains("name too long"),
            "InvalidInput message should include the detail; got: '{}'",
            s
        );
    }
}
