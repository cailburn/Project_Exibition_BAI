from flask import Blueprint
from app.routes.health import health_bp


def register_routes(app):
    """Register all API blueprints with their respective url prefixes."""
    # Prefix all endpoints with /api
    app.register_blueprint(health_bp, url_prefix="/api")
