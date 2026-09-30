# AI-Powered Customer Churn Prediction & Retention System

An intelligent customer churn prediction and retention-support system that identifies at-risk customers, prioritizes their attention and provides actionable retention recommendations.
---

## 📖 Project Overview
In subscription-based and service-oriented industries, retaining existing customers is an important business challenge. Customer behavior such as tenure, expenditure, login frequency, support interactions and complaints can provide useful signals of potential churn.

**CustomChurn** transforms these customer signals into actionable churn insights through an integrated machine learning and customer management system.
The system uses a trained **Random Forest classification pipeline** to generate churn probabilities and classify customers into **Low, Medium, or High risk**. These predictions are then combined with complaint activity to prioritize customers and provide risk-based retention recommendations.
The platform brings together customer management, churn prediction, complaint tracking, prioritization, retention support and dashboard monitoring in a single full-stack application.

---

## 🚀 Key Features

### 1. ML-Based Churn Prediction
- Predicts customer churn probability using a Random Forest classifier.
- Uses six customer features:
  - Tenure
  - Monthly Expenditure
  - Login Frequency
  - Support Calls
  - Complaints
  - Plan Type
- Generates:
  - Churn Probability
  - Churn Percentage
  - Predicted Churn
  - Risk Level

Risk levels are classified as:

| Churn Probability | Risk Level |
|---|---|
| 0–30% | Low |
| 31–70% | Medium |
| 71–100% | High |

The trained model is loaded during inference using Joblib. The application does not retrain the model during normal API requests.

---

### 2. Customer Management
- View customer records
- Search customers by name or ID
- View individual customer details
- Add new customers
- Validate customer information
- Handle duplicate customer IDs

---

### 3. Customer Priority Queue
Customers can be prioritized using:
1. Risk level
2. Churn probability
3. Complaint activity

This helps identify customers who may require greater attention.

---

### 4. Complaint Management
- Create customer complaints
- Associate complaints with customers
- View complaint details
- Search and filter complaints
- Update complaint status
- Track resolution time
- Record resolution timestamps

Supported complaint statuses include:
- Open
- In Progress
- Resolved
- Pending

---

### 5. Retention Recommendations
CustomChurn provides risk-based recommendations based on the customer's latest churn prediction and complaint activity.
Examples include:
- Proactive customer contact
- Retention incentives or upgrades
- Engagement monitoring
- Complaint follow-up
- Complaint resolution

The recommendation engine supports retention decisions but does not automatically contact customers or execute offers.

---

### 6. Interactive Dashboard
The dashboard provides an overview of the customer base, including:
- Total Customers
- High-Risk Customers
- Total Complaints
- Average Churn Probability
- Risk Distribution
- Complaint Status
- Prediction Coverage
- Customers Requiring Attention

---
---

## 🛠️ Technology Stack

### Core AI & Data Processing
- **Language:** Python
- **Machine Learning:** Scikit-learn
- **ML Algorithm:** Random Forest Classifier
- **Model Serialization:** Joblib
- **Data Manipulation:** Pandas, NumPy

### Backend & Database
- **API Framework:** Flask
- **API Communication:** REST APIs
- **Database:** MySQL
- **ORM:** Flask-SQLAlchemy / SQLAlchemy
- **MySQL Driver:** PyMySQL
- **Configuration:** python-dotenv
- **Testing:** Pytest

### Frontend
- **User Interface:** React
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **API Requests:** Axios
- **Routing:** React Router
- **Data Visualization:** Recharts
- **Icons:** Lucide React

### Version Control
- GitHub

---
