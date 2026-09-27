import math
from typing import Any, Dict, Optional, Tuple

# The six required features for the trained Random Forest pipeline
NUMERIC_FEATURES = [
    "tenure_months",
    "complaints",
    "support_calls",
    "login_frequency",
    "monthly_expenditure",
]

REQUIRED_FEATURES = [
    "tenure_months",
    "complaints",
    "support_calls",
    "login_frequency",
    "monthly_expenditure",
    "plan_type",
]


def validate_prediction_payload(data: Any) -> Tuple[bool, Optional[str]]:
    """
    Validate prediction input data against the required schema.

    Rules:
    - Must be a dictionary.
    - All six required fields must exist.
    - Numeric fields must contain valid, finite numeric values (rejecting booleans).
    - plan_type must be a non-empty string.
    - No silent conversion of incompatible types.

    Returns:
        (True, None) if validation succeeds.
        (False, error_message) if validation fails.
    """
    if not isinstance(data, dict):
        return False, "Request payload must be a JSON object"

    # Check for presence of all required fields
    for field in REQUIRED_FEATURES:
        if field not in data:
            return False, f"Missing required field: {field}"
        if data[field] is None:
            return False, f"Field '{field}' cannot be null"

    # Validate numeric fields
    for field in NUMERIC_FEATURES:
        val = data[field]
        # In Python, bool is a subclass of int (isinstance(True, int) == True).
        # We explicitly reject booleans for numeric fields.
        if isinstance(val, bool) or not isinstance(val, (int, float)):
            return False, f"Field '{field}' must be a valid numeric value"
        if not math.isfinite(val):
            return False, f"Field '{field}' must be a finite number"

    # Validate plan_type
    plan_type = data["plan_type"]
    if not isinstance(plan_type, str) or not plan_type.strip():
        return False, "Field 'plan_type' must be a non-empty string"

    return True, None


CUSTOMER_NUMERIC_FIELDS = [
    "customer_expenditure",
    "login_frequency",
    "support_calls",
    "complaints",
    "tenure",
]


def validate_create_customer_payload(data: Any) -> Tuple[bool, Optional[str]]:
    """
    Validate input payload for creating a customer.

    Canonical database model fields:
      - customer_id: required, non-empty string, max 64 chars
      - name: optional string, max 100 chars
      - customer_expenditure: optional numeric >= 0
      - login_frequency: optional numeric >= 0
      - support_calls: optional numeric >= 0
      - complaints: optional numeric >= 0
      - tenure: optional numeric >= 0
    """
    if not isinstance(data, dict):
        return False, "Request payload must be a JSON object"

    # customer_id is required
    if "customer_id" not in data:
        return False, "Missing required field: customer_id"

    customer_id = data["customer_id"]
    if not isinstance(customer_id, str) or not customer_id.strip():
        return False, "Field 'customer_id' must be a non-empty string"

    if len(customer_id.strip()) > 64:
        return False, "Field 'customer_id' must not exceed 64 characters"

    # name is optional
    if "name" in data and data["name"] is not None:
        name = data["name"]
        if not isinstance(name, str):
            return False, "Field 'name' must be a string"
        if len(name) > 100:
            return False, "Field 'name' must not exceed 100 characters"

    # Validate numeric fields if present
    for field in CUSTOMER_NUMERIC_FIELDS:
        if field in data and data[field] is not None:
            val = data[field]
            if isinstance(val, bool) or not isinstance(val, (int, float)):
                return False, f"Field '{field}' must be a valid numeric value"
            if not math.isfinite(val):
                return False, f"Field '{field}' must be a finite number"
            if val < 0:
                return False, f"Field '{field}' cannot be negative"

    return True, None


COMPLAINT_REQUIRED_FIELDS = [
    "complaint_id",
    "customer_id",
    "complaint_type",
    "description",
]


def validate_create_complaint_payload(data: Any) -> Tuple[bool, Optional[str]]:
    """
    Validate input payload for creating a complaint.

    Required fields:
      - complaint_id: non-empty string, max 64 chars
      - customer_id: non-empty string, max 64 chars
      - complaint_type: non-empty string, max 100 chars
      - description: non-empty string

    Optional fields:
      - status: if present, non-empty string, max 50 chars
    """
    if not isinstance(data, dict):
        return False, "Request payload must be a JSON object"

    for field in COMPLAINT_REQUIRED_FIELDS:
        if field not in data:
            return False, f"Missing required field: {field}"
        val = data[field]
        if not isinstance(val, str) or not val.strip():
            return False, f"Field '{field}' must be a non-empty string"

    if len(data["complaint_id"].strip()) > 64:
        return False, "Field 'complaint_id' must not exceed 64 characters"

    if len(data["customer_id"].strip()) > 64:
        return False, "Field 'customer_id' must not exceed 64 characters"

    if len(data["complaint_type"].strip()) > 100:
        return False, "Field 'complaint_type' must not exceed 100 characters"

    if "status" in data and data["status"] is not None:
        status = data["status"]
        if not isinstance(status, str) or not status.strip():
            return False, "Field 'status' must be a non-empty string"
        if len(status.strip()) > 50:
            return False, "Field 'status' must not exceed 50 characters"

    return True, None


def validate_update_complaint_status_payload(data: Any) -> Tuple[bool, Optional[str]]:
    """
    Validate input payload for updating complaint status.

    Required:
      - status: non-empty string, max 50 chars
    """
    if not isinstance(data, dict):
        return False, "Request payload must be a JSON object"

    if "status" not in data:
        return False, "Missing required field: status"

    status = data["status"]
    if not isinstance(status, str) or not status.strip():
        return False, "Field 'status' must be a non-empty string"

    if len(status.strip()) > 50:
        return False, "Field 'status' must not exceed 50 characters"

    return True, None


