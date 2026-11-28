---
command: ml:model-compare
plugin: ml
category: ml-operations
description: Compare ML models with comprehensive metrics and recommendations
tags:
  - ml
  - model-comparison
  - evaluation
  - mlflow
  - benchmarking
tools:
  - python-backend-expert
  - Read
  - Write
  - Bash
usage: |
  /ml:model-compare --models model1,model2,model3 --metric f1_score --registry mlflow
examples:
  - input: /ml:model-compare --models rf,xgb,lgbm --task classification
    description: Compare three classifiers
  - input: /ml:model-compare --registry mlflow --filter "accuracy>0.9"
    description: Compare models from MLflow registry
  - input: /ml:model-compare --models model1.pkl,model2.pkl --metrics accuracy,precision,recall --benchmark
    description: Compare models with benchmarking
  - input: /ml:model-compare --framework pytorch --models *.pt --select-best --criteria "accuracy:0.7,latency:0.3"
    description: Auto-select best model with weighted criteria
---

# ml:model-compare

Compare machine learning models across frameworks with comprehensive metrics, performance benchmarking, and automated selection recommendations.

## Description

Enterprise-grade ML model comparison supporting:
- **Multi-framework**: scikit-learn, TensorFlow, PyTorch, XGBoost, LightGBM, CatBoost
- **Comprehensive metrics**: Classification, regression, ranking metrics
- **Performance benchmarking**: Inference time, throughput, memory usage, model size
- **Statistical analysis**: Significance testing, confidence intervals, overfitting detection
- **Model registry integration**: MLflow, Weights & Biases, custom registries
- **Visualization**: Comparison tables, ROC curves, confusion matrices, performance charts
- **Automated selection**: Multi-criteria optimization, constraint-based filtering, Pareto analysis
- **A/B test planning**: Sample size calculation, test design recommendations

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: mlflow, scikit-learn, tensorflow, pytorch, wandb, xgboost, lightgbm.

## Usage

```bash
/ml:model-compare [options]
```

## Options

### Model Loading
- `--models <paths>` - Comma-separated model file paths or names
- `--framework <framework>` - Framework: sklearn, tensorflow, pytorch, xgboost, lightgbm, catboost
- `--registry <registry>` - Load from registry: mlflow, wandb
- `--registry-uri <uri>` - Registry URI (for MLflow)
- `--filter <expression>` - Filter models by metadata (e.g., "accuracy>0.9")

### Metrics Comparison
- `--metrics <metrics>` - Comma-separated metrics (default: auto-detect by task)
- `--task <task>` - Task type: classification, regression, ranking
- `--test-data <path>` - Path to test dataset
- `--custom-metric <name:function>` - Custom metric function

### Performance Benchmarking
- `--benchmark` - Enable performance benchmarking
- `--iterations <n>` - Number of benchmark iterations (default: 10)
- `--batch-sizes <sizes>` - Test batch sizes (default: 1,32,64,128)
- `--measure-memory` - Measure memory usage
- `--percentiles <p>` - Latency percentiles (default: 50,95,99)

### Statistical Analysis
- `--statistical-test <test>` - Statistical test: paired_ttest, mcnemar, wilcoxon
- `--confidence <level>` - Confidence level (default: 0.95)
- `--detect-overfitting` - Detect overfitting via train/test gap

### Visualization
- `--format <format>` - Output format: markdown, json, csv, html (default: markdown)
- `--output <file>` - Output file path
- `--include-charts` - Include ASCII charts
- `--include-roc` - Include ROC curves
- `--include-confusion-matrix` - Include confusion matrices

### Model Selection
- `--select-best` - Automatically select best model
- `--criterion <metric>` - Single selection criterion
- `--criteria <weighted>` - Weighted criteria (e.g., "accuracy:0.7,latency:0.3")
- `--constraints <constraints>` - Constraints (e.g., "latency_ms<100,size_mb<50")
- `--method <method>` - Selection method: single, weighted, pareto
- `--rank-all` - Rank all models
- `--ab-test` - Generate A/B test recommendations

## Examples

### Compare Scikit-learn Classifiers

