from flask import Blueprint

from app.services.churn_service import get_priority_queue, get_top_churn_customers
from app.utils.response import api_response

churn_bp = Blueprint("churn", __name__)


@churn_bp.route("/top-churn", methods=["GET"])
def top_churn():
    """
    GET /api/top-churn

    Return customers who have stored churn predictions, ordered by
    churn_probability DESC (tie-broken by customer_id ASC).

    Customers without any Prediction record are excluded.
    No ML inference is performed; existing Prediction rows are read-only.

    Response:
    {
        "success": true,
        "data": {
            "customers": [...],
            "total": <int>
        },
        "message": "Top churn customers retrieved successfully",
        "is_mock": false
    }
    """
    customers = get_top_churn_customers()
    data = {
        "customers": customers,
        "total": len(customers),
    }
    return api_response(
        data=data,
        message="Top churn customers retrieved successfully",
        success=True,
        is_mock=False,
        status_code=200,
    )


@churn_bp.route("/priority-queue", methods=["GET"])
def priority_queue():
    """
    GET /api/priority-queue

    Return a prioritised list of customers requiring attention.

    Priority ordering (rule-based, no arbitrary score formula):
      1. Risk level:  High > Medium > Low
      2. Higher churn_probability within the same risk level
      3. Higher complaint_count within the same risk level and probability
      4. customer_id ASC as the final deterministic tie-breaker

    Customers without any Prediction record are excluded.
    No ML inference is performed; no records are created or modified.

    Response:
    {
        "success": true,
        "data": {
            "customers": [...],
            "total": <int>
        },
        "message": "Customer priority queue retrieved successfully",
        "is_mock": false
    }
    """
    customers = get_priority_queue()
    data = {
        "customers": customers,
        "total": len(customers),
    }
    return api_response(
        data=data,
        message="Customer priority queue retrieved successfully",
        success=True,
        is_mock=False,
        status_code=200,
    )
