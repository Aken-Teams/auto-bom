"""User-defined can-matching rules (persisted globally)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.tables import CanRule

router = APIRouter(prefix="/api/can-rules", tags=["can-rules"])


@router.get("")
def list_can_rules(db: Session = Depends(get_db)):
    """Return saved can rules, ordered for display/application."""
    rules = db.query(CanRule).order_by(CanRule.can_type, CanRule.sort_order, CanRule.id).all()
    return [
        {
            "id": r.id,
            "can_type": r.can_type,
            "match_field": r.match_field,
            "match_op": r.match_op,
            "match_value": r.match_value,
            "can_code": r.can_code,
            "sort_order": r.sort_order,
        }
        for r in rules
    ]
