/**
 * DependencyAnalyzer - Dependency graph analysis and bottleneck detection
 *
 * Analyzes task dependencies to find bottlenecks, critical paths,
 * and parallelizable work.
 *
 * @example Basic Usage
 * ```javascript
 * const DependencyAnalyzer = require('./lib/dependency-analyzer');
 * const analyzer = new DependencyAnalyzer();
 *
 * const analysis = await analyzer.analyze('epic-001', {
 *   basePath: '.claude'
 * });
 *
 * console.log(analysis.bottlenecks);      // Tasks blocking multiple others
 * console.log(analysis.criticalPath);     // Longest dependency chain
 * console.log(analysis.parallelizable);   // Tasks that can run in parallel
 * ```
 *
 * @example Graph Structure
 * ```javascript
 * // analysis.graph structure:
 * {
 *   nodes: ['task-001', 'task-002', 'task-003'],
 *   edges: [
 *     { from: 'task-001', to: 'task-002', type: 'depends_on' }
 *   ]
 * }
 * ```
 *
 * @module DependencyAnalyzer
 * @version 1.0.0
 * @since v1.29.0
 */

const FilterEngine = require('./filter-engine');
const path = require('path');

class DependencyAnalyzer {
  /**
   * Create DependencyAnalyzer instance
   */
  constructor() {
    // No configuration needed
  }

  /**
   * Analyze dependencies for an epic
   *
   * @param {string} epicId - Epic ID
   * @param {Object} options - Options
   * @param {string} options.basePath - Base path (default: '.claude')
   * @returns {Promise<Object|null>} - Analysis object or null if epic not found
   *
   * @example
   * const analysis = await analyzer.analyze('epic-001');
   * // Returns:
   * // {
   * //   graph: { nodes: [...], edges: [...] },
   * //   bottlenecks: [{ taskId: 'task-003', blocking: 5, impact: 'high' }],
   * //   criticalPath: ['task-001', 'task-003', 'task-008'],
   * //   parallelizable: [['task-002', 'task-004'], ['task-006', 'task-007']],
   * //   circularDependencies: []
   * // }
   */
  async analyze(epicId, options = {}) {
    const basePath = options.basePath || '.claude';
    const filterEngine = new FilterEngine({ basePath });

    // Load tasks
    const epicDir = path.join(basePath, 'epics', epicId);

    const tasks = await filterEngine.loadFiles(epicDir);

    // If no tasks loaded, epic directory doesn't exist
    if (tasks.length === 0) {
      return null;
    }

    // If no epic.md file exists, epic doesn't exist
    const epicFile = tasks.find(t => t.path && t.path.endsWith('epic.md'));
    if (!epicFile) {
      return null;
    }

    const taskFiles = tasks.filter(t => t.frontmatter.id && t.frontmatter.id !== epicId);

    if (taskFiles.length === 0) {
      return {
        graph: { nodes: [], edges: [] },
        bottlenecks: [],
        criticalPath: [],
        parallelizable: [],
        circularDependencies: []
      };
    }

    try {

      // Build dependency graph
      const graph = this._buildGraph(taskFiles);

      // Find bottlenecks
      const bottlenecks = this.findBottlenecks(graph);

      // Find critical path
      const criticalPath = this.findCriticalPath(graph);

      // Find parallelizable tasks
      const parallelizable = this.findParallelizable(graph);

      // Detect circular dependencies
      const circularDependencies = this._detectCircularDependencies(graph);

      return {
        graph,
        bottlenecks,
        criticalPath,
        parallelizable,
        circularDependencies
      };
    } catch (error) {
      return null; // Epic not found
    }
  }

  /**
   * Find bottlenecks in dependency graph
   *
   * @param {Object} graph - Dependency graph
   * @returns {Array} - Bottleneck tasks
   *
   * @example
   * const bottlenecks = analyzer.findBottlenecks(graph);
   * // Returns: [
   * //   {
   * //     taskId: 'task-003',
   * //     blocking: 5,
   * //     impact: 'high',
   * //     reason: 'Blocks 5 other tasks'
   * //   }
   * // ]
   */
  findBottlenecks(graph) {
    const bottlenecks = [];
    const blockingCounts = {};

    // Count how many tasks each node blocks
    for (const edge of graph.edges) {
      if (!blockingCounts[edge.from]) {
        blockingCounts[edge.from] = 0;
      }
      blockingCounts[edge.from]++;
    }

    // Identify bottlenecks (tasks blocking 3+ others)
    for (const [taskId, count] of Object.entries(blockingCounts)) {
      if (count >= 3) {
        let impact = 'low';
        if (count >= 5) {
          impact = 'high';
        } else if (count >= 4) {
          impact = 'medium';
        }

        bottlenecks.push({
          taskId,
          blocking: count,
          impact,
          reason: count === 1 ? 'Blocks 1 other task' : `Blocks ${count} other tasks`
        });
      }
    }

    // Sort by blocking count (descending)
    bottlenecks.sort((a, b) => b.blocking - a.blocking);

    return bottlenecks;
  }

