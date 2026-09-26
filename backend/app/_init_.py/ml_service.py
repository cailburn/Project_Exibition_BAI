from pathlib import Path
import joblib

# Finding the project root from this file's location.
# ml_service.py
# → services
# → app
# → backend
# → project root
PROJECT_ROOT = Path(__file__).resolve().parents[3]
MODEL_PATH = PROJECT_ROOT / "Preprocessing" / "churn_rf_pipeline.pkl"

# Loading the trained ML pipeline once when the service is imported.
_model = None
def load_model():
    """Load and return the trained churn prediction pipeline."""
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Churn model not found at: {MODEL_PATH}"
            )
        _model = joblib.load(MODEL_PATH)
    return _model

def predict_churn(input_data):
    """Generate a churn prediction using the trained pipeline.
    input_data should contain:
    - tenure_months
    - complaints
    - support_calls
    - login_frequency
    - monthly_expenditure
    - plan_type
    """

    model = load_model()

    required_features = [
        "tenure_months",
        "complaints",
        "support_calls",
        "login_frequency",
        "monthly_expenditure",
        "plan_type",
    ]
    missing_features = [
        feature for feature in required_features
        if feature not in input_data
    ]

    if missing_features:
        raise ValueError(
            f"Missing required features: {missing_features}"
        )
    model_input = {
        feature: input_data[feature]
        for feature in required_features
    }
    prediction = model.predict([model_input])[0]
    probabilities = model.predict_proba([model_input])[0]

    # Finding the probability corresponding to churn = 1.
    classes = model.named_steps["model"].classes_
    churn_index = list(classes).index(1)
    churn_probability = float(probabilities[churn_index])

    churn_percentage = churn_probability * 100

    if churn_percentage <= 30:
        risk_level = "Low"
    elif churn_percentage <= 70:
        risk_level = "Medium"
    else:
        risk_level = "High"
    return {
        "predicted_churn": int(prediction),
        "churn_probability": round(churn_probability, 4),
        "churn_percentage": round(churn_percentage, 2),
        "risk_level": risk_level,
    }
