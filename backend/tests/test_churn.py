"""
Phase 6 — Churn & Priority Features: Tests
============================================

Tests for:
  GET /api/top-churn
  GET /api/priority-queue

Covers all 15 mandatory scenarios plus shared helpers.

Design notes
------------
- Tests insert data directly via SQLAlchemy (same pattern as test_customers.py
  and test_complaints.py) for fast, DB-level control without going through the
  prediction endpoint.
- churn_percentage is derived, not stored; assertions use round() to tolerate
  floating-point representation differences.
- Complaint records are read-only in these tests: we verify the count is
  correct and that no modifications to existing rows occurred.
"""

from datetime import datetime, timedelta, timezone

import pytest

from app.extensions import db
from app.models.complaint import Complaint
from app.models.customer import Customer
from app.models.prediction import Prediction


# ──────────────────────────────────────────────────────────────────────────────
# Shared fixtures / helper factories
# ──────────────────────────────────────────────────────────────────────────────


def _make_customer(customer_id, name=None):
    """Create and persist a minimal Customer row."""
    customer = Customer(customer_id=customer_id, name=name)
    db.session.add(customer)
    db.session.flush()  # assign PK without committing; caller commits
    return customer


def _make_prediction(customer_id, churn_probability, risk_level, predicted_at=None):
    """Create and persist a Prediction row for *customer_id*."""
    if predicted_at is None:
        predicted_at = datetime.now(timezone.utc)
    prediction = Prediction(
        customer_id=customer_id,
        churn_probability=churn_probability,
        risk_level=risk_level,
        predicted_at=predicted_at,
    )
    db.session.add(prediction)
    db.session.flush()
    return prediction


def _make_complaint(customer_id, complaint_id, complaint_type="General"):
    """Create and persist a minimal Complaint row."""
    complaint = Complaint(
        complaint_id=complaint_id,
        customer_id=customer_id,
        complaint_type=complaint_type,
        description="Test complaint",
    )
    db.session.add(complaint)
    db.session.flush()
    return complaint


# ══════════════════════════════════════════════════════════════════════════════
# Feature 1 — Top Churn List  (GET /api/top-churn)
# ══════════════════════════════════════════════════════════════════════════════


