import os
from pathlib import Path
from typing import Any, Dict, Optional
import joblib
import pandas as pd

# Canonical feature contract for the trained Random Forest pipeline
REQUIRED_FEATURES = [
    "tenure_months",
    "complaints",
    "support_calls",
    "login_frequency",
    "monthly_expenditure",
    "plan_type",
]

# Root project directory resolution
BASE_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
WORKSPACE_ROOT = BASE_BACKEND_DIR.parent
DEFAULT_MODEL_PATH = WORKSPACE_ROOT / "Preprocessing" / "churn_rf_pipeline.pkl"

# Cached pipeline instance
_model: Optional[Any] = None


def get_model_path() -> Path:
    """
    Resolve the canonical model path using project-relative resolution.
    Falls back gracefully if overridden via environment variable.
    """
    env_path = os.getenv("CHURN_PIPELINE_PATH")
    if env_path and Path(env_path).is_file():
        return Path(env_path)
    return DEFAULT_MODEL_PATH


def load_model(model_path: Optional[str | Path] = None):
    """
    Load the trained scikit-learn Pipeline from disk using joblib.
    Caches the loaded pipeline in memory to avoid reloading on each request.
    """
    global _model
    if _model is not None and model_path is None:
        return _model

    target_path = Path(model_path) if model_path else get_model_path()
    if not target_path.exists():
        raise FileNotFoundError(f"Trained ML pipeline not found at {target_path}")

    loaded_pipeline = joblib.load(target_path)

    # Cache default pipeline
    if model_path is None:
        _model = loaded_pipeline

    return loaded_pipeline


def predict_churn(input_data: Dict[str, Any], model: Optional[Any] = None) -> Dict[str, Any]:
    """
    Generate churn inference using the loaded scikit-learn Pipeline.

    Validates that the 6 required features exist, preserves exact names and order,
    passes the DataFrame directly to the pipeline (no manual preprocessing),
    and computes churn prediction, probability for class 1, churn percentage,
    and risk level.
    """
    if not isinstance(input_data, dict):
        raise TypeError("Input data must be a dictionary")

    # Validate that all required features exist
    missing_features = [f for f in REQUIRED_FEATURES if f not in input_data]
    if missing_features:
        raise ValueError(f"Missing required feature(s): {', '.join(missing_features)}")

    # Preserve exact feature names and order
    feature_row = {feature: input_data[feature] for feature in REQUIRED_FEATURES}
    df = pd.DataFrame([feature_row], columns=REQUIRED_FEATURES)

    # Obtain model instance
    pipeline = model if model is not None else load_model()

    # Inference: predict class and class probabilities
    pred = pipeline.predict(df)
    proba = pipeline.predict_proba(df)

    # Extract probability corresponding to churn class 1
    classes = list(pipeline.classes_)
    if 1 not in classes:
        raise ValueError(f"Churn class 1 not found in model classes: {classes}")
    class_1_idx = classes.index(1)
    raw_prob = float(proba[0][class_1_idx])

    churn_prob = round(raw_prob, 4)
    churn_percentage = round(churn_prob * 100, 2)

    # Determine risk level based on specified thresholds:
    # 0-30% = Low, 31-70% = Medium, 71-100% = High
    if churn_percentage <= 30.0:
        risk_level = "Low"
    elif churn_percentage <= 70.0:
        risk_level = "Medium"
    else:
        risk_level = "High"

    return {
        "predicted_churn": int(pred[0]),
        "churn_probability": churn_prob,
        "churn_percentage": churn_percentage,
        "risk_level": risk_level,
    }
