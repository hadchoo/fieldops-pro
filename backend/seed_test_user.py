
from getpass import getpass

from pwdlib import PasswordHash
from sqlalchemy import select

from app.database import SessionLocal
from app.models.user import User


password_hasher = PasswordHash.recommended()

with SessionLocal() as db:

    existing_user = db.scalar(
        select(User).where(
            User.email == "testuser@example.com"
        )
    )

    if existing_user:
        print("Test user already exists.")

    else:
        password = getpass("Enter test password: ")

        if not password:
            raise ValueError("Password cannot be empty")

        user = User(
            name="Test User",
            email="testuser@example.com",
            password_hash=password_hasher.hash(password)
        )

        db.add(user)
        db.commit()

        print("Test user created successfully!")
