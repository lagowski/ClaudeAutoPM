# AI Model Deployment Command

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: mlflow, openai, huggingface, langchain.

## Command Description

Generate production-ready AI model deployment infrastructure with Context7-verified patterns:
- Model versioning and registry (MLflow)
- API endpoint generation (FastAPI)
- Load balancing and scaling
- Monitoring and observability
- Error handling and fallbacks
- CI/CD integration

## Usage

```bash
/ai:model-deploy <model-name>
```

## Options

- `--model-type` - Model type (openai, huggingface, custom) [default: openai]
- `--framework` - Deployment framework (fastapi, flask, mlflow) [default: fastapi]
- `--monitoring` - Enable monitoring (prometheus, datadog, none) [default: prometheus]
- `--caching` - Enable response caching [default: true]
- `--rate-limiting` - Requests per minute [default: 60]

## Implementation Steps

1. **Query Context7 Documentation**
   ```python
   # MANDATORY: Query these Context7 resources before scaffolding
   - /mlflow/mlflow deployment patterns
   - /openai/openai-python production best practices
   - /huggingface/transformers inference optimization
   ```

2. **Create Project Structure**
   ```
   <model-name>-deployment/
   ├── app/
   │   ├── api/
   │   │   ├── __init__.py
   │   │   ├── routes.py        # API endpoints
   │   │   └── models.py        # Pydantic models
   │   ├── core/
   │   │   ├── config.py        # Configuration
   │   │   ├── inference.py     # Model inference logic
   │   │   └── monitoring.py    # Metrics and logging
   │   └── main.py             # FastAPI application
   ├── models/
   │   └── registry/           # MLflow model registry
   ├── tests/
   │   ├── test_api.py
   │   ├── test_inference.py
   │   └── test_monitoring.py
   ├── deployment/
   │   ├── docker/
   │   │   ├── Dockerfile
   │   │   └── docker-compose.yml
   │   └── kubernetes/
   │       ├── deployment.yaml
   │       └── service.yaml
   ├── monitoring/
   │   ├── prometheus.yml
   │   └── grafana-dashboard.json
   ├── .env.example
   ├── requirements.txt
   └── README.md
   ```

3. **Generate FastAPI Application (Context7 Pattern)**
   ```python
   # app/main.py - Context7 best practices
   from fastapi import FastAPI, HTTPException, Depends
   from fastapi.middleware.cors import CORSMiddleware
   from fastapi.responses import JSONResponse
   from prometheus_fastapi_instrumentator import Instrumentator
   import logging
   from contextlib import asynccontextmanager

   from app.api.routes import router
   from app.core.config import settings
   from app.core.inference import ModelInference

   # Context7 Pattern: Lifespan context manager for startup/shutdown
   @asynccontextmanager
   async def lifespan(app: FastAPI):
       # Startup: Load model
       logger.info("Loading AI model...")
       app.state.model = ModelInference(settings.MODEL_PATH)
       await app.state.model.load()
       logger.info("Model loaded successfully")

       yield

       # Shutdown: Cleanup
       logger.info("Shutting down...")
       await app.state.model.cleanup()

   app = FastAPI(
       title="AI Model Deployment API",
       description="Production-ready AI model serving",
       version="1.0.0",
       lifespan=lifespan
   )

   # Context7 Pattern: Prometheus metrics instrumentation
   Instrumentator().instrument(app).expose(app)

   # CORS middleware
   app.add_middleware(
       CORSMiddleware,
       allow_origins=settings.ALLOWED_ORIGINS,
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )

   # Include API routes
   app.include_router(router, prefix="/api/v1")

   @app.get("/health")
   async def health_check():
       """Health check endpoint"""
       return {"status": "healthy", "model": "loaded"}
   ```

