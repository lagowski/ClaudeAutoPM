---
command: core:context-analyze
plugin: core
category: core-operations
description: Context usage analysis and optimization
tags:
  - core
  - context
  - optimization
  - mcp
  - performance
tools:
  - @mcp-context-manager
  - @file-analyzer
  - Read
  - Write
  - Bash
usage: |
  /core:context-analyze [options]

  Options:
    --file <path>       Analyze specific file
    --session current   Analyze current session context
    --optimize          Generate optimization recommendations
    --target <percent>  Target reduction percentage (e.g., 50%)
    --visualize         Display visual charts and graphs
    --tokens            Show detailed token breakdown
    --recommend         Include actionable recommendations
    --history           Show historical usage trends
examples:
  - input: /core:context-analyze --file CLAUDE.md --tokens
    description: Analyze token usage for CLAUDE.md with detailed breakdown
  - input: /core:context-analyze --session current --visualize
    description: Analyze current session with visual charts
  - input: /core:context-analyze --optimize --target 50%
    description: Suggest optimizations to reduce context by 50%
  - input: /core:context-analyze --recommend --history
    description: Get recommendations with historical trend analysis
---

# Context Usage Analysis and Optimization

Analyze context usage, track token consumption, identify optimization opportunities, and improve MCP efficiency.

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: anthropic, langchain, tiktoken.

## Instructions

### 1. Context7 Documentation Query (MANDATORY FIRST STEP)

Before implementation, query Context7 for:
1. Current Claude API token limits and context window size
2. Best practices for token counting (tiktoken library usage)
3. Context optimization patterns from LangChain
4. Caching and chunking strategies

### 2. Token Counting

**Process:**

1. **Identify Target Content**
   - If `--file` specified: Analyze single file
   - If `--session current`: Analyze all files in current context
   - Default: Analyze CLAUDE.md and related configuration files

2. **Count Tokens Using Proper Encoding**
   ```javascript
   // Use tiktoken or equivalent for accurate counting
   // Must match Claude's actual token counting method
   const tokenCount = countTokens(text, encoding='cl100k_base');
   ```

3. **Calculate Metrics**
   - Total tokens per file
   - Percentage of context window used
   - Tokens remaining in window
   - Average tokens per line/paragraph

### 3. Context Window Analysis

**Analyze Overall Usage:**

```
📊 Context Window Analysis
==========================

Total Tokens: 45,234 / 200,000 (22.6%)
Remaining: 154,766 tokens

Context Efficiency: Good ✅
- Well below 80% threshold
- Room for growth
```

**Break Down by Category:**
- Configuration files (CLAUDE.md, plugin.json, etc.)
- Source code files
- Documentation files
- Test files
- Other assets

### 4. File Size Contribution Analysis

**Identify Top Contributors:**

```
📈 Top Token Contributors
========================

1. CLAUDE.md                    12,456 tokens (27.5%) ⚠️
2. .claude/agents/agent1.md      5,234 tokens (11.6%)
3. .claude/agents/agent2.md      4,123 tokens  (9.1%)
4. src/index.js                  3,891 tokens  (8.6%)
5. docs/README.md                3,456 tokens  (7.6%)

Remaining 35 files:             16,074 tokens (35.6%)
```

**Flag Issues:**
- ⚠️ Files >10,000 tokens (consider splitting)
- ⚡ Files >20,000 tokens (critical - must split)
- 💡 Files with high redundancy (opportunity for deduplication)

### 5. MCP Context Efficiency Scoring

**Analyze MCP Usage:**

```
🔮 MCP Efficiency Score: 78/100
==================================

Tool Utilization:        85% (17/20 tools actively used)
Resource Utilization:    72% (13/18 resources accessed)
Cache Hit Rate:          81% (good performance)
Context Sharing:         Medium (could improve)

Unused MCP Tools:
  - @aws-cloud-architect (0 invocations)
  - @docker-expert (1 invocation, consider removing)
  - context7://deprecated-api (outdated, remove)

💡 Recommendation: Remove 3 unused tools → Save ~2,400 tokens
```

**Efficiency Factors:**
1. Tool utilization rate (used tools / total tools)
2. Resource access patterns
3. Cache effectiveness
4. Context sharing between agents
5. Redundant tool definitions

### 6. Optimization Recommendations

**Generate Actionable Suggestions:**

