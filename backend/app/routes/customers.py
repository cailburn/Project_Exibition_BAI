from flask import Blueprint, request
from app.services.customer_service import (
    create_customer,
    get_all_customers,
    get_customer_by_id,
)
from app.utils.response import api_response
from app.utils.validation import validate_create_customer_payload

customers_bp = Blueprint("customers", __name__)


@customers_bp.route("/customers", methods=["GET"])
def list_customers():
    """
    GET /api/customers
    
    Retrieve all customers.
    Returns:
    {
        "success": true,
        "data": {
            "customers": [...],
            "total": N
        },
        "message": "Customers retrieved successfully",
        "is_mock": false
    }
    """
    customers = get_all_customers()
    data = {
        "customers": [c.to_dict() for c in customers],
        "total": len(customers),
    }
    return api_response(
        data=data,
        message="Customers retrieved successfully",
        success=True,
        is_mock=False,
        status_code=200,
    )


@customers_bp.route("/customers/<customer_id>", methods=["GET"])
def get_customer(customer_id):
    """
    GET /api/customers/<customer_id>
    
    Retrieve a single customer profile by primary key customer_id.
    """
    if not customer_id or not customer_id.strip():
        return api_response(
            data=None,
            message="Field 'customer_id' must be a non-empty string",
            success=False,
            is_mock=False,
            status_code=400,
        )

    customer = get_customer_by_id(customer_id.strip())
    if customer is None:
        return api_response(
            data=None,
            message=f"Customer with ID '{customer_id}' not found",
            success=False,
            is_mock=False,
            status_code=404,
        )

    return api_response(
        data=customer.to_dict(),
        message="Customer retrieved successfully",
        success=True,
        is_mock=False,
        status_code=200,
    )


@customers_bp.route("/customers", methods=["POST"])
def add_customer():
    """
    POST /api/customers
    
    Create a new customer profile.
    Expected canonical database model fields:
      - customer_id: required, string
      - name: optional, string
      - customer_expenditure: optional, numeric >= 0
      - login_frequency: optional, numeric >= 0
      - support_calls: optional, numeric >= 0
      - complaints: optional, numeric >= 0
      - tenure: optional, numeric >= 0
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

    is_valid, error_msg = validate_create_customer_payload(payload)
    if not is_valid:
        return api_response(
            data=None,
            message=error_msg,
            success=False,
            is_mock=False,
            status_code=400,
        )

    customer_id = payload["customer_id"].strip()
    existing_customer = get_customer_by_id(customer_id)
    if existing_customer is not None:
        return api_response(
            data=None,
            message=f"Customer with ID '{customer_id}' already exists",
            success=False,
            is_mock=False,
            status_code=409,
        )

    try:
        new_customer = create_customer(payload)
    except Exception as exc:
        return api_response(
            data=None,
            message=f"Failed to create customer: {str(exc)}",
            success=False,
            is_mock=False,
            status_code=500,
        )

    return api_response(
        data=new_customer.to_dict(),
        message="Customer created successfully",
        success=True,
        is_mock=False,
        status_code=201,
    )
