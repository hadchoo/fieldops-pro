
import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, EmailStr


class MembershipResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    email: EmailStr
    role: str
    status: str
    created_at: datetime


class MemberAddRequest(BaseModel):
    email: EmailStr
    role: Literal[
        "Admin",
        "Treasurer",
        "Logistics",
        "Member",
        "Viewer"
    ] = "Member"

class MemberRoleUpdate(BaseModel):
    role: Literal[
        "Admin",
        "Treasurer",
        "Logistics",
        "Member",
        "Viewer"
    ]
