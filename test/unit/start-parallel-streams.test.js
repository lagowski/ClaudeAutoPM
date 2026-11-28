// Mock dependencies before importing
jest.mock('fs');
jest.mock('js-yaml');

const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');
const startParallelStreams = require('../../autopm/.claude/scripts/start-parallel-streams.js');

describe('Start Parallel Streams', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    process.exit = jest.fn();
    process.cwd = jest.fn().mockReturnValue('/test/project');
  });

  describe('startParallelStreams()', () => {
    it('should exit when analysis file does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      startParallelStreams('123');

      expect(console.error).toHaveBeenCalledWith('❌ Issue #123 not decomposed yet');
      expect(console.log).toHaveBeenCalledWith('Run: autopm decompose 123');
    });

    it('should process streams when analysis exists', () => {
      const analysisPath = '/test/project/.claude/epics/current/issue-123/123-analysis.md';
      const updatesPath = '/test/project/.claude/epics/current/issue-123/updates';

      fs.existsSync.mockImplementation(path => path === analysisPath);
      fs.readdirSync.mockReturnValue(['stream-1.md', 'stream-2.md', 'other-file.txt']);

      const streamContent = `---
stream: 1
name: Frontend Implementation
agent: frontend-developer
status: pending
dependencies: []
parameters:
  framework: react
---
# Stream 1 Content
Tasks to complete...`;

      fs.readFileSync.mockReturnValue(streamContent);
      yaml.load.mockReturnValue({
        stream: 1,
        name: 'Frontend Implementation',
        agent: 'frontend-developer',
        status: 'pending',
        dependencies: [],
        parameters: { framework: 'react' }
      });

      startParallelStreams('123');

      expect(fs.readdirSync).toHaveBeenCalledWith(updatesPath);
      expect(console.log).toHaveBeenCalledWith('\n🚀 Starting 2 parallel streams for issue #123\n');
      expect(console.log).toHaveBeenCalledWith('📋 Execution Plan:\n');
    });

    it('should separate streams with and without dependencies', () => {
      const analysisPath = '/test/project/.claude/epics/current/issue-123/123-analysis.md';

      fs.existsSync.mockImplementation(path => path === analysisPath);
      fs.readdirSync.mockReturnValue(['stream-1.md', 'stream-2.md']);

      const streamContent1 = `---
stream: 1
name: Frontend
agent: frontend-dev
status: pending
dependencies: []
---`;

      const streamContent2 = `---
stream: 2
name: Backend
agent: backend-dev
status: pending
dependencies: [1]
---`;

      fs.readFileSync
        .mockReturnValueOnce(streamContent1)
        .mockReturnValueOnce(streamContent2);

      yaml.load
        .mockReturnValueOnce({
          stream: 1,
          name: 'Frontend',
          agent: 'frontend-dev',
          status: 'pending',
          dependencies: []
        })
        .mockReturnValueOnce({
          stream: 2,
          name: 'Backend',
          agent: 'backend-dev',
          status: 'pending',
          dependencies: [1]
        });

      startParallelStreams('123');

      expect(console.log).toHaveBeenCalledWith('\n  Group 1 (can start immediately):');
      expect(console.log).toHaveBeenCalledWith('    • Stream A: Frontend');
      expect(console.log).toHaveBeenCalledWith('\n  Group 2 (waiting for dependencies):');
      expect(console.log).toHaveBeenCalledWith('    • Stream B: Backend');
    });

    it('should start streams with no dependencies', () => {
      const analysisPath = '/test/project/.claude/epics/current/issue-123/123-analysis.md';

      fs.existsSync.mockImplementation(path => path === analysisPath);
      fs.readdirSync.mockReturnValue(['stream-1.md']);

      const streamContent = `---
stream: 1
name: Independent Task
agent: developer
status: pending
dependencies: []
---`;

      fs.readFileSync.mockReturnValue(streamContent);
      yaml.load.mockReturnValue({
        stream: 1,
        name: 'Independent Task',
        agent: 'developer',
        status: 'pending',
        dependencies: []
      });

      startParallelStreams('123');

      expect(console.log).toHaveBeenCalledWith('✅ Stream A: Independent Task');
      expect(console.log).toHaveBeenCalledWith('   ➡️  Starting developer...');
    });

    it('should block streams with unmet dependencies', () => {
      const analysisPath = '/test/project/.claude/epics/current/issue-123/123-analysis.md';

      fs.existsSync.mockImplementation(path => path === analysisPath);
      fs.readdirSync.mockReturnValue(['stream-1.md']);

      const streamContent = `---
stream: 1
name: Dependent Task
agent: developer
status: pending
dependencies: [2, 3]
---`;

      fs.readFileSync.mockReturnValue(streamContent);
      yaml.load.mockReturnValue({
        stream: 1,
        name: 'Dependent Task',
        agent: 'developer',
        status: 'pending',
        dependencies: [2, 3]
      });

      startParallelStreams('123');

      expect(console.log).toHaveBeenCalledWith('⏸️  Stream A: Dependent Task');
      expect(console.log).toHaveBeenCalledWith('   ⚠️  Blocked - waiting for: 2, 3');
    });

    it('should handle streams in progress', () => {
      const analysisPath = '/test/project/.claude/epics/current/issue-123/123-analysis.md';

      fs.existsSync.mockImplementation(path => path === analysisPath);
      fs.readdirSync.mockReturnValue(['stream-1.md']);

      const streamContent = `---
stream: 1
name: Active Task
agent: developer
status: in_progress
dependencies: []
---`;

      fs.readFileSync.mockReturnValue(streamContent);
      yaml.load.mockReturnValue({
        stream: 1,
        name: 'Active Task',
        agent: 'developer',
        status: 'in_progress',
        dependencies: []
      });

      startParallelStreams('123');

      expect(console.log).toHaveBeenCalledWith('🔄 Stream A: Active Task');
      expect(console.log).toHaveBeenCalledWith('   Already in progress with developer');
    });

    it('should handle completed streams', () => {
      const analysisPath = '/test/project/.claude/epics/current/issue-123/123-analysis.md';

      fs.existsSync.mockImplementation(path => path === analysisPath);
      fs.readdirSync.mockReturnValue(['stream-1.md']);

      const streamContent = `---
stream: 1
name: Done Task
agent: developer
status: completed
dependencies: []
---`;

      fs.readFileSync.mockReturnValue(streamContent);
      yaml.load.mockReturnValue({
        stream: 1,
        name: 'Done Task',
        agent: 'developer',
        status: 'completed',
        dependencies: []
      });

      startParallelStreams('123');

      expect(console.log).toHaveBeenCalledWith('✓  Stream A: Done Task');
      expect(console.log).toHaveBeenCalledWith('   Already completed');
    });

    it('should display parameters when present', () => {
      const analysisPath = '/test/project/.claude/epics/current/issue-123/123-analysis.md';

      fs.existsSync.mockImplementation(path => path === analysisPath);
      fs.readdirSync.mockReturnValue(['stream-1.md']);

      const streamContent = `---
stream: 1
name: Task with Params
agent: developer
status: pending
dependencies: []
parameters:
  framework: react
  version: 18
---`;

      fs.readFileSync.mockReturnValue(streamContent);
      yaml.load.mockReturnValue({
        stream: 1,
        name: 'Task with Params',
        agent: 'developer',
        status: 'pending',
        dependencies: [],
        parameters: { framework: 'react', version: 18 }
      });

      startParallelStreams('123');

      expect(console.log).toHaveBeenCalledWith('      Parameters: {"framework":"react","version":18}');
    });

    it('should show next steps instructions', () => {
      const analysisPath = '/test/project/.claude/epics/current/issue-123/123-analysis.md';

      fs.existsSync.mockImplementation(path => path === analysisPath);
      fs.readdirSync.mockReturnValue(['stream-1.md']);

      fs.readFileSync.mockReturnValue('---\nstream: 1\nname: Task\nagent: dev\nstatus: pending\n---');
      yaml.load.mockReturnValue({
        stream: 1,
        name: 'Task',
        agent: 'dev',
        status: 'pending',
        dependencies: []
      });

      startParallelStreams('123');

      expect(console.log).toHaveBeenCalledWith('📊 Next Steps:\n');
      expect(console.log).toHaveBeenCalledWith('1. Monitor progress: autopm status 123');
      expect(console.log).toHaveBeenCalledWith('💡 Agents will update their stream files as they progress.');
    });

    it('should handle empty dependencies and parameters', () => {
      const analysisPath = '/test/project/.claude/epics/current/issue-123/123-analysis.md';

      fs.existsSync.mockImplementation(path => path === analysisPath);
      fs.readdirSync.mockReturnValue(['stream-1.md']);

      const streamContent = `---
stream: 1
name: Simple Task
agent: developer
status: pending
---`;

      fs.readFileSync.mockReturnValue(streamContent);
      yaml.load.mockReturnValue({
        stream: 1,
        name: 'Simple Task',
        agent: 'developer',
        status: 'pending'
      });

      startParallelStreams('123');

      expect(console.log).toHaveBeenCalledWith('✅ Stream A: Simple Task');
      expect(console.log).toHaveBeenCalledWith('   ➡️  Starting developer...');
    });

    it('should handle YAML parsing errors gracefully', () => {
      const analysisPath = '/test/project/.claude/epics/current/issue-123/123-analysis.md';

      fs.existsSync.mockImplementation(path => path === analysisPath);
      fs.readdirSync.mockReturnValue(['stream-1.md']);

      fs.readFileSync.mockReturnValue('invalid yaml content');
      yaml.load.mockImplementation(() => {
        throw new Error('YAML parsing error');
      });

      // Should not crash
      expect(() => startParallelStreams('123')).not.toThrow();
    });

    it('should call updateStreamStatus for starting streams', () => {
      const analysisPath = '/test/project/.claude/epics/current/issue-123/123-analysis.md';
      const streamPath = '/test/project/.claude/epics/current/issue-123/updates/stream-1.md';

      fs.existsSync.mockImplementation(path => path === analysisPath);
      fs.readdirSync.mockReturnValue(['stream-1.md']);

      const streamContent = `---
stream: 1
name: Starting Task
agent: developer
status: pending
dependencies: []
---`;

      fs.readFileSync.mockReturnValue(streamContent);
      fs.writeFileSync.mockImplementation(() => {});

      yaml.load.mockReturnValue({
        stream: 1,
        name: 'Starting Task',
        agent: 'developer',
        status: 'pending',
        dependencies: []
      });

      startParallelStreams('123');

      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('CLI interface', () => {
    it('should detect when no issue number provided', () => {
      // Test the function directly to avoid module caching issues
      startParallelStreams();

      // Since no issue number is provided, it should try to process undefined
      // and likely fail early or show error
      expect(console.error).toHaveBeenCalled();
    });

    it('should process issue number parameter correctly', () => {
      fs.existsSync.mockReturnValue(false);

      startParallelStreams('999');

      expect(console.error).toHaveBeenCalledWith('❌ Issue #999 not decomposed yet');
      expect(console.log).toHaveBeenCalledWith('Run: autopm decompose 999');
    });
  });

  describe('updateStreamStatus helper (via integration)', () => {
    it('should update status to in_progress correctly', () => {
      const analysisPath = '/test/project/.claude/epics/current/issue-123/123-analysis.md';

      fs.existsSync.mockImplementation(path => path === analysisPath);
      fs.readdirSync.mockReturnValue(['stream-1.md']);

      const originalContent = `---
stream: 1
name: Task
agent: developer
status: pending
started: null
---
Original content`;

      fs.readFileSync.mockReturnValue(originalContent);
      fs.writeFileSync.mockImplementation(() => {});

      yaml.load.mockReturnValue({
        stream: 1,
        name: 'Task',
        agent: 'developer',
        status: 'pending',
        dependencies: []
      });

      startParallelStreams('123');

      // Verify writeFileSync was called (indicating status update)
      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = fs.writeFileSync.mock.calls[0];
      const updatedContent = writeCall[1];

      expect(updatedContent).toContain('status: in_progress');
      expect(updatedContent).toMatch(/started: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(updatedContent).toContain('Status changed to: in_progress');
    });
  });

  describe('Stream processing functionality', () => {
    it('should process streams with parameters correctly', () => {
      const analysisPath = '/test/project/.claude/epics/current/issue-123/123-analysis.md';

      fs.existsSync.mockImplementation(path => path === analysisPath);
      fs.readdirSync.mockReturnValue(['stream-1.md']);

      fs.readFileSync.mockReturnValue('content');
      yaml.load.mockReturnValue({
        stream: 1,
        name: 'Task with Parameters',
        agent: 'developer',
        status: 'pending',
        dependencies: [],
        parameters: { framework: 'react' }
      });

      startParallelStreams('123');

      // Check that the execution starts
      expect(console.log).toHaveBeenCalledWith('\n🚀 Starting 1 parallel streams for issue #123\n');
      expect(console.log).toHaveBeenCalledWith('📋 Execution Plan:\n');
    });

    it('should process streams with dependencies correctly', () => {
      const analysisPath = '/test/project/.claude/epics/current/issue-123/123-analysis.md';

      fs.existsSync.mockImplementation(path => path === analysisPath);
      fs.readdirSync.mockReturnValue(['stream-1.md', 'stream-2.md']);

      fs.readFileSync
        .mockReturnValueOnce('content1')
        .mockReturnValueOnce('content2');

      yaml.load
        .mockReturnValueOnce({
          stream: 1,
          name: 'Independent Task',
          agent: 'dev1',
          status: 'completed',
          dependencies: []
        })
        .mockReturnValueOnce({
          stream: 2,
          name: 'Dependent Task',
          agent: 'dev2',
          status: 'pending',
          dependencies: [1]
        });

      startParallelStreams('123');

      // Check that multiple streams are processed
      expect(console.log).toHaveBeenCalledWith('\n🚀 Starting 2 parallel streams for issue #123\n');
      expect(console.log).toHaveBeenCalledWith('📋 Execution Plan:\n');
    });
  });

  describe('Integration tests', () => {
    it('should maintain backward compatibility', () => {
      const startParallelStreamsModule = require('../../autopm/.claude/scripts/start-parallel-streams.js');
      expect(typeof startParallelStreamsModule).toBe('function');
      expect(startParallelStreamsModule.name).toBe('startParallelStreams');
    });

    it('should handle realistic parallel execution scenario', () => {
      const analysisPath = '/test/project/.claude/epics/current/issue-456/456-analysis.md';

      fs.existsSync.mockImplementation(path => path === analysisPath);
      fs.readdirSync.mockReturnValue(['stream-frontend.md', 'stream-backend.md', 'stream-testing.md']);

      const frontendStream = `---
stream: frontend
name: React Component Development
agent: frontend-developer
status: pending
dependencies: []
parameters:
  component: UserProfile
  styling: tailwind
---`;

      const backendStream = `---
stream: backend
name: API Development
agent: backend-developer
status: pending
dependencies: []
parameters:
  endpoint: /api/users
  method: CRUD
---`;

      const testingStream = `---
stream: testing
name: Integration Testing
agent: qa-engineer
status: pending
dependencies: [frontend, backend]
parameters:
  framework: cypress
  coverage: 90
---`;

      fs.readFileSync
        .mockReturnValueOnce(frontendStream)
        .mockReturnValueOnce(backendStream)
        .mockReturnValueOnce(testingStream);

      yaml.load
        .mockReturnValueOnce({
          stream: 'frontend',
          name: 'React Component Development',
          agent: 'frontend-developer',
          status: 'pending',
          dependencies: [],
          parameters: { component: 'UserProfile', styling: 'tailwind' }
        })
        .mockReturnValueOnce({
          stream: 'backend',
          name: 'API Development',
          agent: 'backend-developer',
          status: 'pending',
          dependencies: [],
          parameters: { endpoint: '/api/users', method: 'CRUD' }
        })
        .mockReturnValueOnce({
          stream: 'testing',
          name: 'Integration Testing',
          agent: 'qa-engineer',
          status: 'pending',
          dependencies: ['frontend', 'backend'],
          parameters: { framework: 'cypress', coverage: 90 }
        });

      startParallelStreams('456');

      expect(console.log).toHaveBeenCalledWith('\n🚀 Starting 3 parallel streams for issue #456\n');

      // Check that the execution plan is shown
      expect(console.log).toHaveBeenCalledWith('📋 Execution Plan:\n');
      expect(console.log).toHaveBeenCalledWith('Parallel Groups:');
      expect(console.log).toHaveBeenCalledWith('\n  Group 1 (can start immediately):');
      expect(console.log).toHaveBeenCalledWith('\n  Group 2 (waiting for dependencies):');

      // Check that next steps are shown
      expect(console.log).toHaveBeenCalledWith('📊 Next Steps:\n');
    });
  });
});