"""
Phase 6 — Churn & Priority Features: Service Layer
====================================================

Provides business logic for:
  - get_top_churn_customers()  : returns customers with predictions, sorted by
                                  churn_probability DESC (then customer_id ASC as
                                  a deterministic tie-breaker).
  - get_priority_queue()       : returns customers requiring attention, ordered by
                                  risk level (High → Medium → Low), then by
                                  churn_probability DESC within the same risk level,
                                  then by complaint_count DESC, then by customer_id
                                  ASC as the final deterministic tie-breaker.

Design decisions
-----------------
- Only customers who have at least one Prediction record appear in either list.
  Customers without predictions are silently excluded (no fabricated values).
- When a customer has multiple Prediction records, the one with the latest
  predicted_at timestamp is used.  If two records share the same predicted_at
  (unlikely but possible with bulk inserts), the one with the highest
  prediction_id (autoincrement PK) wins, giving a fully deterministic result.
- churn_percentage is derived as churn_probability * 100.  It is not a stored
  column; it is computed here to match the ML-service convention.
- complaint_count is calculated via a SQL COUNT and is never persisted.
"""

from typing import Any, Dict, List

from sqlalchemy import func

from app.extensions import db
from app.models.complaint import Complaint
from app.models.customer import Customer
from app.models.prediction import Prediction

# ──────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────────────────────────────────────

# Priority ordering for risk levels (lower integer = higher priority)
_RISK_ORDER: Dict[str, int] = {
    "High": 0,
    "Medium": 1,
    "Low": 2,
}


def _latest_predictions_subquery():
    """
    Build a subquery that resolves the single "latest" prediction for every
    customer who has at least one Prediction record.

    "Latest" is defined as:
      MAX(predicted_at) — most recent timestamp
      MAX(prediction_id) — deterministic tie-breaker when timestamps collide

    Returns a SQLAlchemy subquery with columns:
      customer_id, max_predicted_at, max_prediction_id
    """
    subq = (
        db.session.query(
            Prediction.customer_id,
            func.max(Prediction.predicted_at).label("max_predicted_at"),
            func.max(Prediction.prediction_id).label("max_prediction_id"),
        )
        .group_by(Prediction.customer_id)
        .subquery("latest_preds")
    )
    return subq


def _complaint_count_subquery():
    """
    Build a subquery that counts the number of Complaint records per customer.

    Returns a SQLAlchemy subquery with columns:
      customer_id, complaint_count
    """
    subq = (
        db.session.query(
            Complaint.customer_id,
            func.count(Complaint.complaint_id).label("complaint_count"),
        )
        .group_by(Complaint.customer_id)
        .subquery("complaint_counts")
    )
    return subq


# ──────────────────────────────────────────────────────────────────────────────
# Public service functions
# ──────────────────────────────────────────────────────────────────────────────


def get_top_churn_customers() -> List[Dict[str, Any]]:
    """
    Return customers who currently have stored churn predictions, ordered by
    churn_probability DESC, then customer_id ASC as a deterministic tie-breaker.

    Exclusions
    ----------
    - Customers with no Prediction record are excluded.

    No ML inference is performed.  No Prediction records are created or
    modified.

    Returns
    -------
    A list of dicts, each containing:
      customer_id, name, churn_probability, churn_percentage, risk_level
    """
    latest_subq = _latest_predictions_subquery()

    rows = (
        db.session.query(Customer, Prediction)
        .join(latest_subq, Customer.customer_id == latest_subq.c.customer_id)
        .join(
            Prediction,
            Prediction.prediction_id == latest_subq.c.max_prediction_id,
        )
        .order_by(
            Prediction.churn_probability.desc(),
            Customer.customer_id.asc(),
        )
        .all()
    )

    result = []
    for customer, prediction in rows:
        result.append(
            {
                "customer_id": customer.customer_id,
                "name": customer.name,
                "churn_probability": prediction.churn_probability,
                "churn_percentage": round(prediction.churn_probability * 100, 2),
                "risk_level": prediction.risk_level,
            }
        )
    return result


def get_priority_queue() -> List[Dict[str, Any]]:
    """
    Return a prioritised list of customers requiring attention.

    Priority logic (explicit, rule-based, no arbitrary scoring formula)
    -------------------------------------------------------------------
    1. Risk level:  High  >  Medium  >  Low
    2. Within the same risk level: higher churn_probability first
    3. Within the same risk level and probability: higher complaint_count first
    4. Final tie-breaker: customer_id ASC  (deterministic)

    Exclusions
    ----------
    - Customers with no Prediction record are excluded (no fabricated churn
      values).

    No ML inference is performed.  No records are created or modified.

    Returns
    -------
    A list of dicts, each containing:
      customer_id, name, risk_level, churn_probability, churn_percentage,
      complaint_count, priority
    where `priority` mirrors `risk_level` for clarity.
    """
    latest_subq = _latest_predictions_subquery()
    complaint_subq = _complaint_count_subquery()

    rows = (
        db.session.query(
            Customer,
            Prediction,
            func.coalesce(complaint_subq.c.complaint_count, 0).label("complaint_count"),
        )
        .join(latest_subq, Customer.customer_id == latest_subq.c.customer_id)
        .join(
            Prediction,
            Prediction.prediction_id == latest_subq.c.max_prediction_id,
        )
        .outerjoin(complaint_subq, Customer.customer_id == complaint_subq.c.customer_id)
        .all()
    )

    # Sort in Python for transparent, readable priority ordering
    def _priority_key(row):
        customer, prediction, complaint_count = row
        risk_order = _RISK_ORDER.get(prediction.risk_level, 99)
        # Negate probability and complaint_count so higher values sort first
        return (
            risk_order,
            -prediction.churn_probability,
            -complaint_count,
            customer.customer_id,
        )

    rows_sorted = sorted(rows, key=_priority_key)

    result = []
    for customer, prediction, complaint_count in rows_sorted:
        result.append(
            {
                "customer_id": customer.customer_id,
                "name": customer.name,
                "risk_level": prediction.risk_level,
                "churn_probability": prediction.churn_probability,
                "churn_percentage": round(prediction.churn_probability * 100, 2),
                "complaint_count": int(complaint_count),
                "priority": prediction.risk_level,
            }
        )
    return result
