"""File upload and parsing routes."""
import shutil
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import UPLOAD_DIR
from app.models.tables import UploadRecord, CanTemplate, StdOperation
from app.services.excel_parser import (
    parse_bom_base, parse_can_template, parse_std_operations,
)

router = APIRouter(prefix="/api/upload", tags=["upload"])


@router.post("/bom-base")
async def upload_bom_base(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload BOM base file (WXBMR005)."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Only Excel files are supported")

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    save_path = UPLOAD_DIR / f"bom_base_{ts}_{file.filename}"
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    items = parse_bom_base(str(save_path))

    record = UploadRecord(
        filename=file.filename,
        file_path=str(save_path),
        file_type="bom_base",
        row_count=len(items),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "filename": record.filename,
        "row_count": len(items),
        "items": items,
    }


@router.post("/can-template")
async def upload_can_template(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload file containing 罐头 templates (C-CMAX导入清单 with 罐头 sheet)."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Only Excel files are supported")

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    save_path = UPLOAD_DIR / f"can_template_{ts}_{file.filename}"
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    templates = parse_can_template(str(save_path))

    # Upsert into database
    for t in templates:
        existing = db.query(CanTemplate).filter_by(waf_code=t["waf_code"]).first()
        if existing:
            for k, v in t.items():
                setattr(existing, k, v)
        else:
            db.add(CanTemplate(**t))
    db.commit()

    return {"count": len(templates), "templates": templates}


@router.post("/std-operations")
async def upload_std_operations(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload WXBMR004 standard operations file."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Only Excel files are supported")

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    save_path = UPLOAD_DIR / f"std_ops_{ts}_{file.filename}"
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    ops = parse_std_operations(str(save_path))

    record = UploadRecord(
        filename=file.filename,
        file_path=str(save_path),
        file_type="std_operation",
        row_count=len(ops),
    )
    db.add(record)

    # Clear and reload std operations
    db.query(StdOperation).delete()
    for op in ops:
        db.add(StdOperation(**op))
    db.commit()
    db.refresh(record)

    return {"id": record.id, "filename": record.filename, "row_count": len(ops)}


@router.get("/records")
async def list_upload_records(db: Session = Depends(get_db)):
    """List all upload records."""
    records = db.query(UploadRecord).order_by(UploadRecord.uploaded_at.desc()).all()
    return [
        {
            "id": r.id,
            "filename": r.filename,
            "file_type": r.file_type,
            "row_count": r.row_count,
            "uploaded_at": r.uploaded_at.isoformat() if r.uploaded_at else None,
        }
        for r in records
    ]


@router.get("/can-templates")
async def list_can_templates(db: Session = Depends(get_db)):
    """List all can templates in database."""
    templates = db.query(CanTemplate).all()
    return [
        {
            "id": t.id,
            "function": t.function,
            "waf_code": t.waf_code,
            "supplier": t.supplier,
            "wafer_size": t.wafer_size,
            "mil": t.mil,
            "weld_can": t.weld_can,
            "weld_desc": t.weld_desc,
            "mold_can": t.mold_can,
            "mold_desc": t.mold_desc,
            "pack_can": t.pack_can,
            "pack_desc": t.pack_desc,
        }
        for t in templates
    ]
