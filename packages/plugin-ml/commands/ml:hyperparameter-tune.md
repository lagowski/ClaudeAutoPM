---
command: ml:hyperparameter-tune
plugin: ml
category: ml-operations
description: Automated hyperparameter optimization with Bayesian methods
tags:
  - ml
  - hyperparameter-tuning
  - optimization
  - optuna
  - ray-tune
tools:
  - @python-backend-expert
  - Read
  - Write
  - Bash
usage: |
  /ml:hyperparameter-tune --model xgboost --strategy bayesian --trials 100 --metric f1_score
examples:
  - input: /ml:hyperparameter-tune --model RandomForest --strategy grid --cv 5
    description: Grid search with 5-fold CV
  - input: /ml:hyperparameter-tune --strategy optuna --trials 200 --distributed ray
    description: Distributed Bayesian optimization with Optuna
  - input: /ml:hyperparameter-tune --strategy random --trials 50 --early-stopping
    description: Random search with early stopping
  - input: /ml:hyperparameter-tune --multi-objective --optimize accuracy,latency
    description: Multi-objective optimization for accuracy and latency
---

# ml:hyperparameter-tune

Automated hyperparameter optimization with multiple search strategies, distributed tuning, and experiment tracking.

## Description

Comprehensive hyperparameter tuning system supporting:
- **Search Strategies**: Grid, Random, Bayesian (Optuna), TPE, Hyperband
- **Distributed Tuning**: Ray Tune with parallel trial execution
- **Multi-Objective**: Optimize multiple metrics simultaneously (Pareto optimization)
- **Early Stopping**: Median pruning, Hyperband, ASHA schedulers
- **Experiment Tracking**: MLflow, Weights & Biases integration
- **Cross-Validation**: K-fold, stratified, time-series splits
- **Resource Management**: GPU allocation, concurrent trial limits
- **Visualization**: Optimization history, parameter importance, contour plots

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: optuna, ray-tune, scikit-learn, hyperopt, wandb.

**WARNING:** This command was implemented without Context7 MCP verification due to MCP unavailability. All patterns should be re-verified against Context7 documentation before production use.

## Usage

```bash
/ml:hyperparameter-tune [options]
```

## Options

### Search Strategy
- `--strategy <grid|random|bayesian|optuna|ray>` - Optimization strategy (default: optuna)
- `--trials <n>` - Number of trials to run (default: 100)
- `--timeout <seconds>` - Maximum optimization time

### Parameter Space
- `--config <file>` - Parameter space configuration file (JSON/YAML)
- `--param <name=type:range>` - Define parameter inline
  - Example: `--param "learning_rate=continuous:0.001-0.1:log"`
  - Example: `--param "n_estimators=discrete:50-500:50"`
  - Example: `--param "optimizer=categorical:adam,sgd,rmsprop"`

### Model & Data
- `--model <name>` - Model type (sklearn, xgboost, pytorch, tensorflow)
- `--cv <k>` - K-fold cross-validation (default: 5)
- `--metric <name>` - Optimization metric (accuracy, f1_score, etc.)
- `--data <path>` - Path to training data

### Optimization Features
- `--multi-objective` - Enable multi-objective optimization
- `--optimize <metrics>` - Comma-separated metrics for multi-objective
- `--directions <dir>` - Optimization directions (maximize, minimize)
- `--early-stopping` - Enable early stopping
- `--pruner <median|hyperband|asha>` - Pruning strategy

### Distributed Tuning
- `--distributed` - Enable distributed tuning with Ray
- `--workers <n>` - Number of parallel workers
- `--resources-per-trial <spec>` - Resources per trial (e.g., "cpu:2,gpu:1")
- `--scheduler <asha|hyperband|pbt>` - Ray Tune scheduler

### Experiment Tracking
- `--track <mlflow|wandb>` - Experiment tracking backend
- `--experiment <name>` - Experiment name
- `--project <name>` - Project name (for Weights & Biases)
- `--save-history <path>` - Save trial history to file