4. **Generate Inference Logic (Context7 Pattern)**
   ```python
   # app/core/inference.py - Context7 best practices
   from typing import List, Dict, Any, Optional
   import asyncio
   from datetime import datetime, timedelta
   import logging
   from openai import AsyncOpenAI
   from cachetools import TTLCache

   logger = logging.getLogger(__name__)

   class ModelInference:
       """
       Model inference with Context7 best practices.

       Context7 Patterns:
       - AsyncOpenAI for non-blocking inference
       - TTL caching for repeated queries
       - Rate limiting and retry logic
       - Comprehensive error handling
       """

       def __init__(self, model_name: str):
           self.model_name = model_name
           self.client: Optional[AsyncOpenAI] = None
           # Context7 pattern: TTL cache for responses
           self.cache = TTLCache(maxsize=1000, ttl=300)  # 5 min cache
           self.rate_limiter = RateLimiter(requests_per_minute=60)

       async def load(self):
           """Load model and initialize client"""
           try:
               self.client = AsyncOpenAI(
                   api_key=settings.OPENAI_API_KEY,
                   max_retries=3,
                   timeout=60.0
               )
               logger.info(f"Loaded model: {self.model_name}")
           except Exception as e:
               logger.error(f"Failed to load model: {e}")
               raise

       async def predict(
           self,
           prompt: str,
           temperature: float = 0.7,
           max_tokens: int = 500,
           use_cache: bool = True
       ) -> Dict[str, Any]:
           """
           Run inference with caching and error handling.

           Context7 Pattern: Cached async inference with retry
           """
           # Check cache
           cache_key = f"{prompt}:{temperature}:{max_tokens}"
           if use_cache and cache_key in self.cache:
               logger.info("Cache hit")
               return self.cache[cache_key]

           # Rate limiting
           await self.rate_limiter.wait_if_needed()

           # Inference with retry
           for attempt in range(3):
               try:
                   response = await self.client.chat.completions.create(
                       model=self.model_name,
                       messages=[{"role": "user", "content": prompt}],
                       temperature=temperature,
                       max_tokens=max_tokens
                   )

                   result = {
                       "text": response.choices[0].message.content,
                       "model": self.model_name,
                       "usage": {
                           "prompt_tokens": response.usage.prompt_tokens,
                           "completion_tokens": response.usage.completion_tokens,
                           "total_tokens": response.usage.total_tokens
                       },
                       "timestamp": datetime.utcnow().isoformat()
                   }

                   # Cache result
                   if use_cache:
                       self.cache[cache_key] = result

                   return result

               except Exception as e:
                   logger.error(f"Inference attempt {attempt + 1} failed: {e}")
                   if attempt == 2:
                       raise
                   await asyncio.sleep(2 ** attempt)  # Exponential backoff

       async def batch_predict(
           self,
           prompts: List[str],
           batch_size: int = 5
       ) -> List[Dict[str, Any]]:
           """
           Batch inference with Context7 best practices.

           Context7 Pattern: Concurrent batch processing
           """
           results = []

           for i in range(0, len(prompts), batch_size):
               batch = prompts[i:i + batch_size]

               # Process batch concurrently
               tasks = [self.predict(prompt) for prompt in batch]
               batch_results = await asyncio.gather(*tasks, return_exceptions=True)

               for result in batch_results:
                   if isinstance(result, Exception):
                       logger.error(f"Batch prediction error: {result}")
                       results.append({"error": str(result)})
                   else:
                       results.append(result)

               # Brief pause between batches
               if i + batch_size < len(prompts):
                   await asyncio.sleep(0.5)

           return results

       async def cleanup(self):
           """Cleanup resources"""
           if self.client:
               await self.client.close()
               logger.info("Client closed")
   ```

