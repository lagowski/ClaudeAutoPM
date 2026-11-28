/**
 * Test suite for /cloud:cost-alert command
 *
 * TDD approach: These tests are written FIRST before implementation
 * Following strict Red-Green-Refactor cycle
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('/cloud:cost-alert Command', () => {
  const commandPath = path.join(__dirname, '../../commands/cloud:cost-alert.md');

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
      expect(frontmatter).toMatch(/command:\s*cloud:cost-alert/);
      expect(frontmatter).toMatch(/plugin:\s*cloud/);
      expect(frontmatter).toMatch(/category:\s*cloud-operations/);
      expect(frontmatter).toMatch(/description:/);
    });

    test('command should include required tools', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      const frontmatter = frontmatterMatch[1];

      // Should include necessary tools (account for YAML array format)
      expect(frontmatter).toMatch(/@aws-cloud-architect/);
      expect(frontmatter).toMatch(/@gcp-cloud-architect/);
      expect(frontmatter).toMatch(/@azure-cloud-architect/);
      expect(frontmatter).toMatch(/Read/);
      expect(frontmatter).toMatch(/Write/);
      expect(frontmatter).toMatch(/Bash/);
    });

    test('command should have appropriate tags', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)[1];

      // Tags can be in YAML array format, so just check for presence
      expect(frontmatter).toMatch(/cloud/);
      expect(frontmatter).toMatch(/cost-management/);
      expect(frontmatter).toMatch(/monitoring/);
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

    test('should include multi-cloud support instructions', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/AWS.*GCP.*Azure|multi-cloud/i);
    });

    test('should include cost retrieval instructions', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/fetch.*cost|retrieve.*cost|cost.*data/i);
    });

    test('should include anomaly detection instructions', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/anomaly.*detection|detect.*anomal/i);
    });

    test('should include budget tracking instructions', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/budget.*track|forecast/i);
    });

    test('should include alert configuration instructions', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/alert.*channel|Slack.*email.*PagerDuty/i);
    });

    test('should include cost analysis instructions', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/cost.*analysis|analyze.*cost|group.*by/i);
    });

    test('should include optimization recommendations', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/optimization.*recommendation|recommend.*optimiz/i);
    });
  });

  describe('Usage Examples', () => {
    test('should include basic usage example', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/\/cloud:cost-alert/);
    });

    test('should include provider-specific examples', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/--provider\s+(aws|gcp|azure)/);
    });

    test('should include budget alert examples', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/--budget|--threshold/);
    });

    test('should include anomaly detection examples', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/--anomaly-detection/);
    });

    test('should include alert channel examples', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');

      expect(content).toMatch(/--channel\s+(slack|email|pagerduty)/);
    });
  });

  describe('Options Documentation', () => {
    test('should document --provider option', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/--provider.*aws.*gcp.*azure/i);
    });

    test('should document --threshold option', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/--threshold/i);
    });

    test('should document --period option', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/--period.*(daily|weekly|monthly)/i);
    });

    test('should document --channel option', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/--channel.*(slack|email|pagerduty)/i);
    });

    test('should document --budget option', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/--budget/i);
    });

    test('should document --anomaly-detection option', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/--anomaly-detection/i);
    });

    test('should document --group-by option', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/--group-by.*(service|region|tag)/i);
    });
  });

  describe('Implementation Details', () => {
    test('should mention AWS Cost Explorer API', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/AWS Cost Explorer|Cost Explorer API/i);
    });

    test('should mention GCP Cloud Billing API', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/GCP.*Billing|Cloud Billing API/i);
    });

    test('should mention Azure Cost Management API', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/Azure Cost Management/i);
    });

    test('should describe threshold-based anomaly detection', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/threshold.*detection/i);
    });

    test('should describe trend-based anomaly detection', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/trend.*detection/i);
    });

    test('should describe ML-based anomaly detection', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/ML.*detection|machine learning/i);
    });

    test('should describe budget tracking', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/budget.*track|utilization/i);
    });

    test('should describe cost forecasting', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/forecast/i);
    });

    test('should describe alert channels', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/Slack.*email.*PagerDuty|webhook/i);
    });
  });

  describe('Output Format', () => {
    test('should describe console output format', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/## Output|console.*output/i);
    });

    test('should include cost alert visualization', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/💰|alert.*format|cost.*alert/i);
    });

    test('should include severity levels', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/severity|critical|warning|info/i);
    });
  });

  describe('Best Practices', () => {
    test('should include best practices section', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/## Best Practices/i);
    });

    test('should mention regular monitoring', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/regular|daily|weekly|monthly|monitor/i);
    });

    test('should mention alert tuning', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/tune.*alert|adjust.*threshold/i);
    });
  });

  describe('Related Commands', () => {
    test('should reference related cloud commands', () => {
      const content = fs.readFileSync(commandPath, 'utf-8');
      expect(content).toMatch(/\/cloud:cost-optimize|\/cloud:validate/);
    });
  });
});
