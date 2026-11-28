---
allowed-tools: Task, Bash, Read, Write, Edit, WebFetch, Glob, Grep
---

# Azure DevOps Task New

Create a new Task under a User Story.

**Usage**: `/azure:task-new <story-id> <task-title>`

**Examples**:
- `/azure:task-new 34 "Add input validation"`
- `/azure:task-new 34 "Write unit tests" --hours=4`
- `/azure:task-new 34 "Fix bug" --assigned-to=john@example.com`

## Required Documentation Access

**MANDATORY:** Query Context7 for Azure DevOps and agile best practices before proceeding. Use the Azure DevOps query set in `.claude/rules/context7-required.md`.


## Instructions

### 1. Interactive Task Creation

```
📝 Creating new Task for Story #34

Task Title: Add input validation

Task Details:
Description: [Validate email format and password strength]
Activity Type: [Development]
Original Estimate: [4] hours
Assigned To: [john@example.com]
Priority: [2]

Confirm creation? (y/n): _
```

### 2. Create Task

Use azure-devops-specialist agent to create task with parent link:

```json
{
  "op": "add",
  "path": "/fields/System.Title",
  "value": "Add input validation"
},
{
  "op": "add",
  "path": "/relations/-",
  "value": {
    "rel": "System.LinkTypes.Hierarchy-Reverse",
    "url": "story_url"
  }
}
```

### 3. Success Output

```
✅ Task created successfully!

Task #106: Add input validation
Parent: Story #34 - Password Reset
Hours: 4h
Assigned: john@example.com
Status: To Do

Next: /azure:task-start 106
```