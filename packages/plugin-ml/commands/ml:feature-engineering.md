---
command: ml:feature-engineering
plugin: ml
category: ml-operations
description: Automated feature generation, selection, and transformation
tags:
  - ml
  - feature-engineering
  - feature-selection
  - data-transformation
  - featuretools
tools:
  - @python-backend-expert
  - Read
  - Write
  - Bash
usage: |
  /ml:feature-engineering --input data.csv --target sales --auto-generate --select-top 20
examples:
  - input: /ml:feature-engineering --input data.csv --encode categorical --scale numerical
    description: Apply encoding and scaling
  - input: /ml:feature-engineering --auto-generate --max-depth 2 --select mutual-info
    description: Auto-generate features and select best
---

# /ml:feature-engineering

Automated feature generation, selection, and transformation following industry best practices from Featuretools, scikit-learn, category-encoders, and feature-engine.

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: featuretools, scikit-learn, pandas, category-encoders, feature-engine.

## Purpose

Automate the complex and time-consuming process of feature engineering by:
- **Auto-generating** features using Deep Feature Synthesis (Featuretools)
- **Selecting** most important features using multiple methods (RFE, LASSO, mutual info)
- **Encoding** categorical variables with optimal strategies
- **Transforming** numerical features (scaling, binning, polynomial)
- **Creating** time-series features (lag, rolling windows, seasonal)
- **Extracting** text features (TF-IDF, embeddings)
- **Analyzing** feature importance and interactions
- **Handling** missing values with appropriate strategies

## Command Structure

```bash
/ml:feature-engineering [OPTIONS]
```

### Options

#### Input/Output
- `--input <path>` - Input dataset (CSV, Parquet, JSON)
- `--output <path>` - Output feature matrix (default: features.csv)
- `--target <column>` - Target variable column name
- `--export-definitions <path>` - Save feature definitions for reuse

#### Automated Feature Generation
- `--auto-generate` - Enable Deep Feature Synthesis (Featuretools)
- `--entities <json>` - Entity definitions for multi-table data
- `--relationships <json>` - Relationships between entities
- `--max-depth <n>` - Maximum feature depth (default: 2)
- `--primitives <list>` - Primitives to use (sum, mean, max, min, etc.)
- `--custom-primitives <path>` - Custom primitive definitions

#### Feature Selection
- `--select <method>` - Selection method: rfe, rfecv, lasso, mutual_info, chi2
- `--select-top <n>` - Select top N features
- `--remove-correlated <threshold>` - Remove features with correlation > threshold
- `--variance-threshold <value>` - Remove low-variance features

#### Categorical Encoding
- `--encode <method>` - Encoding method: onehot, target, ordinal, binary, woe, catboost
- `--encode-columns <list>` - Columns to encode (default: auto-detect)
- `--high-cardinality-threshold <n>` - Use binary encoding above this threshold

#### Numerical Transformations
- `--scale <method>` - Scaling: standard, minmax, robust
- `--polynomial-degree <n>` - Create polynomial features up to degree N
- `--interactions-only` - Create only interaction features, not powers
- `--bin <column:bins>` - Bin numerical features (e.g., age:5, income:quantile:10)
- `--log-transform <columns>` - Apply log transformation to skewed features

#### Time-Series Features
- `--lags <column:lags>` - Create lag features (e.g., value:1,2,3)
- `--rolling <column:window:func>` - Rolling statistics (e.g., value:7:mean,std)
- `--datetime-components` - Extract year, month, day, dayofweek, etc.
- `--seasonal-period <n>` - Extract seasonal components with period N

#### Text Features
- `--text-column <column>` - Text column for feature extraction
- `--tfidf` - Create TF-IDF features
- `--max-features <n>` - Maximum text features (default: 100)
- `--ngram-range <min:max>` - N-gram range (default: 1:1)

#### Missing Value Handling
- `--impute <strategy>` - Imputation strategy: mean, median, mode, knn, ffill, bfill
- `--create-missing-indicators` - Create binary indicators for missing values
- `--missing-threshold <value>` - Drop features with > threshold missing

#### Analysis
- `--analyze-importance` - Calculate feature importance
- `--detect-interactions` - Detect feature interactions
- `--visualize` - Generate visualizations
- `--validate` - Validate feature matrix quality

## Workflow

