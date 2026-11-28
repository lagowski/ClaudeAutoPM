# ml:train-optimize

Optimize machine learning training pipelines with Context7-verified patterns for scikit-learn, PyTorch, and TensorFlow.

## Description

Comprehensive ML training optimization covering:
- Hyperparameter tuning (GridSearchCV, RandomizedSearchCV, Optuna)
- Cross-validation strategies
- Model selection and pipelines
- Distributed training (PyTorch DDP, TensorFlow Strategy)
- Mixed precision training (AMP)
- Learning rate scheduling

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: scikit-learn, pytorch, tensorflow.

## Usage

```bash
/ml:train-optimize [options]
```

## Options

- `--framework <sklearn|pytorch|tensorflow>` - ML framework
- `--scope <hyperparams|distributed|precision|all>` - Optimization scope
- `--analyze-only` - Analyze without applying changes
- `--output <file>` - Write optimization report
- `--aggressive` - Apply aggressive optimizations

## Examples

### Optimize Scikit-learn Pipeline
```bash
/ml:train-optimize --framework sklearn --scope hyperparams
```

### Optimize PyTorch Training
```bash
/ml:train-optimize --framework pytorch --scope distributed
```

### Full ML Optimization
```bash
/ml:train-optimize --output ml-optimization-report.md
```

## Optimization Patterns

### 1. Scikit-learn Hyperparameter Tuning

**Pattern from Context7 (/scikit-learn/scikit-learn):**

#### GridSearchCV with Pipeline

```python
# BEFORE: Manual hyperparameter testing
from sklearn.ensemble import RandomForestClassifier

model = RandomForestClassifier(n_estimators=100, max_depth=5)
model.fit(X_train, y_train)
# ❌ Suboptimal hyperparameters

# AFTER: GridSearchCV with Pipeline
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.feature_selection import SelectKBest
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GridSearchCV

# Create pipeline
pipe = Pipeline([
    ('scaler', StandardScaler()),
    ('select', SelectKBest()),
    ('model', RandomForestClassifier())
])

# Define parameter grid
param_grid = {
    'select__k': [5, 10, 20],
    'model__n_estimators': [100, 200, 500],
    'model__max_depth': [5, 10, 20, None],
    'model__min_samples_split': [2, 5, 10],
    'model__min_samples_leaf': [1, 2, 4]
}

# Grid search with cross-validation
grid_search = GridSearchCV(
    estimator=pipe,
    param_grid=param_grid,
    cv=5,
    scoring='roc_auc',
    n_jobs=-1,  # Use all CPU cores
    verbose=2
)

grid_search.fit(X_train, y_train)

# Best model
print(f"Best params: {grid_search.best_params_}")
print(f"Best ROC-AUC: {grid_search.best_score_:.4f}")

# Evaluate on test set
test_score = grid_search.score(X_test, y_test)
print(f"Test ROC-AUC: {test_score:.4f}")
```

**Benefits:**
- Systematically tests combinations
- Uses cross-validation for robust estimates
- Parallel computation (n_jobs=-1)
- Prevents overfitting

#### HalvingGridSearchCV (Faster Search)

```python
# AFTER: Faster hyperparameter search
from sklearn.experimental import enable_halving_search_cv  # noqa
from sklearn.model_selection import HalvingGridSearchCV

# Halving search (successively halves candidates)
halving_search = HalvingGridSearchCV(
    estimator=RandomForestClassifier(random_state=42),
    param_grid={
        'max_depth': [3, 5, 10, 20],
        'min_samples_split': [2, 5, 10, 20]
    },
    cv=5,
    factor=2,  # Halve candidates each iteration
    resource='n_estimators',  # Budget on n_estimators
    max_resources=500,
    random_state=42
)

halving_search.fit(X_train, y_train)
print(f"Best estimator: {halving_search.best_estimator_}")
```

**Benefits:**
- 2-5x faster than GridSearchCV
- Efficiently allocates resources
- Eliminates poor candidates early

#### Nested Parameter Grid