### Visualization
- `--visualize` - Generate optimization visualizations
- `--plot <type>` - Plot type (history, importance, contour, slice)
- `--output <path>` - Output directory for results

### Advanced
- `--sampler <tpe|random|grid>` - Optuna sampler (default: TPE)
- `--n-startup-trials <n>` - Number of random trials before Bayesian (default: 10)
- `--n-warmup-steps <n>` - Warmup steps for pruning (default: 5)
- `--ignore-failures` - Continue optimization if trials fail
- `--checkpoint-freq <n>` - Checkpoint frequency for Ray Tune
- `--resume <path>` - Resume from checkpoint or study

## Examples

### 1. Grid Search with Cross-Validation

```bash
/ml:hyperparameter-tune \
  --model RandomForest \
  --strategy grid \
  --cv 5 \
  --param "n_estimators=discrete:100-500:100" \
  --param "max_depth=discrete:5,10,15,20,None" \
  --param "min_samples_split=discrete:2,5,10" \
  --metric accuracy
```

**Output:**
```
🔍 Grid Search Hyperparameter Tuning
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Parameter Space:
  • n_estimators: [100, 200, 300, 400, 500]
  • max_depth: [5, 10, 15, 20, None]
  • min_samples_split: [2, 5, 10]

Total combinations: 75
Cross-validation folds: 5
Total fits: 375

Running grid search...
[====================] 100% (375/375) ETA: 0s

✅ Best Parameters:
  • n_estimators: 300
  • max_depth: 15
  • min_samples_split: 2

📊 Best Score: 0.9245 ± 0.0123 (5-fold CV)

All results saved to: grid_search_results.json
```

### 2. Bayesian Optimization with Optuna

```bash
/ml:hyperparameter-tune \
  --strategy optuna \
  --trials 200 \
  --param "learning_rate=continuous:0.001-0.1:log" \
  --param "n_layers=discrete:1-10" \
  --param "dropout=continuous:0.1-0.5" \
  --pruner median \
  --early-stopping \
  --visualize \
  --track mlflow \
  --experiment neural_network_tuning
```

**Output:**
```
🎯 Optuna Bayesian Optimization (TPE Sampler)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Study: neural_network_tuning
Sampler: Tree-structured Parzen Estimator
Pruner: Median (n_warmup_steps=5)
Trials: 200

Parameter Space:
  • learning_rate: [0.001, 0.1] (log scale)
  • n_layers: {1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
  • dropout: [0.1, 0.5]

Running optimization...
Trial 000 [Complete] value: 0.7234 params: {lr: 0.0523, n_layers: 3, dropout: 0.32}
Trial 001 [Complete] value: 0.7891 params: {lr: 0.0123, n_layers: 5, dropout: 0.25}
Trial 002 [Pruned]   intermediate: 0.6543 at step 10
Trial 003 [Complete] value: 0.8234 params: {lr: 0.0087, n_layers: 4, dropout: 0.28}
...
Trial 199 [Complete] value: 0.9156 params: {lr: 0.0091, n_layers: 6, dropout: 0.23}

[====================] 100% (200/200) Completed: 165 | Pruned: 35

✅ Best Trial (#187):
  • learning_rate: 0.0091
  • n_layers: 6
  • dropout: 0.23
  • value: 0.9156

📊 Parameter Importance:
  1. learning_rate: 0.542
  2. n_layers: 0.321
  3. dropout: 0.137

📈 Visualizations saved:
  • optimization_history.png
  • param_importance.png
  • parallel_coordinate.png
  • contour_plot.png

🔬 MLflow Experiment:
  • Experiment ID: 12
  • Run ID: a7f3b2c1
  • Artifacts logged: 15
```

### 3. Distributed Tuning with Ray Tune

