---
name: python-api-scaffold
category: python
priority: medium
tags:
  - python
  - fastapi
  - api
  - scaffold
mcpTools:
  - context7
---

# Python API Scaffolding Command

Generate production-ready FastAPI application with Context7-verified best practices.

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: fastapi, python.

## Purpose

Create a complete FastAPI application structure with:
- Async endpoints following Context7 best practices
- Pydantic validation with HttpUrl and modern validators
- OAuth2 authentication with scopes
- Database integration (SQLAlchemy async)
- Proper dependency injection
- Type hints using latest Python features
- Testing setup with pytest
- Docker containerization

## Usage

```bash
/python:api-scaffold <project-name> [options]
```

## Options

- `--db <type>` - Database (postgresql, mysql, sqlite) [default: postgresql]
- `--auth` - Include OAuth2 authentication [default: true]
- `--docker` - Include Dockerfile and docker-compose [default: true]
- `--tests` - Include pytest setup [default: true]

## Generated Structure

```
<project-name>/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app with Context7 async patterns
│   ├── core/
│   │   ├── config.py        # Pydantic BaseSettings
│   │   ├── database.py      # Async SQLAlchemy engine
│   │   └── security.py      # OAuth2 with scopes
│   ├── api/
│   │   ├── deps.py          # Dependency injection
│   │   └── v1/
│   │       ├── endpoints/   # Async route handlers
│   │       └── router.py    # Route registration
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic models (HttpUrl validation)
│   └── services/            # Business logic
├── tests/
│   ├── conftest.py          # pytest fixtures
│   └── test_api.py          # API tests
├── migrations/              # Alembic migrations
├── pyproject.toml           # uv configuration
├── Dockerfile               # Multi-stage build
├── docker-compose.yml       # Development setup
└── README.md
```

## Implementation Steps

1. **Query Context7 Documentation** (MANDATORY FIRST STEP)
   - Retrieve FastAPI async endpoint patterns
   - Get Pydantic HttpUrl validation examples
   - Access OAuth2 scopes implementation
   - Review Python type hints (AsyncIterator, ParamSpec)

2. **Create Project Structure**
   - Initialize uv project
   - Setup pyproject.toml with dependencies
   - Create directory structure

3. **Core Configuration** (Using Context7 patterns)
   ```python
   # app/core/config.py
   from pydantic_settings import BaseSettings
   from pydantic import HttpUrl

   class Settings(BaseSettings):
       database_url: str
       api_url: HttpUrl  # Context7 HttpUrl validation
       secret_key: str

       class Config:
           env_file = ".env"
   ```

4. **Database Setup** (Context7 async SQLAlchemy)
   ```python
   # app/core/database.py
   from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
   from sqlalchemy.orm import sessionmaker
   from typing import AsyncIterator  # Context7 type hint

   async def get_db() -> AsyncIterator[AsyncSession]:
       async with async_session() as session:
           yield session
   ```

5. **OAuth2 Authentication** (Context7 scopes pattern)
   ```python
   # app/core/security.py
   from fastapi.security import OAuth2PasswordBearer

   oauth2_scheme = OAuth2PasswordBearer(
       tokenUrl="token",
       scopes={
           "me": "Read information about the current user.",
           "items": "Read items.",
       },
   )
   ```

6. **API Endpoints** (Context7 async patterns)
   ```python
   # app/api/v1/endpoints/users.py
   from fastapi import Depends, APIRouter
   from typing import AsyncIterator

   @router.get("/users/me/")
   async def read_users_me(
       current_user: User = Depends(get_current_active_user)
   ):
       return current_user
   ```

7. **Testing Setup**
   - Configure pytest with async support
   - Create test fixtures
   - Add API endpoint tests

8. **Docker Configuration**
   - Multi-stage Dockerfile
   - docker-compose with PostgreSQL
   - Development and production configs

## Context7-Verified Best Practices Applied

From `/websites/fastapi_tiangolo` (28,852 snippets, trust 9.0):
- **Async endpoints**: All route handlers use async/await
- **HttpUrl validation**: Pydantic HttpUrl for URL fields
- **OAuth2 scopes**: Granular permission control
- **Dependency injection**: Proper use of Depends()
- **Background tasks**: BackgroundTasks for async operations

From `/python/cpython` (19,631 snippets, trust 8.9):
- **Type hints**: AsyncIterator for async generators
- **ParamSpec**: Type-safe decorator patterns
- **TypeIs**: Type narrowing in conditionals
- **TYPE_CHECKING**: Conditional imports for type checking only

## Expected Output

```
🐍 PYTHON API SCAFFOLDING
=========================

Project: my-api
Framework: FastAPI 0.104+
Database: PostgreSQL (async)
Auth: OAuth2 with scopes
Testing: pytest with async support

📋 CREATED FILES:
✓ app/main.py (FastAPI app with async endpoints)
✓ app/core/config.py (Pydantic settings with HttpUrl)
✓ app/core/database.py (Async SQLAlchemy engine)
✓ app/core/security.py (OAuth2 with scopes)
✓ app/api/deps.py (Dependency injection)
✓ app/api/v1/endpoints/users.py (Example endpoints)
✓ app/models/user.py (SQLAlchemy models)
✓ app/schemas/user.py (Pydantic schemas with HttpUrl)
✓ tests/conftest.py (pytest fixtures)
✓ tests/test_api.py (API tests)
✓ pyproject.toml (uv configuration)
✓ Dockerfile (Multi-stage build)
✓ docker-compose.yml (Development setup)

🔧 NEXT STEPS:
1. cd my-api
2. uv sync (install dependencies)
3. cp .env.example .env (configure environment)
4. docker-compose up -d (start PostgreSQL)
5. alembic upgrade head (run migrations)
6. uv run uvicorn app.main:app --reload (start server)
7. pytest (run tests)

📖 API DOCUMENTATION: http://localhost:8000/docs
```

## Validation Checklist

- [ ] Context7 documentation queried for latest patterns
- [ ] All endpoints are async
- [ ] Pydantic validation uses HttpUrl for URLs
- [ ] OAuth2 with scopes implemented
- [ ] Type hints include AsyncIterator and ParamSpec
- [ ] Database uses async SQLAlchemy
- [ ] Dependency injection properly configured
- [ ] Tests include async fixtures
- [ ] Docker configuration is multi-stage
- [ ] README includes setup instructions

## Agent Coordination

This command works with:
- **python-backend-engineer**: For implementation details
- **postgresql-expert**: For database schema design
- **docker-containerization-expert**: For containerization
- **test-runner**: For executing tests

## Related Commands

- `/python:docs-query` - Query Python library documentation
- `/testing:prime` - Setup testing environment
- `/docker:compose-generate` - Generate docker-compose configuration

## Error Handling

- Missing project name → Prompt for name
- Invalid database type → Show valid options
- No Context7 access → Error with instructions
- Directory exists → Confirm overwrite

## Notes

- Always queries Context7 BEFORE generating code
- Uses uv for modern Python dependency management
- Follows FastAPI async patterns from official docs
- Applies Pydantic v2 validation techniques
- Includes type hints using latest Python features
- Production-ready with proper error handling and logging
