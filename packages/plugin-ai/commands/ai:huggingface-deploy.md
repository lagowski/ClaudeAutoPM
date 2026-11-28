---
allowed-tools: Bash, Read, Write, LS
---

# huggingface:deploy

Deploy HuggingFace models to production with Context7-verified quantization, optimization, and inference endpoint strategies.

## Description

Comprehensive HuggingFace model deployment following official best practices:
- Model quantization (GPTQ, AWQ, GGUF)
- Inference optimization (vLLM, TGI, Optimum)
- Deployment strategies (HF Inference Endpoints, SageMaker, local)
- Auto-scaling and load balancing
- Model serving with FastAPI
- Performance monitoring

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: transformers, huggingface, optimum, vllm.

## Usage

```bash
/huggingface:deploy [options]
```

## Options

- `--model <model-id>` - HuggingFace model ID (e.g., mistralai/Mistral-7B-v0.1)
- `--quantization <none|gptq|awq|gguf>` - Quantization method (default: none)
- `--backend <vllm|tgi|optimum|transformers>` - Inference backend (default: transformers)
- `--deployment <endpoints|sagemaker|local>` - Deployment target (default: local)
- `--output <file>` - Write deployment config

## Examples

### Full Deployment Pipeline
```bash
/huggingface:deploy --model mistralai/Mistral-7B-v0.1 --quantization gptq --backend vllm
```

### Deploy to HF Inference Endpoints
```bash
/huggingface:deploy --model meta-llama/Llama-3.1-8B --deployment endpoints
```

### Local Deployment with Quantization
```bash
/huggingface:deploy --model TheBloke/Mistral-7B-GPTQ --backend vllm --deployment local
```

### Generate Deployment Config
```bash
/huggingface:deploy --model microsoft/phi-2 --output deploy-config.yaml
```

## Deployment Categories

### 1. Model Quantization (Context7-Verified)

**Pattern from Context7 (/huggingface/transformers):**

#### GPTQ Quantization (4-bit)
```python
from transformers import AutoModelForCausalLM, AutoTokenizer, GPTQConfig

# Load model with GPTQ quantization
model_id = "TheBloke/Mistral-7B-GPTQ"

quantization_config = GPTQConfig(
    bits=4,
    group_size=128,
    desc_act=False
)

model = AutoModelForCausalLM.from_pretrained(
    model_id,
    device_map="auto",
    quantization_config=quantization_config
)

tokenizer = AutoTokenizer.from_pretrained(model_id)

# Generate
inputs = tokenizer("What is machine learning?", return_tensors="pt").to("cuda")
outputs = model.generate(**inputs, max_new_tokens=100)
print(tokenizer.decode(outputs[0]))
```

**Memory Savings:**
- FP16 model: 14 GB (7B parameters × 2 bytes)
- GPTQ 4-bit: 3.5 GB (7B parameters × 0.5 bytes)
- Reduction: 75% memory savings

**Performance:**
- Speed: ~5% slower than FP16
- Quality: Minimal degradation (<1% perplexity increase)
- Throughput: 4x more models per GPU

#### AWQ Quantization (4-bit, optimized)
```python
from transformers import AutoModelForCausalLM, AwqConfig

# AWQ: Activation-aware Weight Quantization
awq_config = AwqConfig(
    bits=4,
    group_size=128,
    zero_point=True,
    version="gemm"  # Optimized GEMM kernels
)

model = AutoModelForCausalLM.from_pretrained(
    "TheBloke/Mistral-7B-AWQ",
    device_map="auto",
    quantization_config=awq_config
)

# AWQ is 2-3x faster than GPTQ for same quality
```

**Performance:**
- Speed: Same as FP16 (optimized kernels)
- Quality: Better than GPTQ (activation-aware)
- Memory: 75% reduction (same as GPTQ)
- Best for: Production inference

