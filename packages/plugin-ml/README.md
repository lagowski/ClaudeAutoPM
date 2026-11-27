# @claudeautopm/plugin-ml

Comprehensive Machine Learning plugin with **10 specialist agents** covering deep learning, classical ML, computer vision, NLP, time series, AutoML, and more. All patterns verified against official documentation via Context7 MCP server.

**Version**: 2.0.0 | **Schema**: 2.0 | **Agents**: 10 | **Context7-Verified**: ✅

## 📦 Installation

```bash
# Install the plugin package
npm install @claudeautopm/plugin-ml

# Or install globally
npm install -g @claudeautopm/plugin-ml
```

## Context7 Integration

This plugin uses Context7 MCP server to ensure all ML patterns follow the latest official documentation:

**Libraries Verified**:
- **TensorFlow**: `/tensorflow/tensorflow` (5,192 snippets, trust 7.9)
- **PyTorch**: `/pytorch/pytorch` (4,451 snippets, trust 8.4)
- **Gymnasium**: `/farama-foundation/gymnasium` (288 snippets, trust 8.1)
- **Stable-Baselines3**: `/dlr-rm/stable-baselines3` (265 snippets, trust 8.0)
- **Scikit-learn**: `/scikit-learn/scikit-learn` (4,161 snippets, trust 8.5)

All ML patterns, best practices, and code examples are verified against current official documentation to prevent outdated approaches and ensure production-ready implementations.

## 🧠 What's Included

### 10 Specialist Agents

#### 1. tensorflow-keras-expert
**TensorFlow and Keras deep learning specialist**
- Model building: Sequential, Functional, Subclassing APIs
- Training optimization: Callbacks, learning rate schedules, XLA compilation
- Distributed training: MirroredStrategy, TPUStrategy
- Mixed precision: Float16 for 2-3x speedup
- Deployment: SavedModel, TensorFlow Lite for mobile/edge
- Context7 patterns: 10+ verified TensorFlow best practices

**Example**:
```markdown
@tensorflow-keras-expert

Build a CNN for MNIST digit classification with:
- Data augmentation
- Early stopping and checkpointing
- XLA compilation for speedup
- TensorFlow Lite export for mobile deployment
```

#### 2. pytorch-expert
**PyTorch deep learning specialist**
- Model building: torch.nn.Module, custom architectures
- Training: torch.compile for 2x speedup, custom training loops
- Distributed: DistributedDataParallel (DDP) for multi-GPU
- Mixed precision: torch.amp for faster training
- Optimization: Learning rate schedulers, gradient clipping
- Context7 patterns: 10+ verified PyTorch best practices

**Example**:
```markdown
@pytorch-expert

Create a ResNet-50 model for ImageNet with:
- torch.compile optimization
- DDP training on 4 GPUs
- Mixed precision (FP16)
- Cosine annealing LR schedule
- Model checkpointing
```

#### 3. reinforcement-learning-expert
**Reinforcement Learning specialist**
- Environments: Gymnasium API, custom environment creation
- Algorithms: PPO, SAC, TD3, DQN (via Stable-Baselines3)
- Training: Q-Learning, policy gradients, actor-critic methods
- Optimization: Reward shaping, vectorized environments
- Callbacks: Early stopping, model checkpointing
- Context7 patterns: 10+ verified RL best practices

**Example**:
```markdown
@reinforcement-learning-expert

Train a PPO agent for CartPole-v1 with:
- Stable-Baselines3 integration
- Evaluation callbacks
- Reward threshold stopping
- Best model saving
- Test agent visualization
```

#### 4. scikit-learn-expert
**Classical machine learning specialist**
- Pipelines: Preprocessing and modeling without data leakage
- Model selection: GridSearchCV, RandomizedSearchCV
- Cross-validation: KFold, StratifiedKFold
- Feature engineering: Selection, scaling, encoding
- Algorithms: Classification, regression, clustering
- Context7 patterns: 5+ verified scikit-learn best practices

**Example**:
```markdown
@scikit-learn-expert

Build a classification pipeline for customer churn with:
- Pipeline with StandardScaler and RandomForest
- GridSearchCV for hyperparameter tuning
- 5-fold cross-validation
- Feature importance analysis
- Handle class imbalance with class_weight
```

#### 5. neural-network-architect
**Neural network architecture design specialist**
- Architecture patterns: CNNs, ResNets, Transformers, U-Net
- Layer selection: Convolutions, normalization, activation functions
- Skip connections: Residual blocks, encoder-decoder
- Model scaling: Width, depth, resolution strategies
- Context7 patterns: Architecture best practices

**Example**:
```markdown
@neural-network-architect

Design a ResNet architecture for ImageNet with:
- ResNet-50 structure with bottleneck blocks
- Batch normalization and ReLU activations
- Skip connections for gradient flow
- Proper initialization strategies
```

