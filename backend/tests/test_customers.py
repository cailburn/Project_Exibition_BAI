from datetime import datetime, timedelta

from app.extensions import db
from app.models import Customer, Complaint, Prediction


def test_get_customers_empty(client):
    """Test GET /api/customers returns empty list and total 0 when database has no customers."""
    response = client.get("/api/customers")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert data["is_mock"] is False
    assert data["message"] == "Customers retrieved successfully"
    assert data["data"]["customers"] == []
    assert data["data"]["total"] == 0


def test_create_customer_valid(client, app):
    """Test POST /api/customers successfully creates a customer and persists to database."""
    payload = {
        "customer_id": "CUST-API-001",
        "name": "Ananya Sharma",
        "customer_expenditure": 1450.50,
        "login_frequency": 18,
        "support_calls": 2,
        "complaints": 1,
        "tenure": 12,
    }
    response = client.post("/api/customers", json=payload)
    assert response.status_code == 201

    data = response.get_json()
    assert data["success"] is True
    assert data["is_mock"] is False
    assert data["message"] == "Customer created successfully"
    assert data["data"]["customer_id"] == "CUST-API-001"
    assert data["data"]["name"] == "Ananya Sharma"
    assert data["data"]["customer_expenditure"] == 1450.50
    assert data["data"]["login_frequency"] == 18
    assert data["data"]["support_calls"] == 2
    assert data["data"]["complaints"] == 1
    assert data["data"]["tenure"] == 12
    assert data["data"]["created_at"] is not None

    with app.app_context():
        customer = db.session.get(Customer, "CUST-API-001")
        assert customer is not None
        assert customer.name == "Ananya Sharma"
        assert customer.customer_expenditure == 1450.50


def test_create_customer_minimal_payload(client, app):
    """Test POST /api/customers with only required customer_id uses default values."""
    payload = {
        "customer_id": "CUST-MIN-002",
    }
    response = client.post("/api/customers", json=payload)
    assert response.status_code == 201

    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["customer_id"] == "CUST-MIN-002"
    assert data["data"]["name"] is None
    assert data["data"]["customer_expenditure"] == 0.0
    assert data["data"]["login_frequency"] == 0
    assert data["data"]["support_calls"] == 0
    assert data["data"]["complaints"] == 0
    assert data["data"]["tenure"] == 0


def test_create_customer_missing_customer_id(client):
    """Test POST /api/customers rejects payload without customer_id with 400."""
    payload = {
        "name": "No ID Customer",
        "customer_expenditure": 500.0,
    }
    response = client.post("/api/customers", json=payload)
    assert response.status_code == 400

    data = response.get_json()
    assert data["success"] is False
    assert "Missing required field: customer_id" in data["message"]


def test_create_customer_duplicate_id_conflict(client):
    """Test POST /api/customers returns 409 Conflict when customer_id already exists."""
    payload = {
        "customer_id": "CUST-DUP-003",
        "name": "Original User",
    }
    # First creation
    res1 = client.post("/api/customers", json=payload)
    assert res1.status_code == 201

    # Second creation with identical customer_id
    res2 = client.post("/api/customers", json=payload)
    assert res2.status_code == 409

    data = res2.get_json()
    assert data["success"] is False
    assert data["is_mock"] is False
    assert "already exists" in data["message"]


def test_create_customer_invalid_numeric_types(client):
    """Test POST /api/customers rejects non-numeric or boolean values for numeric metrics."""
    # Test string for numeric
    res1 = client.post(
        "/api/customers",
        json={"customer_id": "CUST-INV-001", "customer_expenditure": "a thousand"},
    )
    assert res1.status_code == 400
    assert "numeric value" in res1.get_json()["message"].lower()

    # Test boolean for numeric
    res2 = client.post(
        "/api/customers",
        json={"customer_id": "CUST-INV-002", "complaints": True},
    )
    assert res2.status_code == 400
    assert "numeric value" in res2.get_json()["message"].lower()


def test_create_customer_negative_values(client):
    """Test POST /api/customers rejects negative values for metrics with 400."""
    res = client.post(
        "/api/customers",
        json={"customer_id": "CUST-NEG-001", "tenure": -5},
    )
    assert res.status_code == 400
    assert "negative" in res.get_json()["message"].lower()


def test_create_customer_malformed_json(client):
    """Test POST /api/customers rejects malformed or non-JSON request body."""
    res = client.post(
        "/api/customers",
        data="Not a JSON string",
        content_type="text/plain",
    )
    assert res.status_code == 400
    assert "JSON" in res.get_json()["message"]


def test_get_customers_list(client):
    """Test GET /api/customers returns all stored customers with correct count."""
    client.post("/api/customers", json={"customer_id": "CUST-LIST-1", "name": "User 1"})
    client.post("/api/customers", json={"customer_id": "CUST-LIST-2", "name": "User 2"})

    response = client.get("/api/customers")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["total"] == 2
    assert len(data["data"]["customers"]) == 2
    ids = [c["customer_id"] for c in data["data"]["customers"]]
    assert "CUST-LIST-1" in ids
    assert "CUST-LIST-2" in ids


def test_get_customer_by_id_success(client):
    """Test GET /api/customers/<customer_id> returns matching customer details."""
    client.post(
        "/api/customers",
        json={
            "customer_id": "CUST-GET-01",
            "name": "Kavita Nair",
            "customer_expenditure": 2100.0,
            "tenure": 24,
        },
    )

    response = client.get("/api/customers/CUST-GET-01")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["customer_id"] == "CUST-GET-01"
    assert data["data"]["name"] == "Kavita Nair"
    assert data["data"]["customer_expenditure"] == 2100.0
    assert data["data"]["tenure"] == 24


def test_get_customer_by_id_not_found(client):
    """Test GET /api/customers/<customer_id> returns 404 when ID does not exist."""
    response = client.get("/api/customers/NON-EXISTENT-ID")
    assert response.status_code == 404

    data = response.get_json()
    assert data["success"] is False
    assert data["is_mock"] is False
    assert "not found" in data["message"].lower()


def test_customer_creation_integrates_with_prediction(client, app):
    """
    Test Phase 4 customer creation integrates seamlessly with Phase 3 ML prediction:
    1. Create customer via POST /api/customers
    2. Predict churn via POST /api/predict using the customer_id
    3. Verify prediction is linked in the database
    """
    create_res = client.post(
        "/api/customers",
        json={
            "customer_id": "CUST-INTEG-99",
            "name": "Integrated Test Customer",
            "customer_expenditure": 2500.0,
            "login_frequency": 14,
            "support_calls": 3,
            "complaints": 2,
            "tenure": 20,
        },
    )
    assert create_res.status_code == 201

    # Call predict endpoint using newly created customer
    pred_res = client.post(
        "/api/predict",
        json={
            "customer_id": "CUST-INTEG-99",
            "plan_type": "Premium",
        },
    )
    assert pred_res.status_code == 200

    pred_data = pred_res.get_json()
    assert pred_data["success"] is True
    assert pred_data["is_mock"] is False
    assert pred_data["data"]["customer_id"] == "CUST-INTEG-99"
    assert "prediction_id" in pred_data["data"]

    # Verify prediction row in database
    with app.app_context():
        customer = db.session.get(Customer, "CUST-INTEG-99")
        assert len(customer.predictions) == 1
        assert customer.predictions[0].prediction_id == pred_data["data"]["prediction_id"]