#### bitsandbytes INT8 Quantization
```python
from transformers import AutoModelForCausalLM, BitsAndBytesConfig

# INT8 quantization with bitsandbytes
bnb_config = BitsAndBytesConfig(
    load_in_8bit=True,
    llm_int8_threshold=6.0,
    llm_int8_has_fp16_weight=False
)

model = AutoModelForCausalLM.from_pretrained(
    "mistralai/Mistral-7B-v0.1",
    device_map="auto",
    quantization_config=bnb_config
)

# Memory: 50% reduction, minimal quality loss
```

**Performance:**
- Memory: 7 GB (50% reduction)
- Speed: 10% slower than FP16
- Quality: <0.5% degradation
- Best for: Fine-tuning and inference

#### GGUF Quantization (CPU inference)
```bash
# Convert to GGUF format for llama.cpp
pip install llama-cpp-python

# Download GGUF model
from huggingface_hub import hf_hub_download

model_path = hf_hub_download(
    repo_id="TheBloke/Mistral-7B-GGUF",
    filename="mistral-7b.Q4_K_M.gguf"
)

# Load with llama-cpp-python
from llama_cpp import Llama

llm = Llama(
    model_path=model_path,
    n_ctx=2048,
    n_gpu_layers=0  # CPU only (or 32 for GPU offload)
)

# Generate
output = llm("What is AI?", max_tokens=100)
print(output['choices'][0]['text'])
```

**Performance:**
- CPU inference: 5-10 tokens/sec (4-bit)
- GPU offload: 20-50 tokens/sec
- Memory: 4 GB (CPU)
- Best for: Edge deployment, CPU servers

### 2. vLLM High-Throughput Serving (Context7-Verified)

**Pattern from Context7 (/huggingface/vllm):**

#### vLLM Server Setup
```python
from vllm import LLM, SamplingParams

# Initialize vLLM
llm = LLM(
    model="mistralai/Mistral-7B-v0.1",
    tensor_parallel_size=1,  # Number of GPUs
    dtype="auto",
    max_model_len=4096,
    gpu_memory_utilization=0.9,
    enforce_eager=False,  # Use CUDA graphs for faster inference
    trust_remote_code=True
)

# Sampling parameters
sampling_params = SamplingParams(
    temperature=0.7,
    top_p=0.9,
    max_tokens=256
)

# Batch inference
prompts = [
    "What is machine learning?",
    "Explain quantum computing.",
    "What is Python programming?"
]

outputs = llm.generate(prompts, sampling_params)

for output in outputs:
    prompt = output.prompt
    generated_text = output.outputs[0].text
    print(f"Prompt: {prompt}")
    print(f"Generated: {generated_text}\n")
```

**Performance:**
- Throughput: 2-10x higher than HF Transformers
- Continuous batching: Automatic request batching
- PagedAttention: Efficient KV cache management
- Multi-GPU: Tensor parallelism support

**Benchmarks (Mistral-7B on A100):**
- HF Transformers: 30 tokens/sec
- vLLM: 200+ tokens/sec (6x faster)
- Memory efficiency: 2x more concurrent requests

#### vLLM API Server
```bash
# Start vLLM OpenAI-compatible API server
python -m vllm.entrypoints.openai.api_server \
  --model mistralai/Mistral-7B-v0.1 \
  --host 0.0.0.0 \
  --port 8000 \
  --tensor-parallel-size 1

# Test with OpenAI client
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="dummy"  # vLLM doesn't require API key
)

completion = client.chat.completions.create(
    model="mistralai/Mistral-7B-v0.1",
    messages=[
        {"role": "user", "content": "What is AI?"}
    ]
)

print(completion.choices[0].message.content)
```

**Benefits:**
- OpenAI-compatible API
- Drop-in replacement for OpenAI
- 10x cheaper than OpenAI (self-hosted)
- Full control over model

### 3. Text Generation Inference (TGI) (Context7-Verified)

**Pattern from Context7 (/huggingface/tgi):**

