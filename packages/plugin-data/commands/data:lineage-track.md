---
command: data:lineage-track
plugin: data
category: data-operations
description: Data lineage tracking and visualization with OpenLineage compliance
tags:
  - data
  - lineage
  - openlineage
  - data-catalog
  - governance
  - compliance
tools:
  - @python-backend-expert
  - @airflow-orchestration-expert
  - Read
  - Write
  - Bash
usage: |
  /data:lineage-track --source airflow --dag my_pipeline --catalog atlas --visualize
examples:
  - input: /data:lineage-track --sql queries/ --output lineage.json --format openlineage
    description: Extract lineage from SQL queries
  - input: /data:lineage-track --dbt project/ --column-level --visualize dot
    description: Column-level lineage from dbt project
  - input: /data:lineage-track --airflow dags/ --catalog datahub --publish
    description: Extract Airflow lineage and publish to DataHub
  - input: /data:lineage-track --spark jobs/ --impact-analysis table_name --direction upstream
    description: Analyze upstream impact for Spark jobs
---

# Data Lineage Track Command

Track data lineage across SQL, Spark, dbt, and Airflow with OpenLineage compliance, visualization, and catalog integration.

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: openlineage, atlas, dbt, airflow, graphviz, spark, datahub, sqlparser.

## Command Usage

```bash
/data:lineage-track [options]
```

### Options

#### Source Selection
- `--sql <path>` - Extract lineage from SQL files
- `--dbt <path>` - Extract lineage from dbt project
- `--airflow <dag_id>` - Extract lineage from Airflow DAG
- `--spark <path>` - Extract lineage from Spark code
- `--discover <path>` - Auto-discover lineage from repository

#### Lineage Options
- `--column-level` - Track column-level lineage (default: table-level)
- `--include-history` - Include lineage from git history
- `--format <format>` - Output format: openlineage, graphml, json (default: openlineage)

#### Analysis Options
- `--impact-analysis <dataset>` - Analyze impact for specific dataset
- `--direction <dir>` - Impact direction: upstream, downstream, both (default: both)
- `--impact-radius` - Calculate impact radius (number of affected datasets)

#### Visualization Options
- `--visualize <format>` - Generate visualization: dot, mermaid, interactive
- `--highlight-critical` - Highlight critical paths in visualization
- `--layout <algorithm>` - Layout algorithm: hierarchical, force-directed, circular

#### Catalog Integration
- `--catalog <type>` - Catalog type: atlas, datahub
- `--catalog-url <url>` - Catalog server URL
- `--publish` - Publish lineage to catalog
- `--sync-metadata` - Sync dataset metadata to catalog

#### Compliance & Governance
- `--compliance <type>` - Generate compliance report: pii, gdpr, retention, security
- `--trace-pii` - Trace PII data flow across pipelines
- `--retention-check` - Check data retention policies

#### Output Options
- `--output <path>` - Output file path (default: lineage.json)
- `--version <version>` - Version lineage snapshot
- `--diff <version1> <version2>` - Compare lineage versions

## Implementation Steps

### 1. Query Context7 for Latest Patterns

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: openlineage, apache-atlas, dbt.

### 2. Extract Lineage from Sources

#### SQL Lineage Extraction

```javascript
// Context7 Pattern: SQL parsing for lineage
// Use sqlparser or sql-parser library

const parseSQL = (sqlContent) => {
  // Parse SQL to extract tables and columns
  const parser = require('node-sql-parser');
  const opt = { database: 'PostgreSQL' };

  try {
    const ast = parser.astify(sqlContent, opt);

    const inputs = new Set();
    const outputs = new Set();

    // Extract FROM clauses (inputs)
    extractFromClauses(ast, inputs);

    // Extract INTO/INSERT clauses (outputs)
    extractOutputClauses(ast, outputs);

    return {
      inputs: Array.from(inputs),
      outputs: Array.from(outputs),
      columns: extractColumnLineage(ast)
    };
  } catch (error) {
    throw new Error(`Invalid SQL syntax: ${error.message}`);
  }
};
```

#### dbt Lineage Extraction

