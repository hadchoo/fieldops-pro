
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.routers.participants import router as participants_router
from sqlalchemy import text, select, func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app.routers.events import router as events_router
from app.database import engine, get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.membership import Membership
from app.routers.auth import router as auth_router
from app.routers.organizations import router as organizations_router
from app.routers.registrations import router as registrations_router

app = FastAPI(
    title="FieldOps Pro API",
    version="0.1.0"
)

app.include_router(auth_router)
app.include_router(organizations_router)
app.include_router(events_router)
app.include_router(participants_router)
app.include_router(registrations_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "application": "FieldOps Pro"
    }


@app.get("/health/db")
def database_health():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "status": "ok",
            "database": "connected"
        }

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable"
        )

    
@app.get("/dev/users/count")
def count_users(db: Session = Depends(get_db)):

    total = db.scalar(
        select(func.count(User.id))
    )

    return {
        "total_users": total
    }

@app.get("/dev/users/test")
def get_test_user(db: Session = Depends(get_db)):

    user = db.scalar(
        select(User).where(
            User.email == "testuser@example.com"
        )
    )

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="Test user not found"
        )

    return {
        "name": user.name,
        "created_at": user.created_at
    }


@app.get("/dev/organizations/demo/members")
def get_organization_members(
    db: Session = Depends(get_db)
):

    organization = db.scalar(
        select(Organization).where(
            Organization.name == "Demo Scout Group"
        )
    )

    if organization is None:
        raise HTTPException(
            status_code=404,
            detail="Organization not found"
        )

    members = db.execute(
        select(User.name, Membership.role)
        .join(
            Membership,
            User.id == Membership.user_id
        )
        .where(
            Membership.organization_id == organization.id
        )
    ).all()

    return {
        "organization": organization.name,
        "members": [
            {"name": name, "role": role}
            for name, role in members
        ]
    }

