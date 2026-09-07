from datetime import datetime, timezone
from app.extensions import db


def _utc_now():
    return datetime.now(timezone.utc)


class Prediction(db.Model):
    """
    Prediction model storing historical churn scores and risk classifications.
    
    Fields store true inference outcomes from the prediction pipeline once available.
    """
    __tablename__ = "prediction"

    prediction_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    customer_id = db.Column(
        db.String(64),
        db.ForeignKey("customer.customer_id"),
        nullable=False,
        index=True,
    )
    churn_probability = db.Column(db.Float, nullable=False)
    risk_level = db.Column(db.String(20), nullable=False)
    predicted_at = db.Column(db.DateTime, nullable=False, default=_utc_now)

    # Relationship back to Customer
    customer = db.relationship("Customer", back_populates="predictions")

    def to_dict(self):
        return {
            "prediction_id": self.prediction_id,
            "customer_id": self.customer_id,
            "churn_probability": self.churn_probability,
            "risk_level": self.risk_level,
            "predicted_at": self.predicted_at.isoformat() if self.predicted_at else None,
        }

    def __repr__(self):
        return (
            f"<Prediction {self.prediction_id} - Customer {self.customer_id} "
            f"({self.risk_level}: {self.churn_probability})>"
        )