```python
# AFTER: Complex nested estimator tuning
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GridSearchCV

calibrated_forest = CalibratedClassifierCV(
    estimator=RandomForestClassifier(n_estimators=100)
)

# Tune nested estimator parameters
param_grid = {
    'estimator__max_depth': [2, 4, 6, 8],
    'estimator__min_samples_split': [2, 5, 10]
}

search = GridSearchCV(
    calibrated_forest,
    param_grid,
    cv=5,
    scoring='roc_auc'
)

search.fit(X_train, y_train)
```

#### VotingClassifier with GridSearchCV

```python
# AFTER: Ensemble optimization
from sklearn.ensemble import VotingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.model_selection import GridSearchCV

# Define base estimators
clf1 = LogisticRegression(random_state=1)
clf2 = RandomForestClassifier(random_state=1)
clf3 = GaussianNB()

# Voting classifier
eclf = VotingClassifier(
    estimators=[('lr', clf1), ('rf', clf2), ('gnb', clf3)],
    voting='soft'
)

# Tune individual estimator parameters
params = {
    'lr__C': [0.1, 1.0, 10.0, 100.0],
    'rf__n_estimators': [50, 100, 200],
    'rf__max_depth': [5, 10, 20]
}

grid = GridSearchCV(
    estimator=eclf,
    param_grid=params,
    cv=5,
    scoring='roc_auc',
    n_jobs=-1
)

grid.fit(X_train, y_train)
```

### 2. PyTorch Mixed Precision Training (AMP)

**Pattern from Context7 (/pytorch/pytorch):**

```python
# BEFORE: Standard FP32 training (slower, more memory)
import torch
import torch.nn as nn
import torch.optim as optim

model = Net().cuda()
optimizer = optim.SGD(model.parameters(), lr=0.01)
criterion = nn.CrossEntropyLoss()

for epoch in range(epochs):
    for input, target in data_loader:
        input, target = input.cuda(), target.cuda()

        optimizer.zero_grad()
        output = model(input)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()
# ❌ No mixed precision = slower training

# AFTER: Mixed precision with AMP (2-3x faster)
import torch
from torch.amp import autocast, GradScaler

model = Net().cuda()
optimizer = optim.SGD(model.parameters(), lr=0.01)
criterion = nn.CrossEntropyLoss()

# Create GradScaler for loss scaling
scaler = GradScaler()

for epoch in range(epochs):
    for input, target in data_loader:
        input, target = input.cuda(), target.cuda()

        optimizer.zero_grad()

        # Forward pass with autocast (mixed precision)
        with autocast(device_type='cuda', dtype=torch.float16):
            output = model(input)
            loss = criterion(output, target)

        # Backward pass with gradient scaling
        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
```

**Benefits:**
- 2-3x faster training
- 50% less GPU memory usage
- Maintains model accuracy
- Automatic gradient scaling

### 3. PyTorch Distributed Data Parallel (DDP)

**Pattern from Context7:**

```python
# BEFORE: Single GPU training (slow for large models)
model = MyModel()
model.to(device)

for epoch in range(epochs):
    for batch in data_loader:
        # Training loop
        pass

# AFTER: Multi-GPU with DDP
import torch
import torch.distributed as dist
import torch.multiprocessing as mp
from torch.nn.parallel import DistributedDataParallel as DDP
import os

def train_ddp(rank, world_size):
    # Initialize process group
    dist.init_process_group(
        backend='nccl',  # or 'gloo' for CPU
        init_method='env://',
        rank=rank,
        world_size=world_size
    )

    # Create model and move to GPU
    model = MyModel().to(rank)

    # Wrap with DDP
    ddp_model = DDP(model, device_ids=[rank])

    # Define loss and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.SGD(ddp_model.parameters(), lr=0.01)

    # Training loop
    for epoch in range(epochs):
        for input, target in train_loader:
            input, target = input.to(rank), target.to(rank)

            # Forward pass
            output = ddp_model(input)
            loss = criterion(output, target)

            # Backward pass
            optimizer.zero_grad()
            loss.backward()

            # Update parameters (synchronized across GPUs)
            optimizer.step()

def main():
    world_size = 4  # Number of GPUs
    os.environ["MASTER_ADDR"] = "localhost"
    os.environ["MASTER_PORT"] = "29500"

    mp.spawn(
        train_ddp,
        args=(world_size,),
        nprocs=world_size,
        join=True
    )

if __name__ == "__main__":
    main()
```