5. **Generate API Routes (Context7 Pattern)**
   ```python
   # app/api/routes.py - Context7 best practices
   from fastapi import APIRouter, HTTPException, Depends, Request
   from pydantic import BaseModel, Field
   from typing import List, Optional
   import logging

   from app.core.inference import ModelInference

   logger = logging.getLogger(__name__)
   router = APIRouter()

   class PredictionRequest(BaseModel):
       prompt: str = Field(..., min_length=1, max_length=10000)
       temperature: float = Field(default=0.7, ge=0.0, le=2.0)
       max_tokens: int = Field(default=500, ge=1, le=4000)
       use_cache: bool = True

   class PredictionResponse(BaseModel):
       text: str
       model: str
       usage: dict
       timestamp: str

   def get_model(request: Request) -> ModelInference:
       """Dependency to get model from app state"""
       return request.app.state.model

   @router.post("/predict", response_model=PredictionResponse)
   async def predict(
       request: PredictionRequest,
       model: ModelInference = Depends(get_model)
   ):
       """
       Run inference on a single prompt.

       Context7 Pattern: Async endpoint with validation
       """
       try:
           result = await model.predict(
               prompt=request.prompt,
               temperature=request.temperature,
               max_tokens=request.max_tokens,
               use_cache=request.use_cache
           )
           return result
       except Exception as e:
           logger.error(f"Prediction failed: {e}")
           raise HTTPException(status_code=500, detail=str(e))

   @router.post("/batch-predict")
   async def batch_predict(
       prompts: List[str],
       model: ModelInference = Depends(get_model)
   ):
       """
       Run inference on multiple prompts.

       Context7 Pattern: Batch processing endpoint
       """
       try:
           results = await model.batch_predict(prompts)
           return {"results": results, "count": len(results)}
       except Exception as e:
           logger.error(f"Batch prediction failed: {e}")
           raise HTTPException(status_code=500, detail=str(e))
   ```

6. **Generate Monitoring Configuration**
   ```yaml
   # monitoring/prometheus.yml
   global:
     scrape_interval: 15s
     evaluation_interval: 15s

   scrape_configs:
     - job_name: 'ai-model-api'
       static_configs:
         - targets: ['localhost:8000']
       metrics_path: '/metrics'
   ```

7. **Generate Dockerfile (Context7 Pattern)**
   ```dockerfile
   # deployment/docker/Dockerfile
   FROM python:3.11-slim

   WORKDIR /app

   # Install dependencies
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt

   # Copy application
   COPY app/ app/

   # Context7 pattern: Non-root user for security
   RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
   USER appuser

   # Health check
   HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
     CMD curl -f http://localhost:8000/health || exit 1

   # Run application
   CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```

8. **Generate Kubernetes Deployment**
   ```yaml
   # deployment/kubernetes/deployment.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: ai-model-deployment
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: ai-model
     template:
       metadata:
         labels:
           app: ai-model
       spec:
         containers:
         - name: ai-model
           image: ai-model:latest
           ports:
           - containerPort: 8000
           env:
           - name: OPENAI_API_KEY
             valueFrom:
               secretKeyRef:
                 name: ai-secrets
                 key: openai-api-key
           resources:
             requests:
               memory: "512Mi"
               cpu: "500m"
             limits:
               memory: "1Gi"
               cpu: "1000m"
           livenessProbe:
             httpGet:
               path: /health
               port: 8000
             initialDelaySeconds: 30
             periodSeconds: 10
           readinessProbe:
             httpGet:
               path: /health
               port: 8000
             initialDelaySeconds: 10
             periodSeconds: 5
   ```

## Context7-Verified Best Practices Applied

1. **Async Inference** (from `/openai/openai-python`):
   - AsyncOpenAI for non-blocking operations
   - Concurrent batch processing with asyncio.gather()
   - Proper timeout and retry configuration

2. **Caching** (from ML production patterns):
   - TTL cache for repeated queries
   - Cache key generation from request parameters
   - Configurable cache expiration

3. **Rate Limiting** (from `/openai/openai-python`):
   - Token bucket algorithm
   - Exponential backoff on failures
   - Configurable rate limits

4. **Monitoring** (from production ML patterns):
   - Prometheus metrics instrumentation
   - Request/response logging
   - Error tracking and alerting

## Testing

Generated scaffold includes:
- Unit tests for inference logic
- Integration tests for API endpoints
- Load tests for performance validation
- End-to-end deployment tests

## Production Considerations

- Horizontal scaling with Kubernetes
- Model versioning with MLflow
- Blue-green deployments
- Canary releases
- Cost monitoring and optimization

## References

- Context7: `/mlflow/mlflow` - Model deployment patterns
- Context7: `/openai/openai-python` - Production API usage
