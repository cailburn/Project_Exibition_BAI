from flask import Blueprint

from app.services.dashboard_service import get_dashboard_statistics
from app.utils.response import api_response


dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.get("/dashboard")
def get_dashboard():
    """Return dashboard summary statistics."""

    data = get_dashboard_statistics()

    return api_response(
        success=True,
        data=data,
        message="Dashboard statistics retrieved successfully",
        is_mock=False,
    )
