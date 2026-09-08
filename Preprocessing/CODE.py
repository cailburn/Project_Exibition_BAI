from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import pandas as pd
import shap
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
log = logging.getLogger(__name__)


# --------------------------------------------------------------------------- #
# Config — everything you'd want to tune lives here, nowhere else
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Config:
    data_dir: Path = Path(r"C:\Users\LOQ\OneDrive\Desktop\Project_Exi")
    training_csv: Path = data_dir / "DATASET_Training.csv"
    recommendations_csv: Path = data_dir / "DATASET_retention_recommendations.csv"
    models_dir: Path = Path("models")
    output_csv: Path = Path("DATASET_churn_analysis.csv")

    id_col: str = "customer_id"
    target_col: str = "churn"

    # Columns dropped before modeling, grouped by *why* they're dropped
    leaky_cols: tuple = ("churn_score",)              # would tell the model the answer directly
    non_predictive_cols: tuple = ("name", "phone", "join_date")  # personal info, no predictive math value
    categorical_cols: tuple = ("plan_type",)           # needs one-hot encoding, not scaling

    high_risk_threshold: float = 75.0  # percent — matches the 'High' risk_level cutoff used upstream
    top_n_features: int = 10
    test_size: float = 0.2
    random_state: int = 42

    run_cross_validation: bool = True
    cv_folds: int = 5
    run_shap: bool = True
    shap_sample_size: int = 500  # cap SHAP computation for speed on large test sets


CFG = Config()


# --------------------------------------------------------------------------- #
# 1. Load & feature framing
# --------------------------------------------------------------------------- #
def load_dataset(cfg: Config) -> pd.DataFrame:
    if not cfg.training_csv.exists():
        raise FileNotFoundError(f"Training CSV not found at {cfg.training_csv}")
    df = pd.read_csv(cfg.training_csv)
    df[cfg.target_col] = df[cfg.target_col].astype(int)
    log.info("Loaded %d rows, %d columns", *df.shape)
    return df


def build_feature_frame(df: pd.DataFrame, cfg: Config) -> pd.DataFrame:
    """Drop id/target/leaky/non-predictive columns, keep everything else as features."""
    drop_cols = [cfg.id_col, cfg.target_col, *cfg.leaky_cols, *cfg.non_predictive_cols]
    return df.drop(columns=[c for c in drop_cols if c in df.columns])


def build_preprocessor(X: pd.DataFrame, cfg: Config) -> ColumnTransformer:
    """Scale numeric columns, one-hot-encode explicitly named categorical columns.

    Categorical columns are taken from cfg.categorical_cols (not auto-detected by
    dtype) so a stray text column can't silently get treated as numeric or vice versa.
    """
    categorical_cols = [c for c in cfg.categorical_cols if c in X.columns]
    numerical_cols = [
        c for c in X.select_dtypes(include=["number"]).columns if c not in categorical_cols
    ]

    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numerical_cols),
            ("cat", OneHotEncoder(drop="first", handle_unknown="ignore"), categorical_cols),
        ]
    )


# --------------------------------------------------------------------------- #
# 2. Train & evaluate
# --------------------------------------------------------------------------- #
def train_models(X_train, y_train, preprocessor: ColumnTransformer) -> tuple[Pipeline, Pipeline]:
    """Train a Logistic Regression baseline alongside the primary Random Forest model."""
    lr_pipeline = Pipeline([
        ("preprocess", preprocessor),
        ("model", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=CFG.random_state)),
    ])
    rf_pipeline = Pipeline([
        ("preprocess", preprocessor),
        ("model", RandomForestClassifier(
            n_estimators=100, class_weight="balanced", random_state=CFG.random_state, n_jobs=-1
        )),
    ])

    lr_pipeline.fit(X_train, y_train)
    rf_pipeline.fit(X_train, y_train)
    return lr_pipeline, rf_pipeline


def evaluate_model(model: Pipeline, X_test, y_test, name: str = "Model") -> None:
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]
    log.info("--- %s Performance ---", name)
    print(classification_report(y_test, y_pred))
    print(f"ROC-AUC Score: {roc_auc_score(y_test, y_proba):.4f}\n")


def print_top_features(rf_pipeline: Pipeline, cfg: Config) -> pd.Series:
    """Quick, cheap sanity check: are the drivers sensible (e.g. complaints,
    support_calls, login_frequency) rather than an artifact of encoding?
    """
    feature_names = rf_pipeline.named_steps["preprocess"].get_feature_names_out()
    importances = rf_pipeline.named_steps["model"].feature_importances_
    top_features = (
        pd.Series(importances, index=feature_names)
        .sort_values(ascending=False)
        .head(cfg.top_n_features)
    )
    print(f"Top {cfg.top_n_features} features driving churn risk:")
    print(top_features, "\n")
    return top_features


def cross_validate(model: Pipeline, X, y, cfg: Config) -> None:
    """Sanity-check with k-fold cross-validation instead of relying on a single split."""
    scores = cross_val_score(model, X, y, cv=cfg.cv_folds, scoring="roc_auc", n_jobs=-1)
    log.info("CV ROC-AUC: mean=%.4f, std=%.4f (folds=%s)", scores.mean(), scores.std(), scores.round(3))


# --------------------------------------------------------------------------- #
# 3. Persist model
# --------------------------------------------------------------------------- #
def save_model(model: Pipeline, cfg: Config, filename: str = "churn_rf_pipeline.pkl") -> Path:
    """Persist ONE pipeline artifact (preprocessor + model) — no separate scaler.pkl to keep in sync."""
    cfg.models_dir.mkdir(parents=True, exist_ok=True)
    path = cfg.models_dir / filename
    joblib.dump(model, path)
    log.info("Saved pipeline (preprocessor + model) to %s", path)
    return path