```bash
/ml:hyperparameter-tune \
  --strategy ray \
  --distributed \
  --workers 8 \
  --trials 500 \
  --scheduler asha \
  --resources-per-trial "cpu:2,gpu:0.5" \
  --param "learning_rate=continuous:0.0001-0.1:log" \
  --param "batch_size=categorical:16,32,64,128" \
  --checkpoint-freq 10 \
  --track wandb \
  --project deep-learning-tuning
```

**Output:**
```
⚡ Ray Tune Distributed Hyperparameter Tuning
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Configuration:
  • Workers: 8
  • Trials: 500
  • Scheduler: ASHA (Async Successive Halving)
  • Resources per trial: CPU=2, GPU=0.5
  • Max concurrent: 16 trials

Parameter Space:
  • learning_rate: LogUniform(0.0001, 0.1)
  • batch_size: Choice([16, 32, 64, 128])

Initializing Ray cluster... ✓
Connected to 8 workers

Running ASHA optimization...
[Trial 001] accuracy=0.7234 | resource=1
[Trial 002] accuracy=0.7456 | resource=1
[Trial 003] accuracy=0.8123 | resource=1  [PROMOTED to resource=3]
[Trial 004] accuracy=0.6891 | resource=1  [STOPPED]
...

Current Best Trials:
  1. Trial 342: accuracy=0.9234 (lr=0.0087, bs=64) [resource=81]
  2. Trial 287: accuracy=0.9187 (lr=0.0123, bs=32) [resource=81]
  3. Trial 156: accuracy=0.9145 (lr=0.0091, bs=64) [resource=27]

Progress: [====================] 500/500 trials
  • Completed: 500
  • Stopped early: 324
  • Failed: 0
  • Running: 0

✅ Best Configuration:
  • learning_rate: 0.0087
  • batch_size: 64
  • accuracy: 0.9234

⏱️  Time saved: 67% (early stopping)
💾 Checkpoints: 50 saved to ray_results/

🌐 Weights & Biases:
  • Project: deep-learning-tuning
  • Run: asha-tuning-2025-10-21
  • URL: https://wandb.ai/team/deep-learning-tuning/runs/xyz123
```

### 4. Multi-Objective Optimization

```bash
/ml:hyperparameter-tune \
  --multi-objective \
  --optimize "accuracy,inference_time" \
  --directions "maximize,minimize" \
  --strategy optuna \
  --trials 300 \
  --param "n_layers=discrete:1-10" \
  --param "units_per_layer=discrete:32-512:32" \
  --visualize
```

**Output:**
```
🎯 Multi-Objective Optimization (Pareto Front)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Objectives:
  • accuracy (maximize)
  • inference_time (minimize)

Parameter Space:
  • n_layers: {1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
  • units_per_layer: {32, 64, 96, ..., 512}

Running multi-objective optimization...
Trial 000: accuracy=0.7234, latency=45ms
Trial 001: accuracy=0.8123, latency=78ms
Trial 002: accuracy=0.7891, latency=52ms
...
Trial 299: accuracy=0.9156, latency=123ms

[====================] 100% (300/300)

✅ Pareto Front (12 optimal solutions):

┌─────────┬──────────┬────────────┬──────────┬─────────────────┐
│ Trial # │ Accuracy │ Latency    │ n_layers │ units_per_layer │
├─────────┼──────────┼────────────┼──────────┼─────────────────┤
│ 287     │ 0.9234   │ 134ms      │ 8        │ 512             │
│ 245     │ 0.9187   │ 98ms       │ 6        │ 384             │
│ 198     │ 0.9045   │ 67ms       │ 4        │ 256             │
│ 156     │ 0.8823   │ 52ms       │ 3        │ 192             │
│ 89      │ 0.8456   │ 41ms       │ 2        │ 128             │
│ 34      │ 0.7891   │ 28ms       │ 1        │ 64              │
└─────────┴──────────┴────────────┴──────────┴─────────────────┘

📊 Trade-off Analysis:
  • High accuracy model: 0.9234 acc @ 134ms
  • Balanced model: 0.9045 acc @ 67ms
  • Fast model: 0.7891 acc @ 28ms

📈 Pareto front visualization saved: pareto_front.png
```

