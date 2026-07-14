"""User-defined electroplating thickness (5um/8um) rules — persisted."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.tables import PlatingRule

router = APIRouter(prefix="/api/plating-rules", tags=["plating-rules"])


class PlatingRuleIn(BaseModel):
    match_field: str = "summary"   # summary | item_no
    match_value: str
    target_um: int = 8             # 5 | 8


def _to_dict(r: PlatingRule) -> dict:
    return {
        "id": r.id,
        "match_field": r.match_field,
        "match_value": r.match_value,
        "target_um": r.target_um,
        "sort_order": r.sort_order,
    }


@router.get("")
def list_rules(db: Session = Depends(get_db)):
    rules = db.query(PlatingRule).order_by(PlatingRule.sort_order, PlatingRule.id).all()
    return [_to_dict(r) for r in rules]


@router.put("")
def replace_rules(rules: list[PlatingRuleIn], db: Session = Depends(get_db)):
    """Replace all plating rules with the given list (save from the UI)."""
    db.query(PlatingRule).delete()
    for idx, r in enumerate(rules):
        if not (r.match_value or "").strip():
            continue  # skip empty rows
        db.add(PlatingRule(
            match_field=r.match_field if r.match_field in ("summary", "item_no") else "summary",
            match_value=r.match_value.strip(),
            target_um=8 if int(r.target_um) == 8 else 5,
            sort_order=idx,
        ))
    db.commit()
    return {"saved": db.query(PlatingRule).count()}