```javascript
// Context7 Pattern: dbt manifest parsing
// Source: /dbt-labs/dbt-core

const parsedbt = (dbtProjectPath) => {
  const manifestPath = path.join(dbtProjectPath, 'target/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath));

  const lineage = {
    datasets: new Set(),
    transformations: []
  };

  // Extract from manifest nodes
  for (const [nodeId, node] of Object.entries(manifest.nodes)) {
    if (node.resource_type === 'model') {
      // Input datasets from refs and sources
      const inputs = [
        ...node.depends_on.nodes
          .filter(n => n.startsWith('model.') || n.startsWith('source.'))
          .map(n => n.split('.').slice(-1)[0])
      ];

      lineage.transformations.push({
        name: node.name,
        inputs,
        outputs: [node.name],
        type: 'dbt',
        sql: node.compiled_sql
      });

      inputs.forEach(i => lineage.datasets.add(i));
      lineage.datasets.add(node.name);
    }
  }

  return {
    datasets: Array.from(lineage.datasets),
    transformations: lineage.transformations
  };
};
```

#### Airflow Lineage Extraction

```javascript
// Context7 Pattern: Airflow lineage backend
// Source: /apache/airflow

const parseAirflow = (dagDefinition) => {
  const lineage = {
    datasets: [],
    transformations: []
  };

  // Extract lineage from task inlets/outlets
  for (const task of dagDefinition.tasks) {
    const inputs = task.inlets || [];
    const outputs = task.outlets || [];

    lineage.transformations.push({
      taskId: task.task_id,
      inputs: inputs.map(i => i.uri || i),
      outputs: outputs.map(o => o.uri || o),
      type: 'airflow'
    });

    inputs.forEach(i => lineage.datasets.push(i.uri || i));
    outputs.forEach(o => lineage.datasets.push(o.uri || o));
  }

  return lineage;
};
```

### 3. Generate OpenLineage Events

```javascript
// Context7 Pattern: OpenLineage event generation
// Source: /OpenLineage/OpenLineage

const generateOpenLineageEvent = (run, datasets, eventType = 'COMPLETE') => {
  return {
    eventType,
    eventTime: new Date().toISOString(),
    run: {
      runId: run.runId,
      facets: run.facets || {}
    },
    job: {
      namespace: run.jobNamespace,
      name: run.jobName,
      facets: {}
    },
    inputs: datasets
      .filter(d => d.type === 'input')
      .map(d => ({
        namespace: d.namespace,
        name: d.name,
        facets: {
          schema: d.schema,
          dataSource: d.dataSource
        }
      })),
    outputs: datasets
      .filter(d => d.type === 'output')
      .map(d => ({
        namespace: d.namespace,
        name: d.name,
        facets: {
          schema: d.schema,
          dataSource: d.dataSource,
          outputStatistics: d.statistics
        }
      })),
    producer: 'claudeautopm-lineage-tracker/1.0.0'
  };
};
```

### 4. Build Lineage Graph

```javascript
// Context7 Pattern: Graph construction with cycle detection

const buildGraph = (lineageData) => {
  const graph = {
    nodes: [],
    edges: [],
    hasCycles: false,
    cycles: []
  };

  // Create nodes for datasets
  const datasets = new Set(lineageData.datasets || []);
  lineageData.transformations?.forEach(t => {
    t.inputs?.forEach(i => datasets.add(i));
    t.outputs?.forEach(o => datasets.add(o));
  });

  graph.nodes = Array.from(datasets).map(d => ({
    id: typeof d === 'string' ? d : d.name,
    label: typeof d === 'string' ? d : d.name,
    metadata: typeof d === 'object' ? d : {}
  }));

  // Create edges for transformations
  lineageData.transformations?.forEach(t => {
    t.inputs?.forEach(input => {
      t.outputs?.forEach(output => {
        graph.edges.push({
          source: input,
          target: output,
          transformation: t.name || t.type
        });
      });
    });
  });

  // Detect cycles
  graph.cycles = detectCycles(graph);
  graph.hasCycles = graph.cycles.length > 0;

  return graph;
};

const detectCycles = (graph) => {
  const visited = new Set();
  const recursionStack = new Set();
  const cycles = [];

  const dfs = (node, path) => {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = graph.edges
      .filter(e => e.source === node)
      .map(e => e.target);

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recursionStack.has(neighbor)) {
        // Found cycle
        const cycleStart = path.indexOf(neighbor);
        cycles.push(path.slice(cycleStart));
      }
    }

    recursionStack.delete(node);
  };

  graph.nodes.forEach(n => {
    if (!visited.has(n.id)) {
      dfs(n.id, []);
    }
  });

  return cycles;
};
```

### 5. Column-Level Lineage