### 1. Auto-Generate Features (Featuretools)

```bash
/ml:feature-engineering \
  --input sales_data/ \
  --entities entities.json \
  --relationships relationships.json \
  --auto-generate \
  --max-depth 2 \
  --primitives sum,mean,max,min,std
```

**entities.json:**
```json
{
  "customers": {
    "data": "customers.csv",
    "index": "customer_id"
  },
  "transactions": {
    "data": "transactions.csv",
    "index": "transaction_id"
  }
}
```

**relationships.json:**
```json
[
  {
    "parent": "customers",
    "parent_column": "customer_id",
    "child": "transactions",
    "child_column": "customer_id"
  }
]
```

### 2. Feature Selection

```bash
# RFE with cross-validation
/ml:feature-engineering \
  --input features.csv \
  --target sales \
  --select rfecv \
  --select-top 20

# LASSO regularization
/ml:feature-engineering \
  --input features.csv \
  --target sales \
  --select lasso \
  --variance-threshold 0.01

# Mutual information
/ml:feature-engineering \
  --input features.csv \
  --target category \
  --select mutual_info \
  --remove-correlated 0.95
```

### 3. Categorical Encoding

```bash
# One-hot encoding
/ml:feature-engineering \
  --input data.csv \
  --encode onehot \
  --encode-columns category,region,type

# Target encoding with validation
/ml:feature-engineering \
  --input data.csv \
  --target sales \
  --encode target \
  --encode-columns category

# Binary encoding for high cardinality
/ml:feature-engineering \
  --input data.csv \
  --encode binary \
  --high-cardinality-threshold 10
```

### 4. Numerical Transformations

```bash
# Scaling and polynomial features
/ml:feature-engineering \
  --input data.csv \
  --scale standard \
  --polynomial-degree 2 \
  --interactions-only

# Binning and log transform
/ml:feature-engineering \
  --input data.csv \
  --bin age:5 income:quantile:10 \
  --log-transform income,revenue
```

### 5. Time-Series Features

```bash
/ml:feature-engineering \
  --input timeseries.csv \
  --lags value:1,2,3,7 \
  --rolling value:7:mean,std value:30:mean \
  --datetime-components \
  --seasonal-period 7
```

### 6. Text Features

```bash
/ml:feature-engineering \
  --input reviews.csv \
  --text-column review_text \
  --tfidf \
  --max-features 100 \
  --ngram-range 1:2
```

### 7. Complete Pipeline

```bash
/ml:feature-engineering \
  --input data.csv \
  --target sales \
  --impute mean \
  --create-missing-indicators \
  --encode onehot \
  --scale standard \
  --polynomial-degree 2 \
  --select mutual_info \
  --select-top 50 \
  --analyze-importance \
  --detect-interactions \
  --export-definitions feature_pipeline.json \
  --output engineered_features.csv
```

## Implementation Approach

### @python-backend-expert Tasks

1. **Setup Environment**
   ```python
   # Install dependencies
   pip install featuretools scikit-learn category-encoders feature-engine pandas numpy
   ```

2. **Parse Command Arguments**
   - Extract all options from command line
   - Validate input files exist
   - Check option compatibility

3. **Load and Validate Data**
   ```python
   import pandas as pd
   df = pd.read_csv(input_path)
   validate_data_quality(df)
   ```

4. **Execute Feature Generation Pipeline**
   - Auto-generate features (if enabled)
   - Apply transformations in correct order
   - Handle missing values
   - Encode categorical variables
   - Transform numerical features
   - Create time-series features
   - Extract text features
   - Select features
   - Analyze importance

5. **Export Results**
   - Save feature matrix
   - Export feature definitions (JSON)
   - Generate visualization reports
   - Create summary statistics

### Key Libraries Integration

#### Featuretools (Deep Feature Synthesis)
```python
import featuretools as ft

# Create entity set
es = ft.EntitySet(id="sales")
es = es.add_dataframe(dataframe_name="customers", dataframe=customers_df, index="customer_id")
es = es.add_dataframe(dataframe_name="transactions", dataframe=transactions_df, index="transaction_id")

# Define relationships
es = es.add_relationship("customers", "customer_id", "transactions", "customer_id")

# Generate features
feature_matrix, feature_defs = ft.dfs(
    entityset=es,
    target_dataframe_name="customers",
    max_depth=2,
    trans_primitives=["sum", "mean", "std", "max", "min"]
)
```