### 5. Random Search with Early Stopping

```bash
/ml:hyperparameter-tune \
  --strategy random \
  --trials 500 \
  --early-stopping \
  --param "learning_rate=continuous:0.001-0.1:log" \
  --param "n_estimators=discrete:50-1000" \
  --param "max_depth=discrete:3-20" \
  --metric f1_score \
  --cv 10 \
  --save-history results/random_search_history.csv
```

**Output:**
```
🎲 Random Search with Early Stopping
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Parameter Distributions:
  • learning_rate: LogUniform(0.001, 0.1)
  • n_estimators: RandInt(50, 1000)
  • max_depth: RandInt(3, 20)

Early Stopping:
  • Patience: 20 trials
  • Min improvement: 0.001

Cross-validation: 10-fold stratified
Metric: f1_score

Running random search...
Trial 001: f1=0.7234 (lr=0.0523, n_est=234, depth=12)
Trial 002: f1=0.7891 (lr=0.0123, n_est=567, depth=8)
Trial 003: f1=0.8234 (lr=0.0087, n_est=789, depth=10) ⭐ NEW BEST
...
Trial 087: f1=0.9123 (lr=0.0091, n_est=845, depth=9) ⭐ NEW BEST

[====================] Stopped at trial 107/500 (early stopping triggered)

✅ Best Parameters:
  • learning_rate: 0.0091
  • n_estimators: 845
  • max_depth: 9

📊 Best Score: 0.9123 ± 0.0156 (10-fold CV)

⏱️  Trials evaluated: 107
⚡ Time saved: 79% (early stopping)

📁 Results saved:
  • Best params: results/best_params.json
  • Trial history: results/random_search_history.csv
  • CV scores: results/cv_scores.csv
```

### 6. XGBoost Hyperparameter Tuning

```bash
/ml:hyperparameter-tune \
  --model xgboost \
  --strategy optuna \
  --trials 200 \
  --param "learning_rate=continuous:0.01-0.3:log" \
  --param "max_depth=discrete:3-10" \
  --param "min_child_weight=discrete:1-10" \
  --param "subsample=continuous:0.5-1.0" \
  --param "colsample_bytree=continuous:0.5-1.0" \
  --param "gamma=continuous:0-5" \
  --metric auc \
  --pruner hyperband \
  --track mlflow
```

### 7. Resume from Checkpoint

```bash
# Resume previous Optuna study
/ml:hyperparameter-tune \
  --strategy optuna \
  --resume sqlite:///optuna_study.db \
  --trials 100 \
  --visualize

# Resume Ray Tune experiment
/ml:hyperparameter-tune \
  --strategy ray \
  --resume ray_results/experiment_2025-10-21/ \
  --trials 200
```

## Parameter Space Configuration File

You can define complex parameter spaces in a YAML or JSON file:

**config.yaml:**
```yaml
parameters:
  # Continuous parameters
  learning_rate:
    type: continuous
    min: 0.0001
    max: 0.1
    log: true

  dropout:
    type: continuous
    min: 0.1
    max: 0.5

  # Discrete parameters
  n_layers:
    type: discrete
    min: 1
    max: 10

  n_estimators:
    type: discrete
    values: [100, 200, 500, 1000]

  # Categorical parameters
  optimizer:
    type: categorical
    choices: [adam, sgd, rmsprop, adamw]

  activation:
    type: categorical
    choices: [relu, tanh, sigmoid, gelu]

  # Conditional parameters
  momentum:
    type: continuous
    min: 0.5
    max: 0.99
    condition:
      parameter: optimizer
      value: sgd

optimization:
  strategy: optuna
  n_trials: 200
  sampler: TPE
  pruner: median
  n_startup_trials: 10
  n_warmup_steps: 5

cross_validation:
  n_folds: 5
  shuffle: true
  stratified: true

tracking:
  backend: mlflow
  experiment_name: my_experiment
  log_artifacts: true

visualization:
  enabled: true
  plots:
    - history
    - importance
    - parallel_coordinate
    - contour
```

