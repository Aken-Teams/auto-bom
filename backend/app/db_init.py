"""Initialize database tables."""
from app.database import engine, Base
from app.models import *  # noqa: F401, F403


def init_db():
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully.")


if __name__ == "__main__":
    init_db()