class TestTopChurn:
    """Tests for GET /api/top-churn."""

    # ── Test 1 ────────────────────────────────────────────────────────────────
    def test_empty_database_returns_empty_list(self, client):
        """Empty database → 200, empty customers list, total 0."""
        response = client.get("/api/top-churn")
        assert response.status_code == 200

        data = response.get_json()
        assert data["success"] is True
        assert data["is_mock"] is False
        assert data["message"] == "Top churn customers retrieved successfully"
        assert data["data"]["customers"] == []
        assert data["data"]["total"] == 0

    # ── Test 2 ────────────────────────────────────────────────────────────────
    def test_customers_without_predictions_are_excluded(self, client, app):
        """Customer with no Prediction record must not appear in top-churn."""
        with app.app_context():
            _make_customer("CHURN-NOPRED-01", "No Prediction")
            db.session.commit()

        response = client.get("/api/top-churn")
        assert response.status_code == 200

        data = response.get_json()
        assert data["data"]["total"] == 0
        ids = [c["customer_id"] for c in data["data"]["customers"]]
        assert "CHURN-NOPRED-01" not in ids

    # ── Test 3 ────────────────────────────────────────────────────────────────
    def test_single_prediction_appears_correctly(self, client, app):
        """A customer with one prediction is returned with correct fields."""
        with app.app_context():
            _make_customer("CHURN-SINGLE-01", "Solo User")
            _make_prediction("CHURN-SINGLE-01", 0.75, "High")
            db.session.commit()

        response = client.get("/api/top-churn")
        assert response.status_code == 200

        data = response.get_json()
        assert data["data"]["total"] == 1
        customer = data["data"]["customers"][0]
        assert customer["customer_id"] == "CHURN-SINGLE-01"
        assert customer["name"] == "Solo User"
        assert customer["churn_probability"] == pytest.approx(0.75)
        assert customer["churn_percentage"] == pytest.approx(75.0)
        assert customer["risk_level"] == "High"

    # ── Test 4 ────────────────────────────────────────────────────────────────
    def test_multiple_customers_sorted_by_churn_probability_desc(self, client, app):
        """Multiple customers are returned ordered by churn_probability DESC."""
        with app.app_context():
            _make_customer("CHURN-SORT-A", "Low Risk")
            _make_customer("CHURN-SORT-B", "High Risk")
            _make_customer("CHURN-SORT-C", "Medium Risk")
            _make_prediction("CHURN-SORT-A", 0.20, "Low")
            _make_prediction("CHURN-SORT-B", 0.90, "High")
            _make_prediction("CHURN-SORT-C", 0.55, "Medium")
            db.session.commit()

        response = client.get("/api/top-churn")
        assert response.status_code == 200

        customers = response.get_json()["data"]["customers"]
        assert len(customers) == 3
        probabilities = [c["churn_probability"] for c in customers]
        assert probabilities == sorted(probabilities, reverse=True), (
            "Customers must be sorted by churn_probability DESC"
        )
        # Exact order
        assert customers[0]["customer_id"] == "CHURN-SORT-B"
        assert customers[1]["customer_id"] == "CHURN-SORT-C"
        assert customers[2]["customer_id"] == "CHURN-SORT-A"

    # ── Test 5 ────────────────────────────────────────────────────────────────
    def test_same_probability_has_deterministic_ordering(self, client, app):
        """Tie in churn_probability → secondary order is customer_id ASC."""
        with app.app_context():
            _make_customer("CHURN-TIE-Z", "Tie Customer Z")
            _make_customer("CHURN-TIE-A", "Tie Customer A")
            _make_prediction("CHURN-TIE-Z", 0.60, "Medium")
            _make_prediction("CHURN-TIE-A", 0.60, "Medium")
            db.session.commit()

        response = client.get("/api/top-churn")
        assert response.status_code == 200

        customers = response.get_json()["data"]["customers"]
        assert len(customers) == 2
        # Secondary sort is customer_id ASC → "CHURN-TIE-A" before "CHURN-TIE-Z"
        assert customers[0]["customer_id"] == "CHURN-TIE-A"
        assert customers[1]["customer_id"] == "CHURN-TIE-Z"

    # ── Test 6 ────────────────────────────────────────────────────────────────
    def test_multiple_predictions_uses_latest_predicted_at(self, client, app):
        """
        When a customer has multiple Prediction rows, only the latest
        predicted_at is used.  The older (lower probability) row is ignored.
        """
        with app.app_context():
            _make_customer("CHURN-MULTI-PRED-01", "Multi Pred User")
            older_time = datetime.now(timezone.utc) - timedelta(days=10)
            newer_time = datetime.now(timezone.utc)
            # Older prediction with high probability
            _make_prediction("CHURN-MULTI-PRED-01", 0.95, "High", predicted_at=older_time)
            # Newer prediction with lower probability — this should be used
            _make_prediction("CHURN-MULTI-PRED-01", 0.30, "Low", predicted_at=newer_time)
            db.session.commit()

        response = client.get("/api/top-churn")
        assert response.status_code == 200

        customers = response.get_json()["data"]["customers"]
        assert len(customers) == 1
        customer = customers[0]
        assert customer["customer_id"] == "CHURN-MULTI-PRED-01"
        # Should reflect the *newer* prediction (probability 0.30)
        assert customer["churn_probability"] == pytest.approx(0.30)
        assert customer["risk_level"] == "Low"

    # ── Test 7 ────────────────────────────────────────────────────────────────
    def test_customer_information_is_included_correctly(self, client, app):
        """Verify that all required customer fields appear in the response."""
        with app.app_context():
            _make_customer("CHURN-FIELDS-01", "Field Check User")
            _make_prediction("CHURN-FIELDS-01", 0.48, "Medium")
            db.session.commit()

        response = client.get("/api/top-churn")
        assert response.status_code == 200

        customer = response.get_json()["data"]["customers"][0]
        # All required fields must be present
        for field in ("customer_id", "name", "churn_probability", "churn_percentage", "risk_level"):
            assert field in customer, f"Field '{field}' missing from top-churn response"
        assert customer["churn_percentage"] == pytest.approx(
            round(customer["churn_probability"] * 100, 2)
        )