#### Scikit-learn (Feature Selection)
```python
from sklearn.feature_selection import RFECV, SelectFromModel, mutual_info_classif
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LassoCV

# RFE with cross-validation
selector = RFECV(estimator=RandomForestClassifier(), cv=5)
X_selected = selector.fit_transform(X, y)

# LASSO
lasso = LassoCV(cv=5)
lasso.fit(X, y)
selected_features = X.columns[lasso.coef_ != 0]

# Mutual information
mi_scores = mutual_info_classif(X, y)
top_features = X.columns[np.argsort(mi_scores)[-20:]]
```

#### Category-Encoders
```python
import category_encoders as ce

# One-hot encoding
encoder = ce.OneHotEncoder(cols=['category', 'region'])
X_encoded = encoder.fit_transform(X)

# Target encoding
encoder = ce.TargetEncoder(cols=['category'])
X_encoded = encoder.fit_transform(X, y)

# Binary encoding for high cardinality
encoder = ce.BinaryEncoder(cols=['user_id'])
X_encoded = encoder.fit_transform(X)
```

#### Feature-engine
```python
from feature_engine.imputation import MeanMedianImputer
from feature_engine.transformation import LogTransformer
from feature_engine.discretisation import EqualFrequencyDiscretiser

# Imputation
imputer = MeanMedianImputer(imputation_method='mean', variables=['age', 'income'])
X_imputed = imputer.fit_transform(X)

# Log transformation
log_tf = LogTransformer(variables=['income', 'revenue'])
X_log = log_tf.fit_transform(X_imputed)

# Binning
discretiser = EqualFrequencyDiscretiser(q=5, variables=['age'])
X_binned = discretiser.fit_transform(X_log)
```

#### Pandas (Time-Series & Transformations)
```python
# Lag features
for lag in [1, 2, 3, 7]:
    df[f'value_lag_{lag}'] = df['value'].shift(lag)

# Rolling statistics
df['value_rolling_mean_7'] = df['value'].rolling(window=7).mean()
df['value_rolling_std_7'] = df['value'].rolling(window=7).std()

# Datetime components
df['year'] = df['date'].dt.year
df['month'] = df['date'].dt.month
df['dayofweek'] = df['date'].dt.dayofweek
df['quarter'] = df['date'].dt.quarter

# GroupBy aggregations
customer_features = df.groupby('customer_id').agg({
    'amount': ['sum', 'mean', 'std', 'max', 'min'],
    'transaction_id': 'count'
})
```

## Output

### Feature Matrix
```
engineered_features.csv
- All original features
- Generated features
- Transformed features
- Selected features only (if selection applied)
```

### Feature Definitions
```json
{
  "version": "1.0",
  "timestamp": "2025-10-21T10:30:00Z",
  "transformations": [
    {
      "type": "imputation",
      "strategy": "mean",
      "columns": ["age", "income"],
      "params": {"age_mean": 35.5, "income_mean": 65000}
    },
    {
      "type": "encoding",
      "method": "onehot",
      "columns": ["category"],
      "mapping": {"A": [1,0,0], "B": [0,1,0], "C": [0,0,1]}
    },
    {
      "type": "scaling",
      "method": "standard",
      "columns": ["age", "income"],
      "params": {"age_mean": 35.5, "age_std": 7.2, "income_mean": 65000, "income_std": 15000}
    },
    {
      "type": "selection",
      "method": "mutual_info",
      "selected_features": ["feature1", "feature2", "feature3"],
      "scores": [0.45, 0.38, 0.32]
    }
  ],
  "feature_count": {
    "original": 10,
    "generated": 25,
    "after_selection": 15
  }
}
```

