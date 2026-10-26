
import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker

# Locate and load the project's .env file
BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env")

# Get the database password
password = os.getenv("POSTGRES_PASSWORD")

if not password:
    raise RuntimeError("Database password is missing")

# Configure the PostgreSQL connection
DATABASE_URL = URL.create(
    "postgresql+psycopg",
    username="fieldops",
    password=password,
    host="127.0.0.1",
    port=5432,
    database="fieldops"
)

# Create the database engine
engine = create_engine(DATABASE_URL, pool_pre_ping=True)


# Create database sessions
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False
)


# Provide a session to FastAPI endpoints
def get_db():
    with SessionLocal() as db:
        yield db