#### TGI Docker Deployment
```bash
# Run TGI with Docker
docker run --gpus all --shm-size 1g -p 8080:80 \
  -v $PWD/data:/data \
  ghcr.io/huggingface/text-generation-inference:latest \
  --model-id mistralai/Mistral-7B-v0.1 \
  --num-shard 1 \
  --max-input-length 2048 \
  --max-total-tokens 4096 \
  --quantize gptq

# Test with curl
curl http://localhost:8080/generate \
  -X POST \
  -d '{"inputs": "What is deep learning?", "parameters": {"max_new_tokens": 100}}' \
  -H 'Content-Type: application/json'
```

**TGI Features:**
- Continuous batching
- Flash Attention 2
- GPTQ/AWQ quantization
- Token streaming
- Auto-scaling

#### TGI Client (Python)
```python
from huggingface_hub import InferenceClient

client = InferenceClient(model="http://localhost:8080")

# Generate
text = client.text_generation(
    "Explain artificial intelligence",
    max_new_tokens=100,
    temperature=0.7,
    top_p=0.9,
    stream=False
)

print(text)

# Streaming
for token in client.text_generation(
    "Write a story about AI",
    max_new_tokens=200,
    stream=True
):
    print(token, end="", flush=True)
```

**Performance (Mistral-7B on A100):**
- Throughput: 150+ tokens/sec
- Latency: <100ms time to first token
- Memory: Optimized with Flash Attention 2
- Best for: Production serving

### 4. HuggingFace Inference Endpoints (Context7-Verified)

**Pattern from Context7 (/huggingface/inference-endpoints):**

#### Deploy to HF Inference Endpoints
```python
from huggingface_hub import create_inference_endpoint

# Create managed endpoint
endpoint = create_inference_endpoint(
    name="mistral-7b-endpoint",
    repository="mistralai/Mistral-7B-v0.1",
    framework="pytorch",
    task="text-generation",
    accelerator="gpu",
    instance_size="x1",  # 1x NVIDIA A10G
    instance_type="nvidia-a10g",
    region="us-east-1",
    vendor="aws",
    account_id="your-account-id",
    min_replica=1,
    max_replica=3,
    revision="main",
    custom_image={
        "health_route": "/health",
        "env": {
            "MAX_INPUT_LENGTH": "2048",
            "MAX_TOTAL_TOKENS": "4096"
        }
    }
)

print(f"Endpoint created: {endpoint.name}")
print(f"URL: {endpoint.url}")

# Wait for deployment
endpoint.wait()

# Test endpoint
from huggingface_hub import InferenceClient

client = InferenceClient(model=endpoint.url, token="hf_xxx")

response = client.text_generation(
    "What is machine learning?",
    max_new_tokens=100
)

print(response)
```

**Pricing (as of 2025):**
- x1 (NVIDIA A10G): $0.60/hour
- x2 (2x A10G): $1.20/hour
- x4 (4x A100): $4.50/hour
- Auto-scaling: Pay only for active replicas

**Benefits:**
- Fully managed infrastructure
- Auto-scaling (1-10 replicas)
- Built-in monitoring
- 99.9% uptime SLA
- Global CDN

### 5. Optimum Hardware Acceleration (Context7-Verified)

**Pattern from Context7 (/huggingface/optimum):**

#### ONNX Runtime Optimization
```python
from optimum.onnxruntime import ORTModelForCausalLM
from transformers import AutoTokenizer

# Convert to ONNX and optimize
model = ORTModelForCausalLM.from_pretrained(
    "microsoft/phi-2",
    export=True,
    provider="CUDAExecutionProvider"  # GPU acceleration
)

tokenizer = AutoTokenizer.from_pretrained("microsoft/phi-2")

# Inference
inputs = tokenizer("What is AI?", return_tensors="pt")
outputs = model.generate(**inputs, max_new_tokens=100)
print(tokenizer.decode(outputs[0]))
```

**Performance:**
- Speed: 2-3x faster than PyTorch
- Memory: 30% reduction
- Cross-platform: CPU, GPU, NPU
- Best for: Edge deployment

