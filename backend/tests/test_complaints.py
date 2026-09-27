from app.extensions import db
from app.models import Complaint, Customer


def test_get_complaints_empty(client):
    """Test GET /api/complaints returns empty list and total 0 when database has no complaints."""
    response = client.get("/api/complaints")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert data["is_mock"] is False
    assert data["message"] == "Complaints retrieved successfully"
    assert data["data"]["complaints"] == []
    assert data["data"]["total"] == 0


def test_create_complaint_valid(client, app):
    """Test POST /api/complaints successfully creates a complaint and persists to database."""
    # Create customer first
    with app.app_context():
        customer = Customer(customer_id="CUST-COMP-01", name="Rohan Das")
        db.session.add(customer)
        db.session.commit()

    payload = {
        "complaint_id": "COMP-001",
        "customer_id": "CUST-COMP-01",
        "complaint_type": "Billing",
        "description": "Incorrect charges on recent invoice",
        "status": "In Progress",
    }
    response = client.post("/api/complaints", json=payload)
    assert response.status_code == 201

    data = response.get_json()
    assert data["success"] is True
    assert data["is_mock"] is False
    assert data["message"] == "Complaint created successfully"
    assert data["data"]["complaint_id"] == "COMP-001"
    assert data["data"]["customer_id"] == "CUST-COMP-01"
    assert data["data"]["complaint_type"] == "Billing"
    assert data["data"]["description"] == "Incorrect charges on recent invoice"
    assert data["data"]["status"] == "In Progress"
    assert data["data"]["created_at"] is not None
    assert data["data"]["updated_at"] is not None

    with app.app_context():
        comp = db.session.get(Complaint, "COMP-001")
        assert comp is not None
        assert comp.complaint_type == "Billing"


def test_create_complaint_minimal_required_fields(client, app):
    """Test POST /api/complaints with minimal required fields defaults status to Open."""
    with app.app_context():
        customer = Customer(customer_id="CUST-COMP-02", name="Maya Sen")
        db.session.add(customer)
        db.session.commit()

    payload = {
        "complaint_id": "COMP-MIN-002",
        "customer_id": "CUST-COMP-02",
        "complaint_type": "Network",
        "description": "Frequent internet disconnection",
    }
    response = client.post("/api/complaints", json=payload)
    assert response.status_code == 201

    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["complaint_id"] == "COMP-MIN-002"
    assert data["data"]["status"] == "Open"


def test_create_complaint_missing_complaint_id(client, app):
    """Test POST /api/complaints rejects missing complaint_id with 400."""
    with app.app_context():
        customer = Customer(customer_id="CUST-COMP-03")
        db.session.add(customer)
        db.session.commit()

    payload = {
        "customer_id": "CUST-COMP-03",
        "complaint_type": "Hardware",
        "description": "Router malfunction",
    }
    response = client.post("/api/complaints", json=payload)
    assert response.status_code == 400

    data = response.get_json()
    assert data["success"] is False
    assert "Missing required field: complaint_id" in data["message"]


def test_create_complaint_missing_customer_id(client):
    """Test POST /api/complaints rejects missing customer_id with 400."""
    payload = {
        "complaint_id": "COMP-NO-CUST",
        "complaint_type": "Hardware",
        "description": "Router malfunction",
    }
    response = client.post("/api/complaints", json=payload)
    assert response.status_code == 400

    data = response.get_json()
    assert data["success"] is False
    assert "Missing required field: customer_id" in data["message"]


def test_create_complaint_missing_complaint_type(client, app):
    """Test POST /api/complaints rejects missing complaint_type with 400."""
    with app.app_context():
        customer = Customer(customer_id="CUST-COMP-04")
        db.session.add(customer)
        db.session.commit()

    payload = {
        "complaint_id": "COMP-NO-TYPE",
        "customer_id": "CUST-COMP-04",
        "description": "Some description",
    }
    response = client.post("/api/complaints", json=payload)
    assert response.status_code == 400

    data = response.get_json()
    assert data["success"] is False
    assert "Missing required field: complaint_type" in data["message"]


def test_create_complaint_missing_description(client, app):
    """Test POST /api/complaints rejects missing description with 400."""
    with app.app_context():
        customer = Customer(customer_id="CUST-COMP-05")
        db.session.add(customer)
        db.session.commit()

    payload = {
        "complaint_id": "COMP-NO-DESC",
        "customer_id": "CUST-COMP-05",
        "complaint_type": "Billing",
    }
    response = client.post("/api/complaints", json=payload)
    assert response.status_code == 400

    data = response.get_json()
    assert data["success"] is False
    assert "Missing required field: description" in data["message"]


def test_create_complaint_duplicate_id_conflict(client, app):
    """Test POST /api/complaints returns 409 Conflict when complaint_id already exists."""
    with app.app_context():
        customer = Customer(customer_id="CUST-COMP-06")
        db.session.add(customer)
        db.session.commit()

    payload = {
        "complaint_id": "COMP-DUP-01",
        "customer_id": "CUST-COMP-06",
        "complaint_type": "Service",
        "description": "Initial complaint",
    }
    res1 = client.post("/api/complaints", json=payload)
    assert res1.status_code == 201

    # Second request with duplicate ID
    res2 = client.post("/api/complaints", json=payload)
    assert res2.status_code == 409

    data = res2.get_json()
    assert data["success"] is False
    assert data["is_mock"] is False
    assert "already exists" in data["message"]


def test_create_complaint_nonexistent_customer(client):
    """Test POST /api/complaints returns 404 when referenced customer_id does not exist."""
    payload = {
        "complaint_id": "COMP-UNKNOWN-CUST",
        "customer_id": "NON-EXISTENT-CUST",
        "complaint_type": "Support",
        "description": "Customer does not exist",
    }
    response = client.post("/api/complaints", json=payload)
    assert response.status_code == 404

    data = response.get_json()
    assert data["success"] is False
    assert data["is_mock"] is False
    assert "not found" in data["message"].lower()


