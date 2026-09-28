from app.models.task import TaskStatus, validate_status_transition


def test_valid_transitions() -> None:
    assert validate_status_transition(TaskStatus.SCHEDULED, TaskStatus.QUEUED)
    assert validate_status_transition(TaskStatus.SCHEDULED, TaskStatus.IN_PROGRESS)
    assert validate_status_transition(TaskStatus.QUEUED, TaskStatus.IN_PROGRESS)
    assert validate_status_transition(TaskStatus.IN_PROGRESS, TaskStatus.DONE)
    assert validate_status_transition(TaskStatus.IN_PROGRESS, TaskStatus.FAILED)
    assert validate_status_transition(TaskStatus.FAILED, TaskStatus.QUEUED)
    assert validate_status_transition(TaskStatus.FAILED, TaskStatus.SCHEDULED)
    assert validate_status_transition(TaskStatus.DONE, TaskStatus.SCHEDULED)


def test_invalid_transitions() -> None:
    assert not validate_status_transition(TaskStatus.DONE, TaskStatus.IN_PROGRESS)
    assert not validate_status_transition(TaskStatus.DONE, TaskStatus.QUEUED)
    assert not validate_status_transition(TaskStatus.SCHEDULED, TaskStatus.DONE)
    assert not validate_status_transition(TaskStatus.SCHEDULED, TaskStatus.FAILED)
    assert not validate_status_transition(TaskStatus.QUEUED, TaskStatus.DONE)
    assert not validate_status_transition(TaskStatus.QUEUED, TaskStatus.FAILED)


def test_same_status_is_valid() -> None:
    for status in TaskStatus:
        assert validate_status_transition(status, status)


def test_cost_calculation() -> None:
    from decimal import Decimal

    from app.services.cost_tracker import calculate_cost

    # Opus: 15/1M input, 75/1M output
    cost = calculate_cost("claude-opus-4-6", 1000, 500)
    expected = Decimal(str((1000 * 15.0 + 500 * 75.0) / 1_000_000))
    assert cost == expected

    # Unknown model: 0 cost
    cost = calculate_cost("unknown-model", 1000, 500)
    assert cost == Decimal("0")
