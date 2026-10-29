
import uuid
from datetime import datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator
)


class TaskCreate(BaseModel):
    event_id: uuid.UUID
    title: str = Field(max_length=150)
    description: str | None = None
    priority: Literal["low", "medium", "high"] = "medium"
    due_at: datetime | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str):
        value = value.strip()

        if not value:
            raise ValueError("Task title cannot be empty")

        return value


class TaskRead(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    title: str
    description: str | None
    priority: str
    status: str
    due_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskStatusUpdate(BaseModel):
    status: Literal["todo", "in_progress", "done"]


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=150)
    description: str | None = None
    priority: Literal["low", "medium", "high"] | None = None
    due_at: datetime | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None):
        if value is None:
            raise ValueError("Task title cannot be null")

        value = value.strip()

        if not value:
            raise ValueError("Task title cannot be empty")

        return value

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str | None):
        if value is None:
            raise ValueError("Task priority cannot be null")

        return value
