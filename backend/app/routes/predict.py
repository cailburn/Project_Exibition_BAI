from flask import Blueprint, request
from app.services.ml_service import predict_churn
from app.services.prediction_service import (
    get_customer,
    merge_customer_with_features,
    save_prediction_record,
)
from app.utils.response import api_response
from app.utils.validation import validate_prediction_payload

predict_bp = Blueprint("predict", __name__)


@predict_bp.route("/predict", methods=["POST"])
def predict():
    """
    POST /api/predict
    
    Generates real ML churn prediction using the trained Random Forest pipeline.
    Validates the 6 required features:
      - tenure_months
      - complaints
      - support_calls
      - login_frequency
      - monthly_expenditure
      - plan_type

    When customer_id is provided and the customer exists in the database:
      - Maps database fields (customer_expenditure → monthly_expenditure, tenure → tenure_months)
      - Persists the prediction outcome to the Prediction table
    """
    if not request.is_json:
        return api_response(
            data=None,
            message="Request body must be valid JSON",
            success=False,
            is_mock=False,
            status_code=400,
        )

    payload = request.get_json(silent=True)
    if payload is None or not isinstance(payload, dict):
        return api_response(
            data=None,
            message="Request body must be a valid JSON object",
            success=False,
            is_mock=False,
            status_code=400,
        )

    customer = None
    customer_id = payload.get("customer_id")

    # If customer_id is supplied, customer must exist in the database
    if customer_id is not None:
        if not isinstance(customer_id, str) or not customer_id.strip():
            return api_response(
                data=None,
                message="Field 'customer_id' must be a non-empty string",
                success=False,
                is_mock=False,
                status_code=400,
            )
        customer = get_customer(customer_id.strip())
        if customer is None:
            return api_response(
                data=None,
                message=f"Customer with ID '{customer_id}' not found",
                success=False,
                is_mock=False,
                status_code=404,
            )

    # Prepare features for ML model
    if customer is not None:
        features = merge_customer_with_features(customer, payload)
    else:
        features = dict(payload)
        # Apply field mapping if database-named fields were supplied in standalone request
        if "customer_expenditure" in features and "monthly_expenditure" not in features:
            features["monthly_expenditure"] = features.pop("customer_expenditure")
        if "tenure" in features and "tenure_months" not in features:
            features["tenure_months"] = features.pop("tenure")

    # Validate all required ML features
    is_valid, error_message = validate_prediction_payload(features)
    if not is_valid:
        return api_response(
            data=None,
            message=error_message,
            success=False,
            is_mock=False,
            status_code=400,
        )

    # Call ML service for inference (no manual preprocessing, exact features preserved)
    try:
        prediction_result = predict_churn(features)
    except Exception as exc:
        return api_response(
            data=None,
            message=f"Prediction error: {str(exc)}",
            success=False,
            is_mock=False,
            status_code=500,
        )

    response_data = dict(prediction_result)

    # Save to database only when customer_id is provided and customer exists
    if customer is not None:
        saved_record = save_prediction_record(
            customer_id=customer.customer_id,
            churn_probability=prediction_result["churn_probability"],
            risk_level=prediction_result["risk_level"],
        )
        response_data["prediction_id"] = saved_record.prediction_id
        response_data["customer_id"] = customer.customer_id

    return api_response(
        data=response_data,
        message="Churn prediction generated successfully",
        success=True,
        is_mock=False,
        status_code=200,
    )
