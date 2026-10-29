
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ParticipantCreate(BaseModel):
    organization_id: uuid.UUID
    full_name: str = Field(min_length=1, max_length=150)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str):
        value = value.strip()

        if not value:
            raise ValueError("Participant name cannot be empty")

        return value


class ParticipantRead(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    full_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
