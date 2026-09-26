from typing import Any, Dict, Optional
from app.extensions import db
from app.models.customer import Customer
from app.models.prediction import Prediction


def get_customer(customer_id: str) -> Optional[Customer]:
    """
    Retrieve Customer record by primary key customer_id.
    """
    return db.session.get(Customer, customer_id)


def merge_customer_with_features(customer: Customer, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Map existing Customer fields to ML features when customer_id is supplied.

    Database ↔ ML Field Mapping:
      customer.customer_expenditure → monthly_expenditure
      customer.tenure → tenure_months
      customer.complaints → complaints
      customer.support_calls → support_calls
      customer.login_frequency → login_frequency

    Note: Customer does not have plan_type in the database.
    Therefore, plan_type is NEVER guessed or defaulted from DB; it must be
    supplied explicitly in the payload.
    Payload values take precedence over database values if both are supplied.
    """
    merged = dict(payload)

    # Database ↔ ML mapping with fallback to customer record
    if "monthly_expenditure" not in merged:
        if "customer_expenditure" in merged:
            merged["monthly_expenditure"] = merged.pop("customer_expenditure")
        else:
            merged["monthly_expenditure"] = customer.customer_expenditure

    if "tenure_months" not in merged:
        if "tenure" in merged:
            merged["tenure_months"] = merged.pop("tenure")
        else:
            merged["tenure_months"] = customer.tenure

    if "complaints" not in merged:
        merged["complaints"] = customer.complaints

    if "support_calls" not in merged:
        merged["support_calls"] = customer.support_calls

    if "login_frequency" not in merged:
        merged["login_frequency"] = customer.login_frequency

    return merged


def save_prediction_record(
    customer_id: str,
    churn_probability: float,
    risk_level: str,
) -> Prediction:
    """
    Persist prediction result into the Prediction table for a verified customer.
    Database logic is kept strictly isolated from ML inference.
    """
    prediction = Prediction(
        customer_id=customer_id,
        churn_probability=churn_probability,
        risk_level=risk_level,
    )
    db.session.add(prediction)
    db.session.commit()
    return prediction
