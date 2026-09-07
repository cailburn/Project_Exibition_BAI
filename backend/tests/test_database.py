from datetime import datetime, timezone
from app.extensions import db
from app.models import Customer, Complaint, Prediction


def test_app_starts_with_testing_config(app):
    """Verify application starts with testing configuration and SQLite in-memory."""
    assert app.config["TESTING"] is True
    assert app.config["DATABASE_TYPE"] == "sqlite"
    assert app.config["SQLALCHEMY_DATABASE_URI"] == "sqlite:///:memory:"


def test_sqlalchemy_initialization(app):
    """Verify SQLAlchemy extension is properly registered with the application."""
    assert "sqlalchemy" in app.extensions
    with app.app_context():
        # Engine should be active and inspectable
        inspector = db.inspect(db.engine)
        table_names = inspector.get_table_names()
        assert "customer" in table_names
        assert "complaint" in table_names
        assert "prediction" in table_names


def test_customer_table_creation_and_fields(app):
    """Verify Customer table records can be created, stored, and queried."""
    with app.app_context():
        customer = Customer(
            customer_id="CUST-001",
            name="Rahul Sharma",
            customer_expenditure=899.0,
            login_frequency=12,
            support_calls=3,
            complaints=2,
            tenure=8,
        )
        db.session.add(customer)
        db.session.commit()

        retrieved = db.session.get(Customer, "CUST-001")
        assert retrieved is not None
        assert retrieved.customer_id == "CUST-001"
        assert retrieved.name == "Rahul Sharma"
        assert retrieved.customer_expenditure == 899.0
        assert retrieved.login_frequency == 12
        assert retrieved.support_calls == 3
        assert retrieved.complaints == 2
        assert retrieved.tenure == 8
        assert isinstance(retrieved.created_at, datetime)
        assert isinstance(retrieved.updated_at, datetime)

        # Verify serialization dict
        d = retrieved.to_dict()
        assert d["customer_id"] == "CUST-001"
        assert d["customer_expenditure"] == 899.0
        assert d["login_frequency"] == 12
        assert d["support_calls"] == 3
        assert d["complaints"] == 2
        assert d["tenure"] == 8


def test_complaint_table_and_customer_relationship(app):
    """Verify Complaint table creation and bi-directional Customer-Complaint relationship."""
    with app.app_context():
        customer = Customer(
            customer_id="CUST-002",
            name="Priya Patel",
            customer_expenditure=1250.0,
            login_frequency=5,
            support_calls=6,
            complaints=1,
            tenure=14,
        )
        complaint = Complaint(
            customer_id="CUST-002",
            complaint_type="Network Issue",
            description="Broadband disconnects repeatedly during work hours.",
            status="Open",
        )
        db.session.add(customer)
        db.session.add(complaint)
        db.session.commit()

        # Query complaint
        retrieved_complaint = db.session.get(Complaint, complaint.complaint_id)
        assert retrieved_complaint is not None
        assert retrieved_complaint.complaint_type == "Network Issue"
        assert retrieved_complaint.customer_id == "CUST-002"
        # Bi-directional: complaint -> customer
        assert retrieved_complaint.customer.name == "Priya Patel"

        # Bi-directional: customer -> complaint_records
        retrieved_customer = db.session.get(Customer, "CUST-002")
        assert len(retrieved_customer.complaint_records) == 1
        assert retrieved_customer.complaint_records[0].complaint_type == "Network Issue"

        # Verify serialization
        cd = retrieved_complaint.to_dict()
        assert cd["complaint_id"] == complaint.complaint_id
        assert cd["status"] == "Open"


def test_prediction_table_and_customer_relationship(app):
    """Verify Prediction table creation and bi-directional Customer-Prediction relationship."""
    with app.app_context():
        customer = Customer(
            customer_id="CUST-003",
            name="Amit Verma",
            customer_expenditure=450.0,
            login_frequency=2,
            support_calls=5,
            complaints=3,
            tenure=2,
        )
        prediction = Prediction(
            customer_id="CUST-003",
            churn_probability=0.88,
            risk_level="High",
        )
        db.session.add(customer)
        db.session.add(prediction)
        db.session.commit()

        # Query prediction
        retrieved_pred = db.session.get(Prediction, prediction.prediction_id)
        assert retrieved_pred is not None
        assert retrieved_pred.churn_probability == 0.88
        assert retrieved_pred.risk_level == "High"
        # Bi-directional: prediction -> customer
        assert retrieved_pred.customer.name == "Amit Verma"

        # Bi-directional: customer -> predictions
        retrieved_customer = db.session.get(Customer, "CUST-003")
        assert len(retrieved_customer.predictions) == 1
        assert retrieved_customer.predictions[0].churn_probability == 0.88
        assert retrieved_customer.predictions[0].risk_level == "High"

        # Verify serialization
        pd = retrieved_pred.to_dict()
        assert pd["prediction_id"] == prediction.prediction_id
        assert pd["churn_probability"] == 0.88
        assert pd["risk_level"] == "High"
