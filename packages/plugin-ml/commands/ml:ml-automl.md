# ml:automl

Automated machine learning with Context7-verified patterns for AutoGluon, FLAML, and AutoKeras. Get best models with minimal code.

## Description

Comprehensive AutoML for rapid model development:
- AutoGluon (best overall quality, multi-layer stacking)
- FLAML (fast, cost-effective, 10x faster)
- AutoKeras (deep learning, neural architecture search)
- H2O AutoML (enterprise-grade, distributed)
- Model comparison and selection
- Automated feature engineering

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: autogluon, flaml, keras, h2o.

## Usage

```bash
/ml:automl [options]
```

## Options

- `--framework <autogluon|flaml|autokeras|h2o>` - AutoML framework
- `--task <classification|regression|timeseries>` - ML task type
- `--time-budget <seconds>` - Maximum training time
- `--metric <roc_auc|rmse|accuracy>` - Optimization metric
- `--preset <best_quality|medium_quality|fast>` - Quality preset
- `--output <file>` - Save model and report

## Examples

### Quick AutoML with AutoGluon
```bash
/ml:automl --framework autogluon --time-budget 3600 --preset best_quality
```

### Fast Prototyping with FLAML
```bash
/ml:automl --framework flaml --time-budget 300 --metric roc_auc
```

### Deep Learning with AutoKeras
```bash
/ml:automl --framework autokeras --task classification --time-budget 1800
```

### Enterprise with H2O
```bash
/ml:automl --framework h2o --time-budget 3600 --output h2o_models
```

## AutoML Patterns

### 1. AutoGluon (Best Overall)

**Pattern from Context7 (/autogluon/autogluon):**

#### Tabular Classification/Regression

```python
# BEFORE: Manual model selection and tuning (hours of work)
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GridSearchCV

param_grid = {'n_estimators': [100, 200], 'max_depth': [5, 10, 20]}
model = RandomForestClassifier()
grid_search = GridSearchCV(model, param_grid, cv=5)
grid_search.fit(X_train, y_train)
# ❌ Only one model type, manual tuning

# AFTER: AutoGluon (trains 10+ models, auto-tunes, ensembles)
from autogluon.tabular import TabularPredictor, TabularDataset

# Load data
train_data = TabularDataset('train.csv')
test_data = TabularDataset('test.csv')

# Train with AutoML
predictor = TabularPredictor(
    label='target_column',
    eval_metric='roc_auc',  # or 'rmse', 'accuracy', 'f1', etc.
    problem_type='binary'  # or 'multiclass', 'regression'
).fit(
    train_data=train_data,
    time_limit=3600,  # 1 hour time budget
    presets='best_quality',  # or 'medium_quality', 'optimize_for_deployment'
    num_bag_folds=5,  # K-fold bagging
    num_bag_sets=1,
    num_stack_levels=2  # Multi-layer stacking
)

# Predictions
predictions = predictor.predict(test_data)
probabilities = predictor.predict_proba(test_data)

# Evaluate
performance = predictor.evaluate(test_data)
print(f"Test {predictor.eval_metric.name}: {performance}")

# Leaderboard (all models tried)
leaderboard = predictor.leaderboard(test_data, silent=True)
print(leaderboard)

# Feature importance
importance = predictor.feature_importance(test_data)
print("Top 10 features:")
print(importance.head(10))

# Save model
predictor.save('my_predictor')
```

**✅ AutoGluon Features:**
- Trains 10+ model types automatically:
  - LightGBM, XGBoost, CatBoost
  - Random Forest, Extra Trees
  - K-Nearest Neighbors
  - Neural Networks (FastAI, PyTorch)
  - Linear models
- Multi-layer stacking ensembles
- Automatic preprocessing:
  - Missing value imputation
  - Categorical encoding
  - Feature scaling
  - Outlier handling
- Hyperparameter optimization
- K-fold bagging for robustness

