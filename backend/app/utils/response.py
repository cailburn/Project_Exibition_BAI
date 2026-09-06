from flask import jsonify


def api_response(data=None, message="Success", success=True, is_mock=False, status_code=200):
    """
    Standardized API response envelope for all CustomChurn backend endpoints.
    
    Response schema:
    {
        "success": bool,
        "data": dict | list | None,
        "message": str,
        "is_mock": bool
    }
    """
    payload = {
        "success": success,
        "data": data if data is not None else {},
        "message": message,
        "is_mock": is_mock,
    }
    return jsonify(payload), status_code
