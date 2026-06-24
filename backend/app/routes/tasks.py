"""BOM task management routes."""
import re
import shutil
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import UPLOAD_DIR, OUTPUT_DIR
from app.models.tables import BomTask, BomTaskItem, CanTemplate, UploadRecord
from app.services.bom_generator import (
    generate_cmax_list, generate_bom_loader, generate_routings, generate_sequences,
)
from app.services.excel_parser import parse_std_operations

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _move_upload_file(db: Session, upload_id: int, task_dir: Path):
    """Move an upload file into a task-specific directory."""
    rec = db.query(UploadRecord).filter_by(id=upload_id).first()
    if rec and rec.file_path:
        old_path = Path(rec.file_path)
        if old_path.exists():
            new_path = task_dir / old_path.name
            shutil.move(str(old_path), str(new_path))
            rec.file_path = str(new_path)


def _item_to_dict(i: BomTaskItem) -> dict:
    """Convert a BomTaskItem to a dict with all fields for generators."""
    return {
        "item_no": i.item_no, "summary": i.summary, "doc_no": i.doc_no,
        "category_l": "半成品", "category_m": "自製",
        "alt_structure": i.alt_structure, "type_name": i.type_name,
        "family": i.family, "package": i.package, "line": i.line,
        "function": i.function, "component": i.component,
        "component_summary": i.component_summary,
        "weld_can": i.weld_can, "mold_can": i.mold_can, "pack_can": i.pack_can,
    }


class TaskCreate(BaseModel):
    name: str
    upload_id: int | None = None
    can_upload_id: int | None = None


class TaskItemCreate(BaseModel):
    item_no: str
    summary: str | None = None
    doc_no: str | None = None
    type_name: str | None = None
    family: str | None = None
    package: str | None = None
    line: str | None = None
    function: str | None = None
    alt_structure: str | None = None
    component: str | None = None
    component_summary: str | None = None
    weld_can: str | None = None
    mold_can: str | None = None
    pack_can: str | None = None


class CanRuleIn(BaseModel):
    """A user-defined rule for assigning a general (mold/pack) can."""
    can_type: str  # mold | pack
    match_field: str = "item_no"  # item_no | type_name | family | package | component
    match_op: str = "contains"  # all | contains | equals | regex
    match_value: str | None = None
    can_code: str


class CanMatchRequest(BaseModel):
    """Request to auto-match cans for task items, with optional general-can rules."""
    rules: list[CanRuleIn] = []


# Item fields a rule may match against
_RULE_FIELDS = {"item_no", "type_name", "family", "package", "component"}


def _rule_matches(rule: CanRuleIn, item: BomTaskItem) -> bool:
    if rule.match_op == "all":
        return True
    field = rule.match_field if rule.match_field in _RULE_FIELDS else "item_no"
    target = getattr(item, field, "") or ""
    value = rule.match_value or ""
    if rule.match_op == "contains":
        return value != "" and value in target
    if rule.match_op == "equals":
        return target == value
    if rule.match_op == "regex":
        if not value:
            return False
        try:
            return re.search(value, target) is not None
        except re.error:
            return False
    return False


@router.post("")
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    task = BomTask(name=data.name, upload_id=data.upload_id, can_upload_id=data.can_upload_id)
    db.add(task)
    db.commit()
    db.refresh(task)

    task_upload_dir = UPLOAD_DIR / f"task_{task.id}"
    task_upload_dir.mkdir(exist_ok=True)

    # Move associated BOM base upload file into task-specific directory
    if data.upload_id:
        _move_upload_file(db, data.upload_id, task_upload_dir)

    # Move associated can template upload file into task-specific directory
    if data.can_upload_id:
        _move_upload_file(db, data.can_upload_id, task_upload_dir)

    db.commit()
    return {"id": task.id, "name": task.name, "status": task.status}


