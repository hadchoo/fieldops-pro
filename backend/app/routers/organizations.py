import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.organization import Organization
from app.models.membership import Membership
from app.schemas.organization import OrganizationCreate, OrganizationResponse
from app.schemas.membership import MembershipResponse, MemberAddRequest, MemberRoleUpdate

router = APIRouter(
    prefix="/organizations",
    tags=["Organizations"]
)


@router.post(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED
)
def create_organization(
    organization_data: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    new_organization = Organization(
        name=organization_data.name
    )

    try:
        db.add(new_organization)
        db.flush()

        membership = Membership(
            user_id=current_user.id,
            organization_id=new_organization.id,
            role="Owner",
            status="active"
        )

        db.add(membership)
        db.commit()

        db.refresh(new_organization)

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not create organization"
        )

    return new_organization


@router.get("", response_model=list[OrganizationResponse])
def get_my_organizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    organizations = db.scalars(
        select(Organization)
        .join(
            Membership,
            Membership.organization_id == Organization.id
        )
        .where(
            Membership.user_id == current_user.id,
            Membership.status == "active"
        )
    ).all()

    return organizations


@router.get("/{organization_id}", response_model=OrganizationResponse)
def get_organization(
    organization_id: uuid.UUID,
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

    organization = db.get(Organization, organization_id)

    if organization is None:
        raise HTTPException(
            status_code=404,
            detail="Organization not found"
        )

    return organization


@router.get(
    "/{organization_id}/members",
    response_model=list[MembershipResponse]
)
def get_organization_members(
    organization_id: uuid.UUID,
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

    members = db.execute(
        select(
            Membership.id,
            Membership.user_id,
            User.name,
            User.email,
            Membership.role,
            Membership.status,
            Membership.created_at
        )
        .join(User, Membership.user_id == User.id)
        .where(
            Membership.organization_id == organization_id
        )
    ).mappings().all()

    return [dict(member) for member in members]

@router.post(
    "/{organization_id}/members",
    response_model=MembershipResponse,
    status_code=status.HTTP_201_CREATED
)
def add_organization_member(
    organization_id: uuid.UUID,
    member_data: MemberAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    current_membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == current_user.id,
            Membership.status == "active"
        )
    )

    if current_membership is None:
        raise HTTPException(
            status_code=404,
            detail="Organization not found"
        )

    if current_membership.role not in ["Owner", "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="Permission denied"
        )

    if member_data.role == "Admin" and current_membership.role != "Owner":
        raise HTTPException(
            status_code=403,
            detail="Only the Owner can assign Admin role"
        )

    email = str(member_data.email).lower()

    user = db.scalar(
        select(User).where(User.email == email)
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    existing_membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == user.id
        )
    )

    if existing_membership:
        raise HTTPException(
            status_code=409,
            detail="User is already a member"
        )

    new_membership = Membership(
        user_id=user.id,
        organization_id=organization_id,
        role=member_data.role,
        status="active"
    )

    db.add(new_membership)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="User is already a member"
        )

    db.refresh(new_membership)

    return {
        "id": new_membership.id,
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": new_membership.role,
        "status": new_membership.status,
        "created_at": new_membership.created_at
    }


@router.patch(
    "/{organization_id}/members/{membership_id}/role",
    response_model=MembershipResponse
)
def update_member_role(
    organization_id: uuid.UUID,
    membership_id: uuid.UUID,
    role_data: MemberRoleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    current_membership = db.scalar(
        select(Membership).where(
            Membership.organization_id == organization_id,
            Membership.user_id == current_user.id,
            Membership.status == "active"
        )
    )

    if current_membership is None:
        raise HTTPException(
            status_code=404,
            detail="Organization not found"
        )

    if current_membership.role not in ["Owner", "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="Permission denied"
        )

    target_membership = db.scalar(
        select(Membership).where(
            Membership.id == membership_id,
            Membership.organization_id == organization_id,
            Membership.status == "active"
        )
    )

    if target_membership is None:
        raise HTTPException(
            status_code=404,
            detail="Member not found"
        )

    if target_membership.role == "Owner":
        raise HTTPException(
            status_code=403,
            detail="Cannot change Owner role"
        )

    if current_membership.role == "Admin":
        if target_membership.role == "Admin":
            raise HTTPException(
                status_code=403,
                detail="Admin cannot modify another Admin"
            )

        if role_data.role == "Admin":
            raise HTTPException(
                status_code=403,
                detail="Only Owner can assign Admin role"
            )

    if target_membership.user_id == current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Cannot change your own role"
        )

    target_membership.role = role_data.role

    try:
        db.commit()
        db.refresh(target_membership)
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not update member role"
        )

    user = db.get(User, target_membership.user_id)

    return {
        "id": target_membership.id,
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": target_membership.role,
        "status": target_membership.status,
        "created_at": target_membership.created_at
    }
