import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# 1. Load the dataset
# Using 'r' handles the Windows backslashes in your path perfectly
df = pd.read_csv(r'C:\Users\LOQ\OneDrive\Desktop\Project_Exi\DATASET_Training.csv')

# 2. Drop Non-Predictive Columns & Data Leakage
# 'churn_score' tells the model the answer directly, so we must remove it to train the AI properly.
# We also drop personal info which holds no predictive math value.
columns_to_drop = ['customer_id', 'name', 'phone', 'join_date', 'churn_score']
df = df.drop(columns=[col for col in columns_to_drop if col in df.columns])

# 3. Fix the Target Variable ('churn')
# Since your data likely uses True/False or 1/0 instead of 'Yes'/'No', 
# this line safely converts the column to pure 1s and 0s without creating NaNs.
df['churn'] = df['churn'].astype(int)

# 4. Separate Features (X) and Target (y)
X = df.drop(columns=['churn'])
y = df['churn']

# 5. Handle Categorical Features (like 'plan_type')
# We explicitly grab object columns to avoid the pandas version warning you received
categorical_cols = X.select_dtypes(include=['object', 'category']).columns.tolist()
X_encoded = pd.get_dummies(X, columns=categorical_cols, drop_first=True)

# 6. Scale Numerical Features
# Finds continuous numeric columns like 'monthly_expenditure' and 'tenure_months'
numerical_cols = X_encoded.select_dtypes(include=['int32', 'int64', 'float64']).columns.tolist()
scaler = StandardScaler()

# Scales numbers so high values (like expenditure) don't overpower low values (like complaints)
X_encoded[numerical_cols] = scaler.fit_transform(X_encoded[numerical_cols])

# 7. Perform a Stratified Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(
    X_encoded, y, test_size=0.2, random_state=42, stratify=y
)

print(f"✅ Training data features: {X_train.shape[1]}")
print(f"✅ Training records: {X_train.shape[0]}")
print(f"✅ Target distribution:\n{y_train.value_counts(normalize=True) * 100}")
print("Data is successfully preprocessed and ready for modeling!")