**Results:**
```
AutoGluon Training Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Models Trained: 14
Time: 3600 seconds
Best Model: WeightedEnsemble_L2

Leaderboard:
                         model  score_val  fit_time  pred_time
0       WeightedEnsemble_L2     0.9234     3589.2      2.34
1       WeightedEnsemble_L1     0.9198     1834.5      1.89
2       LightGBM              0.9145      245.3      0.12
3       CatBoost              0.9132      432.1      0.15
4       XGBoost               0.9087      189.7      0.11
...

Top Features:
1. feature_23: 0.145
2. feature_7:  0.132
3. feature_15: 0.098
```

### 2. FLAML (Fast, Cost-Effective)

**Pattern from Context7 (/microsoft/flaml):**

```python
# AFTER: Efficient AutoML with budget constraints
from flaml import AutoML
from sklearn.metrics import roc_auc_score, accuracy_score

# Initialize
automl = AutoML()

# Train with strict time/cost budget
automl.fit(
    X_train,
    y_train,
    task='classification',  # or 'regression'
    metric='roc_auc',  # metric to optimize
    time_budget=300,  # 5 minutes only!
    estimator_list=[
        'lgbm',      # LightGBM
        'xgboost',   # XGBoost
        'catboost',  # CatBoost
        'rf',        # Random Forest
        'extra_tree' # Extra Trees
    ],
    eval_method='cv',  # Cross-validation
    n_splits=5,
    early_stop=True,
    log_file_name='flaml_log.txt',
    verbose=1
)

# Best model
print(f"Best model: {automl.best_estimator}")
print(f"Best config: {automl.best_config}")
print(f"Best score: {1 - automl.best_loss}")
print(f"Training time: {automl.best_config_train_time:.2f}s")

# Predictions
predictions = automl.predict(X_test)
probas = automl.predict_proba(X_test)

# Evaluate
accuracy = accuracy_score(y_test, predictions)
roc_auc = roc_auc_score(y_test, probas[:, 1])
print(f"Test accuracy: {accuracy:.4f}")
print(f"Test ROC-AUC: {roc_auc:.4f}")

# Feature importance
print("Feature importance:")
print(automl.feature_importances_)

# Model info
print(f"Number of iterations: {automl.best_iteration}")
print(f"Total training time: {automl._time_taken_best_iter:.2f}s")
```

**⚡ FLAML Benefits:**
- 10x faster than traditional AutoML
- Efficient search algorithm (CFO - Cost-Frugal Optimization)
- Low computational cost
- Excellent for budget-constrained scenarios
- Early stopping to save time

### 3. AutoKeras (Neural Architecture Search)

**Pattern from Context7 (/keras/autokeras):**

```python
# AFTER: AutoML for deep learning
import autokeras as ak
import tensorflow as tf

# Image Classification
image_clf = ak.ImageClassifier(
    max_trials=10,  # Number of architectures to try
    overwrite=True,
    directory='image_classifier',
    objective='val_accuracy',
    tuner='bayesian',  # or 'random', 'hyperband'
    seed=42
)

# Train
image_clf.fit(
    x_train,
    y_train,
    epochs=10,
    validation_split=0.2,
    callbacks=[
        tf.keras.callbacks.EarlyStopping(patience=3)
    ]
)

# Evaluate
accuracy = image_clf.evaluate(x_test, y_test)
print(f"Test accuracy: {accuracy[1]:.4f}")

# Export best model
best_model = image_clf.export_model()
best_model.save('best_image_model.keras')

# Text Classification
text_clf = ak.TextClassifier(
    max_trials=10,
    overwrite=True,
    directory='text_classifier'
)

text_clf.fit(
    x_train_text,
    y_train,
    epochs=5,
    validation_split=0.2
)

# Structured Data (Tabular)
structured_clf = ak.StructuredDataClassifier(
    max_trials=10,
    overwrite=True,
    directory='structured_classifier',
    objective='val_accuracy'
)

structured_clf.fit(
    x_train_df,
    y_train,
    epochs=10,
    validation_split=0.2
)
```