```
💡 Optimization Recommendations
===============================

High Impact (>5,000 token reduction):

1. Split CLAUDE.md (12,456 tokens → ~6,000 tokens)
   - Move agent documentation to separate files
   - Extract examples to .claude/examples/
   - Impact: -6,456 tokens (14.3% reduction)

2. Summarize verbose agent files (8,357 tokens → ~4,000 tokens)
   - @file-analyzer: Use bullet points instead of prose
   - @code-analyzer: Remove redundant examples
   - Impact: -4,357 tokens (9.6% reduction)

Medium Impact (1,000-5,000 tokens):

3. Deduplicate MCP tool definitions (3,234 tokens → ~1,800 tokens)
   - Merge similar tool definitions
   - Use references instead of duplication
   - Impact: -1,434 tokens (3.2% reduction)

Low Impact (<1,000 tokens):

4. Compress whitespace in JSON configs (891 tokens → ~600 tokens)
   - Remove unnecessary indentation
   - Minify non-human-edited configs
   - Impact: -291 tokens (0.6% reduction)

Total Potential Reduction: -12,538 tokens (27.7%)
Target Achievement: 50% → Can exceed target ✅
```

**Prioritization Logic:**
1. Sort by impact (tokens saved)
2. Consider implementation effort
3. Preserve readability and maintainability
4. Flag breaking changes

### 7. Context Pruning Suggestions

**Smart Pruning Strategies:**

```
✂️ Context Pruning Suggestions
==============================

Safe to Remove (no impact on functionality):

1. Old documentation files
   - docs/legacy/v1-guide.md (4,567 tokens)
   - archived/old-examples.md (2,345 tokens)

2. Redundant test fixtures
   - test/fixtures/duplicate-data.json (1,234 tokens)

Consider Removing (low impact):

3. Rarely used utility scripts
   - scripts/one-time-migration.sh (891 tokens)
   - Last used: 6 months ago

4. Verbose comments in code
   - src/utils.js: 234 tokens in comments vs 567 code
   - Ratio: 41% comments (recommend <25%)

Do NOT Remove:

⛔ Core configuration files
⛔ Active agent definitions
⛔ Current project documentation
⛔ Frequently accessed utilities
```

### 8. Caching Effectiveness Analysis

**Analyze Cache Performance:**

```
⚡ Context Caching Analysis
===========================

Cache Hit Rate: 81% ✅
Cache Miss Rate: 19%

Most Cached Content:
1. CLAUDE.md (95% hit rate, rarely changes)
2. plugin.json files (89% hit rate)
3. Agent definitions (76% hit rate)

Cache Misses (opportunities to improve):
1. Frequently modified source files (45% hit rate)
   - Consider smaller, more stable modules
2. Large generated files (12% hit rate)
   - Regenerate instead of caching

💡 Recommendation:
- Split frequently-modified files into stable + dynamic parts
- Cache stable parts, regenerate dynamic content
- Potential savings: ~8,000 tokens per session
```

### 9. Historical Usage Trends

**Track Over Time:**

```
📈 Context Usage Trends (Last 7 Days)
=====================================

Day       | Tokens   | Change    | Files
----------|----------|-----------|-------
2024-10-21| 45,234   | +2,341    | 42
2024-10-20| 42,893   | -1,234    | 41
2024-10-19| 44,127   | +5,678    | 43
2024-10-18| 38,449   | +891      | 40
2024-10-17| 37,558   | -2,123    | 41

Trend: Increasing ⚠️ (+20.4% over 7 days)

Analysis:
- Average daily growth: +1,535 tokens
- Peak usage: 45,234 tokens (today)
- Projected 30-day: ~91,284 tokens (within limits ✅)

Anomalies Detected:
- Oct 19: Large spike (+5,678) due to new agent additions
- Oct 20: Drop after cleanup (-1,234)
```

### 10. Visualization

**If `--visualize` flag:**

Generate ASCII charts for terminal display:

```
Token Distribution (Top 10 Files)
==================================

CLAUDE.md         ████████████████████████ 12,456 (27.5%)
agent1.md         ██████████ 5,234 (11.6%)
agent2.md         ████████ 4,123 (9.1%)
index.js          ███████ 3,891 (8.6%)
README.md         ███████ 3,456 (7.6%)
config.json       █████ 2,789 (6.2%)
utils.js          ████ 2,345 (5.2%)
test.js           ████ 2,123 (4.7%)
agent3.md         ███ 1,891 (4.2%)
styles.css        ███ 1,678 (3.7%)

Scale: █ = 500 tokens
```

