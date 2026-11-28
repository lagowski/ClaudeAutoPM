# Python Backend Framework Selection Guide

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: python.

## Quick Selection Guide

The `python-backend-engineer` agent supports both **FastAPI** and **Flask** frameworks. Use this guide to choose the right framework for your project:

| Requirement | FastAPI | Flask |
|-------------|---------|-------|
| **High Performance APIs** | ✅ Primary | ⚙️ Moderate |
| **Async/Await Support** | ✅ Primary | ⚠️ Limited |
| **Rapid Prototyping** | ✅ Good | ✅ Primary |
| **Microservices** | ✅ Primary | ⚙️ Moderate |
| **Traditional Web Apps** | ⚙️ Possible | ✅ Primary |
| **Auto Documentation** | ✅ Built-in | ⚙️ Extensions |
| **Type Safety** | ✅ Built-in | ⚙️ Manual |
| **Learning Curve** | ⚙️ Moderate | ✅ Easy |
| **Large Applications** | ✅ Good | ✅ Primary |
| **WebSocket Support** | ✅ Built-in | ⚙️ Extensions |
| **Background Tasks** | ✅ Built-in | ⚙️ Celery |
| **Ecosystem Maturity** | ⚙️ Growing | ✅ Mature |
| **Community Size** | ⚙️ Growing | ✅ Large |
| **Enterprise Features** | ✅ Good | ✅ Excellent |

**Legend:**
- ✅ **Primary/Excellent**: Best choice for this use case
- ✅ **Good**: Strong support
- ⚙️ **Moderate/Possible**: Doable with some effort
- ⚠️ **Limited**: Has constraints or limitations

## Detailed Framework Comparison

### FastAPI (use python-backend-engineer with framework=fastapi)

**Best For:**
- **Modern APIs**: REST/GraphQL APIs with auto-documentation
- **High-performance Services**: Async-heavy applications
- **Microservices Architecture**: Independent scalable services
- **Type-safe Development**: Pydantic models for validation
- **Real-time Applications**: WebSocket support built-in

**Core Strengths:**
- Automatic OpenAPI/Swagger documentation
- Built-in request/response validation
- Native async/await support
- High performance (comparable to Node.js/Go)
- Modern Python type hints integration
- WebSocket and background task support
- Dependency injection system

**Typical Use Cases:**
- API-first applications
- High-throughput services
- Real-time applications (chat, notifications)
- Machine learning API services
- IoT data ingestion APIs
- Modern single-page app backends

### Flask (use python-backend-engineer with framework=flask)

**Best For:**
- **Traditional Web Applications**: Server-rendered applications
- **Rapid Prototyping**: Quick MVPs and proof-of-concepts
- **Large Applications**: Complex web applications with many features
- **Team Familiarity**: Teams experienced with Flask ecosystem
- **Flexible Architecture**: Applications needing custom structures

**Core Strengths:**
- Mature ecosystem with extensive extensions
- Flexible and unopinionated framework
- Excellent for server-rendered applications
- Strong community and documentation
- Easy learning curve
- Blueprint system for large applications
- Established patterns and conventions

**Typical Use Cases:**
- Content management systems
- E-commerce platforms
- Admin dashboards with server-side rendering
- Legacy system integration
- Monolithic web applications
- Educational projects

## Selection Decision Tree

### 1. What type of application are you building?

#### API-Only Applications
→ **FastAPI** (python-backend-engineer with framework=fastapi)
**Reasoning:**
- Auto-generated API documentation
- Built-in request/response validation
- High performance for API workloads
- Native async support for database operations

#### Web Applications with Templates
→ **Flask** (python-backend-engineer with framework=flask)
**Reasoning:**
- Mature template engine (Jinja2)
- Server-side rendering capabilities
- Extensive web development patterns
- Blueprint organization for large apps

#### Hybrid (API + Web)
→ **Consider both or choose based on primary focus:**
- API-heavy → FastAPI (python-backend-engineer with framework=fastapi)
- Web-heavy → Flask (python-backend-engineer with framework=flask)

### 2. What are your performance requirements?

#### High Performance Required
→ **FastAPI** (python-backend-engineer with framework=fastapi)
**Use When:**
- 1000+ requests per second expected
- Low latency requirements (< 100ms)
- Async I/O operations (database, external APIs)
- Concurrent user handling important

#### Standard Performance Acceptable
→ **Flask** (python-backend-engineer with framework=flask)
**Use When:**
- < 1000 requests per second
- Response time requirements moderate
- Synchronous operations sufficient
- WSGI deployment acceptable

### 3. What is your team's experience level?

#### Python Beginners to Intermediate
→ **Flask** (python-backend-engineer with framework=flask)
**Reasoning:**
- Simpler concepts and patterns
- Extensive tutorials and examples
- Less opinionated (easier to understand)
- Gradual learning curve

#### Python Advanced or Performance-Focused Teams
→ **FastAPI** (python-backend-engineer with framework=fastapi)
**Reasoning:**
- Leverages advanced Python features
- Type hints and modern patterns
- Async programming concepts
- Performance optimization opportunities

### 4. What are your integration requirements?

#### Modern Stack (React, Vue, Mobile Apps)
→ **FastAPI** (python-backend-engineer with framework=fastapi)
**Features:**
- Auto-generated API clients
- OpenAPI specification
- JSON-first approach
- CORS handling built-in

