
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.membership import Membership
from app.models.event import Event
from app.models.participant import Participant
from app.models.registration import Registration
from app.schemas.registration import (
    RegistrationCreate,
    RegistrationRead,
    RegistrationPaymentUpdate
)

router = APIRouter(
    prefix="/api/v1/registrations",
    tags=["Registrations"]
)


# CREATE REGISTRATION
@router.post(
    "",
    response_model=RegistrationRead,
    status_code=status.HTTP_201_CREATED
)
def create_registration(
    registration_data: RegistrationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    event = db.scalar(
        select(Event).where(
            Event.id == registration_data.event_id,
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

    participant = db.scalar(
        select(Participant).where(
            Participant.id == registration_data.participant_id,
            Participant.organization_id == event.organization_id
        )
    )

    if participant is None:
        raise HTTPException(
            status_code=404,
            detail="Participant not found"
        )

    if event.status not in ["planned", "active"]:
        raise HTTPException(
            status_code=409,
            detail="Event is not accepting registrations"
        )

    existing_registration = db.scalar(
        select(Registration).where(
            Registration.event_id == event.id,
            Registration.participant_id == participant.id
        )
    )

    if existing_registration is not None:
        raise HTTPException(
            status_code=409,
            detail="Participant already has a registration for this event"
        )

    # CHECK EVENT CAPACITY
    registered_count = db.scalar(
        select(func.count(Registration.id)).where(
            Registration.event_id == event.id,
            Registration.status == "registered"
        )
    )

    if event.capacity is not None and registered_count >= event.capacity:
        raise HTTPException(
            status_code=409,
            detail="Event has reached maximum capacity"
        )

    new_registration = Registration(
    event_id=event.id,
    participant_id=participant.id,
    fee_required=registration_data.fee_required,
    payment_status="unpaid" if registration_data.fee_required else None
)


    try:
        db.add(new_registration)
        db.commit()
        db.refresh(new_registration)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Registration conflict"
        )

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not create registration"
        )

    return new_registration


# GET REGISTRATIONS
@router.get(
    "",
    response_model=list[RegistrationRead]
)
def get_registrations(
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

    registrations = db.scalars(
        select(Registration)
        .where(
            Registration.event_id == event_id
        )
        .order_by(
            Registration.created_at.asc(),
            Registration.id.asc()
        )
    ).all()

    return registrations


# MARK ATTENDANCE
@router.patch(
    "/{registration_id}/attendance",
    response_model=RegistrationRead
)
def mark_attendance(
    registration_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    registration = db.scalar(
        select(Registration).where(
            Registration.id == registration_id
        )
    )

    if registration is None:
        raise HTTPException(
            status_code=404,
            detail="Registration not found"
        )

    event = db.scalar(
        select(Event).where(
            Event.id == registration.event_id,
            Event.archived_at.is_(None)
        )
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Registration not found"
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
            detail="Registration not found"
        )

    if membership.role not in ["Owner", "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="Permission denied"
        )

    if registration.status != "registered":
        raise HTTPException(
            status_code=409,
            detail="Registration is cancelled"
        )

    if event.status != "active":
        raise HTTPException(
            status_code=409,
            detail="Attendance requires an active event"
        )

    if registration.attended_at is not None:
        return registration

    registration.attended_at = datetime.now(timezone.utc)

    try:
        db.commit()
        db.refresh(registration)

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not mark attendance"
        )

    return registration


# CANCEL REGISTRATION
@router.patch(
    "/{registration_id}/cancel",
    response_model=RegistrationRead
)
def cancel_registration(
    registration_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    registration = db.scalar(
        select(Registration).where(
            Registration.id == registration_id
        )
    )

    if registration is None:
        raise HTTPException(
            status_code=404,
            detail="Registration not found"
        )

    event = db.scalar(
        select(Event).where(
            Event.id == registration.event_id,
            Event.archived_at.is_(None)
        )
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Registration not found"
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
            detail="Registration not found"
        )

    if membership.role not in ["Owner", "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="Permission denied"
        )

    if registration.status == "cancelled":
        return registration

    if registration.attended_at is not None:
        raise HTTPException(
            status_code=409,
            detail="Cannot cancel an attended registration"
        )

    registration.status = "cancelled"

    try:
        db.commit()
        db.refresh(registration)

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not cancel registration"
        )

    return registration


# UPDATE REGISTRATION PAYMENT STATUS
@router.patch(
    "/{registration_id}/payment",
    response_model=RegistrationRead
)
def update_registration_payment(
    registration_id: uuid.UUID,
    payment_data: RegistrationPaymentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    registration = db.scalar(
        select(Registration).where(
            Registration.id == registration_id
        )
    )

    if registration is None:
        raise HTTPException(
            status_code=404,
            detail="Registration not found"
        )

    event = db.scalar(
        select(Event).where(
            Event.id == registration.event_id,
            Event.archived_at.is_(None)
        )
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Registration not found"
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
            detail="Registration not found"
        )

    if membership.role not in ["Owner", "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="Permission denied"
        )

    if registration.status == "cancelled":
        raise HTTPException(
            status_code=409,
            detail="Cannot update payment for cancelled registration"
        )

    if not registration.fee_required:
        raise HTTPException(
            status_code=409,
            detail="No payment required for this registration"
        )

    registration.payment_status = payment_data.payment_status

    try:
        db.commit()
        db.refresh(registration)

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not update payment status"
        )

    return registration
