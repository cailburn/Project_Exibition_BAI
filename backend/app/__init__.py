import os
from flask import Flask
from app.config import config_by_name
from app.extensions import cors, db
from app.models import Customer, Complaint, Prediction  # noqa: F401
from app.routes import register_routes
from app.utils.response import api_response


def create_app(config_name=None):
    """
    Application factory pattern for CustomChurn Flask Backend.
    """
    if config_name is None:
        config_name = os.getenv("FLASK_ENV", "development").lower()

    app = Flask(__name__)
    config_class = config_by_name.get(config_name, config_by_name["development"])
    app.config.from_object(config_class)

    # Initialize CORS
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}},
        supports_credentials=True,
    )

    # Initialize SQLAlchemy database extension
    db.init_app(app)

    # CLI command for table creation
    @app.cli.command("init-db")
    def init_db_command():
        """Create database tables."""
        db.create_all()
        print(f"Database tables created successfully using {app.config.get('DATABASE_TYPE')} engine.")

    # Register API Blueprints
    register_routes(app)

    # Global Error Handlers returning standardized envelope
    @app.errorhandler(404)
    def not_found(error):
        return api_response(
            data=None,
            message="Endpoint not found",
            success=False,
            is_mock=False,
            status_code=404,
        )

    @app.errorhandler(500)
    def internal_error(error):
        return api_response(
            data=None,
            message="Internal server error",
            success=False,
            is_mock=False,
            status_code=500,
        )

    return app
