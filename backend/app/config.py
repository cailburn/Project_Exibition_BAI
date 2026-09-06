import os
from pathlib import Path
from dotenv import load_dotenv

# Base backend directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env if present
env_file = BASE_DIR / ".env"
if env_file.exists():
    load_dotenv(dotenv_path=env_file)


class Config:
    """Base configuration loaded from environment variables."""
    SECRET_KEY = os.getenv("SECRET_KEY", "dev_fallback_secret_key_change_in_prod")
    DEBUG = False
    TESTING = False

    # CORS origins
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")
        if origin.strip()
    ]

    # Database configuration
    # Supported: "mysql" (default) or explicitly "sqlite" for testing/dev
    DATABASE_TYPE = os.getenv("DATABASE_TYPE", "mysql").lower()
    
    # Specific credentials for MySQL
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
    MYSQL_DB = os.getenv("MYSQL_DB", "customchurn_db")

    # SQLALCHEMY_DATABASE_URI will be configured in Phase 2
    # Rules: No silent fallback. Explicit config only.
    if DATABASE_TYPE == "sqlite":
        SQLALCHEMY_DATABASE_URI = os.getenv(
            "DATABASE_URL", f"sqlite:///{BASE_DIR / 'customchurn_local.db'}"
        )
    else:
        # Default to MySQL
        SQLALCHEMY_DATABASE_URI = os.getenv(
            "DATABASE_URL",
            f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
        )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ML Model Path
    ML_MODEL_PATH = os.getenv("ML_MODEL_PATH", str(BASE_DIR / "app" / "ml_models" / "churn_model.joblib"))


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True
    DEBUG = True
    DATABASE_TYPE = "sqlite"
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


class ProductionConfig(Config):
    DEBUG = False


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
