
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class TaskAssignmentCreate(BaseModel):
    task_id: uuid.UUID
    user_id: uuid.UUID


class TaskAssignmentRead(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