  /**
   * Find critical path through dependency graph
   *
   * @param {Object} graph - Dependency graph
   * @returns {Array} - Task IDs in critical path
   *
   * @example
   * const criticalPath = analyzer.findCriticalPath(graph);
   * // Returns: ['task-001', 'task-003', 'task-008', 'task-015']
   */
  findCriticalPath(graph) {
    if (graph.nodes.length === 0) {
      return [];
    }

    // Build adjacency list
    const adjList = {};
    const inDegree = {};

    for (const node of graph.nodes) {
      adjList[node] = [];
      inDegree[node] = 0;
    }

    for (const edge of graph.edges) {
      adjList[edge.from].push(edge.to);
      inDegree[edge.to] = (inDegree[edge.to] || 0) + 1;
    }

    // Find longest path using dynamic programming
    const longestPath = {};
    const parent = {};

    // Initialize
    for (const node of graph.nodes) {
      longestPath[node] = 0;
      parent[node] = null;
    }

    // Topological sort with longest path calculation
    const queue = [];
    for (const node of graph.nodes) {
      if (inDegree[node] === 0) {
        queue.push(node);
      }
    }

    const sorted = [];
    while (queue.length > 0) {
      const node = queue.shift();
      sorted.push(node);

      for (const neighbor of adjList[node]) {
        // Update longest path
        if (longestPath[node] + 1 > longestPath[neighbor]) {
          longestPath[neighbor] = longestPath[node] + 1;
          parent[neighbor] = node;
        }

        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Find node with longest path
    let maxLength = 0;
    let endNode = null;

    for (const node of graph.nodes) {
      if (longestPath[node] > maxLength) {
        maxLength = longestPath[node];
        endNode = node;
      }
    }

    if (!endNode) {
      // No dependencies, return first node
      return graph.nodes.slice(0, 1);
    }

    // Reconstruct path
    const path = [];
    let current = endNode;
    while (current !== null) {
      path.unshift(current);
      current = parent[current];
    }

    return path;
  }

  /**
   * Find tasks that can be executed in parallel
   *
   * @param {Object} graph - Dependency graph
   * @returns {Array<Array<string>>} - Groups of parallelizable tasks
   *
   * @example
   * const parallelizable = analyzer.findParallelizable(graph);
   * // Returns: [
   * //   ['task-002', 'task-004', 'task-005'],  // Can work in parallel
   * //   ['task-006', 'task-007']                // Can work in parallel
   * // ]
   */
  findParallelizable(graph) {
    if (graph.nodes.length === 0) {
      return [];
    }

    // Build adjacency list
    const adjList = {};
    const inDegree = {};

    for (const node of graph.nodes) {
      adjList[node] = [];
      inDegree[node] = 0;
    }

    for (const edge of graph.edges) {
      adjList[edge.from].push(edge.to);
      inDegree[edge.to] = (inDegree[edge.to] || 0) + 1;
    }

    // Group tasks by dependency level
    const levels = [];
    const visited = new Set();
    const queue = [];

    // Start with tasks that have no dependencies
    for (const node of graph.nodes) {
      if (inDegree[node] === 0) {
        queue.push(node);
      }
    }

    while (queue.length > 0 || visited.size < graph.nodes.length) {
      // Current level = all tasks in queue
      const currentLevel = [...queue];
      queue.length = 0;

      if (currentLevel.length > 1) {
        // More than one task at this level = can be parallelized
        levels.push(currentLevel);
      }

      // Mark as visited and add dependents
      for (const node of currentLevel) {
        visited.add(node);

        for (const neighbor of adjList[node]) {
          inDegree[neighbor]--;
          if (inDegree[neighbor] === 0 && !visited.has(neighbor)) {
            queue.push(neighbor);
          }
        }
      }

      // If queue is empty but we haven't visited all nodes,
      // there might be a cycle or isolated nodes
      if (queue.length === 0 && visited.size < graph.nodes.length) {
        // Add unvisited nodes with lowest remaining in-degree
        let minDegree = Infinity;
        let nextNode = null;

        for (const node of graph.nodes) {
          if (!visited.has(node) && inDegree[node] < minDegree) {
            minDegree = inDegree[node];
            nextNode = node;
          }
        }

        if (nextNode) {
          queue.push(nextNode);
          inDegree[nextNode] = 0;
        } else {
          break;
        }
      }
    }

    return levels;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  _buildGraph(taskFiles) {
    const nodes = [];
    const edges = [];

    // Create nodes
    for (const task of taskFiles) {
      nodes.push(task.frontmatter.id);
    }

    // Create edges from dependencies
    for (const task of taskFiles) {
      const taskId = task.frontmatter.id;

      // From depends_on
      if (task.frontmatter.depends_on && Array.isArray(task.frontmatter.depends_on)) {
        for (const depId of task.frontmatter.depends_on) {
          edges.push({
            from: depId,
            to: taskId,
            type: 'depends_on'
          });
        }
      }

      // From blocks
      if (task.frontmatter.blocks && Array.isArray(task.frontmatter.blocks)) {
        for (const blockedId of task.frontmatter.blocks) {
          edges.push({
            from: taskId,
            to: blockedId,
            type: 'blocks'
          });
        }
      }
    }

    return { nodes, edges };
  }

  _detectCircularDependencies(graph) {
    const cycles = [];
    const visited = new Set();
    const recStack = new Set();

    // Build adjacency list
    const adjList = {};
    for (const node of graph.nodes) {
      adjList[node] = [];
    }
    for (const edge of graph.edges) {
      adjList[edge.from].push(edge.to);
    }

    const dfs = (node, path) => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      for (const neighbor of adjList[node]) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor, path)) {
            return true;
          }
        } else if (recStack.has(neighbor)) {
          // Found cycle
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart);
          cycle.push(neighbor); // Close the cycle

          cycles.push({
            cycle,
            length: cycle.length - 1
          });

          return true;
        }
      }

      recStack.delete(node);
      path.pop();
      return false;
    };

    // Check each node
    for (const node of graph.nodes) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }

    return cycles;
  }
}

module.exports = DependencyAnalyzer;
