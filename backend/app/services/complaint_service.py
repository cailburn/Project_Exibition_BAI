from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.extensions import db
from app.models.complaint import Complaint


def _utc_now():
    return datetime.now(timezone.utc)


def get_all_complaints() -> List[Complaint]:
    """
    Retrieve all complaints ordered by creation time (most recent first).
    """
    return db.session.query(Complaint).order_by(Complaint.created_at.desc()).all()


def get_complaint_by_id(complaint_id: str) -> Optional[Complaint]:
    """
    Retrieve a complaint by primary key complaint_id.
    """
    return db.session.get(Complaint, complaint_id)


def create_complaint(data: Dict[str, Any]) -> Complaint:
    """
    Create and persist a new Complaint record into the database.
    
    Expected validated fields:
      - complaint_id: required non-empty string
      - customer_id: required non-empty string
      - complaint_type: required non-empty string
      - description: required non-empty string
      - status: optional string (defaults to 'Open')
    """
    complaint_id = data["complaint_id"].strip()
    customer_id = data["customer_id"].strip()
    complaint_type = data["complaint_type"].strip()
    description = data["description"].strip()
    status = data.get("status", "Open")
    if isinstance(status, str):
        status = status.strip() or "Open"
    else:
        status = "Open"

    complaint = Complaint(
        complaint_id=complaint_id,
        customer_id=customer_id,
        complaint_type=complaint_type,
        description=description,
        status=status,
    )
    db.session.add(complaint)
    db.session.commit()
    return complaint


def update_complaint_status(complaint_id: str, status: str) -> Optional[Complaint]:
    """
    Update the status of an existing complaint.
    """
    complaint = get_complaint_by_id(complaint_id)
    if complaint is None:
        return None

    clean_status = status.strip()
    complaint.status = clean_status
    complaint.updated_at = _utc_now()
    if clean_status.lower() == "resolved" and not complaint.resolved_at:
        complaint.resolved_at = _utc_now()

    db.session.commit()
    return complaint