#### Intel Neural Compressor
```python
from optimum.intel import INCModelForCausalLM

# Optimize for Intel CPUs
model = INCModelForCausalLM.from_pretrained(
    "microsoft/phi-2",
    export=True
)

# INT8 quantization for CPU
from optimum.intel import INCQuantizer

quantizer = INCQuantizer.from_pretrained(model)
quantized_model = quantizer.quantize()

# 4x faster on Intel CPUs
```

### 6. FastAPI Model Serving (Context7-Verified)

**Pattern from Context7:**

#### Production API Server
```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

app = FastAPI()

# Load model once at startup
model_id = "microsoft/phi-2"
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    torch_dtype=torch.float16,
    device_map="auto"
)
tokenizer = AutoTokenizer.from_pretrained(model_id)

class GenerationRequest(BaseModel):
    prompt: str
    max_tokens: int = 100
    temperature: float = 0.7
    top_p: float = 0.9

class GenerationResponse(BaseModel):
    generated_text: str
    tokens_generated: int

@app.post("/generate", response_model=GenerationResponse)
async def generate(request: GenerationRequest):
    try:
        inputs = tokenizer(request.prompt, return_tensors="pt").to(model.device)

        outputs = model.generate(
            **inputs,
            max_new_tokens=request.max_tokens,
            temperature=request.temperature,
            top_p=request.top_p,
            do_sample=True
        )

        generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        tokens_generated = len(outputs[0]) - len(inputs.input_ids[0])

        return GenerationResponse(
            generated_text=generated_text,
            tokens_generated=tokens_generated
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "healthy"}

# Run: uvicorn server:app --host 0.0.0.0 --port 8000
```

#### Docker Deployment
```dockerfile
FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

# Install Python
RUN apt-get update && apt-get install -y python3 python3-pip

# Install dependencies
COPY requirements.txt .
RUN pip3 install -r requirements.txt

# Copy application
COPY server.py .

# Download model at build time
RUN python3 -c "from transformers import AutoModelForCausalLM; AutoModelForCausalLM.from_pretrained('microsoft/phi-2')"

# Run server
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
```

```bash
# Build and run
docker build -t hf-model-server .
docker run --gpus all -p 8000:8000 hf-model-server
```

### 7. Monitoring and Auto-Scaling (Context7-Verified)

**Pattern from Context7:**

#### Prometheus Metrics
```python
from prometheus_client import Counter, Histogram, start_http_server
import time

# Metrics
request_count = Counter('model_requests_total', 'Total inference requests')
request_duration = Histogram('model_request_duration_seconds', 'Request duration')
tokens_generated = Counter('model_tokens_generated_total', 'Total tokens generated')

@app.post("/generate")
async def generate(request: GenerationRequest):
    request_count.inc()

    start_time = time.time()

    # Generate
    outputs = model.generate(...)

    # Record metrics
    duration = time.time() - start_time
    request_duration.observe(duration)
    tokens_generated.inc(len(outputs[0]))

    return response

# Start metrics server
start_http_server(9090)
```

#### Kubernetes Auto-Scaling
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: hf-model-server
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: hf-model-server
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: model_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
```

## Deployment Output

```
🚀 HuggingFace Model Deployment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Model: mistralai/Mistral-7B-v0.1
Quantization: GPTQ 4-bit
Backend: vLLM
Deployment: Local

📊 Model Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Base Model:
  - Parameters: 7.2B
  - FP16 size: 14 GB
  - Context length: 8192 tokens

  Quantization:
  - Method: GPTQ 4-bit
  - Quantized size: 3.5 GB (75% reduction)
  - Quality: 99% of FP16 (minimal degradation)
  - Speed: 95% of FP16 performance

  vLLM Configuration:
  - GPUs: 1x NVIDIA A100
  - Tensor parallel: 1
  - Max model length: 4096
  - GPU memory: 90% utilization
  - PagedAttention: Enabled

