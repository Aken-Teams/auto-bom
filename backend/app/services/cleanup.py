"""Startup housekeeping: remove orphaned upload files / records.

An "orphan" is an uploaded file that was never attached to a task — the user
uploaded a file then refreshed/left before the task was created. Such files sit
loosely in the uploads root, are invisible in the UI, and cannot be deleted
there. We GC them on startup.

A time threshold protects uploads that may still belong to an in-progress
wizard flow (uploaded but task not yet created).
"""
import logging
from datetime import datetime, timedelta
from pathlib import Path
from sqlalchemy.orm import Session
from app.config import UPLOAD_DIR
from app.models.tables import BomTask, UploadRecord

log = logging.getLogger(__name__)

ORPHAN_MAX_AGE_HOURS = 1


def cleanup_orphan_uploads(db: Session, max_age_hours: int = ORPHAN_MAX_AGE_HOURS) -> int:
    """Delete upload records (and their loose files) not referenced by any task
    and older than `max_age_hours`. Also removes stray root files with no record.
    Returns the number of items removed.
    """
    cutoff = datetime.now() - timedelta(hours=max_age_hours)
    upload_root = UPLOAD_DIR.resolve()

    referenced: set[int] = set()
    for t in db.query(BomTask.upload_id, BomTask.can_upload_id, BomTask.std_upload_id).all():
        referenced.update(t)
    referenced.discard(None)

    removed = 0
    known_paths: set[Path] = set()
    for r in db.query(UploadRecord).all():
        if r.file_path:
            known_paths.add(Path(r.file_path).resolve())
        if r.id in referenced:
            continue
        if r.uploaded_at and r.uploaded_at >= cutoff:
            continue  # too recent — may belong to an in-progress flow
        p = Path(r.file_path) if r.file_path else None
        # only remove the file if it is still loose in the uploads root
        if p and p.exists() and p.parent.resolve() == upload_root:
            try:
                p.unlink()
            except OSError:
                pass
        db.delete(r)
        removed += 1
    db.commit()

    # Stray files in the uploads root that have no record at all
    for f in UPLOAD_DIR.iterdir():
        if not f.is_file() or f.resolve() in known_paths:
            continue
        try:
            if datetime.fromtimestamp(f.stat().st_mtime) < cutoff:
                f.unlink()
                removed += 1
        except OSError:
            pass

    if removed:
        log.info(f"cleanup: removed {removed} orphan upload(s)")
    return removed