**Markdown Report Format:**

```markdown
## Context Analysis Report

### Summary
- **Total Tokens:** 45,234
- **Context Utilization:** 22.6%
- **Efficiency Score:** 78/100

### Top Contributors
| File | Tokens | % of Total |
|------|--------|------------|
| CLAUDE.md | 12,456 | 27.5% |
| agent1.md | 5,234 | 11.6% |
| agent2.md | 4,123 | 9.1% |

### Recommendations
1. Split CLAUDE.md (-6,456 tokens)
2. Summarize verbose agents (-4,357 tokens)
3. Deduplicate MCP tools (-1,434 tokens)
```

## Examples

### Basic Context Analysis

```
/core:context-analyze --session current
```

Output:
```
🔍 CONTEXT ANALYSIS
===================

📊 CONTEXT WINDOW USAGE:
- Total Tokens: 45,234 / 200,000 (22.6%)
- Remaining: 154,766 tokens
- Status: Healthy ✅

📈 TOP TOKEN CONTRIBUTORS:
1. CLAUDE.md - 12,456 tokens (27.5%) ⚠️
2. agent1.md - 5,234 tokens (11.6%)
3. agent2.md - 4,123 tokens (9.1%)
```

### File-Specific Analysis

```
/core:context-analyze --file CLAUDE.md --tokens
```

Shows detailed token breakdown for a specific file.

### Optimization with Target

```
/core:context-analyze --optimize --target 50%
```

Generates recommendations to reduce context by 50%.

### Full Analysis with Visualization

```
/core:context-analyze --session current --recommend --visualize --history
```

Complete analysis with charts, recommendations, and trends.

## Output Format

```
🔍 CONTEXT ANALYSIS
===================

📊 CONTEXT WINDOW USAGE:
- Total Tokens: 45,234 / 200,000 (22.6%)
- Remaining: 154,766 tokens
- Status: Healthy ✅

📈 TOP TOKEN CONTRIBUTORS:
1. CLAUDE.md - 12,456 tokens (27.5%) ⚠️
2. agent1.md - 5,234 tokens (11.6%)
3. agent2.md - 4,123 tokens (9.1%)
4. index.js - 3,891 tokens (8.6%)
5. README.md - 3,456 tokens (7.6%)

🔮 MCP EFFICIENCY SCORE: 78/100
- Tool Utilization: 85%
- Resource Utilization: 72%
- Cache Hit Rate: 81%

💡 OPTIMIZATION SUGGESTIONS:
High Impact:
  ✨ Split CLAUDE.md → -6,456 tokens (14.3% reduction)
  ✨ Summarize verbose agents → -4,357 tokens (9.6% reduction)

Medium Impact:
  💡 Deduplicate MCP tools → -1,434 tokens (3.2% reduction)
  💡 Remove unused agents → -891 tokens (2.0% reduction)

Total Potential: -12,538 tokens (27.7% reduction)

📈 USAGE TREND: Increasing ⚠️
- 7-day change: +7,676 tokens (+20.4%)
- Average daily: +1,096 tokens
- Projection (30d): ~78,114 tokens

⚡ NEXT STEPS:
1. Implement high-impact optimizations first
2. Monitor usage after changes
3. Re-run analysis in 7 days
```

## Implementation Process

### Using @mcp-context-manager Agent

The `@mcp-context-manager` agent specializes in context optimization:

```
@mcp-context-manager analyze current session
- Identify all files in context
- Count tokens using proper encoding
- Calculate efficiency scores
- Generate optimization plan
```

### Integration with @file-analyzer

For large file analysis:

```
@file-analyzer summarize CLAUDE.md for key information
- Extract core instructions
- Identify redundant sections
- Suggest consolidation opportunities
```

### Manual Analysis Steps

If agents unavailable:

1. **List Context Files**
   ```bash
   find .claude -type f -name "*.md" | wc -l
   ```

2. **Estimate Token Count**
   - Rule of thumb: 1 token ≈ 4 characters
   - More accurate: Use tiktoken library
   - Conservative: 1 token ≈ 0.75 words

3. **Identify Large Files**
   ```bash
   find .claude -type f -exec wc -c {} + | sort -rn | head -10
   ```

4. **Analyze Content Redundancy**
   - Look for repeated patterns
   - Check for duplicate documentation
   - Identify copy-pasted code