**Usage:**
```bash
/ml:hyperparameter-tune --config config.yaml --data train.csv --metric accuracy
```

## Optimization Patterns

### 1. Optuna Bayesian Optimization

**Pattern from Context7 (/optuna/optuna):**

```python
import optuna
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score

def objective(trial):
    # Define parameter space
    params = {
        'n_estimators': trial.suggest_int('n_estimators', 50, 500),
        'max_depth': trial.suggest_int('max_depth', 3, 20),
        'min_samples_split': trial.suggest_int('min_samples_split', 2, 10),
        'min_samples_leaf': trial.suggest_int('min_samples_leaf', 1, 10)
    }

    # Train and evaluate
    model = RandomForestClassifier(**params, random_state=42)
    score = cross_val_score(model, X_train, y_train, cv=5, scoring='f1_macro')

    return score.mean()

# Create study and optimize
study = optuna.create_study(direction='maximize', sampler=optuna.samplers.TPESampler())
study.optimize(objective, n_trials=200)

print(f"Best params: {study.best_params}")
print(f"Best score: {study.best_value}")
```

### 2. Optuna with Pruning

```python
def objective_with_pruning(trial):
    params = {
        'learning_rate': trial.suggest_float('learning_rate', 0.001, 0.1, log=True),
        'n_layers': trial.suggest_int('n_layers', 1, 5)
    }

    model = create_model(**params)

    for epoch in range(100):
        # Train for one epoch
        train_loss = train_epoch(model)
        val_accuracy = validate(model)

        # Report intermediate value
        trial.report(val_accuracy, epoch)

        # Prune if performance is poor
        if trial.should_prune():
            raise optuna.TrialPruned()

    return val_accuracy

# Study with median pruner
study = optuna.create_study(
    direction='maximize',
    pruner=optuna.pruners.MedianPruner(n_startup_trials=10, n_warmup_steps=5)
)
study.optimize(objective_with_pruning, n_trials=100)
```

### 3. Ray Tune with ASHA

**Pattern from Context7 (/ray-project/ray):**

```python
from ray import tune
from ray.tune.schedulers import ASHAScheduler

def trainable(config):
    model = create_model(config)

    for epoch in range(100):
        train_loss = train_epoch(model, config)
        val_accuracy = validate(model)

        # Report metrics to Ray Tune
        tune.report(accuracy=val_accuracy, loss=train_loss)

# Define search space
config = {
    'learning_rate': tune.loguniform(0.001, 0.1),
    'batch_size': tune.choice([16, 32, 64, 128]),
    'n_layers': tune.randint(1, 10)
}

# ASHA scheduler for early stopping
scheduler = ASHAScheduler(
    max_t=100,
    grace_period=10,
    reduction_factor=3
)

# Run tuning
analysis = tune.run(
    trainable,
    config=config,
    num_samples=100,
    scheduler=scheduler,
    resources_per_trial={'cpu': 2, 'gpu': 0.5}
)

print(f"Best config: {analysis.best_config}")
```

### 4. Multi-Objective with Optuna

```python
def multi_objective(trial):
    params = {
        'n_layers': trial.suggest_int('n_layers', 1, 10),
        'units': trial.suggest_int('units', 32, 512)
    }

    model = create_model(**params)
    model.train()

    accuracy = evaluate_accuracy(model)
    latency = measure_inference_time(model)

    return accuracy, latency

# Multi-objective study
study = optuna.create_study(directions=['maximize', 'minimize'])
study.optimize(multi_objective, n_trials=300)

# Get Pareto front
pareto_trials = [t for t in study.best_trials]
for trial in pareto_trials:
    print(f"Accuracy: {trial.values[0]:.4f}, Latency: {trial.values[1]:.1f}ms")
```

## Best Practices

### 1. **Choose the Right Strategy**