```bash
/ml:model-compare \
  --models rf_model.pkl,xgb_model.pkl,lgbm_model.pkl \
  --framework sklearn \
  --task classification \
  --metrics accuracy,precision,recall,f1_score,auc_roc \
  --test-data data/test.csv \
  --statistical-test paired_ttest \
  --benchmark
```

**Output:**
```
🔬 ML Model Comparison Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Framework: scikit-learn
Task: Binary Classification
Models: 3
Test Samples: 10,000

📊 Metrics Comparison
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Model          | Accuracy | Precision | Recall | F1 Score | AUC-ROC |
|----------------|----------|-----------|--------|----------|---------|
| rf_model       | 0.8542   | 0.8423    | 0.8612 | 0.8516   | 0.9234  |
| xgb_model      | 0.8734** | 0.8654    | 0.8798 | 0.8725   | 0.9412  |
| lgbm_model     | 0.8698   | 0.8601    | 0.8782 | 0.8690   | 0.9387  |

** = Statistically significant improvement (p < 0.05)

⚡ Performance Benchmarking
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Model          | Inference (ms) | Throughput (/s) | Memory (MB) | Size (MB) |
|----------------|----------------|-----------------|-------------|-----------|
| rf_model       | 12.3           | 81.3            | 245         | 52.1      |
| xgb_model      | 5.7*           | 175.4*          | 189*        | 31.2*     |
| lgbm_model     | 4.2*           | 238.1*          | 156*        | 24.8*     |

* = Best in category

📈 Statistical Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Paired t-test (xgb_model vs rf_model):
  - Test statistic: 2.847
  - P-value: 0.032
  - Result: Statistically significant difference (p < 0.05)
  - Effect size (Cohen's d): 0.421

Paired t-test (lgbm_model vs rf_model):
  - Test statistic: 2.103
  - P-value: 0.068
  - Result: Not statistically significant

🎯 Best Model Recommendation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Selected Model: xgb_model

Justification:
  ✓ Highest accuracy (0.8734) with statistical significance
  ✓ Best AUC-ROC (0.9412) indicating strong discriminative power
  ✓ Excellent inference performance (5.7ms, 175 predictions/sec)
  ✓ Compact model size (31.2 MB)
  ✓ Low memory footprint (189 MB)

Trade-offs:
  - Slightly slower than lgbm_model (5.7ms vs 4.2ms)
  - Accuracy improvement: +2.2% over rf_model
  - Inference speed: 2.2x faster than rf_model

Recommendation: Deploy xgb_model to production
```

### Compare PyTorch Models with Auto-Selection

```bash
/ml:model-compare \
  --framework pytorch \
  --models resnet50.pt,mobilenet_v2.pt,efficientnet_b0.pt \
  --test-data imagenet_val/ \
  --benchmark \
  --select-best \
  --criteria "accuracy:0.5,inference_time_ms:0.3,model_size_mb:0.2" \
  --constraints "inference_time_ms<50,model_size_mb<100"
```

### Compare from MLflow Registry

```bash
/ml:model-compare \
  --registry mlflow \
  --registry-uri http://localhost:5000 \
  --models "production/credit_model,staging/credit_model_v2" \
  --metrics accuracy,precision,recall,auc_roc \
  --statistical-test paired_ttest \
  --ab-test
```

**Output includes A/B test plan:**
```
🧪 A/B Test Recommendation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Models for Testing:
  - Control: production/credit_model (accuracy: 0.8542)
  - Treatment: staging/credit_model_v2 (accuracy: 0.8734)

Expected Improvement: +2.2% (absolute)

Sample Size Calculation:
  - Baseline conversion rate: 85.42%
  - Minimum detectable effect: 2.2%
  - Statistical power: 80%
  - Significance level: 5%
  - Required sample size per variant: 3,847

Traffic Split: 50/50

Duration Estimate:
  - At 1,000 requests/day: 8 days
  - At 10,000 requests/day: 1 day

Success Criteria:
  ✓ Treatment accuracy > 0.865 (p < 0.05)
  ✓ No regression in precision or recall
  ✓ Inference time < 10ms (p95)
```

### Compare with Custom Metrics