**🔥 AutoKeras Features:**
- Neural architecture search (NAS)
- Automatic network design
- Support for:
  - Image classification/regression
  - Text classification/regression
  - Structured data (tabular)
  - Time series forecasting
  - Multi-modal data
- Bayesian optimization
- Exports standard Keras models

### 4. H2O AutoML (Enterprise-Grade)

**Pattern from Context7 (/h2o/automl):**

```python
# AFTER: Distributed AutoML at scale
import h2o
from h2o.automl import H2OAutoML

# Initialize H2O cluster
h2o.init(
    nthreads=-1,  # Use all CPU cores
    max_mem_size='16G'
)

# Load data
train = h2o.import_file('train.csv')
test = h2o.import_file('test.csv')

# Identify features and target
x = train.columns
y = 'target'
x.remove(y)

# Train AutoML
aml = H2OAutoML(
    max_runtime_secs=3600,  # 1 hour
    max_models=20,
    seed=1,
    sort_metric='AUC',
    include_algos=[
        'GBM',         # Gradient Boosting Machine
        'XGBoost',     # XGBoost
        'DRF',         # Distributed Random Forest
        'DeepLearning', # Neural networks
        'GLM'          # Generalized Linear Model
    ],
    nfolds=5,  # Cross-validation
    keep_cross_validation_predictions=True,
    keep_cross_validation_models=True
)

# Fit
aml.train(x=x, y=y, training_frame=train)

# Leaderboard
lb = aml.leaderboard
print("AutoML Leaderboard:")
print(lb.head(rows=10))

# Best model
best_model = aml.leader
print(f"\nBest model: {best_model.model_id}")

# Performance on test set
perf = best_model.model_performance(test)
print(f"\nTest performance:")
print(perf)

# Predictions
predictions = best_model.predict(test)
print(predictions.head())

# Variable importance
varimp = best_model.varimp(use_pandas=True)
print("\nTop 10 important features:")
print(varimp.head(10))

# Save model
h2o.save_model(best_model, path='h2o_models')

# Shutdown H2O
h2o.cluster().shutdown()
```

**🏢 H2O AutoML Features:**
- Distributed training (scales to clusters)
- Enterprise-grade stability
- Multiple algorithm types
- Stacked ensembles
- Cross-validation built-in
- Extensive model interpretability
- Java/Python/R support

## Framework Comparison

| Framework | Speed | Quality | Best For |
|-----------|-------|---------|----------|
| **AutoGluon** | Medium | ⭐⭐⭐⭐⭐ | Best overall quality, production |
| **FLAML** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Fast prototyping, tight budgets |
| **AutoKeras** | Slow | ⭐⭐⭐⭐ | Deep learning (images, text) |
| **H2O AutoML** | Fast | ⭐⭐⭐⭐ | Enterprise, distributed, scale |

## Decision Tree

```
Need AutoML?
│
├─ Tabular data, best quality → AutoGluon
├─ Tight time budget (<10 min) → FLAML
├─ Images/text/deep learning → AutoKeras
├─ Enterprise/distributed → H2O AutoML
└─ Custom control → Manual ML
```

## Output Format

