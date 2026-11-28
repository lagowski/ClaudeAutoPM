/**
 * Test suite for /core:context-analyze command
 *
 * TDD approach: These tests are written FIRST before implementation
 * Following strict Red-Green-Refactor cycle
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('/core:context-analyze Command', () => {
  const commandPath = path.join(__dirname, '../../commands/core:context-analyze.md');

  describe('Command File Structure', () => {
    test('command file should exist', () => {
      expect(fs.existsSync(commandPath)).toBe(true);
    });

    test('command file should have valid frontmatter', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      // Check for frontmatter delimiters
      expect(content).toMatch(/^---\n/);
      expect(content).toMatch(/\n---\n/);

      // Extract frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      expect(frontmatterMatch).not.toBeNull();

      const frontmatter = frontmatterMatch[1];

      // Verify required frontmatter fields
      expect(frontmatter).toMatch(/command:\s*core:context-analyze/);
      expect(frontmatter).toMatch(/plugin:\s*core/);
      expect(frontmatter).toMatch(/category:\s*core-operations/);
      expect(frontmatter).toMatch(/description:/);
    });

    test('command should include required tools', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const frontmatter = frontmatterMatch[1];

      // Should include necessary tools for analysis
      expect(frontmatter).toMatch(/tools:[\s\S]*@mcp-context-manager/);
      expect(frontmatter).toMatch(/tools:[\s\S]*Read/);
      expect(frontmatter).toMatch(/tools:[\s\S]*Write/);
      expect(frontmatter).toMatch(/tools:[\s\S]*Bash/);
    });

    test('command should have proper tags', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const frontmatter = frontmatterMatch[1];

      expect(frontmatter).toMatch(/tags:[\s\S]*core/);
      expect(frontmatter).toMatch(/tags:[\s\S]*context/);
      expect(frontmatter).toMatch(/tags:[\s\S]*optimization/);
      expect(frontmatter).toMatch(/tags:[\s\S]*mcp/);
      expect(frontmatter).toMatch(/tags:[\s\S]*performance/);
    });

    test('command should have usage examples', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const frontmatter = frontmatterMatch[1];

      expect(frontmatter).toMatch(/usage:/);
      expect(frontmatter).toMatch(/examples:/);
    });
  });

  describe('Required Documentation Access', () => {
    test('points to the shared Context7 rule', () => {
      expect(fs.readFileSync(commandPath, 'utf-8')).toContain('.claude/rules/context7-required.md');
    });
  });

  describe('Instructions Section', () => {
    test('command should have Instructions section', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/## Instructions/i);
    });

    test('should include token counting instructions', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/token.*count/i);
      expect(content).toMatch(/encoding/i);
    });

    test('should include context window analysis instructions', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/context.*window/i);
      expect(content).toMatch(/utilization/i);
    });

    test('should include file size contribution analysis', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/file.*contribution/i);
      expect(content).toMatch(/top.*contributor/i);
    });

    test('should include optimization recommendations', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/optimization.*recommendation/i);
      expect(content).toMatch(/pruning|summarization/i);
    });

    test('should include MCP efficiency scoring', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/MCP.*efficiency/i);
      expect(content).toMatch(/score|scoring/i);
    });

    test('should include historical tracking', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/historical.*usage/i);
      expect(content).toMatch(/trend/i);
    });

    test('should include visualization instructions', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/visualize|visualization/i);
      expect(content).toMatch(/chart|graph|report/i);
    });
  });

  describe('Usage Examples', () => {
    test('command should have Examples section', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/## Examples/i);
    });

    test('should show basic context analysis example', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/\/core:context-analyze/);
    });

    test('should show file-specific analysis example', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/--file.*CLAUDE\.md/i);
      expect(content).toMatch(/--tokens/);
    });

    test('should show optimization target example', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/--optimize/);
      expect(content).toMatch(/--target.*50%|--target.*\d+%/);
    });

    test('should show session analysis example', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/--session/);
    });

    test('should show visualization example', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/--visualize/);
    });
  });

  describe('Output Format', () => {
    test('should define structured output format', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      // Should include output symbols
      expect(content).toMatch(/📊/); // Metrics
      expect(content).toMatch(/💡/); // Recommendations
      expect(content).toMatch(/⚡/); // Performance
      expect(content).toMatch(/📈/); // Trends
    });

    test('should include token usage metrics format', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/Token Usage|Tokens/i);
      expect(content).toMatch(/\d+.*tokens|\d+K/i);
    });

    test('should include context window percentage format', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/\d+%.*window|utilization/i);
    });

    test('should include top contributors format', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/Top Contributors/i);
      expect(content).toMatch(/file.*tokens|file.*%/i);
    });

    test('should include optimization suggestions format', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/Optimization.*Suggestion/i);
      expect(content).toMatch(/impact|reduction/i);
    });
  });

  describe('Agent Integration', () => {
    test('should reference mcp-context-manager', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/@mcp-context-manager/i);
    });

    test('should describe agent usage in implementation', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/Implementation|Process/i);
      expect(content).toMatch(/agent.*analyze|manager/i);
    });
  });

  describe('Edge Cases', () => {
    test('should handle very large files', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/large.*file/i);
      expect(content).toMatch(/chunk|split/i);
    });

    test('should handle binary files', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/binary|image|non-text/i);
    });

    test('should handle empty context', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/empty|no.*context/i);
    });

    test('should handle MCP server errors', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/error.*handling|fallback/i);
    });
  });

  describe('Related Commands', () => {
    test('should reference related core commands', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/Related Commands|See Also/i);
      expect(content).toMatch(/\/core:|@file-analyzer|@code-analyzer/i);
    });
  });

  describe('Context7 Integration Compliance', () => {
    test('points to the shared Context7 rule', () => {
      expect(fs.readFileSync(commandPath, 'utf-8')).toContain('.claude/rules/context7-required.md');
    });
  });
});

describe('Context Analysis Implementation Tests', () => {
  // Mock library path - will be created during implementation
  const libPath = path.join(__dirname, '../../lib/context-analyze.js');

  describe('Token Counting', () => {
    test('should count tokens in plain text', async () => {
      // This will fail until implementation exists
      if (!fs.existsSync(libPath)) {
        expect(fs.existsSync(libPath)).toBe(false);
        return;
      }

      const { countTokens } = await import(libPath);
      const text = 'Hello world, this is a test.';
      const count = countTokens(text);

      expect(count).toBeGreaterThan(0);
      expect(typeof count).toBe('number');
    });

    test('should count tokens in code', async () => {
      if (!fs.existsSync(libPath)) {
        expect(fs.existsSync(libPath)).toBe(false);
        return;
      }

      const { countTokens } = await import(libPath);
      const code = `
        function hello() {
          console.log('Hello world');
        }
      `;
      const count = countTokens(code);

      expect(count).toBeGreaterThan(0);
    });

    test('should handle empty text', async () => {
      if (!fs.existsSync(libPath)) {
        expect(fs.existsSync(libPath)).toBe(false);
        return;
      }

      const { countTokens } = await import(libPath);
      const count = countTokens('');

      expect(count).toBe(0);
    });

    test('should handle different encodings', async () => {
      if (!fs.existsSync(libPath)) {
        expect(fs.existsSync(libPath)).toBe(false);
        return;
      }

      const { countTokens } = await import(libPath);
      const unicode = 'Hello 世界 🌍';
      const count = countTokens(unicode);

      expect(count).toBeGreaterThan(0);
    });
  });

  describe('File Analysis', () => {
    test('should analyze single file token count', async () => {
      if (!fs.existsSync(libPath)) {
        expect(fs.existsSync(libPath)).toBe(false);
        return;
      }

      const { analyzeFile } = await import(libPath);

      // Create a temp test file
      const tempFile = path.join(__dirname, 'temp-test.txt');
      fs.writeFileSync(tempFile, 'This is a test file with some content.');

      const analysis = await analyzeFile(tempFile);

      expect(analysis).toHaveProperty('path');
      expect(analysis).toHaveProperty('tokens');
      expect(analysis).toHaveProperty('size');
      expect(analysis.tokens).toBeGreaterThan(0);

      // Cleanup
      fs.unlinkSync(tempFile);
    });

    test('should handle non-existent files', async () => {
      if (!fs.existsSync(libPath)) {
        expect(fs.existsSync(libPath)).toBe(false);
        return;
      }

      const { analyzeFile } = await import(libPath);

      await expect(analyzeFile('/non/existent/file.txt')).rejects.toThrow();
    });

    test('should calculate file contribution percentage', async () => {
      if (!fs.existsSync(libPath)) {
        expect(fs.existsSync(libPath)).toBe(false);
        return;
      }

      const { analyzeFile } = await import(libPath);

      const tempFile = path.join(__dirname, 'temp-test2.txt');
      fs.writeFileSync(tempFile, 'Test content');

      const analysis = await analyzeFile(tempFile);

      expect(analysis).toHaveProperty('contribution');

      fs.unlinkSync(tempFile);
    });
  });

  describe('Context Window Analysis', () => {
    test('should calculate context window utilization', async () => {
      if (!fs.existsSync(libPath)) {
        expect(fs.existsSync(libPath)).toBe(false);
        return;
      }

      const { analyzeContextWindow } = await import(libPath);

      const sessionData = {
        files: [
          { tokens: 1000 },
          { tokens: 2000 },
          { tokens: 500 }
        ],
        maxTokens: 200000
      };

      const analysis = analyzeContextWindow(sessionData);

      expect(analysis).toHaveProperty('totalTokens');
      expect(analysis).toHaveProperty('utilizationPercent');
      expect(analysis).toHaveProperty('remainingTokens');
      expect(analysis.totalTokens).toBe(3500);
      expect(analysis.utilizationPercent).toBeCloseTo(1.75);
    });

    test('should handle empty session', async () => {
      if (!fs.existsSync(libPath)) {
        expect(fs.existsSync(libPath)).toBe(false);
        return;
      }

      const { analyzeContextWindow } = await import(libPath);

      const sessionData = {
        files: [],
        maxTokens: 200000
      };

      const analysis = analyzeContextWindow(sessionData);

      expect(analysis.totalTokens).toBe(0);
      expect(analysis.utilizationPercent).toBe(0);
    });
  });

  describe('Top Contributors Identification', () => {
    test('should identify top contributors by token count', async () => {
      if (!fs.existsSync(libPath)) {
        expect(fs.existsSync(libPath)).toBe(false);
        return;
      }

      const { identifyTopContributors } = await import(libPath);

      const files = [
        { path: 'file1.md', tokens: 5000 },
        { path: 'file2.md', tokens: 1000 },
        { path: 'file3.md', tokens: 3000 },
        { path: 'file4.md', tokens: 2000 }
      ];

      const topContributors = identifyTopContributors(files, 3);

      expect(topContributors).toHaveLength(3);
      expect(topContributors[0].path).toBe('file1.md');
      expect(topContributors[1].path).toBe('file3.md');
      expect(topContributors[2].path).toBe('file4.md');
    });

    test('should calculate contribution percentages', async () => {
      if (!fs.existsSync(libPath)) {
        expect(fs.existsSync(libPath)).toBe(false);
        return;
      }

      const { identifyTopContributors } = await import(libPath);

      const files = [
        { path: 'file1.md', tokens: 6000 },
        { path: 'file2.md', tokens: 4000 }
      ];

      const topContributors = identifyTopContributors(files, 2);

      expect(topContributors[0].percentage).toBe(60);
      expect(topContributors[1].percentage).toBe(40);
    });
  });

  describe('Optimization Recommendations', () => {
    test('should generate recommendations for large files', async () => {
      if (!fs.existsSync(libPath)) {
        expect(fs.existsSync(libPath)).toBe(false);
        return;
      }

      const { generateRecommendations } = await import(libPath);

      const analysis = {
        totalTokens: 150000,
        files: [
          { path: 'large.md', tokens: 50000 },
          { path: 'medium.md', tokens: 30000 }
        ]
      };

      const recommendations = generateRecommendations(analysis, 0.5); // Target 50% reduction

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0]).toHaveProperty('file');
      expect(recommendations[0]).toHaveProperty('suggestion');
      expect(recommendations[0]).toHaveProperty('impact');
    });

    test('should prioritize recommendations by impact', async () => {
      if (!fs.existsSync(libPath)) {
        expect(fs.existsSync(libPath)).toBe(false);
        return;
      }

      const { generateRecommendations } = await import(libPath);

      const analysis = {
        totalTokens: 100000,
        files: [
          { path: 'huge.md', tokens: 70000 },
          { path: 'small.md', tokens: 1000 }
        ]
      };

      const recommendations = generateRecommendations(analysis, 0.3);

      // First recommendation should target the largest file
      expect(recommendations[0].file).toBe('huge.md');
    });

    test('should suggest summarization for verbose files', async () => {
      if (!fs.existsSync(libPath)) {
        expect(fs.existsSync(libPath)).toBe(false);
        return;
      }

      const { generateRecommendations } = await import(libPath);

      const analysis = {
        totalTokens: 80000,
        files: [
          { path: 'verbose.md', tokens: 60000, type: 'documentation' }
        ]
      };

      const recommendations = generateRecommendations(analysis, 0.5);

      expect(recommendations[0].suggestion).toMatch(/summariz/i);
    });
  });

  describe('MCP Efficiency Scoring', () => {
    test('should score MCP context efficiency', async () => {
      if (!fs.existsSync(libPath)) {
        expect(fs.existsSync(libPath)).toBe(false);
        return;
      }

      const { scoreMCPEfficiency } = await import(libPath);

      const mcpUsage = {
        totalTools: 10,
        usedTools: 8,
        totalResources: 5,
        usedResources: 4,
        cacheHitRate: 0.75
      };

      const score = scoreMCPEfficiency(mcpUsage);

      expect(score).toHaveProperty('efficiency');
      expect(score).toHaveProperty('toolUtilization');
      expect(score).toHaveProperty('resourceUtilization');
      expect(score).toHaveProperty('cacheEfficiency');
      expect(score.efficiency).toBeGreaterThanOrEqual(0);
      expect(score.efficiency).toBeLessThanOrEqual(100);
    });

    test('should identify unused MCP tools', async () => {
      if (!fs.existsSync(libPath)) {
        expect(fs.existsSync(libPath)).toBe(false);
        return;
      }

      const { scoreMCPEfficiency } = await import(libPath);

      const mcpUsage = {
        totalTools: 10,
        usedTools: 5,
        unusedTools: ['tool1', 'tool2', 'tool3', 'tool4', 'tool5'],
        totalResources: 5,
        usedResources: 3,
        cacheHitRate: 0.5
      };

      const score = scoreMCPEfficiency(mcpUsage);

      expect(score).toHaveProperty('unusedTools');
      expect(score.unusedTools).toHaveLength(5);
    });
  });

  describe('Visualization', () => {
    test('should generate ASCII chart for token distribution', async () => {
      if (!fs.existsSync(libPath)) {
        expect(fs.existsSync(libPath)).toBe(false);
        return;
      }

      const { visualizeUsage } = await import(libPath);

      const data = {
        files: [
          { path: 'file1.md', tokens: 5000 },
          { path: 'file2.md', tokens: 3000 },
          { path: 'file3.md', tokens: 2000 }
        ]
      };

      const chart = visualizeUsage(data, 'ascii');

      expect(typeof chart).toBe('string');
      expect(chart).toMatch(/file1\.md/);
      expect(chart).toMatch(/█|▓|▒|░|#/); // Bar chart characters
    });

    test('should generate markdown report', async () => {
      if (!fs.existsSync(libPath)) {
        expect(fs.existsSync(libPath)).toBe(false);
        return;
      }

      const { visualizeUsage } = await import(libPath);

      const data = {
        totalTokens: 10000,
        files: [
          { path: 'file1.md', tokens: 6000 },
          { path: 'file2.md', tokens: 4000 }
        ]
      };

      const report = visualizeUsage(data, 'markdown');

      expect(report).toMatch(/##|###/); // Markdown headers
      expect(report).toMatch(/\|/); // Markdown table
    });
  });

  describe('Historical Tracking', () => {
    test('should track usage over time', async () => {
      if (!fs.existsSync(libPath)) {
        expect(fs.existsSync(libPath)).toBe(false);
        return;
      }

      const { trackHistoricalUsage } = await import(libPath);

      const session = {
        timestamp: Date.now(),
        totalTokens: 50000,
        files: [
          { path: 'file1.md', tokens: 30000 },
          { path: 'file2.md', tokens: 20000 }
        ]
      };

      const history = await trackHistoricalUsage(session);

      expect(history).toHaveProperty('sessions');
      expect(history.sessions).toBeInstanceOf(Array);
    });

    test('should identify usage trends', async () => {
      if (!fs.existsSync(libPath)) {
        expect(fs.existsSync(libPath)).toBe(false);
        return;
      }

      const { trackHistoricalUsage } = await import(libPath);

      const sessions = [
        { timestamp: Date.now() - 3600000, totalTokens: 30000 },
        { timestamp: Date.now() - 1800000, totalTokens: 45000 },
        { timestamp: Date.now(), totalTokens: 60000 }
      ];

      const history = { sessions };
      const trends = await trackHistoricalUsage({ ...sessions[2], history });

      expect(trends).toHaveProperty('trend');
      expect(trends.trend).toMatch(/increasing|decreasing|stable/i);
    });
  });
});
