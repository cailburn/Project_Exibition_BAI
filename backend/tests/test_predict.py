import json
from app.extensions import db
from app.models import Customer, Prediction
from app.services.ml_service import REQUIRED_FEATURES, load_model, predict_churn


def test_predict_valid_request(client):
    """Test POST /api/predict with valid features returns standard envelope with is_mock=False."""
    payload = {
        "tenure_months": 24,
        "complaints": 2,
        "support_calls": 3,
        "login_frequency": 15,
        "monthly_expenditure": 2499.0,
        "plan_type": "Premium",
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert data["is_mock"] is False
    assert data["message"] == "Churn prediction generated successfully"

    pred_data = data["data"]
    assert "predicted_churn" in pred_data
    assert pred_data["predicted_churn"] in (0, 1)
    assert 0.0 <= pred_data["churn_probability"] <= 1.0
    assert 0.0 <= pred_data["churn_percentage"] <= 100.0
    assert pred_data["risk_level"] in ("Low", "Medium", "High")
    assert "prediction_id" not in pred_data  # No customer_id supplied, not persisted


def test_predict_missing_required_field(client):
    """Test POST /api/predict rejects missing required field with 400."""
    payload = {
        "tenure_months": 24,
        "complaints": 2,
        "support_calls": 3,
        "login_frequency": 15,
        "monthly_expenditure": 2499.0,
        # plan_type is missing
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 400

    data = response.get_json()
    assert data["success"] is False
    assert data["is_mock"] is False
    assert "Missing required field: plan_type" in data["message"]


def test_predict_invalid_numeric_input(client):
    """Test POST /api/predict rejects non-numeric field value with 400."""
    payload = {
        "tenure_months": "twelve",
        "complaints": 2,
        "support_calls": 3,
        "login_frequency": 15,
        "monthly_expenditure": 2499.0,
        "plan_type": "Premium",
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 400

    data = response.get_json()
    assert data["success"] is False
    assert data["is_mock"] is False
    assert "numeric value" in data["message"].lower()


def test_predict_boolean_numeric_rejected(client):
    """Test POST /api/predict rejects boolean passed for a numeric field with 400."""
    payload = {
        "tenure_months": 24,
        "complaints": True,  # booleans should not masquerade as numeric 1
        "support_calls": 3,
        "login_frequency": 15,
        "monthly_expenditure": 2499.0,
        "plan_type": "Premium",
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 400

    data = response.get_json()
    assert data["success"] is False
    assert data["is_mock"] is False
    assert "numeric value" in data["message"].lower()


def test_predict_invalid_plan_type(client):
    """Test POST /api/predict rejects non-string or empty plan_type with 400."""
    payload = {
        "tenure_months": 24,
        "complaints": 2,
        "support_calls": 3,
        "login_frequency": 15,
        "monthly_expenditure": 2499.0,
        "plan_type": "   ",
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 400

    data = response.get_json()
    assert data["success"] is False
    assert data["is_mock"] is False
    assert "plan_type" in data["message"].lower()


def test_predict_malformed_json_body(client):
    """Test POST /api/predict rejects non-JSON body with 400."""
    response = client.post(
        "/api/predict",
        data="This is not JSON",
        content_type="text/plain",
    )
    assert response.status_code == 400

    data = response.get_json()
    assert data["success"] is False
    assert data["is_mock"] is False
    assert "JSON" in data["message"]


def test_predict_database_persistence_with_valid_customer(client, app):
    """Test POST /api/predict persists Prediction when valid customer_id exists in database."""
    with app.app_context():
        customer = Customer(
            customer_id="CUST-PRED-101",
            name="Sneha Rao",
            customer_expenditure=1800.0,
            login_frequency=10,
            support_calls=2,
            complaints=1,
            tenure=12,
        )
        db.session.add(customer)
        db.session.commit()

    payload = {
        "customer_id": "CUST-PRED-101",
        "tenure_months": 12,
        "complaints": 1,
        "support_calls": 2,
        "login_frequency": 10,
        "monthly_expenditure": 1800.0,
        "plan_type": "Standard",
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert data["is_mock"] is False
    pred_data = data["data"]
    assert pred_data["customer_id"] == "CUST-PRED-101"
    assert "prediction_id" in pred_data

    # Verify record in database
    with app.app_context():
        prediction_record = db.session.get(Prediction, pred_data["prediction_id"])
        assert prediction_record is not None
        assert prediction_record.customer_id == "CUST-PRED-101"
        assert prediction_record.churn_probability == pred_data["churn_probability"]
        assert prediction_record.risk_level == pred_data["risk_level"]


def test_predict_database_mapping_from_customer(client, app):
    """
    Test customer_expenditure → monthly_expenditure and tenure → tenure_months
    mapping when relying on existing Customer record.
    """
    with app.app_context():
        customer = Customer(
            customer_id="CUST-MAP-202",
            name="Vikram Singh",
            customer_expenditure=3200.0,
            login_frequency=22,
            support_calls=1,
            complaints=0,
            tenure=36,
        )
        db.session.add(customer)
        db.session.commit()

    # Pass customer_id and plan_type (Customer table does NOT have plan_type)
    payload = {
        "customer_id": "CUST-MAP-202",
        "plan_type": "Platinum",
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert data["is_mock"] is False
    assert data["data"]["customer_id"] == "CUST-MAP-202"

    with app.app_context():
        cust = db.session.get(Customer, "CUST-MAP-202")
        assert len(cust.predictions) == 1
        assert cust.predictions[0].risk_level in ("Low", "Medium", "High")


def test_predict_missing_plan_type_with_customer_id(client, app):
    """
    Test that plan_type is NEVER guessed or defaulted from database;
    if plan_type is omitted, request must fail with 400.
    """
    with app.app_context():
        customer = Customer(
            customer_id="CUST-NOPLAN-303",
            name="Deepak Joshi",
            customer_expenditure=1200.0,
            login_frequency=5,
            support_calls=4,
            complaints=2,
            tenure=6,
        )
        db.session.add(customer)
        db.session.commit()

    # Supply customer_id but omit plan_type
    payload = {
        "customer_id": "CUST-NOPLAN-303",
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 400

    data = response.get_json()
    assert data["success"] is False
    assert "Missing required field: plan_type" in data["message"]


def test_predict_nonexistent_customer_returns_404(client):
    """Test POST /api/predict with unknown customer_id returns 404."""
    payload = {
        "customer_id": "UNKNOWN-99999",
        "tenure_months": 12,
        "complaints": 1,
        "support_calls": 2,
        "login_frequency": 10,
        "monthly_expenditure": 1800.0,
        "plan_type": "Standard",
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 404

    data = response.get_json()
    assert data["success"] is False
    assert data["is_mock"] is False
    assert "not found" in data["message"].lower()


def test_predict_standalone_does_not_persist_to_db(client, app):
    """Test POST /api/predict without customer_id generates prediction without saving to DB."""
    payload = {
        "tenure_months": 10,
        "complaints": 0,
        "support_calls": 1,
        "login_frequency": 8,
        "monthly_expenditure": 999.0,
        "plan_type": "Basic",
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200

    with app.app_context():
        count = db.session.query(Prediction).count()
        assert count == 0


def test_ml_service_direct_contract():
    """Unit test ml_service functions directly to verify pipeline contract."""
    pipeline = load_model()
    assert pipeline is not None
    assert [name for name, _ in pipeline.steps] == ["preprocess", "model"]

    input_data = {
        "tenure_months": 15,
        "complaints": 1,
        "support_calls": 2,
        "login_frequency": 12,
        "monthly_expenditure": 1499.0,
        "plan_type": "Standard",
    }
    result = predict_churn(input_data)
    assert "predicted_churn" in result
    assert "churn_probability" in result
    assert "churn_percentage" in result
    assert "risk_level" in result
    assert result["risk_level"] in ("Low", "Medium", "High")