### Analysis Report
```
Feature Engineering Summary
==========================

Input:
- Rows: 10,000
- Original features: 10
- Missing values: 5.2%

Generated Features:
- Deep Feature Synthesis: 25 features
- Polynomial features: 15 features
- Time-series features: 12 features
- Total generated: 52 features

Transformations:
✓ Missing values imputed (mean strategy)
✓ Categorical encoded (one-hot: 3 columns)
✓ Numerical scaled (standard scaler)
✓ Log transform applied (2 columns)

Feature Selection:
- Method: Mutual Information
- Features before: 62
- Features after: 20
- Removed correlated: 8 pairs (r > 0.95)
- Removed low variance: 3 features

Feature Importance (Top 10):
1. customer_sum_amount: 0.245
2. rolling_mean_7: 0.198
3. age_income_interaction: 0.176
4. month: 0.154
5. category_encoded: 0.132
...

Feature Interactions Detected:
- age × income: strength 0.82
- month × dayofweek: strength 0.67

Output:
- Final feature count: 20
- Feature matrix saved: engineered_features.csv
- Definitions saved: feature_pipeline.json
```

## Best Practices

### 1. Avoid Feature Leakage
- Never use target in feature generation
- Separate train/test transformations
- Use time-aware splits for time-series

### 2. Handle Missing Values First
```bash
# Always impute or drop before other transformations
/ml:feature-engineering \
  --impute mean \
  --missing-threshold 0.5 \  # Drop if >50% missing
  --create-missing-indicators
```

### 3. Encode Before Scaling
```bash
# Correct order: encode → scale → select
/ml:feature-engineering \
  --encode onehot \
  --scale standard \
  --select mutual_info
```

### 4. Use Cross-Validation for Selection
```bash
# RFECV is more robust than RFE
/ml:feature-engineering \
  --select rfecv  # Instead of --select rfe
```

### 5. Export Definitions for Production
```bash
# Always export for reproducibility
/ml:feature-engineering \
  --export-definitions pipeline.json

# Apply same transformations to new data
/ml:feature-engineering \
  --input new_data.csv \
  --apply-definitions pipeline.json
```

### 6. Validate Feature Quality
```bash
/ml:feature-engineering \
  --validate \
  --variance-threshold 0.01 \
  --remove-correlated 0.95
```

## Common Patterns

### Pattern 1: Automated Feature Discovery
```bash
# Let Featuretools discover features
/ml:feature-engineering \
  --auto-generate \
  --max-depth 2 \
  --select mutual_info \
  --select-top 50
```

### Pattern 2: Manual Feature Engineering
```bash
# Explicit transformations
/ml:feature-engineering \
  --encode target \
  --polynomial-degree 2 \
  --lags value:1,2,3 \
  --rolling value:7:mean,std
```

### Pattern 3: High-Dimensional Data
```bash
# Aggressive feature reduction
/ml:feature-engineering \
  --variance-threshold 0.05 \
  --remove-correlated 0.90 \
  --select lasso \
  --select-top 100
```

### Pattern 4: Time-Series Focus
```bash
# Time-series specific features
/ml:feature-engineering \
  --lags value:1,7,14,30 \
  --rolling value:7:mean,std,min,max \
  --datetime-components \
  --seasonal-period 7 \
  --impute ffill
```

## Error Handling

### Missing Required Arguments
```
Error: --target is required when using --select or --encode target
Solution: Specify target column: --target sales
```

### Incompatible Options
```
Error: Cannot use --auto-generate without --entities and --relationships
Solution: Provide entity definitions or disable --auto-generate
```

### Feature Leakage Detection
```
Warning: Target variable 'sales' appears in feature names
Recommendation: Review feature generation to prevent leakage
```

## Integration

### With Model Training
```bash
# Feature engineering → Model training
/ml:feature-engineering \
  --input data.csv \
  --target churn \
  --output features.csv \
  --export-definitions pipeline.json

/ml:train \
  --input features.csv \
  --target churn \
  --model random-forest
```

### With Hyperparameter Tuning
```bash
# Find best feature engineering params
for depth in 1 2 3; do
  /ml:feature-engineering \
    --auto-generate \
    --max-depth $depth \
    --output features_depth_${depth}.csv

  /ml:train --input features_depth_${depth}.csv --evaluate
done
```

## Related Commands

- `/ml:data-validation` - Validate data quality before feature engineering
- `/ml:train` - Train models using engineered features
- `/ml:evaluate` - Evaluate feature importance
- `/ml:deploy` - Deploy feature engineering pipeline

## References

- Featuretools Documentation: https://docs.featuretools.com/
- Scikit-learn Feature Selection: https://scikit-learn.org/stable/modules/feature_selection.html
- Category Encoders: https://contrib.scikit-learn.org/category_encoders/
- Feature Engine: https://feature-engine.trainindata.com/
