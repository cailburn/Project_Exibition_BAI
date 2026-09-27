"""
Phase 7 — Recommendation Engine: Tests
========================================

Tests for:
  GET /api/recommendation/<customer_id>

Covers all 10 required scenarios plus additional edge-case assertions.

Design notes
------------
- Uses the same direct DB-insertion helpers as test_churn.py and
  test_complaints.py for speed and isolation.
- "Resolved" is the terminal complaint status; all others are unresolved.
- Recommendations are deterministic: the same DB state always produces
  the same output.  Tests assert on list membership / structure, not on
  a specific ordering within the recommendations list, so they remain
  robust if the rule table order is adjusted in future phases.
"""

from datetime import datetime, timedelta, timezone

import pytest

from app.extensions import db
from app.models.complaint import Complaint
from app.models.customer import Customer
from app.models.prediction import Prediction


# ──────────────────────────────────────────────────────────────────────────────
# Shared helper factories  (same conventions as test_churn.py)
# ──────────────────────────────────────────────────────────────────────────────


def _make_customer(customer_id, name=None):
    """Create and persist a minimal Customer row, flushing without committing."""
    customer = Customer(customer_id=customer_id, name=name)
    db.session.add(customer)
    db.session.flush()
    return customer


def _make_prediction(customer_id, churn_probability, risk_level, predicted_at=None):
    """Create and persist a Prediction row."""
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


def _make_complaint(customer_id, complaint_id, status="Open", complaint_type="General"):
    """Create and persist a Complaint row with a configurable status."""
    complaint = Complaint(
        complaint_id=complaint_id,
        customer_id=customer_id,
        complaint_type=complaint_type,
        description="Test complaint",
        status=status,
    )
    db.session.add(complaint)
    db.session.flush()
    return complaint


# ──────────────────────────────────────────────────────────────────────────────
# Helpers for assertions
# ──────────────────────────────────────────────────────────────────────────────


def _messages(recommendations):
    """Return the set of message strings from a recommendations list."""
    return {r["message"] for r in recommendations}


def _types(recommendations):
    """Return the set of type strings from a recommendations list."""
    return {r["type"] for r in recommendations}


# ══════════════════════════════════════════════════════════════════════════════
# Tests
# ══════════════════════════════════════════════════════════════════════════════


