
from sqlalchemy import select

from app.database import SessionLocal
from app.models.organization import Organization


with SessionLocal() as db:

    existing_org = db.scalar(
        select(Organization).where(
            Organization.name == "Demo Scout Group"
        )
    )

    if existing_org:
        print("Organization already exists.")

    else:
        organization = Organization(
            name="Demo Scout Group"
        )

        db.add(organization)
        db.commit()

        print("Organization created successfully!")
        print("Organization ID:", organization.id)