```
🤖 AutoML Training Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Framework: AutoGluon
Task: Binary Classification
Metric: ROC-AUC
Time Budget: 3600s
Time Used: 3589s

📊 Dataset Info
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Training samples: 80,000
  Test samples: 20,000
  Features: 156
  Missing values: 2.3%
  Class balance: 0.65 / 0.35

🏆 Model Leaderboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Rank  Model                    ROC-AUC  Training Time
  ────────────────────────────────────────────────────
  1     WeightedEnsemble_L2      0.9234   3589s
  2     WeightedEnsemble_L1      0.9198   1834s
  3     LightGBM_BAG_L1          0.9145    245s
  4     CatBoost_BAG_L1          0.9132    432s
  5     XGBoost_BAG_L1           0.9087    189s
  6     RandomForest_BAG_L1      0.8956    178s
  7     ExtraTrees_BAG_L1        0.8923    156s
  8     NeuralNetTorch_BAG_L1    0.8876    567s
  9     KNeighbors_BAG_L1        0.8654     89s
  10    LinearModel_BAG_L1       0.8234     45s

📈 Best Model Performance
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Model: WeightedEnsemble_L2
  ROC-AUC: 0.9234
  Accuracy: 0.8756
  F1-Score: 0.8234

  Ensemble Strategy:
  - Base models: 14
  - Stacking layers: 2
  - Bagging folds: 5

🔍 Feature Importance (Top 10)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. customer_age          0.145
  2. transaction_amount    0.132
  3. account_balance       0.098
  4. previous_transactions 0.087
  5. credit_score          0.076
  6. days_since_signup     0.065
  7. merchant_category     0.054
  8. payment_method        0.043
  9. device_type           0.038
  10. time_of_day          0.032

💡 Insights & Recommendations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ High model diversity in ensemble (14 models)
  ✅ Strong performance (ROC-AUC > 0.92)
  ✅ Stable across cross-validation folds

  📌 Next Steps:
  1. Deploy WeightedEnsemble_L2 to production
  2. Monitor top 10 features for data drift
  3. Consider feature engineering for features 11-20
  4. Set up A/B testing vs current model

Model saved to: ./AutogluonModels/ag-20250116_143022/
```

## Implementation

This command uses the **@automl-expert** agent:

1. Query Context7 for AutoML best practices
2. Analyze dataset characteristics
3. Select appropriate AutoML framework
4. Configure training parameters
5. Execute AutoML training
6. Generate comprehensive report
7. Save best models

## Best Practices Applied

Based on Context7 documentation:

**AutoGluon:**
1. **Multi-layer stacking** - Best ensemble quality
2. **K-fold bagging** - Robustness
3. **Time budgets** - Resource management
4. **Quality presets** - Easy configuration
5. **Feature importance** - Model interpretability

**FLAML:**
1. **CFO algorithm** - Efficient search
2. **Early stopping** - Save computation
3. **Cost-frugal** - Budget optimization
4. **Cross-validation** - Robust estimates

**AutoKeras:**
1. **Bayesian optimization** - Smart architecture search
2. **Multi-modal support** - Various data types
3. **Keras export** - Standard models

**H2O AutoML:**
1. **Distributed training** - Scalability
2. **Stacked ensembles** - High performance
3. **Interpretability** - Enterprise requirements

## Related Commands

- `/ml:train-optimize` - Manual training optimization
- `/ml:deploy` - Model deployment
- `/ml:monitor` - Model monitoring
- `/perf:analyze` - Training performance analysis

## Troubleshooting

### AutoGluon Out of Memory
- Reduce `num_bag_folds`
- Use `presets='medium_quality'`
- Limit `time_limit`
- Exclude memory-heavy models

### FLAML Not Finding Good Models
- Increase `time_budget`
- Add more estimators to `estimator_list`
- Check data quality and preprocessing
- Try different `metric`

### AutoKeras Slow
- Reduce `max_trials`
- Use `tuner='random'` instead of 'bayesian'
- Enable GPU acceleration
- Reduce `epochs`

### H2O Cluster Issues
- Check `max_mem_size` allocation
- Verify `nthreads` setting
- Ensure cluster is properly initialized
- Check network connectivity for distributed

## Version History

- v2.0.0 - Initial Schema v2.0 release with Context7 integration
- AutoGluon tabular classification/regression
- FLAML cost-effective AutoML
- AutoKeras neural architecture search
- H2O AutoML distributed training
