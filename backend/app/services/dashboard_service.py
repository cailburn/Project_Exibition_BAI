from sqlalchemy import func

from app.extensions import db
from app.models.customer import Customer
from app.models.complaint import Complaint
from app.models.prediction import Prediction


def get_dashboard_statistics():
    """Return summary statistics for the dashboard."""

    # Basic customer and complaint counts
    total_customers = db.session.query(func.count(Customer.customer_id)).scalar() or 0
    total_complaints = db.session.query(func.count(Complaint.complaint_id)).scalar() or 0

    # Complaint status breakdown
    complaint_rows = (
        db.session.query(
            Complaint.status,
            func.count(Complaint.complaint_id)
        )
        .group_by(Complaint.status)
        .all()
    )

    complaint_status = {
        status: count
        for status, count in complaint_rows
    }

    # Resolved / unresolved complaints
    resolved_complaints = 0
    unresolved_complaints = 0

    for status, count in complaint_rows:
        if status and status.strip().lower() == "resolved":
            resolved_complaints += count
        else:
            unresolved_complaints += count

    # Total prediction records
    total_predictions = (
        db.session.query(func.count(Prediction.prediction_id)).scalar() or 0
    )

    # Latest prediction for each customer
    latest_predictions = (
        db.session.query(Prediction)
        .filter(
            Prediction.prediction_id.in_(
                db.session.query(
                    func.max(Prediction.prediction_id)
                )
                .group_by(Prediction.customer_id)
            )
        )
        .all()
    )

    # The query above uses prediction_id as the final tie-breaker.
    # Latest prediction for each customer
    latest_by_customer = {}

    all_predictions = (
        db.session.query(Prediction)
        .order_by(
            Prediction.customer_id,
            Prediction.predicted_at.desc(),
            Prediction.prediction_id.desc()
        )
        .all()
    )

    for prediction in all_predictions:
        if prediction.customer_id not in latest_by_customer:
            latest_by_customer[prediction.customer_id] = prediction

    latest_predictions = list(latest_by_customer.values())

    customers_with_predictions = len(latest_predictions)
    customers_without_predictions = (
        total_customers - customers_with_predictions
    )

    # Risk distribution
    risk_distribution = {}

    for prediction in latest_predictions:
        risk_level = prediction.risk_level

        if risk_level:
            risk_distribution[risk_level] = (
                risk_distribution.get(risk_level, 0) + 1
            )

    high_risk_customers = risk_distribution.get("High", 0)
    medium_risk_customers = risk_distribution.get("Medium", 0)
    low_risk_customers = risk_distribution.get("Low", 0)

    # Average churn probability using latest prediction per customer
    if latest_predictions:
        average_churn_probability = round(
            sum(
                prediction.churn_probability
                for prediction in latest_predictions
                if prediction.churn_probability is not None
            )
            / len(
                [
                    prediction
                    for prediction in latest_predictions
                    if prediction.churn_probability is not None
                ]
            ),
            2
        )
    else:
        average_churn_probability = 0

    return {
        "total_customers": total_customers,
        "total_complaints": total_complaints,
        "complaint_status": complaint_status,
        "risk_distribution": risk_distribution,
        "total_predictions": total_predictions,
        "customers_with_predictions": customers_with_predictions,
        "customers_without_predictions": customers_without_predictions,
        "high_risk_customers": high_risk_customers,
        "medium_risk_customers": medium_risk_customers,
        "low_risk_customers": low_risk_customers,
        "average_churn_probability": average_churn_probability,
        "unresolved_complaints": unresolved_complaints,
        "resolved_complaints": resolved_complaints,
    }
