/**
 * Tests for PRDService Streaming Methods
 *
 * Tests the streaming capabilities added to PRDService:
 * - parseStream() - Stream PRD parsing with AI
 * - extractEpicsStream() - Stream epic extraction
 * - summarizeStream() - Stream summary generation
 */

const PRDService = require('../../../lib/services/PRDService');

describe('PRDService Streaming Methods', () => {
  let prdService;
  let mockProvider;

  beforeEach(() => {
    // Create mock provider with stream() method
    mockProvider = {
      async *stream(prompt, options) {
        yield 'chunk1 ';
        yield 'chunk2 ';
        yield 'chunk3';
      }
    };

    prdService = new PRDService({ provider: mockProvider });
  });

  describe('parseStream()', () => {
    it('should throw error if provider is not available', async () => {
      const serviceWithoutProvider = new PRDService();

      await expect(async () => {
        for await (const chunk of serviceWithoutProvider.parseStream('test content')) {
          // Should not reach here
        }
      }).rejects.toThrow('Streaming requires an AI provider with stream() support');
    });

    it('should throw error if provider lacks stream() method', async () => {
      const serviceWithBadProvider = new PRDService({ provider: {} });

      await expect(async () => {
        for await (const chunk of serviceWithBadProvider.parseStream('test content')) {
          // Should not reach here
        }
      }).rejects.toThrow('Streaming requires an AI provider with stream() support');
    });

    it('should yield chunks from provider stream', async () => {
      const chunks = [];

      for await (const chunk of prdService.parseStream('test content')) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['chunk1 ', 'chunk2 ', 'chunk3']);
    });

    it('should pass PRD content in prompt to provider', async () => {
      const capturedPrompts = [];
      mockProvider.stream = async function*(prompt, options) {
        capturedPrompts.push(prompt);
        yield 'result';
      };

      for await (const chunk of prdService.parseStream('my PRD content')) {
        // Consume stream
      }

      expect(capturedPrompts).toHaveLength(1);
      expect(capturedPrompts[0]).toContain('my PRD content');
      expect(capturedPrompts[0]).toContain('Product Requirements Document');
    });

    it('should pass options to provider stream', async () => {
      const capturedOptions = [];
      mockProvider.stream = async function*(prompt, options) {
        capturedOptions.push(options);
        yield 'result';
      };

      const streamOptions = { maxTokens: 1000, temperature: 0.5 };
      for await (const chunk of prdService.parseStream('content', streamOptions)) {
        // Consume stream
      }

      expect(capturedOptions).toHaveLength(1);
      expect(capturedOptions[0]).toEqual(streamOptions);
    });
  });

  describe('extractEpicsStream()', () => {
    it('should throw error if provider is not available', async () => {
      const serviceWithoutProvider = new PRDService();

      await expect(async () => {
        for await (const chunk of serviceWithoutProvider.extractEpicsStream('test content')) {
          // Should not reach here
        }
      }).rejects.toThrow('Streaming requires an AI provider with stream() support');
    });

    it('should throw error if provider lacks stream() method', async () => {
      const serviceWithBadProvider = new PRDService({ provider: {} });

      await expect(async () => {
        for await (const chunk of serviceWithBadProvider.extractEpicsStream('test content')) {
          // Should not reach here
        }
      }).rejects.toThrow('Streaming requires an AI provider with stream() support');
    });

    it('should yield chunks from provider stream', async () => {
      const chunks = [];

      for await (const chunk of prdService.extractEpicsStream('test content')) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['chunk1 ', 'chunk2 ', 'chunk3']);
    });

    it('should pass PRD content in prompt to provider', async () => {
      const capturedPrompts = [];
      mockProvider.stream = async function*(prompt, options) {
        capturedPrompts.push(prompt);
        yield 'result';
      };

      for await (const chunk of prdService.extractEpicsStream('my PRD content')) {
        // Consume stream
      }

      expect(capturedPrompts).toHaveLength(1);
      expect(capturedPrompts[0]).toContain('my PRD content');
      expect(capturedPrompts[0]).toContain('extract logical epics');
    });
  });

  describe('summarizeStream()', () => {
    it('should throw error if provider is not available', async () => {
      const serviceWithoutProvider = new PRDService();

      await expect(async () => {
        for await (const chunk of serviceWithoutProvider.summarizeStream('test content')) {
          // Should not reach here
        }
      }).rejects.toThrow('Streaming requires an AI provider with stream() support');
    });

    it('should throw error if provider lacks stream() method', async () => {
      const serviceWithBadProvider = new PRDService({ provider: {} });

      await expect(async () => {
        for await (const chunk of serviceWithBadProvider.summarizeStream('test content')) {
          // Should not reach here
        }
      }).rejects.toThrow('Streaming requires an AI provider with stream() support');
    });

    it('should yield chunks from provider stream', async () => {
      const chunks = [];

      for await (const chunk of prdService.summarizeStream('test content')) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['chunk1 ', 'chunk2 ', 'chunk3']);
    });

    it('should pass PRD content in prompt to provider', async () => {
      const capturedPrompts = [];
      mockProvider.stream = async function*(prompt, options) {
        capturedPrompts.push(prompt);
        yield 'result';
      };

      for await (const chunk of prdService.summarizeStream('my PRD content')) {
        // Consume stream
      }

      expect(capturedPrompts).toHaveLength(1);
      expect(capturedPrompts[0]).toContain('my PRD content');
      expect(capturedPrompts[0]).toContain('executive summary');
    });

    it('should request summary under 300 words', async () => {
      const capturedPrompts = [];
      mockProvider.stream = async function*(prompt, options) {
        capturedPrompts.push(prompt);
        yield 'result';
      };

      for await (const chunk of prdService.summarizeStream('content')) {
        // Consume stream
      }

      expect(capturedPrompts[0]).toContain('300 words');
    });
  });
});