# --------------------------------------------------------------------------- #
# 4. Business output: high-risk customers + retention actions
# --------------------------------------------------------------------------- #
def build_action_plan(customer_ids_test, y_proba, y_pred, cfg: Config) -> pd.DataFrame:
    churn_analysis = pd.DataFrame({
        cfg.id_col: pd.Series(customer_ids_test).values,
        "churn_risk_percentage": y_proba * 100,
        "predicted_churn": y_pred,
    })

    high_risk = churn_analysis[churn_analysis["churn_risk_percentage"] > cfg.high_risk_threshold]

    if not cfg.recommendations_csv.exists():
        raise FileNotFoundError(f"Recommendations CSV not found at {cfg.recommendations_csv}")
    recommendations_df = pd.read_csv(cfg.recommendations_csv)

    final_action_plan = high_risk.merge(recommendations_df, on=cfg.id_col, how="inner")
    final_action_plan.to_csv(cfg.output_csv, index=False)

    log.info("Found %d high-risk customers (of %d in test batch)", len(high_risk), len(churn_analysis))
    log.info("Action plan saved to %s", cfg.output_csv)
    print(final_action_plan[[cfg.id_col, "churn_risk_percentage", "priority"]].head())
    return final_action_plan


# --------------------------------------------------------------------------- #
# 5. Explainability (SHAP)
# --------------------------------------------------------------------------- #
def run_shap_analysis(rf_pipeline: Pipeline, X_test: pd.DataFrame, cfg: Config) -> None:
    """Compute SHAP on a capped sample for speed, using the fitted preprocessor
    from the pipeline so column encoding matches exactly what the model saw.
    """
    log.info("Calculating SHAP values (sampled up to %d rows)...", cfg.shap_sample_size)

    preprocessor = rf_pipeline.named_steps["preprocess"]
    rf_model = rf_pipeline.named_steps["model"]

    sample = X_test.sample(min(cfg.shap_sample_size, len(X_test)), random_state=cfg.random_state)
    X_transformed = preprocessor.transform(sample)
    feature_names = preprocessor.get_feature_names_out()
    X_transformed_df = pd.DataFrame(
        X_transformed.toarray() if hasattr(X_transformed, "toarray") else X_transformed,
        columns=feature_names,
    )

    explainer = shap.TreeExplainer(rf_model)
    shap_values = explainer(X_transformed_df)

    cfg.models_dir.mkdir(parents=True, exist_ok=True)

    plt.figure(figsize=(10, 6))
    plt.title("Top Global Churn Drivers")
    shap.summary_plot(shap_values[:, :, 1], X_transformed_df, show=False)
    plt.tight_layout()
    plt.savefig(cfg.models_dir / "shap_global_summary.png")
    plt.clf()

    plt.figure(figsize=(10, 6))
    shap.waterfall_plot(shap_values[0, :, 1], show=False)
    plt.title("Individual Risk Breakdown (Customer index 0)")
    plt.tight_layout()
    plt.savefig(cfg.models_dir / "shap_local_waterfall.png")
    plt.close("all")

    log.info("SHAP analysis complete — see %s", cfg.models_dir)


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #
def main(cfg: Config = CFG) -> None:
    # 1. Load once — reused for train/test AND for mapping predictions back to
    #    customer_id (no second CSV read).
    df = load_dataset(cfg)
    X = build_feature_frame(df, cfg)
    y = df[cfg.target_col]
    customer_ids = df[cfg.id_col]

    # 2. Stratified split BEFORE any fitting; customer_ids is split alongside
    #    X and y so ids_test lines up with the test predictions exactly.
    X_train, X_test, y_train, y_test, ids_train, ids_test = train_test_split(
        X, y, customer_ids, test_size=cfg.test_size, random_state=cfg.random_state, stratify=y
    )
    log.info(
        "Train: %d rows | Test: %d rows | Churn rate (train): %.2f%%",
        len(X_train), len(X_test), y_train.mean() * 100,
    )

    # 3. Preprocessing + model bundled in one Pipeline each. Calling .fit()
    #    fits the preprocessor on X_train ONLY — test-set statistics never
    #    leak into scaling/encoding.
    preprocessor = build_preprocessor(X, cfg)
    lr_pipeline, rf_pipeline = train_models(X_train, y_train, preprocessor)

    # 4. Evaluate both models (baseline + primary)
    evaluate_model(lr_pipeline, X_test, y_test, name="Logistic Regression (baseline)")
    evaluate_model(rf_pipeline, X_test, y_test, name="Random Forest (primary)")

    # 5. Fast sanity check on what's driving predictions
    print_top_features(rf_pipeline, cfg)

    # 6. Optional: k-fold cross-validation for a more reliable ROC-AUC estimate
    if cfg.run_cross_validation:
        cross_validate(rf_pipeline, X, y, cfg)

    # 7. Persist ONE pipeline artifact
    save_model(rf_pipeline, cfg)

    # 8. Map predictions back to customer_id (via the split-off ids_test —
    #    no need to re-read the training CSV) and build the retention action plan
    y_proba = rf_pipeline.predict_proba(X_test)[:, 1]
    y_pred = rf_pipeline.predict(X_test)
    build_action_plan(ids_test, y_proba, y_pred, cfg)

    # 9. Optional: deeper explainability via SHAP (slower, sampled)
    if cfg.run_shap:
        run_shap_analysis(rf_pipeline, X_test, cfg)


if __name__ == "__main__":
    main()