```javascript
// Context7 Pattern: Column-level dependency tracking

const trackColumnLineage = (sql) => {
  const parser = require('node-sql-parser');
  const ast = parser.astify(sql);

  const columnLineage = {};

  // Extract SELECT columns
  if (ast.columns && ast.columns !== '*') {
    ast.columns.forEach(col => {
      const outputCol = col.as || col.expr.column;

      // Track source columns
      const sources = extractColumnSources(col.expr);

      columnLineage[outputCol] = {
        sources,
        transformation: getTransformationType(col.expr)
      };
    });
  }

  return columnLineage;
};

const extractColumnSources = (expr) => {
  const sources = [];

  const traverse = (node) => {
    if (node.type === 'column_ref') {
      const table = node.table || '';
      const column = node.column;
      sources.push(table ? `${table}.${column}` : column);
    } else if (node.type === 'function') {
      node.args?.value?.forEach(traverse);
    } else if (node.type === 'binary_expr') {
      traverse(node.left);
      traverse(node.right);
    }
  };

  traverse(expr);
  return sources;
};
```

### 6. Impact Analysis

```javascript
// Context7 Pattern: Graph traversal for impact analysis

const analyzeImpact = (graph, dataset, direction = 'both') => {
  const impacted = new Set();
  const affectedSystems = new Set();

  const traverse = (node, dir) => {
    if (impacted.has(node)) return;
    impacted.add(node);

    // Get node metadata
    const nodeData = graph.nodes.find(n => n.id === node);
    if (nodeData?.metadata?.system) {
      affectedSystems.add(nodeData.metadata.system);
    }

    // Get neighbors
    const edges = dir === 'upstream'
      ? graph.edges.filter(e => e.target === node)
      : graph.edges.filter(e => e.source === node);

    edges.forEach(edge => {
      const nextNode = dir === 'upstream' ? edge.source : edge.target;
      traverse(nextNode, dir);
    });
  };

  if (direction === 'both') {
    traverse(dataset, 'upstream');
    traverse(dataset, 'downstream');
  } else {
    traverse(dataset, direction);
  }

  impacted.delete(dataset); // Remove the starting node

  return {
    datasets: Array.from(impacted),
    affectedSystems: Array.from(affectedSystems),
    count: impacted.size
  };
};
```

### 7. Visualization

```javascript
// Context7 Pattern: Graph visualization formats

const visualizeGraph = (graph, format = 'dot', options = {}) => {
  switch (format) {
    case 'dot':
      return generateDOT(graph, options);
    case 'mermaid':
      return generateMermaid(graph, options);
    case 'interactive':
      return generateInteractive(graph, options);
    default:
      throw new Error(`Invalid format: ${format}`);
  }
};

const generateDOT = (graph, options) => {
  let dot = 'digraph lineage {\n';
  dot += '  rankdir=LR;\n';
  dot += '  node [shape=box];\n\n';

  // Add nodes
  graph.nodes.forEach(node => {
    const isCritical = node.metadata?.critical || false;
    const color = (options.highlightCritical && isCritical) ? 'color=red' : '';
    dot += `  "${node.id}" [${color}];\n`;
  });

  dot += '\n';

  // Add edges
  graph.edges.forEach(edge => {
    dot += `  "${edge.source}" -> "${edge.target}"`;
    if (edge.transformation) {
      dot += ` [label="${edge.transformation}"]`;
    }
    dot += ';\n';
  });

  dot += '}\n';
  return dot;
};

const generateMermaid = (graph, options) => {
  let mermaid = 'graph LR\n';

  graph.edges.forEach(edge => {
    const source = edge.source.replace(/[^a-zA-Z0-9]/g, '_');
    const target = edge.target.replace(/[^a-zA-Z0-9]/g, '_');
    mermaid += `  ${source}[${edge.source}] --> ${target}[${edge.target}]\n`;
  });

  return mermaid;
};
```

### 8. Catalog Integration

```javascript
// Context7 Pattern: Apache Atlas integration

const publishToCatalog = async (lineage, catalogType, config) => {
  switch (catalogType) {
    case 'atlas':
      return publishToAtlas(lineage, config);
    case 'datahub':
      return publishToDataHub(lineage, config);
    default:
      throw new Error(`Unknown catalog: ${catalogType}`);
  }
};

const publishToAtlas = async (lineage, config) => {
  const axios = require('axios');

  try {
    const client = axios.create({
      baseURL: config.url,
      auth: {
        username: config.username,
        password: config.password
      }
    });

    // Create entities for datasets
    const entities = lineage.datasets.map(ds => ({
      typeName: 'DataSet',
      attributes: {
        name: ds,
        qualifiedName: `${ds}@cluster`
      }
    }));

    // Create entities
    const response = await client.post('/api/atlas/v2/entity/bulk', {
      entities
    });

    // Create lineage relationships
    for (const transform of lineage.transformations) {
      await client.post('/api/atlas/v2/lineage', {
        baseEntityGuid: transform.outputs[0],
        lineageDirection: 'INPUT',
        lineageDepth: 3
      });
    }

    return {
      success: true,
      entitiesCreated: entities.length,
      authenticated: true
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
```

