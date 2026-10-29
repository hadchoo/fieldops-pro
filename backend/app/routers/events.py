
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.membership import Membership
from app.models.event import Event
from app.models.registration import Registration
from app.schemas.event import (
    EventCreate,
    EventRead,
    EventUpdate,
    EventStatusUpdate
)


router = APIRouter(
    prefix="/api/v1/events",
    tags=["Events"]
)


# CREATE EVENT
@router.post(
    "",
    response_model=EventRead,
    status_code=status.HTTP_201_CREATED
)
def create_event(
    event_data: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == event_data.organization_id,
            Membership.user_id == current_user.id,
            Membership.status == "active"
        )
    )

    if membership is None:
        raise HTTPException(
            status_code=404,
            detail="Organization not found"
        )

    if membership.role not in ["Owner", "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="Permission denied"
        )

    new_event = Event(
        organization_id=event_data.organization_id,
        title=event_data.title,
        description=event_data.description,
        location=event_data.location,
        start_at=event_data.start_at,
        end_at=event_data.end_at,
        capacity=event_data.capacity
    )

    try:
        db.add(new_event)
        db.commit()
        db.refresh(new_event)

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not create event"
        )

    return new_event


# LIST EVENTS WITH SEARCH, FILTERING AND PAGINATION
@router.get(
    "",
    response_model=list[EventRead]
)
def get_events(
    organization_id: uuid.UUID,
    search: str | None = Query(default=None, max_length=100),
    status_filter: Literal[
        "planned", "active", "completed", "cancelled"
    ] | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == current_user.id,
            Membership.status == "active"
        )
    )

    if membership is None:
        raise HTTPException(
            status_code=404,
            detail="Organization not found"
        )

    query = select(Event).where(
        Event.organization_id == organization_id,
        Event.archived_at.is_(None)
    )

    if search and search.strip():
        query = query.where(
            Event.title.ilike(f"%{search.strip()}%")
        )

    if status_filter:
        query = query.where(
            Event.status == status_filter
        )

    events = db.scalars(
        query
        .order_by(Event.start_at.asc(), Event.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return events


# GET EVENT BY ID
@router.get(
    "/{event_id}",
    response_model=EventRead
)
def get_event(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    event = db.scalar(
        select(Event).where(
            Event.id == event_id,
            Event.archived_at.is_(None)
        )
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == event.organization_id,
            Membership.user_id == current_user.id,
            Membership.status == "active"
        )
    )

    if membership is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    return event


# UPDATE EVENT
@router.patch(
    "/{event_id}",
    response_model=EventRead
)
def update_event(
    event_id: uuid.UUID,
    event_data: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    event = db.scalar(
        select(Event).where(
            Event.id == event_id,
            Event.archived_at.is_(None)
        ).with_for_update()
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == event.organization_id,
            Membership.user_id == current_user.id,
            Membership.status == "active"
        )
    )

    if membership is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    if membership.role not in ["Owner", "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="Permission denied"
        )

    update_data = event_data.model_dump(exclude_unset=True)

    # PREVENT CAPACITY BELOW CURRENT REGISTRATIONS
    if "capacity" in update_data and update_data["capacity"] is not None:

        registered_count = db.scalar(
            select(func.count(Registration.id)).where(
                Registration.event_id == event.id,
                Registration.status == "registered"
            )
        )

        if update_data["capacity"] < registered_count:
            raise HTTPException(
                status_code=409,
                detail="Capacity cannot be less than current registrations"
            )

    # VALIDATE EVENT DATES
    start_at = update_data.get("start_at", event.start_at)
    end_at = update_data.get("end_at", event.end_at)

    if end_at <= start_at:
        raise HTTPException(
            status_code=422,
            detail="End date must be after start date"
        )

    # UPDATE EVENT FIELDS
    for field, value in update_data.items():
        setattr(event, field, value)

    try:
        db.commit()
        db.refresh(event)

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not update event"
        )

    return event


# ARCHIVE EVENT
@router.patch(
    "/{event_id}/archive",
    response_model=EventRead
)
def archive_event(
    event_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    event = db.scalar(
        select(Event).where(
            Event.id == event_id,
            Event.archived_at.is_(None)
        )
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == event.organization_id,
            Membership.user_id == current_user.id,
            Membership.status == "active"
        )
    )

    if membership is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    if membership.role not in ["Owner", "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="Permission denied"
        )

    event.archived_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(event)

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not archive event"
        )

    return event


# UPDATE EVENT STATUS
@router.patch(
    "/{event_id}/status",
    response_model=EventRead
)
def update_event_status(
    event_id: uuid.UUID,
    status_data: EventStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    event = db.scalar(
        select(Event).where(
            Event.id == event_id,
            Event.archived_at.is_(None)
        )
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == event.organization_id,
            Membership.user_id == current_user.id,
            Membership.status == "active"
        )
    )

    if membership is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    if membership.role not in ["Owner", "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="Permission denied"
        )

    allowed_transitions = {
        "planned": ["active", "cancelled"],
        "active": ["completed", "cancelled"],
        "completed": [],
        "cancelled": []
    }

    if status_data.status not in allowed_transitions[event.status]:
        raise HTTPException(
            status_code=409,
            detail="Invalid event status transition"
        )

    event.status = status_data.status

    try:
        db.commit()
        db.refresh(event)

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not update event status"
        )

    return event
