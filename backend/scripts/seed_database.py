"""
seed_database.py — CustomChurn Database Seeding Script
========================================================

Purpose
-------
Populate the MySQL customchurn_db with the project's authoritative CSV data.
This script is idempotent: running it more than once will not create duplicate records.

Tables populated
----------------
1. customer    → Data/DATASET_customers_Training.csv     (1020 rows)
2. prediction  → Data/DATASET_churn_analysis.csv         (1020 rows)

Tables NOT populated and why
-----------------------------
complaint — The customers CSV contains a `complaints` aggregate count per customer,
            not individual complaint records. There is no source file containing
            individual complaint records (complaint_type, description, status, etc.).
            Fabricating individual records from aggregate counts is explicitly prohibited.
            The complaint table will remain empty until a proper complaint data source
            is available.

Column mappings
---------------
Customer:
  CSV customer_id        → customer.customer_id  (string, prefixed "CUST-<n>")
  CSV name               → customer.name
  CSV monthly_expenditure → customer.customer_expenditure
  CSV login_frequency    → customer.login_frequency
  CSV support_calls      → customer.support_calls
  CSV complaints         → customer.complaints   (aggregate count)
  CSV tenure_months      → customer.tenure

Prediction:
  CSV customer_id        → prediction.customer_id (same prefix format)
  CSV churn_probability  → prediction.churn_probability (divided by 100: source is 0–100 scale)
  CSV risk_level         → prediction.risk_level
  CSV analysis_date      → prediction.predicted_at (parsed as UTC datetime)

Idempotency
-----------
- Customers are upserted using customer_id as the natural key.
- Predictions: one prediction per customer_id is kept (latest wins on re-run).
  On first run: one prediction inserted per customer.
  On re-run: existing predictions are not duplicated (skip if customer already has one).

Usage
-----
Run from the backend/ directory:
    python scripts/seed_database.py

Or from the project root:
    python backend/scripts/seed_database.py
"""

import sys
import os
from pathlib import Path

# ── Path setup ────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = BACKEND_DIR.parent

# Add backend to sys.path so Flask app imports work
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

DATA_DIR = PROJECT_ROOT / "Data"
CUSTOMERS_CSV = DATA_DIR / "DATASET_customers_Training.csv"
CHURN_CSV = DATA_DIR / "DATASET_churn_analysis.csv"

# ── Validate data files ───────────────────────────────────────────────────────
for path in (CUSTOMERS_CSV, CHURN_CSV):
    if not path.exists():
        print(f"[FATAL] Required data file not found: {path}")
        sys.exit(1)

# ── Imports ───────────────────────────────────────────────────────────────────
import pandas as pd
from datetime import datetime, timezone

# Silently load Flask app (must happen after sys.path is configured)
from app import create_app
from app.extensions import db
from app.models.customer import Customer
from app.models.prediction import Prediction


def _parse_date_utc(date_str: str) -> datetime:
    """Parse YYYY-MM-DD string into a UTC-aware datetime at midnight."""
    return datetime.strptime(str(date_str).strip(), "%Y-%m-%d").replace(tzinfo=timezone.utc)


def _format_customer_id(raw_id) -> str:
    """
    Convert source integer customer_id to string format.
    The Customer model uses String(64) PKs. We prefix with 'CUST-' to make
    the ID format explicit and avoid accidental integer/string comparisons.
    """
    return f"CUST-{int(raw_id)}"


def seed_customers(df_cust: pd.DataFrame) -> dict:
    """
    Upsert customers from DATASET_customers_Training.csv.

    Returns a summary dict with inserted / updated / skipped counts.
    """
    inserted = 0
    updated = 0
    skipped = []

    for _, row in df_cust.iterrows():
        cid = _format_customer_id(row["customer_id"])

        try:
            existing = db.session.get(Customer, cid)

            if existing is None:
                customer = Customer(
                    customer_id=cid,
                    name=str(row["name"]).strip(),
                    customer_expenditure=float(row["monthly_expenditure"]),
                    login_frequency=int(row["login_frequency"]),
                    support_calls=int(row["support_calls"]),
                    complaints=int(row["complaints"]),
                    tenure=int(row["tenure_months"]),
                )
                db.session.add(customer)
                inserted += 1
            else:
                # Update fields to keep data consistent with source
                existing.name = str(row["name"]).strip()
                existing.customer_expenditure = float(row["monthly_expenditure"])
                existing.login_frequency = int(row["login_frequency"])
                existing.support_calls = int(row["support_calls"])
                existing.complaints = int(row["complaints"])
                existing.tenure = int(row["tenure_months"])
                updated += 1

        except Exception as exc:
            skipped.append({"customer_id": cid, "reason": str(exc)})

    db.session.flush()
    return {"inserted": inserted, "updated": updated, "skipped": skipped}


