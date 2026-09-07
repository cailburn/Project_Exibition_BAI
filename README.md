# AI-Powered Customer Churn Prediction & Retention System
An intelligent early warning system that predicts customer attrition, explains the driving factors, and automates targeted retention strategies.
---

## 📖 Project Overview
In subscription-based and service-oriented industries, acquiring a new customer is significantly more expensive than retaining an existing one. This project goes beyond basic binary classification to provide a complete, proactive retention engine. Using the benchmark Kaggle Telco Customer Churn dataset, the system leverages machine learning to forecast precise churn probabilities, explain the reasoning behind these predictions, and automatically recommend actionable business interventions before a customer leaves.

## ✨ Key Features
- **Predictive Analytics & Scoring:** Calculates the exact probability of customer churn using advanced machine learning algorithms (Random Forest, Logistic Regression).

- **Explainable AI (XAI):** Utilizes SHAP (SHapley Additive exPlanations) to transparently display the specific factors—such as short tenure or high monthly bills—driving an individual customer's risk score.

- **Customer Segmentation & CLV:** Applies K-Means clustering to categorize active customers (e.g., High-Value, At-Risk) and calculates Customer Lifetime Value (CLV) to help management prioritize retention budgets.

- **Sentiment & Complaint Analysis:** Integrates NLTK to process text from customer reviews and support tickets, classifying complaint severity and negative sentiment to identify critical, high-emotion triggers.

- **Intelligent Automation:** Maps churn reasons to a recommendation engine that triggers automated, personalized retention emails or SMS alerts (e.g., offering a 20% discount) when risk thresholds are crossed.

- **Interactive Management Dashboard:** Provides a centralized, real-time interface displaying total Revenue at Risk, critical customer counts, and top churn drivers.
---
## 🛠️ Technology Stack
- Core AI & Data Processing

- Language: Python

- Machine Learning: Scikit-learn (Classification & Clustering)

- Explainability & NLP: SHAP, NLTK

- Data Manipulation: Pandas, NumPy

- Backend & Database

- API Framework: FastAPI

- Database: MySQL or PostgreSQL

- Frontend & Deployment

- User Interface: Streamlit (Alternative: React.js/Bootstrap)

- Version Control & Containerization: Git, GitHub, Docker

- Cloud Hosting: Render, Railway, or Streamlit Community Cloud

## ⚙️ Architecture & Process Flow
- Data Intake: Consumes baseline customer data including behavioral habits, transaction history, customer support interactions, and demographic profiles.

- Training & Scoring: Machine learning models identify patterns from historical churn data, establishing a baseline to assign a concrete "Churn Risk Score" (e.g., 91%) to current active users.

- Explainability & Valuation: The system generates a Customer Health Score, outlines the exact reasons for the churn risk using SHAP, and projects the user's CLV.

- Delivery & Automation: The FastAPI backend serves these predictions to the interactive dashboard while simultaneously triggering automated retention protocols via Email/SMS APIs.
---

## 🚀 Local Installation & Setup
1. Clone the repository
```bash
git clone https://github.com/cailburn/churn-prediction-system.git
cd churn-prediction-system
```

2. Create a virtual environment
```Bash
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
```

3. Install dependencies
```Bash
pip install -r requirements.txt
```
4. Run the FastAPI Backend
```Bash
uvicorn app.main:app --reload
```
5. Run the Streamlit Frontend Dashboard
```Bash
streamlit run frontend/app.py
```