def test_get_complaint_by_id(client, app):
    """Test GET /api/complaints/<complaint_id> returns matching complaint."""
    with app.app_context():
        customer = Customer(customer_id="CUST-COMP-07", name="Kunal Roy")
        db.session.add(customer)
        db.session.commit()

    client.post(
        "/api/complaints",
        json={
            "complaint_id": "COMP-GET-01",
            "customer_id": "CUST-COMP-07",
            "complaint_type": "Installation",
            "description": "Technician did not arrive on scheduled date",
            "status": "Open",
        },
    )

    response = client.get("/api/complaints/COMP-GET-01")
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert data["data"]["complaint_id"] == "COMP-GET-01"
    assert data["data"]["customer_id"] == "CUST-COMP-07"
    assert data["data"]["complaint_type"] == "Installation"
    assert data["data"]["description"] == "Technician did not arrive on scheduled date"
    assert data["data"]["status"] == "Open"
    assert "created_at" in data["data"]
    assert "updated_at" in data["data"]


def test_get_complaint_by_id_not_found(client):
    """Test GET /api/complaints/<complaint_id> returns 404 for nonexistent complaint."""
    response = client.get("/api/complaints/COMP-DOES-NOT-EXIST")
    assert response.status_code == 404

    data = response.get_json()
    assert data["success"] is False
    assert data["is_mock"] is False
    assert "not found" in data["message"].lower()


def test_patch_complaint_status(client, app):
    """Test PATCH /api/complaints/<complaint_id> updates the status of an existing complaint."""
    with app.app_context():
        customer = Customer(customer_id="CUST-COMP-08")
        db.session.add(customer)
        db.session.commit()

    client.post(
        "/api/complaints",
        json={
            "complaint_id": "COMP-PATCH-01",
            "customer_id": "CUST-COMP-08",
            "complaint_type": "Speed",
            "description": "Speed is slower than advertised",
            "status": "Open",
        },
    )

    response = client.patch(
        "/api/complaints/COMP-PATCH-01",
        json={"status": "Resolved"},
    )
    assert response.status_code == 200

    data = response.get_json()
    assert data["success"] is True
    assert data["message"] == "Complaint status updated successfully"
    assert data["data"]["complaint_id"] == "COMP-PATCH-01"
    assert data["data"]["status"] == "Resolved"
    assert data["data"]["complaint_type"] == "Speed"  # preserved
    assert data["data"]["description"] == "Speed is slower than advertised"  # preserved


def test_patch_complaint_status_not_found(client):
    """Test PATCH /api/complaints/<complaint_id> returns 404 when complaint does not exist."""
    response = client.patch(
        "/api/complaints/NON-EXISTENT-COMP",
        json={"status": "Resolved"},
    )
    assert response.status_code == 404

    data = response.get_json()
    assert data["success"] is False
    assert "not found" in data["message"].lower()


def test_patch_complaint_status_invalid_payload(client, app):
    """Test PATCH /api/complaints/<complaint_id> returns 400 when status is missing or empty."""
    with app.app_context():
        customer = Customer(customer_id="CUST-COMP-09")
        db.session.add(customer)
        db.session.commit()

    client.post(
        "/api/complaints",
        json={
            "complaint_id": "COMP-PATCH-02",
            "customer_id": "CUST-COMP-09",
            "complaint_type": "Billing",
            "description": "Double billed",
        },
    )

    # Missing status
    res1 = client.patch("/api/complaints/COMP-PATCH-02", json={})
    assert res1.status_code == 400
    assert "status" in res1.get_json()["message"]

    # Empty status
    res2 = client.patch("/api/complaints/COMP-PATCH-02", json={"status": "   "})
    assert res2.status_code == 400
    assert "status" in res2.get_json()["message"]


def test_complaint_malformed_json(client):
    """Test POST and PATCH /api/complaints reject malformed JSON with 400."""
    res1 = client.post(
        "/api/complaints",
        data="Not JSON",
        content_type="text/plain",
    )
    assert res1.status_code == 400
    assert "JSON" in res1.get_json()["message"]

    res2 = client.patch(
        "/api/complaints/COMP-001",
        data="Not JSON",
        content_type="text/plain",
    )
    assert res2.status_code == 400
    assert "JSON" in res2.get_json()["message"]


def test_customer_can_have_multiple_complaints(client, app):
    """Verify that an existing customer can have multiple complaints associated with them."""
    with app.app_context():
        customer = Customer(customer_id="CUST-MULTI-01", name="Multiple Complaints User")
        db.session.add(customer)
        db.session.commit()

    client.post(
        "/api/complaints",
        json={
            "complaint_id": "COMP-M1",
            "customer_id": "CUST-MULTI-01",
            "complaint_type": "Speed",
            "description": "First complaint",
        },
    )
    client.post(
        "/api/complaints",
        json={
            "complaint_id": "COMP-M2",
            "customer_id": "CUST-MULTI-01",
            "complaint_type": "Billing",
            "description": "Second complaint",
        },
    )

    # Verify both complaints exist and are linked to customer
    with app.app_context():
        cust = db.session.get(Customer, "CUST-MULTI-01")
        assert len(cust.complaint_records) == 2
        comp_ids = [c.complaint_id for c in cust.complaint_records]
        assert "COMP-M1" in comp_ids
        assert "COMP-M2" in comp_ids

    # Verify GET all complaints returns both
    res = client.get("/api/complaints")
    assert res.status_code == 200
    assert res.get_json()["data"]["total"] == 2
