"""
Phase 7 — Recommendation Engine: Service Layer
===============================================

Provides rule-based customer retention recommendations for a single customer.

Public API
----------
  get_customer_recommendations(customer_id)
      → dict with recommendation data, or None when customer not found,
        or a dict with recommendations=[] when no prediction exists.

Design decisions
-----------------
- Rules are explicit and transparent — no ML model, no arbitrary numeric
  score, no external API.  The same database state always produces the same
  recommendations (deterministic).

- "Latest prediction" reuses the same tie-breaking logic as Phase 6:
  MAX(predicted_at), then MAX(prediction_id) as the tie-breaker.
  Rather than duplicating the subquery, we query the Prediction table
  for a single customer directly with ORDER BY + LIMIT, which is clear
  and self-contained at this scope.

- "Unresolved complaint" definition:
  A complaint whose status is NOT "Resolved" (case-insensitive).
  This matches the existing project convention where the only explicitly
  terminal status is "Resolved" (set via PATCH /api/complaints/<id>).
  All other statuses (e.g. "Open", "In Progress") are treated as unresolved.

- complaint_count and open_complaint_count are calculated via queries;
  no new columns or tables are created.

Recommendation rules (transparent, explainable)
------------------------------------------------
Risk-level rules (one set always applied when a prediction exists):
  High   → proactive contact, retention incentive, complaint review
  Medium → monitor engagement, follow up on complaints, targeted offer
  Low    → maintain engagement, encourage usage, monitor behaviour

Complaint rules (applied on top of risk rules when conditions are met):
  Any unresolved complaint → prioritise outstanding complaint resolution
  2+ total complaints      → review recurring complaint patterns
"""

from typing import Any, Dict, List, Optional

from app.extensions import db
from app.models.complaint import Complaint
from app.models.customer import Customer
from app.models.prediction import Prediction


# ──────────────────────────────────────────────────────────────────────────────
# Recommendation rule tables
# ──────────────────────────────────────────────────────────────────────────────

# Each entry is (type, priority, message).
_RISK_RULES: Dict[str, List[tuple]] = {
    "High": [
        ("Retention", "High", "Contact the customer proactively to prevent churn."),
        ("Retention", "High", "Offer a suitable retention incentive or upgrade."),
        ("Retention", "High", "Review recent complaints and resolve all outstanding issues."),
    ],
    "Medium": [
        ("Retention", "Medium", "Monitor customer engagement and usage patterns."),
        ("Retention", "Medium", "Follow up on any unresolved complaints promptly."),
        ("Retention", "Medium", "Consider a targeted retention offer to reinforce loyalty."),
    ],
    "Low": [
        ("Retention", "Low", "Maintain regular engagement to keep the customer satisfied."),
        ("Retention", "Low", "Encourage continued product and service usage."),
        ("Retention", "Low", "Monitor for any changes in behaviour that may signal dissatisfaction."),
    ],
}

# Complaint-based rules appended on top of risk rules.
# (type, priority, message)
_UNRESOLVED_COMPLAINT_RULE = (
    "Complaint",
    "High",
    "Prioritise resolution of outstanding complaints to improve customer satisfaction.",
)
_RECURRING_COMPLAINT_RULE = (
    "Complaint",
    "Medium",
    "Review recurring complaint patterns and address the root cause.",
)

# Threshold for the "multiple complaints" rule.
_MULTIPLE_COMPLAINTS_THRESHOLD = 2


# ──────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────────────────────────────────────


def _get_latest_prediction(customer_id: str) -> Optional[Prediction]:
    """
    Return the most recent Prediction row for *customer_id*, or None.

    Tie-breaking: MAX(predicted_at) first; if equal, MAX(prediction_id).
    This matches the Phase 6 convention.
    """
    return (
        db.session.query(Prediction)
        .filter(Prediction.customer_id == customer_id)
        .order_by(
            Prediction.predicted_at.desc(),
            Prediction.prediction_id.desc(),
        )
        .first()
    )


def _get_complaint_stats(customer_id: str) -> Dict[str, int]:
    """
    Return complaint statistics for *customer_id* without modifying any record.

    Returns:
        {
          "total_count":    total number of Complaint rows,
          "unresolved_count": count where status != 'Resolved' (case-insensitive)
        }
    """
    complaints = (
        db.session.query(Complaint)
        .filter(Complaint.customer_id == customer_id)
        .all()
    )
    total = len(complaints)
    unresolved = sum(
        1 for c in complaints if c.status.strip().lower() != "resolved"
    )
    return {"total_count": total, "unresolved_count": unresolved}


def _build_recommendations(risk_level: str, complaint_stats: Dict[str, int]) -> List[Dict[str, str]]:
    """
    Build the recommendation list from risk-level rules and complaint rules.

    Rules applied in order:
    1. Risk-level rules (always included when a valid risk_level exists).
    2. Unresolved-complaint rule (if unresolved_count > 0).
    3. Recurring-complaint rule (if total_count >= threshold).

    Returns a list of dicts: [{type, priority, message}, ...]
    """
    recommendations: List[Dict[str, str]] = []

    # 1. Risk-level rules
    for rec_type, priority, message in _RISK_RULES.get(risk_level, []):
        recommendations.append({"type": rec_type, "priority": priority, "message": message})

    # 2. Unresolved complaint rule
    if complaint_stats["unresolved_count"] > 0:
        rec_type, priority, message = _UNRESOLVED_COMPLAINT_RULE
        recommendations.append({"type": rec_type, "priority": priority, "message": message})

    # 3. Recurring / multiple complaint rule
    if complaint_stats["total_count"] >= _MULTIPLE_COMPLAINTS_THRESHOLD:
        rec_type, priority, message = _RECURRING_COMPLAINT_RULE
        recommendations.append({"type": rec_type, "priority": priority, "message": message})

    return recommendations


# ──────────────────────────────────────────────────────────────────────────────
# Public service function
# ──────────────────────────────────────────────────────────────────────────────


class CustomerNotFoundError(Exception):
    """Raised when the requested customer_id does not exist in the database."""


class NoPredictionError(Exception):
    """Raised when the customer exists but has no Prediction record yet."""


def get_customer_recommendations(customer_id: str) -> Dict[str, Any]:
    """
    Generate rule-based retention recommendations for a single customer.

    Parameters
    ----------
    customer_id : str
        The primary key of the customer to look up.

    Returns
    -------
    dict
        {
          "customer_id":       str,
          "name":              str | None,
          "risk_level":        str,
          "churn_probability": float,
          "churn_percentage":  float,
          "recommendations":   list[dict]
        }

    Raises
    ------
    CustomerNotFoundError
        If no Customer row exists for *customer_id*.
    NoPredictionError
        If the customer exists but has no Prediction record.
    """
    # 1. Verify customer exists
    customer = db.session.get(Customer, customer_id)
    if customer is None:
        raise CustomerNotFoundError(customer_id)

    # 2. Fetch latest prediction
    prediction = _get_latest_prediction(customer_id)
    if prediction is None:
        raise NoPredictionError(customer_id)

    # 3. Fetch complaint statistics (read-only; no records modified)
    complaint_stats = _get_complaint_stats(customer_id)

    # 4. Build recommendations
    recommendations = _build_recommendations(prediction.risk_level, complaint_stats)

    return {
        "customer_id": customer.customer_id,
        "name": customer.name,
        "risk_level": prediction.risk_level,
        "churn_probability": prediction.churn_probability,
        "churn_percentage": round(prediction.churn_probability * 100, 2),
        "recommendations": recommendations,
    }