# ══════════════════════════════════════════════════════════════════════════════
# Feature 2 — Customer Priority Queue  (GET /api/priority-queue)
# ══════════════════════════════════════════════════════════════════════════════


class TestPriorityQueue:
    """Tests for GET /api/priority-queue."""

    # ── Test 8 ────────────────────────────────────────────────────────────────
    def test_empty_database_returns_empty_list(self, client):
        """Empty database → 200, empty customers list, total 0."""
        response = client.get("/api/priority-queue")
        assert response.status_code == 200

        data = response.get_json()
        assert data["success"] is True
        assert data["is_mock"] is False
        assert data["message"] == "Customer priority queue retrieved successfully"
        assert data["data"]["customers"] == []
        assert data["data"]["total"] == 0

    # ── Test 9 ────────────────────────────────────────────────────────────────
    def test_customers_without_predictions_are_excluded(self, client, app):
        """Customer with no Prediction record must not appear in priority-queue."""
        with app.app_context():
            _make_customer("PQ-NOPRED-01", "No Pred")
            db.session.commit()

        response = client.get("/api/priority-queue")
        assert response.status_code == 200

        data = response.get_json()
        assert data["data"]["total"] == 0
        ids = [c["customer_id"] for c in data["data"]["customers"]]
        assert "PQ-NOPRED-01" not in ids

    # ── Test 10 ───────────────────────────────────────────────────────────────
    def test_high_risk_appears_before_medium_risk(self, client, app):
        """High-risk customer must appear before Medium-risk customer."""
        with app.app_context():
            _make_customer("PQ-MED-01", "Medium Risk")
            _make_customer("PQ-HIGH-01", "High Risk")
            _make_prediction("PQ-MED-01", 0.65, "Medium")
            _make_prediction("PQ-HIGH-01", 0.45, "High")  # lower prob but High risk
            db.session.commit()

        response = client.get("/api/priority-queue")
        assert response.status_code == 200

        customers = response.get_json()["data"]["customers"]
        ids = [c["customer_id"] for c in customers]
        assert ids.index("PQ-HIGH-01") < ids.index("PQ-MED-01"), (
            "High-risk customer must precede Medium-risk customer"
        )

    # ── Test 11 ───────────────────────────────────────────────────────────────
    def test_medium_risk_appears_before_low_risk(self, client, app):
        """Medium-risk customer must appear before Low-risk customer."""
        with app.app_context():
            _make_customer("PQ-LOW-01", "Low Risk")
            _make_customer("PQ-MED-02", "Medium Risk")
            _make_prediction("PQ-LOW-01", 0.80, "Low")    # higher prob but Low risk
            _make_prediction("PQ-MED-02", 0.40, "Medium")
            db.session.commit()

        response = client.get("/api/priority-queue")
        assert response.status_code == 200

        customers = response.get_json()["data"]["customers"]
        ids = [c["customer_id"] for c in customers]
        assert ids.index("PQ-MED-02") < ids.index("PQ-LOW-01"), (
            "Medium-risk customer must precede Low-risk customer"
        )

    # ── Test 12 ───────────────────────────────────────────────────────────────
    def test_higher_probability_first_within_same_risk_level(self, client, app):
        """Within the same risk level, higher churn_probability appears first."""
        with app.app_context():
            _make_customer("PQ-PROB-LOW-A", "Low Prob A")
            _make_customer("PQ-PROB-HIGH-B", "High Prob B")
            _make_prediction("PQ-PROB-LOW-A", 0.30, "High")
            _make_prediction("PQ-PROB-HIGH-B", 0.88, "High")
            db.session.commit()

        response = client.get("/api/priority-queue")
        assert response.status_code == 200

        customers = response.get_json()["data"]["customers"]
        assert len(customers) == 2
        ids = [c["customer_id"] for c in customers]
        assert ids[0] == "PQ-PROB-HIGH-B", (
            "Higher probability must come first within same risk level"
        )

    # ── Test 13 ───────────────────────────────────────────────────────────────
    def test_complaint_count_is_calculated_correctly(self, client, app):
        """complaint_count in the response matches actual Complaint records."""
        with app.app_context():
            _make_customer("PQ-COMP-01", "Complaint User")
            _make_prediction("PQ-COMP-01", 0.72, "High")
            _make_complaint("PQ-COMP-01", "COMP-PQ-001")
            _make_complaint("PQ-COMP-01", "COMP-PQ-002")
            _make_complaint("PQ-COMP-01", "COMP-PQ-003")
            db.session.commit()

        response = client.get("/api/priority-queue")
        assert response.status_code == 200

        customers = response.get_json()["data"]["customers"]
        assert len(customers) == 1
        assert customers[0]["complaint_count"] == 3

    # ── Test 14 ───────────────────────────────────────────────────────────────
    def test_complaint_count_does_not_modify_database(self, client, app):
        """
        After calling GET /api/priority-queue, the number of Complaint and
        Customer rows in the database must remain unchanged.
        """
        with app.app_context():
            _make_customer("PQ-DB-SAFE-01", "DB Safe User")
            _make_prediction("PQ-DB-SAFE-01", 0.50, "Medium")
            _make_complaint("PQ-DB-SAFE-01", "COMP-DB-001")
            db.session.commit()

            # Record counts before the endpoint call
            pre_complaint_count = db.session.query(Complaint).count()
            pre_customer_count = db.session.query(Customer).count()
            pre_prediction_count = db.session.query(Prediction).count()

        # Call the endpoint
        response = client.get("/api/priority-queue")
        assert response.status_code == 200

        with app.app_context():
            # Counts must be unchanged
            assert db.session.query(Complaint).count() == pre_complaint_count
            assert db.session.query(Customer).count() == pre_customer_count
            assert db.session.query(Prediction).count() == pre_prediction_count

    # ── Test 15 ───────────────────────────────────────────────────────────────
    def test_multiple_complaints_for_same_customer_counted_correctly(self, client, app):
        """
        A customer with many complaints reports the correct total count,
        and other customers' complaint counts are not affected.
        """
        with app.app_context():
            _make_customer("PQ-MULTI-C-01", "Many Complaints")
            _make_customer("PQ-MULTI-C-02", "Few Complaints")
            _make_prediction("PQ-MULTI-C-01", 0.85, "High")
            _make_prediction("PQ-MULTI-C-02", 0.40, "Medium")
            # 5 complaints for customer 01
            for i in range(5):
                _make_complaint("PQ-MULTI-C-01", f"COMP-MULTI-{i:02d}")
            # 1 complaint for customer 02
            _make_complaint("PQ-MULTI-C-02", "COMP-MULTI-99")
            db.session.commit()

        response = client.get("/api/priority-queue")
        assert response.status_code == 200

        customers = response.get_json()["data"]["customers"]
        counts = {c["customer_id"]: c["complaint_count"] for c in customers}
        assert counts["PQ-MULTI-C-01"] == 5
        assert counts["PQ-MULTI-C-02"] == 1

    # ── Additional: zero complaints is reported as 0, not null ───────────────
    def test_customer_with_no_complaints_has_count_zero(self, client, app):
        """A customer with a prediction but no complaints shows complaint_count 0."""
        with app.app_context():
            _make_customer("PQ-ZERO-COMP-01", "Zero Complaints")
            _make_prediction("PQ-ZERO-COMP-01", 0.60, "Medium")
            db.session.commit()

        response = client.get("/api/priority-queue")
        assert response.status_code == 200

        customers = response.get_json()["data"]["customers"]
        assert len(customers) == 1
        assert customers[0]["complaint_count"] == 0

    # ── Additional: required fields present in priority-queue response ────────
    def test_priority_queue_response_fields(self, client, app):
        """All required fields must be present in each priority-queue entry."""
        with app.app_context():
            _make_customer("PQ-FIELDS-01", "Fields Check")
            _make_prediction("PQ-FIELDS-01", 0.77, "High")
            db.session.commit()

        response = client.get("/api/priority-queue")
        assert response.status_code == 200

        customer = response.get_json()["data"]["customers"][0]
        required_fields = (
            "customer_id",
            "name",
            "risk_level",
            "churn_probability",
            "churn_percentage",
            "complaint_count",
            "priority",
        )
        for field in required_fields:
            assert field in customer, f"Field '{field}' missing from priority-queue response"

        assert customer["priority"] == customer["risk_level"]