- **Grid Search**: Small, discrete parameter spaces (< 100 combinations)
- **Random Search**: Medium-sized spaces, good baseline (100-500 trials)
- **Bayesian (Optuna)**: Complex spaces, limited budget (50-200 trials)
- **Ray Tune + ASHA**: Large-scale distributed tuning (500+ trials)

### 2. **Define Parameter Ranges Wisely**

```python
# ✅ GOOD: Use log scale for learning rates
learning_rate: { type: 'continuous', min: 0.0001, max: 0.1, log: true }

# ❌ BAD: Linear scale for learning rates
learning_rate: { type: 'continuous', min: 0.0001, max: 0.1 }

# ✅ GOOD: Reasonable discrete steps
n_estimators: { type: 'discrete', min: 50, max: 500, step: 50 }

# ❌ BAD: Too fine-grained for discrete
n_estimators: { type: 'discrete', min: 50, max: 500, step: 1 }
```

### 3. **Use Early Stopping**

- Median pruning for Optuna (prune bottom 50%)
- ASHA for Ray Tune (successive halving)
- Custom patience for simple early stopping

### 4. **Cross-Validation Strategy**

- 5-fold for most cases
- 10-fold for small datasets
- Time-series split for temporal data
- Stratified for imbalanced datasets

### 5. **Track Everything**

- Use MLflow or Weights & Biases
- Save parameter history for reproducibility
- Visualize optimization progress
- Monitor resource utilization

### 6. **Multi-Objective Considerations**

- Define clear trade-offs (accuracy vs latency, accuracy vs model size)
- Use Pareto front to select final model
- Consider business constraints (max latency, max memory)

## Integration with ML Frameworks

### Scikit-learn
```bash
/ml:hyperparameter-tune \
  --model sklearn.ensemble.RandomForestClassifier \
  --config sklearn_params.yaml
```

### XGBoost
```bash
/ml:hyperparameter-tune \
  --model xgboost \
  --param "learning_rate=continuous:0.01-0.3:log" \
  --param "max_depth=discrete:3-10"
```

### LightGBM
```bash
/ml:hyperparameter-tune \
  --model lightgbm \
  --param "num_leaves=discrete:20-100" \
  --param "learning_rate=continuous:0.01-0.3:log"
```

### PyTorch
```bash
/ml:hyperparameter-tune \
  --model pytorch \
  --strategy ray \
  --distributed \
  --resources-per-trial "cpu:4,gpu:1"
```

### TensorFlow/Keras
```bash
/ml:hyperparameter-tune \
  --model tensorflow \
  --param "learning_rate=continuous:0.0001-0.01:log" \
  --param "units=categorical:128,256,512"
```

## Output Files

After optimization, the following files are generated:

```
output/
├── best_params.json          # Best hyperparameters
├── trial_history.csv         # All trial results
├── cv_scores.csv             # Cross-validation scores
├── optimization_history.png  # Optimization progress plot
├── param_importance.png      # Parameter importance plot
├── parallel_coordinate.png   # Parallel coordinate plot
├── contour_plot.png          # 2D contour plots
├── pareto_front.png          # Pareto front (multi-objective)
└── summary.json              # Optimization summary
```

## See Also

- `/ml:train-optimize` - Optimize entire training pipeline
- `/ml:automl` - Automated machine learning with AutoGluon
- `@gradient-boosting-expert` - XGBoost/LightGBM tuning specialist
- `@scikit-learn-expert` - Scikit-learn optimization patterns
- `@pytorch-expert` - PyTorch hyperparameter tuning

## References

- [Optuna Documentation](https://optuna.readthedocs.io/)
- [Ray Tune Documentation](https://docs.ray.io/en/latest/tune/)
- [Scikit-learn Model Selection](https://scikit-learn.org/stable/model_selection.html)
- [Hyperopt Documentation](http://hyperopt.github.io/hyperopt/)
- [Weights & Biases Sweeps](https://docs.wandb.ai/guides/sweeps)
