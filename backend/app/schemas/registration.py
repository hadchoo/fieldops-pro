
import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict


class RegistrationCreate(BaseModel):
    event_id: uuid.UUID
    participant_id: uuid.UUID
    fee_required: bool = False


class RegistrationRead(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    participant_id: uuid.UUID
    status: str
    attended_at: datetime | None
    fee_required: bool
    payment_status: Literal["unpaid", "partial", "paid"] | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RegistrationPaymentUpdate(BaseModel):
    payment_status: Literal["unpaid", "partial", "paid"]