class TestRecommendations:
    """Tests for GET /api/recommendation/<customer_id>."""

    # ── Test 1 ────────────────────────────────────────────────────────────────
    def test_high_risk_customer_receives_high_risk_recommendations(self, client, app):
        """Customer with High risk_level receives High-priority Retention recommendations."""
        with app.app_context():
            _make_customer("REC-HIGH-01", "High Risk User")
            _make_prediction("REC-HIGH-01", 0.88, "High")
            db.session.commit()

        response = client.get("/api/recommendation/REC-HIGH-01")
        assert response.status_code == 200

        body = response.get_json()
        assert body["success"] is True
        assert body["is_mock"] is False
        assert body["message"] == "Recommendations generated successfully"

        data = body["data"]
        assert data["customer_id"] == "REC-HIGH-01"
        assert data["risk_level"] == "High"
        assert data["churn_probability"] == pytest.approx(0.88)
        assert data["churn_percentage"] == pytest.approx(88.0)

        recs = data["recommendations"]
        assert len(recs) > 0
        # All risk-level recommendations for High should be Retention type
        retention_recs = [r for r in recs if r["type"] == "Retention"]
        assert len(retention_recs) > 0
        # All retention recommendations should carry High priority
        for r in retention_recs:
            assert r["priority"] == "High"

    # ── Test 2 ────────────────────────────────────────────────────────────────
    def test_medium_risk_customer_receives_medium_risk_recommendations(self, client, app):
        """Customer with Medium risk_level receives Medium-priority Retention recommendations."""
        with app.app_context():
            _make_customer("REC-MED-01", "Medium Risk User")
            _make_prediction("REC-MED-01", 0.55, "Medium")
            db.session.commit()

        response = client.get("/api/recommendation/REC-MED-01")
        assert response.status_code == 200

        data = response.get_json()["data"]
        assert data["risk_level"] == "Medium"

        recs = data["recommendations"]
        retention_recs = [r for r in recs if r["type"] == "Retention"]
        assert len(retention_recs) > 0
        for r in retention_recs:
            assert r["priority"] == "Medium"

    # ── Test 3 ────────────────────────────────────────────────────────────────
    def test_low_risk_customer_receives_low_risk_recommendations(self, client, app):
        """Customer with Low risk_level receives Low-priority Retention recommendations."""
        with app.app_context():
            _make_customer("REC-LOW-01", "Low Risk User")
            _make_prediction("REC-LOW-01", 0.18, "Low")
            db.session.commit()

        response = client.get("/api/recommendation/REC-LOW-01")
        assert response.status_code == 200

        data = response.get_json()["data"]
        assert data["risk_level"] == "Low"

        recs = data["recommendations"]
        retention_recs = [r for r in recs if r["type"] == "Retention"]
        assert len(retention_recs) > 0
        for r in retention_recs:
            assert r["priority"] == "Low"

    # ── Test 4 ────────────────────────────────────────────────────────────────
    def test_customer_not_found_returns_404(self, client):
        """Non-existent customer_id → 404 with meaningful message."""
        response = client.get("/api/recommendation/DOES-NOT-EXIST-999")
        assert response.status_code == 404

        body = response.get_json()
        assert body["success"] is False
        assert body["is_mock"] is False
        assert "not found" in body["message"].lower()

    # ── Test 5 ────────────────────────────────────────────────────────────────
    def test_customer_without_prediction_returns_404(self, client, app):
        """Customer with no Prediction record → 404, no fabricated churn values."""
        with app.app_context():
            _make_customer("REC-NOPRED-01", "No Prediction Yet")
            db.session.commit()

        response = client.get("/api/recommendation/REC-NOPRED-01")
        assert response.status_code == 404

        body = response.get_json()
        assert body["success"] is False
        assert body["is_mock"] is False
        # Message must reference the missing prediction, not claim the customer is missing
        assert "prediction" in body["message"].lower()

    # ── Test 6 ────────────────────────────────────────────────────────────────
    def test_latest_prediction_is_selected_when_multiple_exist(self, client, app):
        """
        When a customer has multiple Prediction rows, the most recent one
        (by predicted_at, then prediction_id) determines the recommendations.
        """
        with app.app_context():
            _make_customer("REC-MULTI-PRED-01", "Multi Pred")
            older_time = datetime.now(timezone.utc) - timedelta(days=7)
            newer_time = datetime.now(timezone.utc)
            # Old prediction: High risk
            _make_prediction("REC-MULTI-PRED-01", 0.91, "High", predicted_at=older_time)
            # New prediction: Low risk — this should be used
            _make_prediction("REC-MULTI-PRED-01", 0.15, "Low", predicted_at=newer_time)
            db.session.commit()

        response = client.get("/api/recommendation/REC-MULTI-PRED-01")
        assert response.status_code == 200

        data = response.get_json()["data"]
        # Must reflect the newer prediction (Low risk)
        assert data["risk_level"] == "Low"
        assert data["churn_probability"] == pytest.approx(0.15)

        recs = data["recommendations"]
        retention_recs = [r for r in recs if r["type"] == "Retention"]
        # All retention recs should be Low priority (not High)
        for r in retention_recs:
            assert r["priority"] == "Low"

    # ── Test 7 ────────────────────────────────────────────────────────────────
    def test_open_complaint_produces_complaint_recommendation(self, client, app):
        """
        A customer with an Open (unresolved) complaint receives a Complaint-type
        recommendation to prioritise its resolution.
        """
        with app.app_context():
            _make_customer("REC-OPEN-COMP-01", "Open Complaint User")
            _make_prediction("REC-OPEN-COMP-01", 0.70, "High")
            _make_complaint("REC-OPEN-COMP-01", "COMP-REC-OPEN-01", status="Open")
            db.session.commit()

        response = client.get("/api/recommendation/REC-OPEN-COMP-01")
        assert response.status_code == 200

        recs = response.get_json()["data"]["recommendations"]
        complaint_recs = [r for r in recs if r["type"] == "Complaint"]
        assert len(complaint_recs) > 0

        # At least one message must mention outstanding/resolution
        messages = _messages(complaint_recs)
        assert any(
            "resolution" in m.lower() or "outstanding" in m.lower()
            for m in messages
        ), "Expected a complaint resolution recommendation for an open complaint"

    # ── Test 8 ────────────────────────────────────────────────────────────────
    def test_multiple_complaints_produce_recurring_pattern_recommendation(self, client, app):
        """
        A customer with 2+ complaints receives a recommendation to review
        recurring complaint patterns.
        """
        with app.app_context():
            _make_customer("REC-MULTI-COMP-01", "Multi Complaint User")
            _make_prediction("REC-MULTI-COMP-01", 0.65, "Medium")
            _make_complaint("REC-MULTI-COMP-01", "COMP-REC-M01", status="Open")
            _make_complaint("REC-MULTI-COMP-01", "COMP-REC-M02", status="Open")
            db.session.commit()

        response = client.get("/api/recommendation/REC-MULTI-COMP-01")
        assert response.status_code == 200

        recs = response.get_json()["data"]["recommendations"]
        messages = _messages(recs)
        assert any(
            "recurring" in m.lower() or "pattern" in m.lower()
            for m in messages
        ), "Expected a recurring complaint pattern recommendation for 2+ complaints"

    # ── Test 9 ────────────────────────────────────────────────────────────────
    def test_no_complaints_still_produces_risk_recommendations(self, client, app):
        """
        A customer with a prediction but no complaints still receives
        risk-based Retention recommendations (no Complaint-type items).
        """
        with app.app_context():
            _make_customer("REC-NO-COMP-01", "No Complaint User")
            _make_prediction("REC-NO-COMP-01", 0.82, "High")
            db.session.commit()

        response = client.get("/api/recommendation/REC-NO-COMP-01")
        assert response.status_code == 200

        data = response.get_json()["data"]
        recs = data["recommendations"]

        retention_recs = [r for r in recs if r["type"] == "Retention"]
        assert len(retention_recs) > 0, "Must have Retention recommendations"

        complaint_recs = [r for r in recs if r["type"] == "Complaint"]
        assert len(complaint_recs) == 0, "Must have no Complaint recommendations when no complaints exist"

    # ── Test 10 ───────────────────────────────────────────────────────────────
    def test_response_uses_existing_api_envelope(self, client, app):
        """
        Successful response must follow the project's standard envelope:
        { success, data, message, is_mock }.
        """
        with app.app_context():
            _make_customer("REC-ENV-01", "Envelope Test User")
            _make_prediction("REC-ENV-01", 0.50, "Medium")
            db.session.commit()

        response = client.get("/api/recommendation/REC-ENV-01")
        assert response.status_code == 200

        body = response.get_json()
        # Standard envelope fields
        assert "success" in body
        assert "data" in body
        assert "message" in body
        assert "is_mock" in body

        assert body["success"] is True
        assert body["is_mock"] is False

        # Data payload must contain required recommendation fields
        data = body["data"]
        for field in ("customer_id", "risk_level", "churn_probability",
                      "churn_percentage", "recommendations"):
            assert field in data, f"Field '{field}' missing from recommendation data"

        # Each recommendation must have type, priority, message
        for rec in data["recommendations"]:
            assert "type" in rec
            assert "priority" in rec
            assert "message" in rec

    # ── Additional: resolved complaint does NOT trigger unresolved rule ────────
    def test_resolved_complaint_does_not_trigger_unresolved_recommendation(self, client, app):
        """
        A complaint with status 'Resolved' must NOT produce a complaint
        resolution recommendation (it is already handled).
        """
        with app.app_context():
            _make_customer("REC-RESOLVED-01", "Resolved Complaint User")
            _make_prediction("REC-RESOLVED-01", 0.40, "Medium")
            _make_complaint("REC-RESOLVED-01", "COMP-RESOLVED-01", status="Resolved")
            db.session.commit()

        response = client.get("/api/recommendation/REC-RESOLVED-01")
        assert response.status_code == 200

        recs = response.get_json()["data"]["recommendations"]
        messages = _messages(recs)
        # The "prioritise resolution" message should NOT appear
        assert not any(
            "prioritise resolution" in m.lower() or "outstanding" in m.lower()
            for m in messages
        ), "Resolved complaints must not trigger an unresolved-complaint recommendation"

    # ── Additional: in-progress complaint IS treated as unresolved ────────────
    def test_in_progress_complaint_is_treated_as_unresolved(self, client, app):
        """
        A complaint with status 'In Progress' (not 'Resolved') must trigger
        the unresolved-complaint recommendation.
        """
        with app.app_context():
            _make_customer("REC-INPROG-01", "In Progress User")
            _make_prediction("REC-INPROG-01", 0.72, "High")
            _make_complaint("REC-INPROG-01", "COMP-INPROG-01", status="In Progress")
            db.session.commit()

        response = client.get("/api/recommendation/REC-INPROG-01")
        assert response.status_code == 200

        recs = response.get_json()["data"]["recommendations"]
        messages = _messages(recs)
        assert any(
            "resolution" in m.lower() or "outstanding" in m.lower()
            for m in messages
        ), "In Progress complaints must be treated as unresolved"

    # ── Additional: churn_percentage is correctly derived ────────────────────
    def test_churn_percentage_is_derived_correctly(self, client, app):
        """churn_percentage == churn_probability * 100, rounded to 2 decimal places."""
        with app.app_context():
            _make_customer("REC-PCT-01", "Percentage User")
            _make_prediction("REC-PCT-01", 0.3333, "Low")
            db.session.commit()

        response = client.get("/api/recommendation/REC-PCT-01")
        assert response.status_code == 200

        data = response.get_json()["data"]
        assert data["churn_percentage"] == pytest.approx(round(0.3333 * 100, 2))

    # ── Additional: endpoint does not modify any database records ─────────────
    def test_endpoint_does_not_modify_database(self, client, app):
        """Row counts must be identical before and after calling the endpoint."""
        with app.app_context():
            _make_customer("REC-SAFE-01", "DB Safe")
            _make_prediction("REC-SAFE-01", 0.60, "Medium")
            _make_complaint("REC-SAFE-01", "COMP-SAFE-REC-01", status="Open")
            db.session.commit()

            pre_customers = db.session.query(Customer).count()
            pre_predictions = db.session.query(Prediction).count()
            pre_complaints = db.session.query(Complaint).count()

        client.get("/api/recommendation/REC-SAFE-01")

        with app.app_context():
            assert db.session.query(Customer).count() == pre_customers
            assert db.session.query(Prediction).count() == pre_predictions
            assert db.session.query(Complaint).count() == pre_complaints