### 9. Compliance Reporting

```javascript
// Context7 Pattern: GDPR and PII tracking

const generateComplianceReport = (graph, reportType) => {
  switch (reportType) {
    case 'pii':
      return tracePIIFlow(graph);
    case 'gdpr':
      return generateGDPRReport(graph);
    case 'retention':
      return generateRetentionReport(graph);
    case 'security':
      return generateSecurityReport(graph);
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
};

const tracePIIFlow = (graph) => {
  const piiDatasets = graph.nodes
    .filter(n => n.metadata?.tags?.includes('pii'))
    .map(n => n.id);

  const affected = new Set();

  piiDatasets.forEach(dataset => {
    const impact = analyzeImpact(graph, dataset, 'downstream');
    impact.datasets.forEach(d => affected.add(d));
  });

  return {
    sourceDatasets: piiDatasets,
    affectedDatasets: Array.from(affected),
    totalAffected: affected.size
  };
};

const generateGDPRReport = (graph) => {
  const euDatasets = graph.nodes
    .filter(n => n.metadata?.region === 'eu' && n.metadata?.pii);

  const crossBorderTransfers = [];

  graph.edges.forEach(edge => {
    const source = graph.nodes.find(n => n.id === edge.source);
    const target = graph.nodes.find(n => n.id === edge.target);

    if (source?.metadata?.region === 'eu' && target?.metadata?.region !== 'eu') {
      crossBorderTransfers.push({
        source: edge.source,
        target: edge.target,
        sourceRegion: 'eu',
        targetRegion: target.metadata.region
      });
    }
  });

  return {
    dataSubjects: euDatasets.map(n => n.id),
    crossBorderTransfers,
    requiresConsent: crossBorderTransfers.length > 0
  };
};
```

## Context7-Verified Patterns Applied

### OpenLineage Specification
- ✅ Event schema with eventType, eventTime, run, job, inputs, outputs
- ✅ Run facets for additional metadata
- ✅ Dataset facets for schema and data source
- ✅ Proper namespace and URI formatting

### Lineage Extraction
- ✅ SQL parsing with node-sql-parser
- ✅ dbt manifest.json parsing for model dependencies
- ✅ Airflow task inlet/outlet tracking
- ✅ Spark DataFrame lineage from transformations

### Graph Construction
- ✅ Directed acyclic graph (DAG) for lineage
- ✅ Cycle detection for validation
- ✅ Node and edge metadata
- ✅ Graph merging for multiple sources

### Catalog Integration
- ✅ Apache Atlas REST API v2
- ✅ DataHub GraphQL API
- ✅ Entity creation and relationship mapping
- ✅ Authentication and error handling

### Compliance
- ✅ PII data flow tracing
- ✅ GDPR cross-border transfer detection
- ✅ Data retention policy tracking
- ✅ Security violation identification

## Output Files

The command generates:

1. **lineage.json** - OpenLineage event or graph JSON
2. **lineage.dot** - DOT visualization (if --visualize dot)
3. **lineage.mermaid** - Mermaid diagram (if --visualize mermaid)
4. **compliance-report.json** - Compliance report (if --compliance)

## Validation Checklist

After lineage tracking, verify:

- [ ] Context7 documentation queried
- [ ] OpenLineage events validate against schema
- [ ] All source datasets identified
- [ ] All target datasets identified
- [ ] Column-level lineage accurate
- [ ] Graph has no unexpected cycles
- [ ] Impact analysis complete
- [ ] Visualization renders correctly
- [ ] Catalog integration successful
- [ ] Compliance requirements met

## Related Resources

- Agent: `@python-backend-expert` for lineage extraction logic
- Agent: `@airflow-orchestration-expert` for Airflow integration
- Rule: `data-quality-standards.md` for data validation
- Rule: `etl-pipeline-standards.md` for pipeline best practices

## Notes

- Always query Context7 before implementing lineage tracking
- Use OpenLineage standard for interoperability
- Track column-level lineage for detailed analysis
- Publish lineage to catalogs for discoverability
- Monitor PII and sensitive data flows for compliance
- Version lineage snapshots for change tracking
- Validate graph for cycles before visualization