#### 6. gradient-boosting-expert
**Gradient boosting specialist (XGBoost, LightGBM, CatBoost)**
- Model training: Early stopping, cross-validation
- Hyperparameter tuning: GridSearchCV, Optuna
- Feature importance: Gain, cover, SHAP values
- Categorical handling: Native categorical support
- Context7 patterns: 10+ verified XGBoost patterns

**Example**:
```markdown
@gradient-boosting-expert

Build a XGBoost model for customer churn with:
- Categorical feature handling (no encoding needed)
- GridSearchCV hyperparameter tuning
- Early stopping on validation set
- SHAP feature importance analysis
```

#### 7. computer-vision-expert
**Computer vision specialist (OpenCV, YOLO, object detection)**
- Image preprocessing: Resizing, normalization, augmentation
- Object detection: YOLO, Faster R-CNN with OpenCV DNN
- Segmentation: DeepLab, Mask R-CNN
- Face recognition: YuNet detection, SFace recognition
- Real-time video: Optimized processing pipelines
- Context7 patterns: OpenCV best practices

**Example**:
```markdown
@computer-vision-expert

Build a real-time object detection pipeline with:
- YOLO v8 with OpenCV DNN module
- GPU acceleration (CUDA backend)
- Video processing at 30 FPS
- Non-maximum suppression for duplicate removal
```

#### 8. nlp-transformer-expert
**NLP transformer specialist (BERT, GPT, T5)**
- Fine-tuning: Text classification, NER, question answering
- Pipeline API: Quick inference with pre-trained models
- Text generation: GPT-2/GPT-3 with sampling strategies
- Inference optimization: Mixed precision, torch.compile
- Parameter-efficient fine-tuning: LoRA with PEFT
- Context7 patterns: 15+ verified Transformers patterns

**Example**:
```markdown
@nlp-transformer-expert

Fine-tune BERT for sentiment analysis with:
- HuggingFace Trainer API
- Mixed precision (FP16) training
- Early stopping and checkpointing
- LoRA for efficient fine-tuning (0.1% trainable params)
```

#### 9. time-series-expert
**Time series forecasting specialist**
- Statistical models: Prophet, ARIMA, SARIMAX
- Deep learning: LSTM, GRU, Temporal Fusion Transformer
- Seasonality: Trend analysis, decomposition
- Anomaly detection: Prophet confidence intervals
- Multi-step forecasting: Recursive and direct strategies
- Context7 patterns: Prophet and ARIMA best practices

**Example**:
```markdown
@time-series-expert

Build a sales forecasting model with:
- Prophet for multiple seasonality (daily, weekly, yearly)
- Custom holiday effects (Black Friday, Christmas)
- Cross-validation for horizon evaluation
- Anomaly detection with 99% confidence intervals
```

#### 10. automl-expert
**Automated machine learning specialist**
- Frameworks: AutoGluon, FLAML, AutoKeras, H2O AutoML
- Model selection: Automatic algorithm comparison
- Ensembling: Stacking, blending, bagging
- Hyperparameter optimization: Bayesian search
- Rapid prototyping: Get best models with minimal code
- Context7 patterns: AutoGluon and FLAML workflows

**Example**:
```markdown
@automl-expert

Build a classification model with AutoGluon:
- Automatic preprocessing and feature engineering
- Train 10+ model types (LightGBM, XGBoost, Neural Nets)
- Multi-layer stacking ensembles
- 1 hour time budget with best_quality preset
```

## 🚀 Quick Start

### Deep Learning with TensorFlow

```markdown
@tensorflow-keras-expert

I need to build an image classifier for 10 classes:
- Use transfer learning with MobileNetV2
- Fine-tune the top layers
- Apply data augmentation
- Use callbacks for early stopping and learning rate scheduling
- Export to TensorFlow Lite for Android deployment
```

### Deep Learning with PyTorch

```markdown
@pytorch-expert

Create a sentiment analysis model:
- BERT-based architecture
- Mixed precision training (FP16)
- Distributed training on 2 GPUs with DDP
- Gradient clipping for stability
- Save best model based on validation F1 score
```

### Reinforcement Learning

```markdown
@reinforcement-learning-expert

Train an RL agent to play Atari Pong:
- Use DQN algorithm from Stable-Baselines3
- Frame stacking for temporal information
- Reward clipping
- Experience replay with prioritization
- Evaluate every 10k steps
- Stop when average reward exceeds 18
```

### Classical Machine Learning

