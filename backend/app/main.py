"""Auto-BOM FastAPI application."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine, Base
from app.models.tables import *  # noqa: F401, F403
from app.routes import upload, tasks

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    # Warm up connection pool so first request is fast
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    logging.getLogger(__name__).info("DB connection pool warmed up")
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


@app.get("/api/health")
async def health():
    return {"status": "ok"}
