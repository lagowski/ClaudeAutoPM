#!/usr/bin/env node
/**
 * Analytics Command
 *
 * Display analytics and insights for PRDs/Epics/Tasks
 *
 * Usage:
 *   autopm analytics:epic <epic-id>      # Epic analytics with burndown
 *   autopm analytics:team                # Team metrics
 *   autopm analytics:velocity            # Velocity trends
 *   autopm analytics:export <epic-id>    # Export to JSON/CSV
 *
 * Features:
 *   - Epic analytics (velocity, progress, blockers)
 *   - Burndown charts (ASCII visualization)
 *   - Team metrics (completion rate, duration)
 *   - Dependency analysis (bottlenecks, critical path)
 *   - Export to JSON/CSV
 */

const { requireEngine } = require('./lib/require-engine');
const AnalyticsEngine = requireEngine('analytics-engine');
const BurndownChart = requireEngine('burndown-chart');
const DependencyAnalyzer = requireEngine('dependency-analyzer');

class AnalyticsCommand {
  constructor() {
    this.basePath = '.claude';
    this.engine = new AnalyticsEngine({ basePath: this.basePath });
    this.chartGenerator = new BurndownChart();
    this.dependencyAnalyzer = new DependencyAnalyzer();
  }

  /**
   * Show epic analytics with burndown chart
   */
  async showEpicAnalytics(epicId) {
    console.log(`\n📊 Epic Analytics: ${epicId}\n`);
    console.log('═'.repeat(70));

    try {
      // Get epic analytics
      const analytics = await this.engine.analyzeEpic(epicId);

      // Display basic info
      console.log(`\n📋 ${analytics.title}`);
      console.log(`   ID: ${analytics.epicId}`);
      console.log(`   Status: ${this.getStatusEmoji(analytics.progress.percentage)} ${analytics.progress.percentage}% complete`);

      // Status breakdown
      console.log(`\n📈 Status Breakdown:`);
      console.log(`   ✅ Completed:    ${analytics.status.completed.toString().padStart(3)} tasks`);
      console.log(`   🔄 In Progress:  ${analytics.status.in_progress.toString().padStart(3)} tasks`);
      console.log(`   ⏸  Pending:      ${analytics.status.pending.toString().padStart(3)} tasks`);
      console.log(`   📦 Total:        ${analytics.status.total.toString().padStart(3)} tasks`);

      // Velocity
      console.log(`\n⚡ Velocity:`);
      console.log(`   Current:  ${analytics.velocity.current.toFixed(1)} tasks/week`);
      console.log(`   Average:  ${analytics.velocity.average.toFixed(1)} tasks/week`);
      console.log(`   Trend:    ${this.getTrendEmoji(analytics.velocity.trend)} ${analytics.velocity.trend}`);

      // Timeline
      console.log(`\n📅 Timeline:`);
      console.log(`   Started:     ${analytics.timeline.started}`);
      console.log(`   Last Update: ${analytics.timeline.lastUpdate}`);
      console.log(`   Days Active: ${analytics.timeline.daysActive}`);
      if (analytics.timeline.estimatedCompletion) {
        console.log(`   Est. Complete: ${analytics.timeline.estimatedCompletion}`);
      }

      // Blockers
      if (analytics.blockers && analytics.blockers.length > 0) {
        console.log(`\n🚧 Blockers (${analytics.blockers.length}):`);
        analytics.blockers.slice(0, 5).forEach(blocker => {
          console.log(`   • ${blocker.taskId}: ${blocker.reason}`);
        });
        if (analytics.blockers.length > 5) {
          console.log(`   ... and ${analytics.blockers.length - 5} more`);
        }
      }

      // Dependencies
      if (analytics.dependencies) {
        console.log(`\n🔗 Dependencies:`);
        console.log(`   Blocked by: ${analytics.dependencies.blocked} tasks`);
        console.log(`   Blocking:   ${analytics.dependencies.blocking} tasks`);
      }

      // Generate burndown chart
      console.log(`\n📉 Burndown Chart:\n`);
      const chart = await this.chartGenerator.generate(epicId);
      console.log(chart);

      console.log('\n' + '═'.repeat(70));

    } catch (error) {
      console.error(`\n❌ Error analyzing epic: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Show team metrics
   */
  async showTeamMetrics(periodDays = 30) {
    console.log(`\n📊 Team Metrics (Last ${periodDays} Days)\n`);
    console.log('═'.repeat(70));

    try {
      const metrics = await this.engine.getTeamMetrics({ period: periodDays });

      // Period
      console.log(`\n📅 Period: ${metrics.period.start} to ${metrics.period.end}`);

      // Completion
      console.log(`\n✅ Completion:`);
      console.log(`   Completed: ${metrics.completion.completed}/${metrics.completion.total} items`);
      console.log(`   Rate:      ${(metrics.completion.rate * 100).toFixed(1)}%`);

      // Velocity
      console.log(`\n⚡ Velocity:`);
      console.log(`   Tasks/week:   ${metrics.velocity.tasksPerWeek.toFixed(1)}`);
      console.log(`   Epics/month:  ${metrics.velocity.epicsPerMonth.toFixed(1)}`);

      // Duration
      console.log(`\n⏱️  Average Duration:`);
      console.log(`   Task:  ${metrics.duration.averageTaskDays.toFixed(1)} days`);
      console.log(`   Epic:  ${metrics.duration.averageEpicDays.toFixed(1)} days`);

      // Breakdown
      console.log(`\n📦 Breakdown by Type:`);
      Object.entries(metrics.breakdown).forEach(([type, stats]) => {
        const rate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : '0.0';
        console.log(`   ${type.toUpperCase().padEnd(6)}: ${stats.completed}/${stats.total} (${rate}%)`);
      });

      console.log('\n' + '═'.repeat(70));

    } catch (error) {
      console.error(`\n❌ Error calculating team metrics: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Show velocity trends
   */
  async showVelocity(periodDays = 30) {
    console.log(`\n⚡ Velocity Trends (Last ${periodDays} Days)\n`);
    console.log('═'.repeat(70));

    try {
      // Get all epics
      const FilterEngine = requireEngine('filter-engine');
      const filterEngine = new FilterEngine({ basePath: this.basePath });
      const epics = await filterEngine.loadFiles(`${this.basePath}/epics/*/epic.md`);

      if (epics.length === 0) {
        console.log('\nℹ️  No epics found.');
        return;
      }

      console.log(`\n📊 Epic Velocities:\n`);

      for (const epic of epics.slice(0, 10)) {
        try {
          const analytics = await this.engine.analyzeEpic(epic.frontmatter.id);
          const trend = this.getTrendEmoji(analytics.velocity.trend);

          console.log(`   ${epic.frontmatter.id.padEnd(15)} ${trend} ${analytics.velocity.current.toFixed(1)} tasks/week (avg: ${analytics.velocity.average.toFixed(1)})`);
        } catch (err) {
          // Skip epics with errors
        }
      }

      if (epics.length > 10) {
        console.log(`\n   ... and ${epics.length - 10} more epics`);
      }

      console.log('\n' + '═'.repeat(70));

    } catch (error) {
      console.error(`\n❌ Error calculating velocity: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Export analytics to file
   */
  async exportAnalytics(epicId, format = 'json', outputFile = null) {
    console.log(`\n📤 Exporting analytics for ${epicId}...\n`);

    try {
      const analytics = await this.engine.analyzeEpic(epicId);
      const exported = await this.engine.export(analytics, format);

      const fs = require('fs');
      const path = require('path');

      if (!outputFile) {
        outputFile = `${epicId}-analytics.${format}`;
      }

      fs.writeFileSync(outputFile, exported);

      console.log(`✅ Exported to: ${path.resolve(outputFile)}`);
      console.log(`   Format: ${format.toUpperCase()}`);
      console.log(`   Size: ${exported.length} bytes`);

    } catch (error) {
      console.error(`\n❌ Error exporting analytics: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Show dependency analysis
   */
  async showDependencies(epicId) {
    console.log(`\n🔗 Dependency Analysis: ${epicId}\n`);
    console.log('═'.repeat(70));

    try {
      const analysis = await this.dependencyAnalyzer.analyze(epicId);

      // Graph overview
      console.log(`\n📊 Graph Overview:`);
      console.log(`   Tasks:        ${analysis.graph.nodes.length}`);
      console.log(`   Dependencies: ${analysis.graph.edges.length}`);

      // Bottlenecks
      if (analysis.bottlenecks.length > 0) {
        console.log(`\n🚧 Bottlenecks (${analysis.bottlenecks.length}):`);
        analysis.bottlenecks.slice(0, 5).forEach(bottleneck => {
          const impactEmoji = bottleneck.impact === 'high' ? '🔴' :
                             bottleneck.impact === 'medium' ? '🟡' : '🟢';
          console.log(`   ${impactEmoji} ${bottleneck.taskId}: blocks ${bottleneck.blocking} tasks`);
          console.log(`      ${bottleneck.reason}`);
        });
      }

      // Critical path
      if (analysis.criticalPath.length > 0) {
        console.log(`\n🎯 Critical Path (${analysis.criticalPath.length} tasks):`);
        console.log(`   ${analysis.criticalPath.join(' → ')}`);
      }

      // Parallelizable
      if (analysis.parallelizable.length > 0) {
        console.log(`\n⚡ Parallelizable Groups (${analysis.parallelizable.length}):`);
        analysis.parallelizable.slice(0, 3).forEach((group, i) => {
          console.log(`   Group ${i + 1}: ${group.join(', ')}`);
        });
      }

      // Circular dependencies
      if (analysis.circularDependencies && analysis.circularDependencies.length > 0) {
        console.log(`\n⚠️  Circular Dependencies (${analysis.circularDependencies.length}):`);
        analysis.circularDependencies.forEach(cycle => {
          console.log(`   ${cycle.join(' → ')}`);
        });
      }

      console.log('\n' + '═'.repeat(70));

    } catch (error) {
      console.error(`\n❌ Error analyzing dependencies: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Show help
   */
  showHelp() {
    console.log(`
📊 Analytics Command

Display analytics and insights for PRDs/Epics/Tasks

Usage:
  autopm analytics:epic <epic-id>         Epic analytics with burndown
  autopm analytics:team [--period 30]    Team metrics (default: 30 days)
  autopm analytics:velocity [--period 30] Velocity trends
  autopm analytics:dependencies <epic-id> Dependency analysis
  autopm analytics:export <epic-id> [--format json|csv] [--output file.json]

Examples:
  autopm analytics:epic epic-001
  autopm analytics:team --period 60
  autopm analytics:export epic-001 --format csv --output report.csv

Options:
  --period <days>    Time period for metrics (default: 30)
  --format <type>    Export format: json or csv (default: json)
  --output <file>    Output file (default: <epic-id>-analytics.<format>)
  --help             Show this help
`);
  }

  /**
   * Helper: Get status emoji
   */
  getStatusEmoji(percentage) {
    if (percentage >= 80) return '🟢';
    if (percentage >= 50) return '🟡';
    if (percentage >= 20) return '🟠';
    return '🔴';
  }

  /**
   * Helper: Get trend emoji
   */
  getTrendEmoji(trend) {
    if (trend === 'increasing') return '📈';
    if (trend === 'decreasing') return '📉';
    return '➡️';
  }

  /**
   * Parse arguments
   */
  parseArgs(args) {
    const options = {
      command: null,
      epicId: null,
      period: 30,
      format: 'json',
      output: null
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--help' || arg === '-h') {
        this.showHelp();
        process.exit(0);
      } else if (arg === '--period' || arg === '-p') {
        options.period = parseInt(args[++i], 10);
      } else if (arg === '--format' || arg === '-f') {
        options.format = args[++i];
      } else if (arg === '--output' || arg === '-o') {
        options.output = args[++i];
      } else if (!options.command) {
        options.command = arg;
      } else if (!options.epicId) {
        options.epicId = arg;
      }
    }

    return options;
  }

  /**
   * Run command
   */
  async run(args) {
    const options = this.parseArgs(args);

    if (!options.command) {
      this.showHelp();
      process.exit(1);
    }

    try {
      switch (options.command) {
        case 'epic':
          if (!options.epicId) {
            console.error('❌ Error: Epic ID required');
            console.error('Usage: autopm analytics:epic <epic-id>');
            process.exit(1);
          }
          await this.showEpicAnalytics(options.epicId);
          break;

        case 'team':
          await this.showTeamMetrics(options.period);
          break;

        case 'velocity':
          await this.showVelocity(options.period);
          break;

        case 'dependencies':
          if (!options.epicId) {
            console.error('❌ Error: Epic ID required');
            console.error('Usage: autopm analytics:dependencies <epic-id>');
            process.exit(1);
          }
          await this.showDependencies(options.epicId);
          break;

        case 'export':
          if (!options.epicId) {
            console.error('❌ Error: Epic ID required');
            console.error('Usage: autopm analytics:export <epic-id> [--format json|csv]');
            process.exit(1);
          }
          await this.exportAnalytics(options.epicId, options.format, options.output);
          break;

        default:
          console.error(`❌ Unknown command: ${options.command}`);
          this.showHelp();
          process.exit(1);
      }

    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
}

// Main execution
if (require.main === module) {
  const command = new AnalyticsCommand();
  command.run(process.argv.slice(2));
}

module.exports = AnalyticsCommand;
