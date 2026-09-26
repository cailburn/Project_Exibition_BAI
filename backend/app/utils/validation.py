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
