"""Auto-BOM FastAPI application."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine, Base, SessionLocal
from app.models.tables import *  # noqa: F401, F403
from app.routes import upload, tasks, can_rules
from app.services.cleanup import cleanup_orphan_uploads

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    # Warm up connection pool so first request is fast
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    logging.getLogger(__name__).info("DB connection pool warmed up")
    # GC orphaned uploads left by abandoned wizard flows
    db = SessionLocal()
    try:
        cleanup_orphan_uploads(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Auto-BOM System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(tasks.router)
app.include_router(can_rules.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
