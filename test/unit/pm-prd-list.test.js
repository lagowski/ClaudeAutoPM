/**
 * Jest TDD Tests for PM PRD List Script (prd-list.js)
 *
 * Comprehensive test suite covering all functionality of the prd-list.js script
 * Target: Improve coverage from ~59% to 80%+
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { listPRDs, parseMetadata, categorizeStatus, formatPRDList } = require('../../autopm/.claude/scripts/pm/prd-list.js');

describe('PM PRD List Script - Comprehensive Jest Tests', () => {
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    // Create isolated test environment
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-prd-list-jest-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Basic Functionality', () => {
    test('should export all required functions', () => {
      expect(typeof listPRDs).toBe('function');
      expect(typeof parseMetadata).toBe('function');
      expect(typeof categorizeStatus).toBe('function');
      expect(typeof formatPRDList).toBe('function');
    });

    test('should return structured PRD data', () => {
      const result = listPRDs();

      expect(result).toHaveProperty('backlog');
      expect(result).toHaveProperty('inProgress');
      expect(result).toHaveProperty('implemented');
      expect(result).toHaveProperty('summary');
      expect(Array.isArray(result.backlog)).toBe(true);
      expect(Array.isArray(result.inProgress)).toBe(true);
      expect(Array.isArray(result.implemented)).toBe(true);
    });

    test('should return empty results when no PRDs directory exists', () => {
      const result = listPRDs();

      expect(result.summary.totalPRDs).toBe(0);
      expect(result.backlog).toHaveLength(0);
      expect(result.inProgress).toHaveLength(0);
      expect(result.implemented).toHaveLength(0);
    });

    test('should return empty results when PRDs directory is empty', () => {
      fs.mkdirSync('.claude/prds', { recursive: true });

      const result = listPRDs();

      expect(result.summary.totalPRDs).toBe(0);
      expect(result.backlog).toHaveLength(0);
      expect(result.inProgress).toHaveLength(0);
      expect(result.implemented).toHaveLength(0);
    });
  });

  describe('Metadata Parsing', () => {
    test('should parse YAML frontmatter correctly', () => {
      const content = `---
name: Test Feature
status: in-progress
description: A test feature for the application
priority: high
---

# Test Feature

This is the content of the PRD.`;

      const metadata = parseMetadata(content);

      expect(metadata.name).toBe('Test Feature');
      expect(metadata.status).toBe('in-progress');
      expect(metadata.description).toBe('A test feature for the application');
      expect(metadata.priority).toBe('high');
    });

    test('should parse simple key-value format', () => {
      const content = `name: Simple Feature
status: backlog
description: Simple description

# Feature Details

Content goes here.`;

      const metadata = parseMetadata(content);

      expect(metadata.name).toBe('Simple Feature');
      expect(metadata.status).toBe('backlog');
      expect(metadata.description).toBe('Simple description');
    });

    test('should handle metadata with colons in values', () => {
      const content = `---
name: API Integration
status: implemented
description: Integration with https://api.example.com:8080/v1
---`;

      const metadata = parseMetadata(content);

      expect(metadata.name).toBe('API Integration');
      expect(metadata.description).toBe('Integration with https://api.example.com:8080/v1');
    });

    test('should handle empty or missing metadata', () => {
      const content = `# Just a title

No metadata here.`;

      const metadata = parseMetadata(content);

      expect(metadata.name).toBe('');
      expect(metadata.status).toBe('');
      expect(metadata.description).toBe('');
      expect(metadata.priority).toBe('');
    });

    test('should ignore unknown fields in metadata', () => {
      const content = `---
name: Feature
status: active
unknown_field: value
another_field: test
---`;

      const metadata = parseMetadata(content);

      expect(metadata.name).toBe('Feature');
      expect(metadata.status).toBe('active');
      expect(metadata).not.toHaveProperty('unknown_field');
      expect(metadata).not.toHaveProperty('another_field');
    });

    test('should handle malformed YAML frontmatter', () => {
      const content = `---
name: Feature
status:
description incomplete
---`;

      const metadata = parseMetadata(content);

      expect(metadata.name).toBe('Feature');
      expect(metadata.status).toBe('');
    });

    test('should stop parsing at content section', () => {
      const content = `name: Feature
status: active

# Content starts here
name: This should be ignored
status: This should also be ignored`;

      const metadata = parseMetadata(content);

      expect(metadata.name).toBe('Feature');
      expect(metadata.status).toBe('active');
    });

    test('should handle lines with comments', () => {
      const content = `name: Feature
status: active
# This is a comment
description: Test description`;

      const metadata = parseMetadata(content);

      expect(metadata.name).toBe('Feature');
      expect(metadata.status).toBe('active');
      expect(metadata.description).toBe('');  // Should stop at comment
    });
  });

  describe('Status Categorization', () => {
    test('should categorize backlog statuses correctly', () => {
      expect(categorizeStatus('backlog')).toBe('backlog');
      expect(categorizeStatus('draft')).toBe('backlog');
      expect(categorizeStatus('')).toBe('backlog');
      expect(categorizeStatus(null)).toBe('backlog');
      expect(categorizeStatus(undefined)).toBe('backlog');
    });

    test('should categorize in-progress statuses correctly', () => {
      expect(categorizeStatus('in-progress')).toBe('inProgress');
      expect(categorizeStatus('active')).toBe('inProgress');
      expect(categorizeStatus('IN-PROGRESS')).toBe('inProgress');
      expect(categorizeStatus('Active')).toBe('inProgress');
    });

    test('should categorize implemented statuses correctly', () => {
      expect(categorizeStatus('implemented')).toBe('implemented');
      expect(categorizeStatus('completed')).toBe('implemented');
      expect(categorizeStatus('done')).toBe('implemented');
      expect(categorizeStatus('IMPLEMENTED')).toBe('implemented');
      expect(categorizeStatus('Done')).toBe('implemented');
    });

    test('should default unknown statuses to backlog', () => {
      expect(categorizeStatus('unknown')).toBe('backlog');
      expect(categorizeStatus('testing')).toBe('backlog');
      expect(categorizeStatus('review')).toBe('backlog');
    });
  });

  describe('PRD File Processing', () => {
    test('should process single PRD file correctly', () => {
      fs.mkdirSync('.claude/prds', { recursive: true });
      fs.writeFileSync('.claude/prds/test-feature.md', `---
name: Test Feature
status: in-progress
description: Test description
---

# Test Feature
Content here.`);

      const result = listPRDs();

      expect(result.summary.totalPRDs).toBe(1);
      expect(result.inProgress).toHaveLength(1);
      expect(result.inProgress[0].name).toBe('Test Feature');
      expect(result.inProgress[0].status).toBe('in-progress');
      expect(result.inProgress[0].description).toBe('Test description');
      expect(result.inProgress[0].fileName).toBe('test-feature.md');
    });

    test('should process multiple PRD files with different statuses', () => {
      fs.mkdirSync('.claude/prds', { recursive: true });

      fs.writeFileSync('.claude/prds/backlog-feature.md', `name: Backlog Feature
status: backlog
description: In backlog`);

      fs.writeFileSync('.claude/prds/active-feature.md', `name: Active Feature
status: active
description: Currently active`);

      fs.writeFileSync('.claude/prds/done-feature.md', `name: Done Feature
status: implemented
description: Already done`);

      const result = listPRDs();

      expect(result.summary.totalPRDs).toBe(3);
      expect(result.backlog).toHaveLength(1);
      expect(result.inProgress).toHaveLength(1);
      expect(result.implemented).toHaveLength(1);

      expect(result.summary.backlogCount).toBe(1);
      expect(result.summary.inProgressCount).toBe(1);
      expect(result.summary.implementedCount).toBe(1);
    });

    test('should use filename as fallback for missing name', () => {
      fs.mkdirSync('.claude/prds', { recursive: true });
      fs.writeFileSync('.claude/prds/feature-without-name.md', `status: backlog
description: No name specified`);

      const result = listPRDs();

      expect(result.backlog[0].name).toBe('feature-without-name');
    });

    test('should use default values for missing metadata', () => {
      fs.mkdirSync('.claude/prds', { recursive: true });
      fs.writeFileSync('.claude/prds/minimal.md', `# Just content`);

      const result = listPRDs();

      expect(result.backlog).toHaveLength(1);
      expect(result.backlog[0].name).toBe('minimal');
      expect(result.backlog[0].status).toBe('backlog');
      expect(result.backlog[0].description).toBe('No description');
    });

    test('should only process .md files', () => {
      fs.mkdirSync('.claude/prds', { recursive: true });

      fs.writeFileSync('.claude/prds/valid.md', 'name: Valid PRD');
      fs.writeFileSync('.claude/prds/invalid.txt', 'name: Invalid file');
      fs.writeFileSync('.claude/prds/also-invalid.doc', 'name: Also invalid');
      fs.writeFileSync('.claude/prds/readme.md', 'name: Another valid PRD');

      const result = listPRDs();

      expect(result.summary.totalPRDs).toBe(2);
      expect(result.backlog).toHaveLength(2);
    });

    test('should handle unreadable files gracefully', () => {
      fs.mkdirSync('.claude/prds', { recursive: true });

      // Create a valid file
      fs.writeFileSync('.claude/prds/valid.md', 'name: Valid PRD');

      // Create file and make it unreadable (simulate permission error)
      fs.writeFileSync('.claude/prds/unreadable.md', 'name: Unreadable');
      if (process.platform !== 'win32') {
        fs.chmodSync('.claude/prds/unreadable.md', 0o000);
      }

      const result = listPRDs();

      // Should still process the valid file
      expect(result.summary.totalPRDs).toBeGreaterThan(0);

      // Clean up permissions for cleanup
      if (process.platform !== 'win32') {
        try {
          fs.chmodSync('.claude/prds/unreadable.md', 0o644);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });

    test('should handle directory read errors gracefully', () => {
      // Create directory but make it unreadable
      fs.mkdirSync('.claude/prds', { recursive: true });
      if (process.platform !== 'win32') {
        fs.chmodSync('.claude/prds', 0o000);
      }

      const result = listPRDs();

      expect(result.summary.totalPRDs).toBe(0);

      // Clean up permissions for cleanup
      if (process.platform !== 'win32') {
        try {
          fs.chmodSync('.claude/prds', 0o755);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('Summary Statistics', () => {
    test('should calculate summary statistics correctly', () => {
      fs.mkdirSync('.claude/prds', { recursive: true });

      // Create 3 backlog, 2 in-progress, 1 implemented
      for (let i = 1; i <= 3; i++) {
        fs.writeFileSync(`.claude/prds/backlog-${i}.md`, `name: Backlog ${i}\nstatus: backlog`);
      }
      for (let i = 1; i <= 2; i++) {
        fs.writeFileSync(`.claude/prds/progress-${i}.md`, `name: Progress ${i}\nstatus: active`);
      }
      fs.writeFileSync('.claude/prds/done-1.md', 'name: Done 1\nstatus: implemented');

      const result = listPRDs();

      expect(result.summary.totalPRDs).toBe(6);
      expect(result.summary.backlogCount).toBe(3);
      expect(result.summary.inProgressCount).toBe(2);
      expect(result.summary.implementedCount).toBe(1);
    });

    test('should maintain consistency between arrays and counts', () => {
      fs.mkdirSync('.claude/prds', { recursive: true });

      fs.writeFileSync('.claude/prds/test1.md', 'status: backlog');
      fs.writeFileSync('.claude/prds/test2.md', 'status: in-progress');
      fs.writeFileSync('.claude/prds/test3.md', 'status: completed');

      const result = listPRDs();

      expect(result.backlog.length).toBe(result.summary.backlogCount);
      expect(result.inProgress.length).toBe(result.summary.inProgressCount);
      expect(result.implemented.length).toBe(result.summary.implementedCount);
      expect(result.summary.totalPRDs).toBe(
        result.summary.backlogCount +
        result.summary.inProgressCount +
        result.summary.implementedCount
      );
    });
  });

  describe('Output Formatting', () => {
    test('should format empty PRD list with helpful message', () => {
      const emptyData = {
        backlog: [],
        inProgress: [],
        implemented: [],
        summary: { totalPRDs: 0, backlogCount: 0, inProgressCount: 0, implementedCount: 0 }
      };

      const output = formatPRDList(emptyData);

      expect(output).toContain('No PRD directory found');
      expect(output).toContain('/pm:prd-new <feature-name>');
    });

    test('should format empty directory with helpful message', () => {
      fs.mkdirSync('.claude/prds', { recursive: true });

      const emptyData = {
        backlog: [],
        inProgress: [],
        implemented: [],
        summary: { totalPRDs: 0, backlogCount: 0, inProgressCount: 0, implementedCount: 0 }
      };

      const output = formatPRDList(emptyData);

      expect(output).toContain('No PRDs found');
      expect(output).toContain('/pm:prd-new <feature-name>');
    });

    test('should include all required sections in output', () => {
      const sampleData = {
        backlog: [{
          name: 'Backlog Feature',
          status: 'backlog',
          description: 'Backlog description',
          filePath: '.claude/prds/backlog.md',
          fileName: 'backlog.md'
        }],
        inProgress: [{
          name: 'Active Feature',
          status: 'active',
          description: 'Active description',
          filePath: '.claude/prds/active.md',
          fileName: 'active.md'
        }],
        implemented: [{
          name: 'Done Feature',
          status: 'implemented',
          description: 'Done description',
          filePath: '.claude/prds/done.md',
          fileName: 'done.md'
        }],
        summary: { totalPRDs: 3, backlogCount: 1, inProgressCount: 1, implementedCount: 1 }
      };

      const output = formatPRDList(sampleData);

      expect(output).toContain('📋 PRD List');
      expect(output).toContain('🔍 Backlog PRDs:');
      expect(output).toContain('🔄 In-Progress PRDs:');
      expect(output).toContain('✅ Implemented PRDs:');
      expect(output).toContain('📊 PRD Summary');
      expect(output).toContain('Total PRDs: 3');
      expect(output).toContain('Backlog: 1');
      expect(output).toContain('In-Progress: 1');
      expect(output).toContain('Implemented: 1');
    });

    test('should show (none) for empty categories', () => {
      const dataWithEmptyCategories = {
        backlog: [],
        inProgress: [{
          name: 'Active Feature',
          status: 'active',
          description: 'Active description',
          filePath: '.claude/prds/active.md',
          fileName: 'active.md'
        }],
        implemented: [],
        summary: { totalPRDs: 1, backlogCount: 0, inProgressCount: 1, implementedCount: 0 }
      };

      const output = formatPRDList(dataWithEmptyCategories);

      expect(output).toContain('🔍 Backlog PRDs:\n   (none)');
      expect(output).toContain('✅ Implemented PRDs:\n   (none)');
      expect(output).toContain('🔄 In-Progress PRDs:\n   📋 .claude/prds/active.md - Active description');
    });

    test('should format file paths and descriptions correctly', () => {
      const sampleData = {
        backlog: [{
          name: 'Test Feature',
          status: 'backlog',
          description: 'Test description with special chars: @#$%',
          filePath: '.claude/prds/test-feature.md',
          fileName: 'test-feature.md'
        }],
        inProgress: [],
        implemented: [],
        summary: { totalPRDs: 1, backlogCount: 1, inProgressCount: 0, implementedCount: 0 }
      };

      const output = formatPRDList(sampleData);

      expect(output).toContain('📋 .claude/prds/test-feature.md - Test description with special chars: @#$%');
    });
  });

  describe('Integration Tests', () => {
    test('should handle real-world PRD structure', () => {
      fs.mkdirSync('.claude/prds', { recursive: true });

      // Create realistic PRD files
      fs.writeFileSync('.claude/prds/user-authentication.md', `---
name: User Authentication System
status: in-progress
description: Implement secure user authentication with JWT tokens
priority: high
---

# User Authentication System

## Overview
This PRD describes the implementation of a secure user authentication system.

## Requirements
- JWT token support
- Password hashing
- Session management`);

      fs.writeFileSync('.claude/prds/api-rate-limiting.md', `name: API Rate Limiting
status: backlog
description: Implement rate limiting for all API endpoints

# API Rate Limiting

To prevent abuse, we need to implement rate limiting.`);

      fs.writeFileSync('.claude/prds/user-profiles.md', `---
name: User Profiles
status: implemented
description: User profile management functionality
---`);

      const result = listPRDs();

      expect(result.summary.totalPRDs).toBe(3);
      expect(result.backlog).toHaveLength(1);
      expect(result.inProgress).toHaveLength(1);
      expect(result.implemented).toHaveLength(1);

      // Check specific PRD details
      const authPRD = result.inProgress.find(prd => prd.name === 'User Authentication System');
      expect(authPRD).toBeDefined();
      expect(authPRD.description).toBe('Implement secure user authentication with JWT tokens');

      const rateLimitPRD = result.backlog.find(prd => prd.name === 'API Rate Limiting');
      expect(rateLimitPRD).toBeDefined();
      expect(rateLimitPRD.description).toBe('Implement rate limiting for all API endpoints');
    });

    test('should handle mixed metadata formats consistently', () => {
      fs.mkdirSync('.claude/prds', { recursive: true });

      // YAML frontmatter
      fs.writeFileSync('.claude/prds/yaml-format.md', `---
name: YAML Feature
status: active
description: Feature with YAML frontmatter
---`);

      // Simple key-value format
      fs.writeFileSync('.claude/prds/simple-format.md', `name: Simple Feature
status: backlog
description: Feature with simple format

# Content starts here`);

      // No metadata (filename fallback)
      fs.writeFileSync('.claude/prds/no-metadata-feature.md', `# Just Content

No metadata in this file.`);

      const result = listPRDs();

      expect(result.summary.totalPRDs).toBe(3);

      const yamlPRD = result.inProgress.find(prd => prd.name === 'YAML Feature');
      expect(yamlPRD).toBeDefined();

      const simplePRD = result.backlog.find(prd => prd.name === 'Simple Feature');
      expect(simplePRD).toBeDefined();

      const noMetadataPRD = result.backlog.find(prd => prd.name === 'no-metadata-feature');
      expect(noMetadataPRD).toBeDefined();
      expect(noMetadataPRD.description).toBe('No description');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle corrupted or malformed files', () => {
      fs.mkdirSync('.claude/prds', { recursive: true });

      // Create files with various issues
      fs.writeFileSync('.claude/prds/binary-file.md', Buffer.from([0x00, 0x01, 0x02, 0x03]));
      fs.writeFileSync('.claude/prds/valid-file.md', 'name: Valid File\nstatus: backlog');

      expect(() => listPRDs()).not.toThrow();

      const result = listPRDs();
      // Should still process valid files
      expect(result.summary.totalPRDs).toBeGreaterThan(0);
    });

    test('should handle very large PRD files', () => {
      fs.mkdirSync('.claude/prds', { recursive: true });

      // Create a large file with metadata at the beginning
      const largeContent = 'name: Large Feature\nstatus: backlog\ndescription: Large file test\n\n' +
                          'x'.repeat(100000); // 100KB of content

      fs.writeFileSync('.claude/prds/large-file.md', largeContent);

      const result = listPRDs();

      expect(result.summary.totalPRDs).toBe(1);
      expect(result.backlog[0].name).toBe('Large Feature');
    });

    test('should handle special characters in filenames', () => {
      fs.mkdirSync('.claude/prds', { recursive: true });

      // Note: Some special chars might not be allowed on all filesystems
      fs.writeFileSync('.claude/prds/feature-with-spaces and-dashes.md', 'name: Special Chars\nstatus: backlog');

      const result = listPRDs();

      expect(result.summary.totalPRDs).toBe(1);
      expect(result.backlog[0].fileName).toBe('feature-with-spaces and-dashes.md');
    });

    test('should handle empty files', () => {
      fs.mkdirSync('.claude/prds', { recursive: true });

      fs.writeFileSync('.claude/prds/empty-file.md', '');

      const result = listPRDs();

      expect(result.summary.totalPRDs).toBe(1);
      expect(result.backlog[0].name).toBe('empty-file');
      expect(result.backlog[0].status).toBe('backlog');
      expect(result.backlog[0].description).toBe('No description');
    });
  });

  describe('Performance and Limits', () => {
    test('should handle many PRD files efficiently', () => {
      fs.mkdirSync('.claude/prds', { recursive: true });

      // Create 50 PRD files
      for (let i = 1; i <= 50; i++) {
        fs.writeFileSync(`.claude/prds/feature-${i}.md`, `name: Feature ${i}\nstatus: backlog\ndescription: Description ${i}`);
      }

      const startTime = Date.now();
      const result = listPRDs();
      const endTime = Date.now();

      expect(result.summary.totalPRDs).toBe(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
    });

    test('should handle concurrent access gracefully', () => {
      fs.mkdirSync('.claude/prds', { recursive: true });
      fs.writeFileSync('.claude/prds/test.md', 'name: Test\nstatus: backlog');

      // Run multiple listPRDs calls simultaneously
      const promises = Array(5).fill().map(() => Promise.resolve(listPRDs()));

      return Promise.all(promises).then(results => {
        expect(results).toHaveLength(5);
        results.forEach(result => {
          expect(result.summary.totalPRDs).toBe(1);
        });
      });
    });
  });

  describe('CLI Integration Simulation', () => {
    test('should work with CLI execution pattern', () => {
      fs.mkdirSync('.claude/prds', { recursive: true });
      fs.writeFileSync('.claude/prds/cli-test.md', 'name: CLI Test\nstatus: active');

      const data = listPRDs();
      const output = formatPRDList(data);

      expect(typeof output).toBe('string');
      expect(output.length).toBeGreaterThan(0);
      expect(output).toContain('PRD List');
    });

    test('should handle CLI execution without errors', () => {
      fs.mkdirSync('.claude/prds', { recursive: true });

      // Test the module structure that CLI expects
      const moduleExports = require('../../autopm/.claude/scripts/pm/prd-list.js');

      expect(typeof moduleExports.listPRDs).toBe('function');
      expect(typeof moduleExports.formatPRDList).toBe('function');
      expect(typeof moduleExports.parseMetadata).toBe('function');
      expect(typeof moduleExports.categorizeStatus).toBe('function');
    });
  });
});