## Edge Cases

### Large Files (>100KB)

**Strategy:**
- Chunk into smaller segments for analysis
- Process in parallel if using agents
- Stream results for real-time feedback

```
Processing large file: CLAUDE.md (234 KB)
  Chunk 1/5... ████████ 45,234 tokens ✅
  Chunk 2/5... ████████ 42,891 tokens ✅
  Chunk 3/5... ████████ 39,456 tokens ✅
  ...
```

### Binary Files

**Handling:**
- Skip token counting (not textual)
- Report size in bytes
- Flag if unexpectedly in context
- Recommend .gitignore or .claudeignore

```
⚠️ Binary files detected in context:
  - .claude/assets/logo.png (145 KB)
  - docs/diagram.pdf (892 KB)

💡 Recommendation: Add to .claudeignore
```

### Empty Context

**Response:**
```
ℹ️ Context appears empty or minimal

Current context: 234 tokens (0.1%)

This is normal for:
- New projects
- Fresh installations
- After major cleanup

No optimization needed at this time.
```

### MCP Server Errors

**Fallback Strategy:**
```
⚠️ MCP server unavailable - using fallback analysis

Limitations:
- Token counts are estimates (±10% accuracy)
- MCP efficiency score unavailable
- Cache analysis skipped

Results marked as [ESTIMATED]
```

## Related Commands

**See Also:**
- `/core:re-init` - Reinitialize CLAUDE.md with optimization
- `@file-analyzer` - Analyze and summarize large files
- `@code-analyzer` - Code-specific analysis and optimization
- `@mcp-context-manager` - Specialized context management agent

## Performance Considerations

**Execution Time:**
- Small projects (<50 files): <5 seconds
- Medium projects (50-200 files): 10-30 seconds
- Large projects (>200 files): 1-2 minutes
- Very large files (>1MB): Use chunking + progress display

**Memory Usage:**
- Typical: <100MB for analysis
- Large files: May spike to 500MB temporarily
- Streaming mode: Constant ~50MB

**Token Budget:**
- Analysis itself: ~2,000-5,000 tokens
- Results display: ~1,000-3,000 tokens
- Total overhead: ~5,000-8,000 tokens
- Justified by potential savings: 10,000-50,000+ tokens

## Security Considerations

**File Access:**
- Only analyze files in project directory
- Respect .gitignore and .claudeignore
- Skip files in .env, secrets/, credentials/
- Report if sensitive files found in context

**Data Privacy:**
- Token counts and file paths only
- Do not expose file contents in reports
- Historical data stored locally only
- No external API calls for token counting

## Best Practices

1. **Run Regularly**
   - Weekly analysis for active projects
   - After major changes
   - Before releases
   - When approaching context limits

2. **Act on High-Impact Recommendations**
   - Prioritize >5,000 token savings
   - Quick wins with low effort
   - Automate where possible

3. **Track Trends**
   - Monitor 7-day and 30-day trends
   - Set alerts for rapid growth
   - Review monthly for optimization

4. **Balance Optimization vs. Usability**
   - Don't over-optimize
   - Keep documentation readable
   - Preserve context that aids understanding
   - Optimize redundancy, not clarity

## Example Workflow

### Scenario: Approaching Context Limit

```
1. Run analysis:
   /core:context-analyze --session current --recommend

2. Review top contributors:
   CLAUDE.md: 45,234 tokens (too large)

3. Get file summary:
   @file-analyzer summarize CLAUDE.md --extract-key-points

4. Implement optimization:
   - Split into CLAUDE.md + .claude/documentation/
   - Move examples to separate files
   - Reference instead of duplicate

5. Re-run analysis:
   /core:context-analyze --session current

   Result: 23,456 tokens saved (48% reduction) ✅

6. Track improvement:
   /core:context-analyze --history

   Trend: Decreasing ✅ (-51.9% from peak)
```

## Troubleshooting

**Issue: Token counts seem inaccurate**
- Solution: Verify tiktoken encoding matches Claude's
- Fallback: Use conservative estimates

**Issue: Analysis takes too long**
- Solution: Use `--file` to analyze specific files
- Consider: Break into smaller analysis chunks

**Issue: MCP efficiency score unavailable**
- Solution: Ensure MCP servers are running
- Check: MCP configuration in package.json

**Issue: Recommendations not actionable**
- Solution: Use `--target` to adjust optimization goals
- Consider: Manual review of top contributors
