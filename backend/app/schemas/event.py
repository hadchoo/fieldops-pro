
import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    AwareDatetime,
    model_validator
)


class EventCreate(BaseModel):
    organization_id: uuid.UUID
    title: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=1000)
    location: str | None = Field(default=None, max_length=200)
    start_at: AwareDatetime
    end_at: AwareDatetime
    capacity: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_at <= self.start_at:
            raise ValueError("End date must be after start date")
        return self
  

class EventRead(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    title: str
    description: str | None
    location: str | None
    start_at: datetime
    end_at: datetime
    status: str
    archived_at: datetime | None
    created_at: datetime
    capacity: int | None

    model_config = ConfigDict(from_attributes=True)


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=1000)
    location: str | None = Field(default=None, max_length=200)
    start_at: AwareDatetime | None = None
    end_at: AwareDatetime | None = None
    capacity: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def validate_required_fields(self):
        for field in ("title", "start_at", "end_at"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class EventStatusUpdate(BaseModel):
    status: Literal[
        "planned",
        "active",
        "completed",
        "cancelled"
    ]
