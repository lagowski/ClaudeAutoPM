/**
 * Jest TDD Tests for /devops:incident-response Command
 *
 * Tests validate the command structure, Context7 integration,
 * incident severity workflows, and automated diagnostics completeness.
 */

const fs = require('fs');
const path = require('path');

describe('/devops:incident-response Command Structure Tests', () => {
  const commandPath = path.join(__dirname, '../../commands/devops:incident-response.md');
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
      expect(commandContent).toContain('# devops:incident-response');
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

  describe('Severity Classification Options', () => {
    test('should support --severity option for P0/P1/P2/P3 classification', () => {
      expect(commandContent).toMatch(/--severity.*critical|high|medium|low/i);
    });

    test('should document P0 (Critical) severity workflow', () => {
      expect(commandContent).toMatch(/P0.*Critical/i);
    });

    test('should document P1 (High) severity workflow', () => {
      expect(commandContent).toMatch(/P1.*High/i);
    });

    test('should document P2 (Medium) severity workflow', () => {
      expect(commandContent).toMatch(/P2.*Medium/i);
    });

    test('should document P3 (Low) severity workflow', () => {
      expect(commandContent).toMatch(/P3.*Low/i);
    });
  });

  describe('Command Options', () => {
    test('should support --service option for specifying affected service', () => {
      expect(commandContent).toMatch(/--service/i);
    });

    test('should support --symptoms option for describing incident symptoms', () => {
      expect(commandContent).toMatch(/--symptoms/i);
    });

    test('should support --analyze-deployment option for deployment analysis', () => {
      expect(commandContent).toMatch(/--analyze-deployment/i);
    });

    test('should support --rollback option for automated rollback', () => {
      expect(commandContent).toMatch(/--rollback/i);
    });

    test('should support --target option for rollback target version', () => {
      expect(commandContent).toMatch(/--target/i);
    });

    test('should support --namespace option for Kubernetes namespace', () => {
      expect(commandContent).toMatch(/--namespace/i);
    });
  });

  describe('Automated Diagnostics Features', () => {
    test('should include service health checks (K8s pods)', () => {
      expect(commandContent).toMatch(/service.*health.*check|pod.*status/i);
    });

    test('should include deployment analysis (last 4 hours)', () => {
      expect(commandContent).toMatch(/deployment.*analysis|recent.*deployment/i);
    });

    test('should include error log correlation', () => {
      expect(commandContent).toMatch(/error.*log|log.*correlation/i);
    });

    test('should include metrics anomaly detection', () => {
      expect(commandContent).toMatch(/metrics.*anomaly|anomaly.*detection/i);
    });

    test('should include distributed tracing analysis', () => {
      expect(commandContent).toMatch(/distributed.*tracing|trace.*analysis/i);
    });

    test('should include dependency health checks', () => {
      expect(commandContent).toMatch(/dependency.*health|dependency.*check/i);
    });
  });

  describe('Decision Logic and Troubleshooting', () => {
    test('should include rollback vs hotfix recommendation logic', () => {
      expect(commandContent).toMatch(/rollback.*recommendation|rollback.*hotfix/i);
    });

    test('should include impact assessment (affected users)', () => {
      expect(commandContent).toMatch(/impact.*assessment|affected.*user/i);
    });

    test('should include timeline documentation', () => {
      expect(commandContent).toMatch(/timeline|incident.*timeline/i);
    });

    test('should include decision tree based on symptoms', () => {
      expect(commandContent).toMatch(/decision.*tree|troubleshoot.*workflow/i);
    });
  });

  describe('Implementation Details', () => {
    test('should reference observability-engineer agent', () => {
      expect(commandContent).toMatch(/@observability-engineer/);
    });

    test('should reference kubernetes-orchestrator agent', () => {
      expect(commandContent).toMatch(/@kubernetes-orchestrator/);
    });

    test('should reference docker-containerization-expert agent', () => {
      expect(commandContent).toMatch(/@docker-containerization-expert/);
    });

    test('should include kubectl commands for pod diagnostics', () => {
      expect(commandContent).toMatch(/kubectl.*get.*pods|kubectl.*logs/i);
    });

    test('should include Prometheus queries for metrics', () => {
      expect(commandContent).toMatch(/Prometheus.*quer/i);
    });

    test('should include deployment history analysis', () => {
      expect(commandContent).toMatch(/git.*log|deployment.*history/i);
    });
  });

  describe('Examples Coverage', () => {
    test('should provide critical severity incident example', () => {
      expect(commandContent).toMatch(/\/devops:incident-response.*--severity.*critical/i);
    });

    test('should provide service-specific incident example', () => {
      expect(commandContent).toMatch(/\/devops:incident-response.*--service/i);
    });

    test('should provide deployment analysis example', () => {
      expect(commandContent).toMatch(/\/devops:incident-response.*--analyze-deployment/i);
    });

    test('should provide rollback example', () => {
      expect(commandContent).toMatch(/\/devops:incident-response.*--rollback/i);
    });
  });

  describe('Output Format', () => {
    test('should include incident severity in output format', () => {
      expect(commandContent).toMatch(/INCIDENT RESPONSE.*P0.*CRITICAL/i);
    });

    test('should include service health status in output', () => {
      expect(commandContent).toMatch(/Service Health/i);
    });

    test('should include timeline in output', () => {
      expect(commandContent).toMatch(/Timeline/i);
    });

    test('should include recommended action in output', () => {
      expect(commandContent).toMatch(/Recommended Action|ROLLBACK/i);
    });

    test('should include investigation findings in output', () => {
      expect(commandContent).toMatch(/Investigation Findings/i);
    });

    test('should include next steps checklist in output', () => {
      expect(commandContent).toMatch(/Next Steps/i);
    });
  });

  describe('Post-Mortem Features', () => {
    test('should include RCA (Root Cause Analysis) documentation', () => {
      expect(commandContent).toMatch(/RCA|root.*cause.*analysis|post.*mortem/i);
    });

    test('should include communication templates for stakeholders', () => {
      expect(commandContent).toMatch(/communication.*template|status.*update/i);
    });
  });

  describe('Best Practices', () => {
    test('should mention incident command structure', () => {
      expect(commandContent).toMatch(/incident.*command|on-call/i);
    });

    test('should include escalation workflows', () => {
      expect(commandContent).toMatch(/escalation/i);
    });

    test('should mention automated remediation', () => {
      expect(commandContent).toMatch(/automated.*remediation|auto.*rollback/i);
    });

    test('should include confidence scoring for recommendations', () => {
      expect(commandContent).toMatch(/confidence|probability/i);
    });
  });

  describe('Related Commands', () => {
    test('should reference related monitoring commands', () => {
      expect(commandContent).toMatch(/Related Commands/i);
    });
  });
});