```bash
/ml:model-compare \
  --models model1.pkl,model2.pkl \
  --framework sklearn \
  --custom-metric "business_value:lambda y_true, y_pred: sum([100 if p == t else -50 for t, p in zip(y_true, y_pred)])" \
  --metrics accuracy,business_value \
  --select-best \
  --criterion business_value
```

### Batch Compare with Filtering

```bash
/ml:model-compare \
  --registry mlflow \
  --filter "tags.stage='staging' AND metrics.accuracy > 0.85" \
  --benchmark \
  --rank-all \
  --output comparison_report.md
```

## Model Comparison Workflow

1. **Load Models**: From files, registries, or experiments
2. **Evaluate Metrics**: Calculate all requested metrics on test data
3. **Benchmark Performance**: Measure inference time, throughput, memory
4. **Statistical Testing**: Test for significant differences
5. **Generate Report**: Create comprehensive comparison visualization
6. **Select Best Model**: Apply criteria and constraints for recommendation

## Supported Frameworks

### Scikit-learn
- **File formats**: .pkl, .joblib
- **Metrics**: All sklearn.metrics
- **Loading**: joblib.load(), pickle.load()

### TensorFlow/Keras
- **File formats**: .h5, SavedModel, .pb
- **Metrics**: keras.metrics, tf.metrics
- **Loading**: tf.keras.models.load_model()

### PyTorch
- **File formats**: .pt, .pth, .ckpt
- **Metrics**: torchmetrics
- **Loading**: torch.load()

### XGBoost
- **File formats**: .json, .model, .ubj
- **Metrics**: XGBoost eval metrics
- **Loading**: xgb.Booster()

### LightGBM
- **File formats**: .txt, .model
- **Metrics**: LightGBM eval metrics
- **Loading**: lgb.Booster()

### CatBoost
- **File formats**: .cbm, .bin
- **Metrics**: CatBoost eval metrics
- **Loading**: CatBoost.load_model()

## Available Metrics

### Classification
- **Binary**: accuracy, precision, recall, f1_score, auc_roc, auc_pr, log_loss, brier_score
- **Multiclass**: accuracy, macro/micro/weighted precision/recall/f1, confusion_matrix
- **Probability**: calibration_curve, reliability_diagram

### Regression
- **Error metrics**: mae, mse, rmse, mape, smape
- **Score metrics**: r2_score, explained_variance, max_error
- **Quantile**: quantile_loss, pinball_loss

### Ranking
- **IR metrics**: ndcg, mrr, map, precision_at_k, recall_at_k

## Performance Metrics

- **Inference time**: Average, p50, p95, p99 latency
- **Throughput**: Predictions per second
- **Memory usage**: Peak memory during inference
- **Model size**: Disk size in MB
- **Batch performance**: Scaling across batch sizes

## Statistical Tests

### Paired t-test
- Compares mean performance across folds
- Assumes normal distribution
- Tests if difference is significant

### McNemar's test
- For classification models
- Tests on contingency table of predictions
- Non-parametric test

### Wilcoxon signed-rank test
- Non-parametric alternative to t-test
- Does not assume normality

## Model Selection Methods

### Single Criterion
Select model with best performance on one metric:
```bash
--select-best --criterion accuracy
```

### Weighted Multi-Criteria
Weight multiple criteria:
```bash
--criteria "accuracy:0.5,inference_time_ms:0.3,model_size_mb:0.2"
```
- Higher weights = more important
- Metrics can be maximized or minimized

### Constraint-Based
Filter by constraints first:
```bash
--constraints "inference_time_ms<50,model_size_mb<100"
```

### Pareto Optimal
Find Pareto frontier:
```bash
--method pareto --objectives accuracy,inference_time_ms
```

## Integration with MLflow

Load models from MLflow registry:

```python
import mlflow

# By model name and version
model = mlflow.pyfunc.load_model("models:/credit_model/1")

# By stage
model = mlflow.pyfunc.load_model("models:/credit_model/Production")

# By run ID
model = mlflow.pyfunc.load_model("runs:/<run_id>/model")
```

MLflow comparison tracks:
- Model versions
- Training metrics
- Hyperparameters
- Artifacts
- Stage (production, staging, archived)