⚡ Performance Benchmarks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Throughput:
  - Baseline (HF Transformers): 30 tokens/sec
  - vLLM optimized: 200 tokens/sec (6.7x faster)
  - Concurrent requests: 20 (vs 5 baseline)

  Latency:
  - Time to first token: 50ms
  - Average token latency: 5ms
  - End-to-end (100 tokens): 550ms

  Memory:
  - Model: 3.5 GB
  - KV cache: 2 GB
  - Total: 5.5 GB (vs 14 GB baseline)

💰 Cost Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Infrastructure:
  - GPU: 1x A100 ($2/hour AWS)
  - Monthly cost: $1,440
  - Requests: 10M/month
  - Cost per 1K requests: $0.144

  vs OpenAI GPT-4o:
  - OpenAI cost: $2.50 per 1M input tokens
  - Self-hosted: $0.144 per 1K requests (~$14.40 per 1M tokens)
  - Savings: 82% ($1.86 per MTok)

  Break-even: ~720K requests/month

🎯 Deployment Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✅ Model downloaded and quantized
  ✅ vLLM server running on port 8000
  ✅ Health check: http://localhost:8000/health
  ✅ OpenAI-compatible API: http://localhost:8000/v1
  ✅ Prometheus metrics: http://localhost:9090/metrics

  Next Steps:
  1. Test inference: curl http://localhost:8000/v1/completions
  2. Load test: python load_test.py
  3. Deploy to production: docker push
  4. Setup monitoring: prometheus + grafana

  Configuration saved to: deploy-config.yaml
```

## Implementation

This command uses the **@huggingface-expert** agent with deployment expertise:

1. Query Context7 for HuggingFace deployment patterns
2. Select optimal quantization method
3. Configure inference backend
4. Setup deployment infrastructure
5. Implement monitoring
6. Generate deployment config
7. Test and validate

## Best Practices Applied

Based on Context7 documentation from `/huggingface/transformers`:

1. **GPTQ Quantization** - 75% memory savings, minimal quality loss
2. **vLLM Serving** - 6x faster throughput than baseline
3. **PagedAttention** - 2x more concurrent requests
4. **Flash Attention 2** - 2-4x faster attention computation
5. **Continuous Batching** - Automatic request batching
6. **Auto-Scaling** - Scale 1-10 replicas based on load
7. **Monitoring** - Prometheus metrics for observability

## Related Commands

- `/ai:model-deployment` - General model deployment
- `/openai:optimize` - OpenAI API optimization
- `/anthropic:optimize` - Anthropic Claude optimization

## Troubleshooting

### Out of Memory (OOM)
- Use GPTQ/AWQ 4-bit quantization (75% reduction)
- Reduce max_model_len parameter
- Enable CPU offloading for large models
- Use tensor parallelism (multi-GPU)

### Low Throughput
- Switch to vLLM (6x faster than HF Transformers)
- Enable continuous batching
- Use Flash Attention 2
- Reduce max_new_tokens

### High Latency
- Use smaller model (Phi-2, Mistral-7B vs Llama-70B)
- Enable CUDA graphs (vLLM)
- Use AWQ quantization (same speed as FP16)
- Reduce context length

### Quality Degradation
- Use AWQ instead of GPTQ (better quality)
- Try INT8 quantization (bitsandbytes)
- Use larger model
- Reduce quantization level (4-bit → 8-bit)

## Installation

```bash
# Install HuggingFace ecosystem
pip install transformers accelerate

# Install quantization
pip install auto-gptq bitsandbytes

# Install vLLM
pip install vllm

# Install Optimum
pip install optimum[onnxruntime-gpu]

# Install serving
pip install fastapi uvicorn

# Install monitoring
pip install prometheus-client
```

## Version History

- v2.0.0 - Initial Schema v2.0 release with Context7 integration
- GPTQ/AWQ/GGUF quantization support
- vLLM high-throughput serving
- Text Generation Inference (TGI) integration
- HF Inference Endpoints deployment
- Optimum hardware acceleration
- FastAPI production serving
- Prometheus monitoring
