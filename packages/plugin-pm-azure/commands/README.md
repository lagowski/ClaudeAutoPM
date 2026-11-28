# Azure DevOps Commands

Complete command suite for Azure DevOps integration with AutoPM project management system.

## Prerequisites

Configure environment variables in `.claude/.env`:

```bash
AZURE_DEVOPS_PAT=<your-pat-token>
AZURE_DEVOPS_ORG=<your-organization>
AZURE_DEVOPS_PROJECT=<your-project>
```

## Command Mapping

### PM System → Azure DevOps

| PM System | Azure DevOps | Work Item Type |
|-----------|--------------|----------------|
| `prd-*` | `us-*` | User Story |
| `issue-*` | `task-*` | Task |
| `epic-*` | `feature-*` | Feature/Epic |

## Available Commands

### User Story Management

#### `/azure:us-new <story-name>`
Create a new User Story with interactive requirements gathering.
- Guided story creation with "As a... I want... So that..." format
- Automatic acceptance criteria generation
- Story point estimation assistance

#### `/azure:us-list [--status=<state>] [--sprint=<name>]`
List and filter User Stories.
- Multiple view modes (sprint, backlog, my stories)
- Visual progress indicators
- Export capabilities (CSV, JSON, Markdown)

#### `/azure:us-parse <story-id>`
Parse User Story into Tasks automatically.
- Standard task templates (design, implementation, testing, documentation)
- Context-specific tasks based on story type
- Automatic hour estimation

#### `/azure:us-status [story-id] [--format=<type>]`
Comprehensive status dashboard.
- Burndown charts
- Sprint progress tracking
- Risk assessment
- Predictive completion dates

#### `/azure:import-us <prd-name|epic-name>`
Import User Stories from PRDs or Epics.
- Batch creation from existing documents
- Field mapping and transformation
- Import tracking and logging

### Task Management

#### `/azure:task-start <task-id> [--branch-name=<name>]`
Start working on a task.
- Automatic Git branch creation
- Status update in Azure DevOps
- Work environment setup
- Time tracking initialization

#### `/azure:task-list [story-id] [--assigned-to=<user>]`
List tasks with multiple views.
- Sprint board view
- My tasks dashboard
- Dependency visualization
- Quick action shortcuts

#### `/azure:task-close <task-id> [--create-pr]`
Complete a task with full workflow.
- Completion checklist
- Automatic PR creation
- Time tracking closure
- Next task suggestions

### Feature/Epic Management

#### `/azure:feature-decompose <feature-id|name>`
Break down Features into User Stories.
- Interactive story mapping
- Dependency identification
- Release planning
- Template library

## Workflow Example

### Complete Feature Development Flow

```bash
# 1. Create a new feature
/azure:feature-decompose authentication-system

# 2. Create User Story
/azure:us-new "Implement user login"

# 3. Parse into tasks
/azure:us-parse 34

# 4. View task board
/azure:task-list 34

# 5. Start development
/azure:task-start 101

# 6. Complete task with PR
/azure:task-close 101 --create-pr

# 7. Check overall status
/azure:us-status 34
```

## Key Features

### 🚀 Automation
- **Git Integration**: Automatic branch creation and PR management
- **Status Updates**: Real-time Azure DevOps synchronization
- **Time Tracking**: Built-in time logging and reporting
- **Workflow Hooks**: Pre/post task hooks for custom automation

### 📊 Visualizations
- **Sprint Boards**: Kanban-style task visualization
- **Burndown Charts**: Sprint progress tracking
- **Dependency Graphs**: Task relationship mapping
- **Progress Bars**: Real-time completion indicators

### 🤖 Intelligence
- **Smart Suggestions**: Next task recommendations
- **Capacity Planning**: Team bandwidth calculation
- **Risk Assessment**: Automatic blocker detection
- **Estimation Helper**: Historical data-based estimates

### 📁 Local Tracking
All commands maintain local copies in:
- `.claude/azure/user-stories/` - User Story documents
- `.claude/azure/tasks/` - Task work logs
- `.claude/azure/features/` - Feature decompositions
- `.claude/azure/imports/` - Import history
- `.claude/azure/cache/` - API response cache

## Advanced Features

### Filters and Options

Most list commands support advanced filtering:

```bash
# Filter by multiple criteria
/azure:us-list --status=Active --sprint="Sprint 1" --assigned-to=me

# Export in different formats
/azure:us-status --format=burndown --export=html

# Time-boxed queries
/azure:task-list --modified-since=7d --status=Active
```

### Sprint Management

```bash
# View sprint dashboard
/azure:us-status --sprint="Sprint 1"

# Check team velocity
/azure:us-status --format=velocity

# Sprint planning view
/azure:us-list --sprint=backlog --points=">=8"
```

### Bulk Operations

```bash
# Import multiple stories from PRD
/azure:import-us large-feature-prd

# Parse all stories in sprint
/azure:us-parse --sprint="Sprint 1" --auto

# Update all task estimates
/azure:task-update --recalculate-hours
```

## Integration with PM System

These Azure DevOps commands seamlessly integrate with the existing PM system:

1. **PRDs** can be imported as User Stories
2. **Epics** can be converted to Features
3. **Issues** map directly to Tasks
4. **Git branches** are automatically managed
5. **Status** syncs bidirectionally

## Best Practices

1. **Always start with User Stories** before creating tasks
2. **Use parse command** for consistent task breakdown
3. **Close tasks with PRs** for traceability
4. **Check status regularly** to identify blockers
5. **Update estimates** as work progresses

## Troubleshooting

### Common Issues

**Connection Failed**
- Verify PAT token is valid
- Check organization and project names
- Ensure network connectivity

**404 Errors**
- Confirm organization exists
- Verify project name spelling
- Check user permissions

**Task Not Found**
- Use correct work item ID
- Ensure task exists in project
- Check if item was moved/deleted

### Debug Mode

Enable verbose logging:
```bash
export AZURE_DEVOPS_DEBUG=true
/azure:us-list --verbose
```

## Support

For issues or feature requests, consult:
- Azure DevOps API documentation
- `.claude/agents/devops/azure-devops-specialist.md`
- Team DevOps channel

## Version

Current version: 1.0.0
Last updated: 2024-01-10
Compatible with: Azure DevOps Services 7.0+