**Benefits:**
- Linear scaling with GPU count
- Synchronized gradient updates
- Efficient communication
- Supports large batch sizes

### 4. Combined: DDP + Mixed Precision

**Pattern from Context7:**

```python
import torch
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP
from torch.amp import autocast, GradScaler

def train_ddp_amp(rank, world_size):
    # Initialize DDP
    dist.init_process_group('nccl', rank=rank, world_size=world_size)

    # Model and DDP wrapper
    model = MyModel().to(rank)
    ddp_model = DDP(model, device_ids=[rank])

    # Optimizer and GradScaler
    optimizer = optim.Adam(ddp_model.parameters(), lr=0.001)
    scaler = GradScaler()

    for epoch in range(epochs):
        for input, target in train_loader:
            input, target = input.to(rank), target.to(rank)

            optimizer.zero_grad()

            # Mixed precision forward pass
            with autocast(device_type='cuda', dtype=torch.float16):
                output = ddp_model(input)
                loss = criterion(output, target)

            # Scaled backward pass
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
```

**Benefits:**
- Best of both worlds
- 4-8x speedup with 4 GPUs + AMP
- Production-ready scaling

### 5. Multiple Optimizers with AMP

**Pattern from Context7:**

```python
# AFTER: Multiple losses and optimizers
scaler = torch.amp.GradScaler()

for epoch in epochs:
    for input, target in data_loader:
        optimizer0.zero_grad()
        optimizer1.zero_grad()

        # Forward pass with autocast
        with autocast(device_type='cuda', dtype=torch.float16):
            output0 = model0(input)
            output1 = model1(input)
            loss0 = loss_fn(2 * output0 + 3 * output1, target)
            loss1 = loss_fn(3 * output0 - 5 * output1, target)

        # Backward passes
        scaler.scale(loss0).backward(retain_graph=True)
        scaler.scale(loss1).backward()

        # Optional: unscale for gradient inspection
        scaler.unscale_(optimizer0)

        # Step optimizers
        scaler.step(optimizer0)
        scaler.step(optimizer1)

        # Update scaler once
        scaler.update()
```

### 6. Cross-Validation Best Practices

**Pattern from Context7:**

```python
from sklearn.model_selection import (
    cross_val_score,
    StratifiedKFold,
    train_test_split
)

# Split into dev and evaluation sets
X_dev, X_eval, y_dev, y_eval = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Cross-validation on dev set
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

# Perform cross-validation
scores = cross_val_score(
    estimator=model,
    X=X_dev,
    y=y_dev,
    cv=cv,
    scoring='roc_auc',
    n_jobs=-1
)

print(f"CV scores: {scores}")
print(f"Mean CV score: {scores.mean():.4f} (+/- {scores.std() * 2:.4f})")

# Final evaluation on held-out set
model.fit(X_dev, y_dev)
eval_score = model.score(X_eval, y_eval)
print(f"Evaluation score: {eval_score:.4f}")
```

## Optimization Output

