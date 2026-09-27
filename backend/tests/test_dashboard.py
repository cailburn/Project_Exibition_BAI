from datetime import datetime, timedelta

from app.extensions import db
from app.models import Customer, Complaint, Prediction

def create_customer(db, customer_id):
    customer = Customer(
        customer_id=customer_id,
        name=f"Customer {customer_id}",
        customer_expenditure=2500.0,
        login_frequency=15,
        support_calls=2,
        complaints=1,
        tenure=12,
    )
    db.session.add(customer)
    return customer

def create_prediction(db, customer_id, probability, risk, predicted_at=None):
    prediction = Prediction(
        customer_id=customer_id,
        churn_probability=probability,
        risk_level=risk,
        predicted_at=predicted_at or datetime.utcnow(),
    )
    db.session.add(prediction)
    return prediction

def create_complaint(db, customer_id, status):
    complaint = Complaint(
        customer_id=customer_id,
        complaint_type="General",
        description="Test complaint",
        status=status,
    )
    db.session.add(complaint)
    return complaint

def test_dashboard_empty_database(client):
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert data["is_mock"] is False
    dashboard = data["data"]

    assert dashboard["total_customers"] == 0
    assert dashboard["total_complaints"] == 0
    assert dashboard["total_predictions"] == 0
    assert dashboard["customers_with_predictions"] == 0
    assert dashboard["customers_without_predictions"] == 0
    assert dashboard["complaint_status"] == {}
    assert dashboard["risk_distribution"] == {}
    assert dashboard["average_churn_probability"] == 0
    assert dashboard["resolved_complaints"] == 0
    assert dashboard["unresolved_complaints"] == 0

def test_dashboard_customer_and_complaint_counts(app, client):
    with app.app_context():
        create_customer(db, "CUST-01")
        create_customer(db, "CUST-02")
        create_complaint(db, "CUST-01", "Open")
        create_complaint(db, "CUST-01", "Resolved")
        create_complaint(db, "CUST-02", "Pending")
        db.session.commit()
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    dashboard = response.get_json()["data"]
    assert dashboard["total_customers"] == 2
    assert dashboard["total_complaints"] == 3

def test_dashboard_complaint_status_breakdown(app, client):
    with app.app_context():
        create_customer(db, "CUST-01")
        create_complaint(db, "CUST-01", "Open")
        create_complaint(db, "CUST-01", "Open")
        create_complaint(db, "CUST-01", "Resolved")
        db.session.commit()
    response = client.get("/api/dashboard")
    dashboard = response.get_json()["data"]
    assert dashboard["complaint_status"]["Open"] == 2
    assert dashboard["complaint_status"]["Resolved"] == 1
    assert dashboard["resolved_complaints"] == 1
    assert dashboard["unresolved_complaints"] == 2

def test_dashboard_prediction_and_risk_statistics(app, client):
    with app.app_context():
        create_customer(db, "CUST-01")
        create_customer(db, "CUST-02")
        create_customer(db, "CUST-03")
        create_prediction(db, "CUST-01", 0.80, "High")
        create_prediction(db, "CUST-02", 0.50, "Medium")
        create_prediction(db, "CUST-03", 0.20, "Low")
        db.session.commit()

    response = client.get("/api/dashboard")
    dashboard = response.get_json()["data"]

    assert dashboard["total_predictions"] == 3
    assert dashboard["customers_with_predictions"] == 3
    assert dashboard["customers_without_predictions"] == 0

    assert dashboard["risk_distribution"]["High"] == 1
    assert dashboard["risk_distribution"]["Medium"] == 1
    assert dashboard["risk_distribution"]["Low"] == 1

    assert dashboard["high_risk_customers"] == 1
    assert dashboard["medium_risk_customers"] == 1
    assert dashboard["low_risk_customers"] == 1

    assert dashboard["average_churn_probability"] == 0.50

def test_dashboard_latest_prediction_only(app, client):
    with app.app_context():
        create_customer(db, "CUST-01")
        create_customer(db, "CUST-02")

        now = datetime.utcnow()

        # Older prediction for CUST-01
        create_prediction(
            db,
            "CUST-01",
            0.90,
            "High",
            predicted_at=now - timedelta(days=1),
        )

        # Latest prediction for CUST-01
        create_prediction(
            db,
            "CUST-01",
            0.20,
            "Low",
            predicted_at=now,
        )

        # One prediction for CUST-02
        create_prediction(
            db,
            "CUST-02",
            0.60,
            "Medium",
            predicted_at=now,
        )

        db.session.commit()
    response = client.get("/api/dashboard")
    dashboard = response.get_json()["data"]
    assert dashboard["total_predictions"] == 3
    assert dashboard["customers_with_predictions"] == 2
    assert dashboard["customers_without_predictions"] == 0

    # CUST-01 must use its latest Low prediction,
    # not the older High prediction.
    assert dashboard["risk_distribution"]["Low"] == 1
    assert dashboard["risk_distribution"]["Medium"] == 1
    assert dashboard["risk_distribution"].get("High", 0) == 0

    # (0.20 + 0.60) / 2 = 0.40
    assert dashboard["average_churn_probability"] == 0.40

def test_dashboard_customers_without_predictions(app, client):
    with app.app_context():
        create_customer(db, "CUST-01")
        create_customer(db, "CUST-02")
        create_customer(db, "CUST-03")
        create_prediction(db, "CUST-01", 0.30, "Low")
        db.session.commit()

    response = client.get("/api/dashboard")
    dashboard = response.get_json()["data"]

    assert dashboard["total_customers"] == 3
    assert dashboard["customers_with_predictions"] == 1
    assert dashboard["customers_without_predictions"] == 2

def test_dashboard_resolved_status_is_case_insensitive(app, client):
    with app.app_context():
        create_customer(db, "CUST-01")
        create_complaint(db, "CUST-01", "Resolved")
        create_complaint(db, "CUST-01", " resolved ")
        create_complaint(db, "CUST-01", "Open")
        
        db.session.commit()

    response = client.get("/api/dashboard")
    dashboard = response.get_json()["data"]
    assert dashboard["resolved_complaints"] == 2
    assert dashboard["unresolved_complaints"] == 1