def seed_predictions(df_churn: pd.DataFrame) -> dict:
    """
    Insert one prediction record per customer from DATASET_churn_analysis.csv.

    Idempotency: If a customer already has any prediction record, that customer
    is skipped — we do not create duplicates.

    churn_probability in source is 0–100 scale.
    Prediction.churn_probability stores 0–1 scale (model convention).
    """
    inserted = 0
    skipped = []

    # Build set of customer_ids that already have predictions for O(1) lookup
    existing_pred_cids = {
        row[0]
        for row in db.session.query(Prediction.customer_id).distinct().all()
    }

    for _, row in df_churn.iterrows():
        cid = _format_customer_id(row["customer_id"])

        # Skip if customer already has a prediction
        if cid in existing_pred_cids:
            skipped.append({"customer_id": cid, "reason": "prediction already exists"})
            continue

        # Skip if customer doesn't exist in DB (FK constraint safety)
        if db.session.get(Customer, cid) is None:
            skipped.append({"customer_id": cid, "reason": "customer not found in DB"})
            continue

        try:
            # Source churn_probability is 0–100; model stores 0–1
            raw_prob = float(row["churn_probability"])
            churn_prob = round(raw_prob / 100.0, 4)

            risk_level = str(row["risk_level"]).strip()
            if risk_level not in ("High", "Medium", "Low"):
                skipped.append({
                    "customer_id": cid,
                    "reason": f"unrecognized risk_level: '{risk_level}'"
                })
                continue

            predicted_at = _parse_date_utc(row["analysis_date"])

            prediction = Prediction(
                customer_id=cid,
                churn_probability=churn_prob,
                risk_level=risk_level,
                predicted_at=predicted_at,
            )
            db.session.add(prediction)
            inserted += 1
            existing_pred_cids.add(cid)  # prevent duplicates within same run

        except Exception as exc:
            skipped.append({"customer_id": cid, "reason": str(exc)})

    db.session.flush()
    return {"inserted": inserted, "skipped": skipped}


def run():
    print("=" * 62)
    print(" CustomChurn — Database Seeding Script")
    print("=" * 62)
    print(f"  Backend dir : {BACKEND_DIR}")
    print(f"  Project root: {PROJECT_ROOT}")
    print(f"  Customers   : {CUSTOMERS_CSV}")
    print(f"  Churn data  : {CHURN_CSV}")
    print()

    # ── Load CSVs ─────────────────────────────────────────────────────────────
    print("[1/5] Loading source data files...")
    df_cust = pd.read_csv(CUSTOMERS_CSV)
    df_churn = pd.read_csv(CHURN_CSV)
    print(f"      customers CSV  : {len(df_cust):,} rows, columns: {list(df_cust.columns)}")
    print(f"      churn CSV      : {len(df_churn):,} rows, columns: {list(df_churn.columns)}")

    # ── Basic validation ──────────────────────────────────────────────────────
    required_cust_cols = {"customer_id", "name", "monthly_expenditure", "login_frequency",
                          "support_calls", "complaints", "tenure_months"}
    required_churn_cols = {"customer_id", "churn_probability", "risk_level", "analysis_date"}

    missing_cust = required_cust_cols - set(df_cust.columns)
    missing_churn = required_churn_cols - set(df_churn.columns)

    if missing_cust:
        print(f"[FATAL] Customers CSV missing required columns: {missing_cust}")
        sys.exit(1)
    if missing_churn:
        print(f"[FATAL] Churn CSV missing required columns: {missing_churn}")
        sys.exit(1)

    null_counts_cust = df_cust[list(required_cust_cols)].isnull().sum()
    if null_counts_cust.any():
        print(f"[FATAL] Null values found in customers CSV required columns:\n{null_counts_cust[null_counts_cust > 0]}")
        sys.exit(1)

    print("      Validation passed — no missing columns or null values.")
    print()

    # ── Initialize Flask app ──────────────────────────────────────────────────
    print("[2/5] Initializing Flask app (development config)...")
    # Change working dir to backend so .env and app imports resolve correctly
    os.chdir(BACKEND_DIR)
    app = create_app("development")
    print("      Flask app initialized.")
    print()

    # ── Seed inside app context and single transaction ────────────────────────
    with app.app_context():
        print("[3/5] Seeding Customer table...")
        with db.session.begin():
            cust_result = seed_customers(df_cust)

        print(f"      Inserted : {cust_result['inserted']:>6,}")
        print(f"      Updated  : {cust_result['updated']:>6,}")
        print(f"      Skipped  : {len(cust_result['skipped']):>6,}")
        if cust_result["skipped"]:
            for s in cust_result["skipped"][:5]:
                print(f"        → {s}")
        print()

        print("[4/5] Seeding Prediction table...")
        with db.session.begin():
            pred_result = seed_predictions(df_churn)

        print(f"      Inserted : {pred_result['inserted']:>6,}")
        skipped_pred = [s for s in pred_result["skipped"] if "already exists" not in s["reason"]]
        skipped_dupe = [s for s in pred_result["skipped"] if "already exists" in s["reason"]]
        print(f"      Skipped (already exist) : {len(skipped_dupe):>4,}")
        print(f"      Skipped (other reasons) : {len(skipped_pred):>4,}")
        if skipped_pred:
            for s in skipped_pred[:5]:
                print(f"        → {s}")
        print()

        print("[5/5] Verification query...")
        from sqlalchemy import func, text
        customer_count = db.session.query(func.count(Customer.customer_id)).scalar()
        complaint_count = db.session.execute(text("SELECT COUNT(*) FROM complaint")).scalar()
        prediction_count = db.session.query(func.count()).select_from(Prediction).scalar()
        customers_with_preds = db.session.query(
            func.count(func.distinct(Prediction.customer_id))
        ).scalar()

        print(f"      customer  table rows           : {customer_count:,}")
        print(f"      complaint table rows           : {complaint_count:,}  (intentionally empty — no source data)")
        print(f"      prediction table rows          : {prediction_count:,}")
        print(f"      customers WITH predictions     : {customers_with_preds:,}")
        print()

    print("=" * 62)
    print(" Seeding complete.")
    print()
    print(" NOTE: complaint table is intentionally empty.")
    print(" The source CSV contains only aggregate complaint counts")
    print(" per customer, not individual complaint records.")
    print(" Individual complaint records require a separate source file")
    print(" with complaint_type, description, and status per record.")
    print("=" * 62)


if __name__ == "__main__":
    run()
