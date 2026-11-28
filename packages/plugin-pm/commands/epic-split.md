---
name: epic-split
type: epic-management
category: pm
---

# Epic Split

Automatically split a PRD into multiple logical epics based on content analysis.

## Usage
```bash
/pm:epic-split <feature_name>
```

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`.

## Description
This command analyzes a PRD and automatically splits it into multiple epics based on:
- Technical components (frontend, backend, infrastructure)
- Feature areas (auth, dashboard, API, etc.)
- Complexity and dependencies
- Priority levels (P0, P1, P2)

## How It Works

1. **PRD Analysis**: Scans the PRD for keywords and patterns
2. **Epic Identification**: Matches content against epic templates
3. **Dependency Mapping**: Determines logical dependencies between epics
4. **Structure Creation**: Creates organized epic folders with metadata

## Epic Types Detected

- **Infrastructure Foundation** - Docker, DB, monitoring
- **Authentication Backend** - JWT, users, RBAC
- **Authentication UI** - Login/register forms
- **API Core Services** - REST endpoints
- **Frontend Foundation** - React/Vue/Angular setup
- **Dashboard & UX** - Main application UI
- **Data Layer** - Database models, migrations
- **Testing & Quality** - Test suites, TDD
- **Deployment & DevOps** - CI/CD, production
- **Security & Compliance** - OWASP, hardening

## Output Structure

```
.claude/epics/<feature_name>/
├── meta.yaml                    # Multi-epic metadata
├── 01-infrastructure/           # Epic 1
│   └── epic.md
├── 02-auth_backend/            # Epic 2
│   └── epic.md
├── 03-frontend_foundation/     # Epic 3
│   └── epic.md
└── ...
```

## Example

```bash
# Split a complex PRD into epics
/pm:epic-split frontend-backend-db-base

# Output:
✓ Identified 6 epics
✓ Epic 1: Infrastructure Foundation (P0, 1w)
✓ Epic 2: Authentication Backend (P0, 2w)
✓ Epic 3: Frontend Foundation (P0, 1w)
✓ Epic 4: Authentication UI (P0, 2w)
✓ Epic 5: Dashboard & UX (P1, 2w)
✓ Epic 6: Testing & Quality (P1, 1w)

Total Estimated Effort: 9 weeks
```

## Benefits

- **Automatic Analysis**: No manual epic creation needed
- **Dependency Detection**: Understands epic relationships
- **Priority Sorting**: P0 epics come first
- **Parallel Work**: Identifies what can be done simultaneously
- **Time Estimates**: Provides week-level estimates

## Next Steps After Split

1. Review the epic breakdown
2. Decompose each epic into tasks: `/pm:epic-decompose <feature>/<epic_number>`
3. Sync to GitHub: `/pm:epic-sync <feature>`
4. Start implementation on parallel epics

## When to Use

- PRDs with multiple components (frontend + backend + infra)
- Complex features requiring phased delivery
- Large teams needing parallel work streams
- Projects requiring clear milestone tracking

## Manual Override

If the automatic split isn't perfect, you can:
1. Edit the generated epic files
2. Adjust dependencies in meta.yaml
3. Merge or split epics further
4. Update time estimates

---

## Instructions

Run `node .claude/scripts/pm/epic-split.js $ARGUMENTS` using the Bash tool and show me the complete output.

- You MUST display the complete output.
- DO NOT truncate.
- DO NOT collapse.
- DO NOT abbreviate.
