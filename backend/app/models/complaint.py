import uuid
from datetime import datetime, timezone
from app.extensions import db


def _utc_now():
    return datetime.now(timezone.utc)


def _generate_complaint_id():
    return f"COMP-{uuid.uuid4().hex[:8].upper()}"


class Complaint(db.Model):
    """
    Complaint model representing customer grievance/support ticket records.
    """
    __tablename__ = "complaint"

    complaint_id = db.Column(db.String(64), primary_key=True, default=_generate_complaint_id)
    customer_id = db.Column(
        db.String(64),
        db.ForeignKey("customer.customer_id"),
        nullable=False,
        index=True,
    )
    complaint_type = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), nullable=False, default="Open")
    created_at = db.Column(db.DateTime, nullable=False, default=_utc_now)
    updated_at = db.Column(db.DateTime, nullable=False, default=_utc_now, onupdate=_utc_now)
    resolved_at = db.Column(db.DateTime, nullable=True)

    # Relationship back to Customer
    customer = db.relationship("Customer", back_populates="complaint_records")

    def to_dict(self):
        return {
            "complaint_id": self.complaint_id,
            "customer_id": self.customer_id,
            "complaint_type": self.complaint_type,
            "description": self.description,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
        }

    def __repr__(self):
        return f"<Complaint {self.complaint_id} - Customer {self.customer_id} ({self.status})>"

