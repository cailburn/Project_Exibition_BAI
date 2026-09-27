from flask import Blueprint

from app.services.recommendation_service import (
    CustomerNotFoundError,
    NoPredictionError,
    get_customer_recommendations,
)
from app.utils.response import api_response

recommendations_bp = Blueprint("recommendations", __name__)


@recommendations_bp.route("/recommendation/<customer_id>", methods=["GET"])
def get_recommendation(customer_id):
    """
    GET /api/recommendation/<customer_id>

    Return rule-based retention recommendations for a single customer.

    The recommendations are derived from:
      - The customer's latest churn Prediction (risk_level, churn_probability)
      - The customer's existing Complaint records (count, unresolved status)

    No ML inference is performed.  No records are created or modified.

    Responses
    ---------
    200  Recommendations generated successfully (customer + prediction found)
    404  Customer not found
    404  Customer has no prediction yet (cannot generate risk-based recommendations)
    """
    if not customer_id or not customer_id.strip():
        return api_response(
            data=None,
            message="Field 'customer_id' must be a non-empty string",
            success=False,
            is_mock=False,
            status_code=400,
        )

    try:
        result = get_customer_recommendations(customer_id.strip())
    except CustomerNotFoundError:
        return api_response(
            data=None,
            message=f"Customer with ID '{customer_id}' not found",
            success=False,
            is_mock=False,
            status_code=404,
        )
    except NoPredictionError:
        return api_response(
            data=None,
            message=(
                f"No churn prediction found for customer '{customer_id}'. "
                "Run a prediction first to generate recommendations."
            ),
            success=False,
            is_mock=False,
            status_code=404,
        )

    return api_response(
        data=result,
        message="Recommendations generated successfully",
        success=True,
        is_mock=False,
        status_code=200,
    )
