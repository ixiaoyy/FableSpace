"""Task envelope for orchestration results"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

@dataclass
class TaskEnvelope:
    """Unified task state structure"""
    task_id: str
    task_type: str  # "orchestrate", "writeback", "slice_generate"
    status: str  # "pending", "running", "completed", "failed"
    stage: str  # "resolve", "fetch", "build", "merge", "orchestrate", "bundle"

    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None

    input_summary: dict = field(default_factory=dict)
    output_summary: dict = field(default_factory=dict)

    warnings: list[str] = field(default_factory=list)
    error_code: Optional[str] = None
    error_message: Optional[str] = None

    result: Optional[Any] = None