#### Traditional Stack (Server-rendered, jQuery)
→ **Flask** (python-backend-engineer with framework=flask)
**Features:**
- Template inheritance
- Form handling with WTForms
- Session management
- Traditional web patterns

## Specific Use Case Recommendations

### API Development

#### RESTful API for Mobile App
**Choice**: FastAPI (python-backend-engineer with framework=fastapi)
**Reasoning:**
- Auto-generated API documentation
- Request/response validation
- High performance for mobile clients
- Easy async database operations

#### Enterprise API with Complex Business Logic
**Choice**: FastAPI (python-backend-engineer with framework=fastapi)
**Reasoning:**
- Type safety for complex data structures
- Dependency injection for business services
- High performance for enterprise load
- OpenAPI for API governance

### Web Applications

#### Content Management System
**Choice**: Flask (python-backend-engineer with framework=flask)
**Reasoning:**
- Server-side rendering capabilities
- Admin interface patterns
- File upload handling
- Traditional web architecture

#### E-commerce Platform
**Choice**: Flask (python-backend-engineer with framework=flask)
**Reasoning:**
- Complex form handling (checkout, admin)
- Server-side rendering for SEO
- Payment integration patterns
- Mature ecosystem for e-commerce

### Hybrid Applications

#### SaaS Platform (Web + API)
**Primary Choice**: FastAPI (python-backend-engineer with framework=fastapi)
**Reasoning:**
- API-first for modern frontend
- WebSocket for real-time features
- High performance for scaling
- Auto-documentation for API users

**Alternative**: Use both
- FastAPI for API endpoints
- Flask for admin/marketing pages

### Specific Scenarios

#### Microservices Architecture
**Choice**: FastAPI (python-backend-engineer with framework=fastapi)
**Features:**
- Smaller, focused services
- Async communication between services
- Auto-generated service documentation
- High performance per service

#### Machine Learning API
**Choice**: FastAPI (python-backend-engineer with framework=fastapi)
**Features:**
- Async model inference
- Request validation for ML inputs
- Background processing for training
- WebSocket for real-time predictions

#### Legacy System Integration
**Choice**: Flask (python-backend-engineer with framework=flask)
**Features:**
- Established integration patterns
- Flexible architecture for custom needs
- Mature ecosystem for various protocols
- Blueprint organization for complexity

#### Startup MVP
**Choice**: Depends on team and product
- **Technical team building API**: FastAPI (python-backend-engineer with framework=fastapi)
- **Mixed team building web app**: Flask (python-backend-engineer with framework=flask)

## Performance Comparison

### Request Handling

**FastAPI:**
- 20,000+ requests/second (async)
- Sub-100ms response times
- Efficient async I/O handling
- Lower memory usage under load

**Flask:**
- 5,000-10,000 requests/second (with Gunicorn)
- 100-500ms typical response times
- Synchronous request handling
- Higher memory usage under concurrent load

### Development Speed

**FastAPI:**
- Slower initial setup (type annotations)
- Faster development with auto-completion
- Built-in validation saves development time
- Auto-documentation reduces documentation effort

**Flask:**
- Faster initial setup and prototyping
- More manual work for validation/docs
- Extensive examples and patterns available
- Familiar patterns speed up development

## Migration Considerations

### From Flask to FastAPI
**Good Reasons:**
- Need better performance
- Want auto-generated documentation
- Moving to API-first architecture
- Team ready for modern Python patterns

**Migration Strategy:**
- Start with new endpoints in FastAPI
- Gradually migrate existing endpoints
- Use both frameworks during transition

### From FastAPI to Flask
**Rare but Valid Reasons:**
- Need traditional web app features
- Team struggles with async concepts
- Require specific Flask ecosystem tools
- Building complex server-rendered applications

## Technology Stack Considerations

### Database Integration

**FastAPI Works Best With:**
- Async ORMs (SQLAlchemy 2.0+, Tortoise ORM)
- NoSQL databases (MongoDB with Motor)
- Redis for caching/sessions
- Cloud-native databases

**Flask Works Best With:**
- Traditional ORMs (SQLAlchemy, Peewee)
- Any SQL database
- File-based databases for simple apps
- Traditional database patterns

### Frontend Integration

**FastAPI Typical Stack:**
- React/Vue/Angular SPA
- Mobile applications
- Static site generators
- API-consuming applications

**Flask Typical Stack:**
- Server-rendered templates (Jinja2)
- Bootstrap/jQuery frontends
- Traditional web applications
- Progressive enhancement approaches

## Decision Questions Summary

1. **Is this primarily an API or web application?**
   - API → FastAPI
   - Web app → Flask

2. **Do you need high performance and scalability?**
   - Yes → FastAPI
   - No → Either (Flask simpler)

3. **Is your team comfortable with async programming?**
   - Yes → FastAPI
   - No → Flask

4. **Do you need real-time features (WebSocket)?**
   - Yes → FastAPI
   - No → Either

5. **Is automatic API documentation important?**
   - Yes → FastAPI
   - No → Flask

6. **Are you building microservices?**
   - Yes → FastAPI
   - No → Flask (better for monoliths)

7. **Do you need traditional web features (forms, sessions, templates)?**
   - Yes → Flask
   - No → FastAPI