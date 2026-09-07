from app.extensions import db
from app.models.customer import Customer
from app.models.complaint import Complaint
from app.models.prediction import Prediction


def init_db(app=None):
    """
    Create database tables based on defined SQLAlchemy models.
    
    If app is provided, runs within the app context.
    Strictly follows configured DATABASE_TYPE (no silent fallback).
    """
    if app is not None:
        with app.app_context():
            db.create_all()
    else:
        db.create_all()


__all__ = ["Customer", "Complaint", "Prediction", "init_db"]
