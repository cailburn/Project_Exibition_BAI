from datetime import datetime, timezone
from app.extensions import db


def _utc_now():
    return datetime.now(timezone.utc)


class Customer(db.Model):
    """
    Customer entity representing customer profile and core behavioral metrics.
    
    The five core prediction input features are:
    - customer_expenditure
    - login_frequency
    - support_calls
    - complaints
    - tenure
    """
    __tablename__ = "customer"

    customer_id = db.Column(db.String(64), primary_key=True)
    name = db.Column(db.String(100), nullable=True)

    # Core prediction features (exact API/domain field names preserved)
    customer_expenditure = db.Column(db.Float, nullable=False, default=0.0)
    login_frequency = db.Column(db.Integer, nullable=False, default=0)
    support_calls = db.Column(db.Integer, nullable=False, default=0)
    complaints = db.Column(db.Integer, nullable=False, default=0)
    tenure = db.Column(db.Integer, nullable=False, default=0)

    # Timestamps
    created_at = db.Column(db.DateTime, nullable=False, default=_utc_now)
    updated_at = db.Column(db.DateTime, nullable=False, default=_utc_now, onupdate=_utc_now)

    # Relationships
    # Note: Relationship is named complaint_records to avoid shadowing the integer feature 'complaints'
    complaint_records = db.relationship(
        "Complaint",
        back_populates="customer",
        cascade="all, delete-orphan",
        lazy=True,
    )
    predictions = db.relationship(
        "Prediction",
        back_populates="customer",
        cascade="all, delete-orphan",
        lazy=True,
    )

    def to_dict(self):
        return {
            "customer_id": self.customer_id,
            "name": self.name,
            "customer_expenditure": self.customer_expenditure,
            "login_frequency": self.login_frequency,
            "support_calls": self.support_calls,
            "complaints": self.complaints,
            "tenure": self.tenure,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<Customer {self.customer_id} ({self.name})>"