```markdown
@scikit-learn-expert

Build a house price prediction model:
- Features: numeric (area, bedrooms) and categorical (location, type)
- Pipeline with imputation, scaling, and encoding
- RandomizedSearchCV for hyperparameter tuning
- Ridge regression with cross-validation
- Feature importance and SHAP analysis
```

## 📋 Agent Capabilities

### TensorFlow/Keras Agent

**Strengths**:
- Production deployment (TensorFlow Serving, TFLite)
- TPU training for massive scale
- Strong mobile/edge support
- Rich ecosystem (TensorFlow Hub, TFX)

**Use Cases**:
- Mobile apps (TFLite)
- Large-scale training (TPUs)
- Production serving (TF Serving)
- Browser deployment (TensorFlow.js)

### PyTorch Agent

**Strengths**:
- Research flexibility
- Dynamic computational graphs
- Excellent debugging
- Strong community support

**Use Cases**:
- Research experiments
- Custom architectures
- Academic projects
- Prototyping new models

### Reinforcement Learning Agent

**Strengths**:
- Game AI and robotics
- Sequential decision making
- Multi-agent systems
- Adaptive systems

**Use Cases**:
- Game playing (Atari, board games)
- Robotics control
- Resource optimization
- Recommendation systems

### Scikit-learn Agent

**Strengths**:
- Fast prototyping
- Interpretable models
- Small datasets
- Production simplicity

**Use Cases**:
- Tabular data
- Feature engineering
- Quick baselines
- Interpretable ML

## 🧪 Context7-Verified Patterns

### TensorFlow Patterns
1. ✅ Callbacks for checkpointing and early stopping
2. ✅ XLA compilation with `jit_compile=True`
3. ✅ Distributed training with MirroredStrategy
4. ✅ Mixed precision with `mixed_float16` policy
5. ✅ Proper data normalization (/ 255.0)
6. ✅ Learning rate schedules (ExponentialDecay, CosineAnnealing)
7. ✅ TensorFlow Lite conversion for mobile
8. ✅ Custom training loops with @tf.function
9. ✅ Model evaluation on test set
10. ✅ SavedModel format for deployment

### PyTorch Patterns
1. ✅ torch.compile for 2x speedup
2. ✅ DistributedDataParallel (DDP) for multi-GPU
3. ✅ Mixed precision with torch.amp.autocast
4. ✅ Proper nn.Module structure with super().__init__
5. ✅ DataLoader with num_workers and pin_memory
6. ✅ Model checkpointing (state_dict, not full model)
7. ✅ Gradient clipping for stability
8. ✅ Learning rate schedulers (StepLR, CosineAnnealing)
9. ✅ Custom loss functions with autograd
10. ✅ Proper CUDA device management

### RL Patterns
1. ✅ Gymnasium API (observation, reward, terminated, truncated, info)
2. ✅ Epsilon-greedy exploration with decay
3. ✅ Q-Learning with Bellman equation updates
4. ✅ Custom environments with proper reset/step
5. ✅ Stable-Baselines3 with callbacks
6. ✅ Vectorized environments for speedup
7. ✅ Reward shaping (dense vs sparse rewards)
8. ✅ Early stopping on reward threshold
9. ✅ Model saving and loading
10. ✅ Custom training callbacks for monitoring

### Scikit-learn Patterns
1. ✅ Pipelines to prevent data leakage
2. ✅ Cross-validation with pipelines
3. ✅ GridSearchCV/RandomizedSearchCV for tuning
4. ✅ Feature selection as pipeline step
5. ✅ class_weight='balanced' for imbalanced data

## 🔧 Configuration

### Environment Variables

```bash
# TensorFlow
export TF_FORCE_GPU_ALLOW_GROWTH=true
export TF_XLA_FLAGS=--tf_xla_enable_xla_devices

# PyTorch
export CUDA_VISIBLE_DEVICES=0,1
export TORCH_DISTRIBUTED_DEBUG=DETAIL

# RL
export GYM_RENDER_MODE=human
```

## 📖 Documentation

- [TensorFlow/Keras Expert Guide](./agents/tensorflow-keras-expert.md)
- [PyTorch Expert Guide](./agents/pytorch-expert.md)
- [RL Expert Guide](./agents/reinforcement-learning-expert.md)
- [Scikit-learn Expert Guide](./agents/scikit-learn-expert.md)

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## 📄 License

MIT © ClaudeAutoPM Team

## 🔗 Links

- [ClaudeAutoPM](https://github.com/lagowski/ClaudeAutoPM)
- [Plugin Documentation](https://github.com/lagowski/ClaudeAutoPM/blob/main/docs/PLUGIN-IMPLEMENTATION-PLAN.md)
- [npm Package](https://www.npmjs.com/package/@claudeautopm/plugin-ml)
- [Issues](https://github.com/lagowski/ClaudeAutoPM/issues)
