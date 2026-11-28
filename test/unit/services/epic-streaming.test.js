/**
 * Tests for EpicService Streaming Methods
 *
 * Tests the streaming capabilities added to EpicService:
 * - decomposeStream() - Stream task decomposition
 * - analyzeStream() - Stream PRD analysis for epic breakdown
 */

const EpicService = require('../../../lib/services/EpicService');
const PRDService = require('../../../lib/services/PRDService');

describe('EpicService Streaming Methods', () => {
  let epicService;
  let prdService;
  let mockProvider;

  beforeEach(() => {
    // Create mock provider with stream() method
    mockProvider = {
      async *stream(prompt, options) {
        yield 'task1 ';
        yield 'task2 ';
        yield 'task3';
      }
    };

    prdService = new PRDService({ provider: mockProvider });
    epicService = new EpicService({ prdService, provider: mockProvider });
  });

  describe('decomposeStream()', () => {
    it('should throw error if provider is not available', async () => {
      const serviceWithoutProvider = new EpicService({ prdService });

      await expect(async () => {
        for await (const chunk of serviceWithoutProvider.decomposeStream('epic content')) {
          // Should not reach here
        }
      }).rejects.toThrow('Streaming requires an AI provider with stream() support');
    });

    it('should throw error if provider lacks stream() method', async () => {
      const serviceWithBadProvider = new EpicService({
        prdService,
        provider: {}
      });

      await expect(async () => {
        for await (const chunk of serviceWithBadProvider.decomposeStream('epic content')) {
          // Should not reach here
        }
      }).rejects.toThrow('Streaming requires an AI provider with stream() support');
    });

    it('should yield chunks from provider stream', async () => {
      const chunks = [];

      for await (const chunk of epicService.decomposeStream('epic content')) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['task1 ', 'task2 ', 'task3']);
    });

    it('should pass epic content in prompt to provider', async () => {
      const capturedPrompts = [];
      mockProvider.stream = async function*(prompt, options) {
        capturedPrompts.push(prompt);
        yield 'result';
      };

      for await (const chunk of epicService.decomposeStream('my epic content')) {
        // Consume stream
      }

      expect(capturedPrompts).toHaveLength(1);
      expect(capturedPrompts[0]).toContain('my epic content');
      expect(capturedPrompts[0]).toContain('Decompose this epic');
    });

    it('should request specific task attributes', async () => {
      const capturedPrompts = [];
      mockProvider.stream = async function*(prompt, options) {
        capturedPrompts.push(prompt);
        yield 'result';
      };

      for await (const chunk of epicService.decomposeStream('content')) {
        // Consume stream
      }

      const prompt = capturedPrompts[0];
      expect(prompt).toContain('Task ID');
      expect(prompt).toContain('Effort estimate');
      expect(prompt).toContain('Dependencies');
      expect(prompt).toContain('Acceptance criteria');
    });

    it('should request 5-15 tasks', async () => {
      const capturedPrompts = [];
      mockProvider.stream = async function*(prompt, options) {
        capturedPrompts.push(prompt);
        yield 'result';
      };

      for await (const chunk of epicService.decomposeStream('content')) {
        // Consume stream
      }

      expect(capturedPrompts[0]).toContain('5-15 tasks');
    });

    it('should pass options to provider stream', async () => {
      const capturedOptions = [];
      mockProvider.stream = async function*(prompt, options) {
        capturedOptions.push(options);
        yield 'result';
      };

      const streamOptions = { maxTokens: 2000, temperature: 0.7 };
      for await (const chunk of epicService.decomposeStream('content', streamOptions)) {
        // Consume stream
      }

      expect(capturedOptions).toHaveLength(1);
      expect(capturedOptions[0]).toEqual(streamOptions);
    });
  });

  describe('analyzeStream()', () => {
    it('should throw error if provider is not available', async () => {
      const serviceWithoutProvider = new EpicService({ prdService });

      await expect(async () => {
        for await (const chunk of serviceWithoutProvider.analyzeStream('prd content')) {
          // Should not reach here
        }
      }).rejects.toThrow('Streaming requires an AI provider with stream() support');
    });

    it('should throw error if provider lacks stream() method', async () => {
      const serviceWithBadProvider = new EpicService({
        prdService,
        provider: {}
      });

      await expect(async () => {
        for await (const chunk of serviceWithBadProvider.analyzeStream('prd content')) {
          // Should not reach here
        }
      }).rejects.toThrow('Streaming requires an AI provider with stream() support');
    });

    it('should yield chunks from provider stream', async () => {
      const chunks = [];

      for await (const chunk of epicService.analyzeStream('prd content')) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['task1 ', 'task2 ', 'task3']);
    });

    it('should pass PRD content in prompt to provider', async () => {
      const capturedPrompts = [];
      mockProvider.stream = async function*(prompt, options) {
        capturedPrompts.push(prompt);
        yield 'result';
      };

      for await (const chunk of epicService.analyzeStream('my PRD content')) {
        // Consume stream
      }

      expect(capturedPrompts).toHaveLength(1);
      expect(capturedPrompts[0]).toContain('my PRD content');
      expect(capturedPrompts[0]).toContain('epic-level breakdown');
    });

    it('should request identification of major themes', async () => {
      const capturedPrompts = [];
      mockProvider.stream = async function*(prompt, options) {
        capturedPrompts.push(prompt);
        yield 'result';
      };

      for await (const chunk of epicService.analyzeStream('content')) {
        // Consume stream
      }

      const prompt = capturedPrompts[0];
      expect(prompt).toContain('2-5 epics');
      expect(prompt).toContain('Epic name and scope');
      expect(prompt).toContain('complexity');
      expect(prompt).toContain('Dependencies');
    });

    it('should request project assessment', async () => {
      const capturedPrompts = [];
      mockProvider.stream = async function*(prompt, options) {
        capturedPrompts.push(prompt);
        yield 'result';
      };

      for await (const chunk of epicService.analyzeStream('content')) {
        // Consume stream
      }

      const prompt = capturedPrompts[0];
      expect(prompt).toContain('Overall project complexity');
      expect(prompt).toContain('epic breakdown approach');
      expect(prompt).toContain('technical risks');
      expect(prompt).toContain('development sequence');
    });

    it('should pass options to provider stream', async () => {
      const capturedOptions = [];
      mockProvider.stream = async function*(prompt, options) {
        capturedOptions.push(options);
        yield 'result';
      };

      const streamOptions = { maxTokens: 3000, temperature: 0.3 };
      for await (const chunk of epicService.analyzeStream('content', streamOptions)) {
        // Consume stream
      }

      expect(capturedOptions).toHaveLength(1);
      expect(capturedOptions[0]).toEqual(streamOptions);
    });
  });
});
