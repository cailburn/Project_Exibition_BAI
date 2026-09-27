from typing import Any, Dict, List, Optional
from app.extensions import db
from app.models.customer import Customer


def get_all_customers() -> List[Customer]:
    """
    Retrieve all customers ordered by creation time (most recent first).
    """
    return db.session.query(Customer).order_by(Customer.created_at.desc()).all()


def get_customer_by_id(customer_id: str) -> Optional[Customer]:
    """
    Retrieve a customer by primary key customer_id.
    """
    return db.session.get(Customer, customer_id)


def create_customer(data: Dict[str, Any]) -> Customer:
    """
    Create and persist a new Customer record into the database.
    
    Expects validated data with canonical database model fields:
      - customer_id (required)
      - name (optional)
      - customer_expenditure (optional, defaults to 0.0)
      - login_frequency (optional, defaults to 0)
      - support_calls (optional, defaults to 0)
      - complaints (optional, defaults to 0)
      - tenure (optional, defaults to 0)
    """
    name = data.get("name")
    if isinstance(name, str):
        name = name.strip() or None

    customer = Customer(
        customer_id=data["customer_id"].strip(),
        name=name,
        customer_expenditure=float(data.get("customer_expenditure", 0.0)),
        login_frequency=int(data.get("login_frequency", 0)),
        support_calls=int(data.get("support_calls", 0)),
        complaints=int(data.get("complaints", 0)),
        tenure=int(data.get("tenure", 0)),
    )
    db.session.add(customer)
    db.session.commit()
    return customer