## Integration with Weights & Biases

Load models from W&B artifacts:

```python
import wandb

run = wandb.init()
artifact = run.use_artifact('model-name:latest')
model_dir = artifact.download()
```

## Output Formats

### Markdown (default)
- Tables with ASCII charts
- Statistical summaries
- Recommendations
- Human-readable

### JSON
```json
{
  "models": [
    {
      "name": "model1",
      "metrics": {"accuracy": 0.85},
      "performance": {"inference_time_ms": 10}
    }
  ],
  "statistical_tests": {...},
  "recommendation": {...}
}
```

### CSV
```csv
model,accuracy,precision,recall,f1_score,inference_time_ms
model1,0.85,0.84,0.86,0.85,10
model2,0.87,0.86,0.88,0.87,15
```

### HTML
- Interactive tables
- Charts and graphs
- Sortable columns
- Filterable results

## Implementation

This command uses specialized ML agents:
- **@pytorch-expert** - PyTorch model evaluation
- **@tensorflow-keras-expert** - TensorFlow evaluation
- **@scikit-learn-expert** - Scikit-learn comparison
- **@gradient-boosting-expert** - XGBoost/LightGBM/CatBoost
- **@python-backend-expert** - Statistical analysis and orchestration

Process:
1. Query Context7 for framework-specific evaluation APIs
2. Load models from files or registries
3. Calculate all requested metrics on test data
4. Benchmark inference performance
5. Run statistical significance tests
6. Generate comparison visualization
7. Apply selection criteria and recommend best model

## Best Practices Applied

Based on Context7 documentation:

**Model Evaluation:**
1. **Stratified splitting** - Preserve class distribution in test set
2. **Cross-validation** - Multiple folds for robust estimates
3. **Appropriate metrics** - Match metrics to business objectives
4. **Statistical testing** - Verify improvements are significant
5. **Confidence intervals** - Quantify uncertainty

**Performance Benchmarking:**
1. **Warmup runs** - Exclude cold start from measurements
2. **Multiple iterations** - Average over many runs
3. **Percentile latencies** - Capture tail performance
4. **Realistic batch sizes** - Test production scenarios
5. **Memory profiling** - Track peak memory usage

**Model Selection:**
1. **Multi-criteria optimization** - Balance accuracy and efficiency
2. **Constraint satisfaction** - Meet production requirements
3. **Pareto analysis** - Identify trade-offs
4. **Domain knowledge** - Consider business context
5. **A/B testing** - Validate in production

## Related Commands

- `/ml:train-optimize` - Optimize model training
- `/ml:automl` - Automated model selection and tuning
- `/ml:deploy` - Deploy selected model
- `/ml:monitor` - Monitor model performance in production
- `/perf:profile` - Profile model performance

## Troubleshooting

### Models Won't Load
- Check framework installation: `pip install tensorflow pytorch xgboost`
- Verify file format matches framework
- Check file permissions and paths
- Ensure compatible library versions

### Metrics Calculation Fails
- Verify test data format (X_test, y_test)
- Check for missing values or NaNs
- Ensure labels match model output format
- Use `--task` to specify classification vs regression

### Statistical Tests Show No Significance
- Increase test set size for more statistical power
- Use cross-validation for multiple measurements
- Check if models are actually different
- Consider practical significance vs statistical significance

### Memory Issues During Benchmarking
- Reduce batch sizes: `--batch-sizes 1,8,16`
- Decrease iterations: `--iterations 5`
- Disable memory measurement: remove `--measure-memory`
- Process models sequentially

### MLflow Connection Failed
- Verify MLflow server is running: `mlflow ui`
- Check `--registry-uri` is correct
- Ensure network connectivity
- Check authentication if required

## Version History

- v2.0.0 - Initial Schema v2.0 release with Context7 integration
- Multi-framework support (scikit-learn, TensorFlow, PyTorch, XGBoost, LightGBM, CatBoost)
- Comprehensive metrics comparison with statistical testing
- Performance benchmarking (latency, throughput, memory)
- MLflow and Weights & Biases integration
- Automated model selection with multi-criteria optimization
- A/B test planning and recommendations