```
🚀 ML Training Optimization Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Framework: PyTorch
Model: ResNet50
Dataset: ImageNet (1.2M samples)

🔧 Hyperparameter Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Current Configuration:
  - learning_rate: 0.1
  - batch_size: 128
  - optimizer: SGD
  - scheduler: None

  ⚠️  Suboptimal hyperparameters detected
     💡 Recommendation: Use GridSearchCV or Optuna
     ⚡ Impact: 10-30% accuracy improvement

  Suggested Configuration:
  - learning_rate: 0.01 (with warmup)
  - batch_size: 256
  - optimizer: AdamW
  - scheduler: CosineAnnealingLR

⚡ Mixed Precision Training
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ❌ Not using AMP (Automatic Mixed Precision)
     💡 Recommendation: Enable torch.amp
     ⚡ Impact: 2-3x faster training, 50% less GPU memory

  Implementation:
  ```python
  from torch.amp import autocast, GradScaler
  scaler = GradScaler()

  with autocast(device_type='cuda', dtype=torch.float16):
      output = model(input)
      loss = criterion(output, target)

  scaler.scale(loss).backward()
  scaler.step(optimizer)
  scaler.update()
  ```

🌐 Distributed Training
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Current: Single GPU training
  Available: 4 GPUs detected

  ⚠️  Not using Distributed Data Parallel (DDP)
     💡 Recommendation: Enable DDP training
     ⚡ Impact: 3.5-4x speedup (near-linear scaling)

  Implementation:
  - Enable DDP with 4 GPUs
  - Batch size: 256 * 4 = 1024 (effective)
  - Training time: 24h → 6h

📊 Cross-Validation Strategy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Current: Single train/test split

  ⚠️  No cross-validation for hyperparameter tuning
     💡 Recommendation: Use StratifiedKFold (k=5)
     ⚡ Impact: More robust performance estimates

  Suggested Strategy:
  1. Split: 80% dev, 20% evaluation (held-out)
  2. CV on dev set: StratifiedKFold k=5
  3. Tune hyperparameters on dev
  4. Final evaluation on held-out set

🎯 Learning Rate Scheduling
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ❌ No learning rate scheduler
     💡 Recommendation: CosineAnnealingLR or OneCycleLR
     ⚡ Impact: 5-15% accuracy improvement

  Suggested Implementation:
  ```python
  scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
      optimizer, T_max=epochs
  )
  ```

Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total Optimizations: 5

  🔴 Critical: 2 (enable DDP, enable AMP)
  🟡 High Impact: 2 (hyperparameter tuning, LR scheduling)
  🟢 Low Impact: 1 (cross-validation)

  Estimated Performance Improvement:
  - Training speed: 4-8x faster (DDP + AMP)
  - GPU memory: 50% reduction (AMP)
  - Model accuracy: 10-30% improvement (hyperparams + LR)
  - Training time: 24h → 3-6h

  Run with --aggressive to apply all optimizations
```

## Implementation

This command uses specialized ML agents:
- **@scikit-learn-expert** - Scikit-learn optimization
- **@pytorch-expert** - PyTorch training optimization
- **@tensorflow-keras-expert** - TensorFlow optimization

Process:
1. Query Context7 for framework-specific patterns
2. Analyze current training configuration
3. Identify optimization opportunities
4. Generate recommendations with impact estimates
5. Optionally apply automated optimizations

## Best Practices Applied

Based on Context7 documentation:

**Scikit-learn:**
1. **GridSearchCV** - Exhaustive hyperparameter search
2. **HalvingGridSearchCV** - Fast successive halving
3. **Pipelines** - Preprocessing + model in one
4. **Cross-validation** - StratifiedKFold for robust estimates
5. **Nested CV** - Complex estimator tuning
6. **VotingClassifier** - Ensemble optimization

**PyTorch:**
1. **Mixed Precision (AMP)** - 2-3x speedup
2. **Distributed Data Parallel (DDP)** - Multi-GPU scaling
3. **GradScaler** - Automatic gradient scaling
4. **Combined DDP + AMP** - Maximum performance
5. **Multiple Optimizers** - Complex training scenarios

## Related Commands

- `/ml:automl` - AutoML automated training
- `/ml:deploy` - Model deployment optimization
- `/perf:profile` - Training performance profiling
- `/gpu:optimize` - GPU utilization optimization

## Troubleshooting

### GridSearchCV Slow
- Use HalvingGridSearchCV instead
- Reduce parameter grid size
- Use RandomizedSearchCV for large spaces
- Enable n_jobs=-1 for parallelization

### AMP Causing NaN Loss
- Use GradScaler (handles gradient scaling)
- Check for operations not supporting FP16
- Reduce learning rate
- Use gradient clipping

### DDP Hanging
- Check NCCL backend configuration
- Verify MASTER_ADDR and MASTER_PORT
- Ensure all processes complete together
- Use timeout parameter

## Version History

- v2.0.0 - Initial Schema v2.0 release with Context7 integration
- Scikit-learn GridSearchCV and HalvingGridSearchCV patterns
- PyTorch DDP and mixed precision (AMP)
- Cross-validation strategies
