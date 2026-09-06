import os
from flask import Blueprint, current_app
from app.utils.response import api_response

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health_check():
    """
    Health check endpoint reporting the actual backend and component state.
    
    Accurately indicates whether the real ML model is loaded or if the system
    is running in mock mode.
    """
    ml_model_path = current_app.config.get("ML_MODEL_PATH", "")
    ml_model_exists = bool(ml_model_path and os.path.isfile(ml_model_path))

    health_data = {
        "status": "ok",
        "service": "CustomChurn Backend",
        "version": "1.0.0",
        "environment": current_app.config.get("ENV", "development"),
        "ml_model_loaded": ml_model_exists,
        "ml_mode": "real" if ml_model_exists else "mock",
    }

    message = (
        "CustomChurn backend is healthy (real ML model active)"
        if ml_model_exists
        else "CustomChurn backend is healthy (real ML model not found; running in mock mode)"
    )

    # is_mock is True because the real ML model is not present
    return api_response(
        data=health_data,
        message=message,
        success=True,
        is_mock=not ml_model_exists,
        status_code=200,
    )