@router.get("")
def list_tasks(page: int = 1, page_size: int = 10, db: Session = Depends(get_db)):
    total = db.query(BomTask).count()
    tasks = (
        db.query(BomTask)
        .order_by(BomTask.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    result = []
    for t in tasks:
        # Get associated BOM base upload
        bom_upload = None
        if t.upload_id:
            rec = db.query(UploadRecord).filter_by(id=t.upload_id).first()
            if rec:
                bom_upload = {"filename": rec.filename, "row_count": rec.row_count, "uploaded_at": rec.uploaded_at.isoformat() if rec.uploaded_at else None}

        # Get the std ops upload used (latest before task creation)
        std_upload = None
        std_rec = db.query(UploadRecord).filter(
            UploadRecord.file_type == "std_operation",
            UploadRecord.uploaded_at <= t.created_at if t.created_at else True,
        ).order_by(UploadRecord.uploaded_at.desc()).first()
        if std_rec:
            std_upload = {"filename": std_rec.filename, "row_count": std_rec.row_count, "uploaded_at": std_rec.uploaded_at.isoformat() if std_rec.uploaded_at else None}

        # Get the can template upload used (latest before task creation)
        can_upload = None
        can_rec = db.query(UploadRecord).filter(
            UploadRecord.file_type == "can_template",
            UploadRecord.uploaded_at <= t.created_at if t.created_at else True,
        ).order_by(UploadRecord.uploaded_at.desc()).first()
        if can_rec:
            can_upload = {"filename": can_rec.filename, "row_count": can_rec.row_count, "uploaded_at": can_rec.uploaded_at.isoformat() if can_rec.uploaded_at else None}

        result.append({
            "id": t.id,
            "name": t.name,
            "status": t.status,
            "item_count": t.item_count,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "has_cmax": bool(t.output_cmax_path),
            "has_output": bool(t.output_bom_path),
            "bom_upload": bom_upload,
            "std_upload": std_upload,
            "can_upload": can_upload,
        })
    return {
        "items": result,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(BomTask).filter_by(id=task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    items = db.query(BomTaskItem).filter_by(task_id=task_id).all()
    return {
        "id": task.id,
        "name": task.name,
        "status": task.status,
        "item_count": task.item_count,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        "output_bom_path": task.output_bom_path,
        "output_routing_path": task.output_routing_path,
        "output_sequence_path": task.output_sequence_path,
        "items": [
            {
                "id": i.id,
                "item_no": i.item_no,
                "summary": i.summary,
                "doc_no": i.doc_no,
                "type_name": i.type_name,
                "family": i.family,
                "package": i.package,
                "line": i.line,
                "function": i.function,
                "alt_structure": i.alt_structure,
                "component": i.component,
                "component_summary": i.component_summary,
                "weld_can": i.weld_can,
                "mold_can": i.mold_can,
                "pack_can": i.pack_can,
            }
            for i in items
        ],
    }


@router.post("/{task_id}/items")
def add_items(task_id: int, items: list[TaskItemCreate], db: Session = Depends(get_db)):
    task = db.query(BomTask).filter_by(id=task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")

    for item_data in items:
        db.add(BomTaskItem(task_id=task_id, **item_data.model_dump()))

    task.item_count = db.query(BomTaskItem).filter_by(task_id=task_id).count() + len(items)
    db.commit()
    return {"added": len(items), "total": task.item_count}


@router.post("/{task_id}/auto-match-cans")
def auto_match_cans(task_id: int, req: CanMatchRequest | None = None, db: Session = Depends(get_db)):
    """Auto-match 罐头 for all items in a task.

    - 焊接罐 (weld): matched one-to-one by WAF code (CanTemplate).
    - 成型/包装罐 (mold/pack): assigned by user-defined rules (general cans).
      The provided rules are also persisted globally for next time.
    """
    task = db.query(BomTask).filter_by(id=task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")

    items = db.query(BomTaskItem).filter_by(task_id=task_id).all()
    templates = {t.waf_code: t for t in db.query(CanTemplate).all()}

    rules = req.rules if req else []
    mold_rules = [r for r in rules if r.can_type == "mold"]
    pack_rules = [r for r in rules if r.can_type == "pack"]

    matched_weld = 0
    matched_mold = 0
    matched_pack = 0
    unmatched = []
    for item in items:
        # Weld: exact WAF match
        if item.component and item.component in templates and templates[item.component].weld_can:
            item.weld_can = templates[item.component].weld_can
            matched_weld += 1
        else:
            unmatched.append(item.item_no)

        # Mold / pack: first matching rule wins
        for r in mold_rules:
            if _rule_matches(r, item):
                item.mold_can = r.can_code
                matched_mold += 1
                break
        for r in pack_rules:
            if _rule_matches(r, item):
                item.pack_can = r.can_code
                matched_pack += 1
                break

    # NOTE: rules are applied per-request but intentionally NOT persisted —
    # each run re-seeds rules from the uploaded can file (see StepConfig).
    db.commit()
    return {
        "matched": matched_weld,
        "matched_weld": matched_weld,
        "matched_mold": matched_mold,
        "matched_pack": matched_pack,
        "unmatched": unmatched,
    }


@router.put("/{task_id}/items/{item_id}")
def update_item(task_id: int, item_id: int, data: TaskItemCreate, db: Session = Depends(get_db)):
    item = db.query(BomTaskItem).filter_by(id=item_id, task_id=task_id).first()
    if not item:
        raise HTTPException(404, "Item not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(item, k, v)
    db.commit()
    return {"ok": True}


@router.post("/{task_id}/generate-cmax")
def generate_cmax(task_id: int, db: Session = Depends(get_db)):
    """Generate C-CMAX import list for a task (Phase 1 output)."""
    task = db.query(BomTask).filter_by(id=task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")

    items = db.query(BomTaskItem).filter_by(task_id=task_id).all()
    if not items:
        raise HTTPException(400, "No items in task")

    item_dicts = [_item_to_dict(i) for i in items]

    task_output_dir = OUTPUT_DIR / f"task_{task_id}"
    task_output_dir.mkdir(exist_ok=True)

    cmax_path = generate_cmax_list(item_dicts, task_output_dir)
    task.output_cmax_path = cmax_path
    db.commit()

    return {"status": "ok", "path": cmax_path, "item_count": len(item_dicts)}


@router.post("/{task_id}/generate")
def generate_files(task_id: int, db: Session = Depends(get_db)):
    """Generate the 3 output files for a task."""
    task = db.query(BomTask).filter_by(id=task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")

    items = db.query(BomTaskItem).filter_by(task_id=task_id).all()
    if not items:
        raise HTTPException(400, "No items in task")

    task.status = "processing"
    db.commit()

    item_dicts = [_item_to_dict(i) for i in items]

    # Build std_ops lookup: seq_num -> first matching op_id
    # Note: proper matching requires domain logic (chip size for 切割, family for others)
    # Prefer the std file already bound to this task (linked at upload); else latest.
    std_record = None
    if task.std_upload_id:
        std_record = db.query(UploadRecord).filter_by(id=task.std_upload_id).first()
    if not std_record:
        std_record = db.query(UploadRecord).filter_by(file_type="std_operation").order_by(UploadRecord.uploaded_at.desc()).first()
    std_ops = {}
    if std_record and std_record.file_path:
        std_ops_rows = parse_std_operations(std_record.file_path)
        for op in std_ops_rows:
            seq = op["seq"]
            if seq not in std_ops:
                std_ops[seq] = op["op_id"]

        # Move std_ops file into task upload directory + link (skip if already bound)
        if task.std_upload_id != std_record.id:
            task_upload_dir = UPLOAD_DIR / f"task_{task_id}"
            task_upload_dir.mkdir(exist_ok=True)
            _move_upload_file(db, std_record.id, task_upload_dir)
            task.std_upload_id = std_record.id

    try:
        task_output_dir = OUTPUT_DIR / f"task_{task_id}"
        task_output_dir.mkdir(exist_ok=True)

        bom_path = generate_bom_loader(item_dicts, task_output_dir)
        routing_path = generate_routings(item_dicts, task_output_dir)
        sequence_path = generate_sequences(item_dicts, std_ops, task_output_dir)

        task.output_bom_path = bom_path
        task.output_routing_path = routing_path
        task.output_sequence_path = sequence_path
        task.status = "completed"
        task.completed_at = datetime.now()
        db.commit()

        return {
            "status": "completed",
            "files": {
                "bom_loader": bom_path,
                "routings": routing_path,
                "sequences": sequence_path,
            },
        }
    except Exception as e:
        task.status = "failed"
        db.commit()
        raise HTTPException(500, str(e))


@router.get("/{task_id}/download/{file_type}")
def download_file(task_id: int, file_type: str, db: Session = Depends(get_db)):
    """Download a generated file. file_type: cmax | bom | routing | sequence"""
    task = db.query(BomTask).filter_by(id=task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")

    path_map = {
        "cmax": task.output_cmax_path,
        "bom": task.output_bom_path,
        "routing": task.output_routing_path,
        "sequence": task.output_sequence_path,
    }
    path = path_map.get(file_type)
    if not path:
        raise HTTPException(404, "File not found")

    return FileResponse(path, filename=path.split("/")[-1].split("\\")[-1])


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Delete a task and all associated files (uploads + outputs)."""
    task = db.query(BomTask).filter_by(id=task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")

    # 1. Delete output directory: outputs/task_{id}/
    task_output_dir = OUTPUT_DIR / f"task_{task_id}"
    if task_output_dir.exists():
        shutil.rmtree(task_output_dir)

    # 2. Delete upload directory: uploads/task_{id}/
    task_upload_dir = UPLOAD_DIR / f"task_{task_id}"
    if task_upload_dir.exists():
        shutil.rmtree(task_upload_dir)

    # 3. Delete associated upload records and legacy flat files
    for uid in [task.upload_id, task.can_upload_id, task.std_upload_id]:
        if uid:
            upload_rec = db.query(UploadRecord).filter_by(id=uid).first()
            if upload_rec:
                old_path = Path(upload_rec.file_path)
                if old_path.exists():
                    old_path.unlink(missing_ok=True)
                db.delete(upload_rec)

    # 4. Delete all task items
    db.query(BomTaskItem).filter_by(task_id=task_id).delete()

    # 5. Delete the task
    db.delete(task)
    db.commit()

    return {"ok": True, "deleted_task_id": task_id}
