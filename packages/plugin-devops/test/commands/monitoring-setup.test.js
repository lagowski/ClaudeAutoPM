/**
 * Jest TDD Tests for /devops:monitoring-setup Command
 *
 * Tests validate the command structure, Context7 integration,
 * and documentation completeness for the monitoring setup command.
 */

const fs = require('fs');
const path = require('path');

describe('/devops:monitoring-setup Command Structure Tests', () => {
  const commandPath = path.join(__dirname, '../../commands/devops:monitoring-setup.md');
  let commandContent;

  beforeAll(() => {
    // This test will initially fail (TDD Red phase)
    if (fs.existsSync(commandPath)) {
      commandContent = fs.readFileSync(commandPath, 'utf8');
    }
  });

  test('command file should exist', () => {
    expect(fs.existsSync(commandPath)).toBe(true);
  });

  describe('Required Sections', () => {
    test('should have command title heading', () => {
      expect(commandContent).toContain('# devops:monitoring-setup');
    });

    test('should have Description section', () => {
      expect(commandContent).toMatch(/## Description/i);
    });

    test('should have Required Documentation Access section', () => {
      expect(commandContent).toContain('## Required Documentation Access');
    });

    test('should have Usage section', () => {
      expect(commandContent).toMatch(/## Usage/i);
    });

    test('should have Options section', () => {
      expect(commandContent).toMatch(/## Options/i);
    });

    test('should have Examples section', () => {
      expect(commandContent).toMatch(/## Examples/i);
    });

    test('should have Implementation section', () => {
      expect(commandContent).toMatch(/## Implementation/i);
    });
  });

  describe('Context7 Documentation Queries', () => {
    test('points to the shared Context7 rule', () => {
      expect(commandContent).toContain('.claude/rules/context7-required.md');
    });
  });

  describe('Command Options', () => {
    test('should support --stack option for monitoring stack selection', () => {
      expect(commandContent).toMatch(/--stack.*prometheus-grafana/i);
    });

    test('should support --platform option for deployment target', () => {
      expect(commandContent).toMatch(/--platform.*kubernetes/i);
    });

    test('should support --namespace option for Kubernetes namespace', () => {
      expect(commandContent).toMatch(/--namespace/i);
    });

    test('should support --add-dashboards option for dashboard selection', () => {
      expect(commandContent).toMatch(/--add-dashboards/i);
    });

    test('should support --slo-targets option for SLO configuration', () => {
      expect(commandContent).toMatch(/--slo-targets/i);
    });
  });

  describe('Implementation Details', () => {
    test('should reference observability-engineer agent', () => {
      expect(commandContent).toMatch(/@observability-engineer/);
    });

    test('should include Prometheus configuration patterns', () => {
      expect(commandContent).toMatch(/Prometheus/i);
      expect(commandContent).toMatch(/scrape.*config/i);
    });

    test('should include Grafana dashboard setup', () => {
      expect(commandContent).toMatch(/Grafana.*dashboard/i);
    });

    test('should include AlertManager configuration', () => {
      expect(commandContent).toMatch(/AlertManager/i);
    });

    test('should include SLO/SLI monitoring patterns', () => {
      expect(commandContent).toMatch(/SLO|Service Level Objective/i);
    });

    test('should include Kubernetes deployment patterns', () => {
      expect(commandContent).toMatch(/Kubernetes|K8s|Helm/i);
    });

    test('should include Docker Compose setup option', () => {
      expect(commandContent).toMatch(/Docker.*Compose/i);
    });
  });

  describe('Examples Coverage', () => {
    test('should provide basic stack setup example', () => {
      expect(commandContent).toMatch(/\/devops:monitoring-setup.*--stack/);
    });

    test('should provide Kubernetes deployment example', () => {
      expect(commandContent).toMatch(/\/devops:monitoring-setup.*--platform.*kubernetes/);
    });

    test('should provide dashboard installation example', () => {
      expect(commandContent).toMatch(/\/devops:monitoring-setup.*--add-dashboards/);
    });

    test('should provide SLO configuration example', () => {
      expect(commandContent).toMatch(/\/devops:monitoring-setup.*--slo-targets/);
    });
  });

  describe('Output Format', () => {
    test('should describe deployment confirmation output', () => {
      expect(commandContent).toMatch(/Monitoring stack deployed|deployed/i);
    });

    test('should describe Grafana URL output', () => {
      expect(commandContent).toMatch(/Grafana.*URL/i);
    });

    test('should describe alert routing output', () => {
      expect(commandContent).toMatch(/Alert.*routing.*configured/i);
    });

    test('should describe documentation output', () => {
      expect(commandContent).toMatch(/Documentation.*custom metrics/i);
    });
  });

  describe('Best Practices', () => {
    test('should mention auto-discovery for service monitoring', () => {
      expect(commandContent).toMatch(/auto.*discover|service.*discovery/i);
    });

    test('should include alerting rules patterns', () => {
      expect(commandContent).toMatch(/alert.*rule/i);
    });

    test('should mention retention policies', () => {
      expect(commandContent).toMatch(/retention/i);
    });

    test('should include authentication and security', () => {
      expect(commandContent).toMatch(/authentication|RBAC|security/i);
    });
  });

  describe('Related Agents', () => {
    test('should reference kubernetes-orchestrator for K8s deployments', () => {
      expect(commandContent).toMatch(/kubernetes-orchestrator/i);
    });

    test('should reference docker-containerization-expert for Docker setups', () => {
      expect(commandContent).toMatch(/docker-containerization-expert/i);
    });
  });
});
