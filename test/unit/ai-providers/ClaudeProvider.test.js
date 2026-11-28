/**
 * ClaudeProvider Unit Tests
 *
 * Test suite for ClaudeProvider extending AbstractAIProvider.
 * Following TDD - These tests are written BEFORE implementation.
 *
 * Test Coverage:
 * - Constructor (string and config object)
 * - Inheritance from AbstractAIProvider
 * - Abstract method implementations
 * - Capability detection
 * - Error handling and formatting
 * - Backward compatibility
 * - Options merging
 */

const ClaudeProvider = require('../../../lib/ai-providers/ClaudeProvider');
const AbstractAIProvider = require('../../../lib/ai-providers/AbstractAIProvider');
const AIProviderError = require('../../../lib/errors/AIProviderError');
const Anthropic = require('@anthropic-ai/sdk');

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk');

describe('ClaudeProvider', () => {
  let mockAnthropicClient;
  let mockCreate;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock Anthropic client methods
    mockCreate = jest.fn();
    mockAnthropicClient = {
      messages: {
        create: mockCreate
      }
    };

    // Mock Anthropic constructor
    Anthropic.mockImplementation(() => mockAnthropicClient);
  });

  // ============================================================
  // CONSTRUCTOR TESTS
  // ============================================================

  describe('Constructor', () => {
    describe('Backward Compatibility - String API Key', () => {
      test('should accept string API key (legacy signature)', () => {
        const provider = new ClaudeProvider('test-api-key');

        expect(provider).toBeInstanceOf(ClaudeProvider);
        expect(provider.apiKey).toBe('test-api-key');
      });

      test('should initialize Anthropic client with string API key', () => {
        new ClaudeProvider('test-api-key');

        expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
      });

      test('should throw error if string API key is empty', () => {
        expect(() => {
          new ClaudeProvider('');
        }).toThrow();
      });

      test('should throw error if API key is null', () => {
        expect(() => {
          new ClaudeProvider(null);
        }).toThrow();
      });

      test('should throw error if API key is undefined', () => {
        expect(() => {
          new ClaudeProvider();
        }).toThrow();
      });
    });

    describe('Enhanced - Config Object', () => {
      test('should accept config object with apiKey', () => {
        const provider = new ClaudeProvider({ apiKey: 'test-key' });

        expect(provider.apiKey).toBe('test-key');
      });

      test('should accept config with custom model', () => {
        const provider = new ClaudeProvider({
          apiKey: 'test-key',
          model: 'claude-3-opus'
        });

        expect(provider.model).toBe('claude-3-opus');
      });

      test('should accept config with custom temperature', () => {
        const provider = new ClaudeProvider({
          apiKey: 'test-key',
          temperature: 0.9
        });

        expect(provider.temperature).toBe(0.9);
      });

      test('should accept config with custom maxTokens', () => {
        const provider = new ClaudeProvider({
          apiKey: 'test-key',
          maxTokens: 8192
        });

        expect(provider.maxTokens).toBe(8192);
      });

      test('should accept config with all options', () => {
        const provider = new ClaudeProvider({
          apiKey: 'test-key',
          model: 'claude-3-opus',
          temperature: 0.5,
          maxTokens: 2048
        });

        expect(provider.apiKey).toBe('test-key');
        expect(provider.model).toBe('claude-3-opus');
        expect(provider.temperature).toBe(0.5);
        expect(provider.maxTokens).toBe(2048);
      });

      test('should use environment variable if apiKey not in config', () => {
        process.env.ANTHROPIC_API_KEY = 'env-key';

        const provider = new ClaudeProvider({});

        expect(provider.apiKey).toBe('env-key');

        delete process.env.ANTHROPIC_API_KEY;
      });

      test('should prefer config apiKey over environment variable', () => {
        process.env.ANTHROPIC_API_KEY = 'env-key';

        const provider = new ClaudeProvider({ apiKey: 'config-key' });

        expect(provider.apiKey).toBe('config-key');

        delete process.env.ANTHROPIC_API_KEY;
      });
    });

    describe('Anthropic Client Initialization', () => {
      test('should create Anthropic client with API key', () => {
        new ClaudeProvider('test-key');

        expect(Anthropic).toHaveBeenCalledTimes(1);
        expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'test-key' });
      });

      test('should store client instance', () => {
        const provider = new ClaudeProvider('test-key');

        expect(provider.client).toBe(mockAnthropicClient);
      });
    });
  });

  // ============================================================
  // INHERITANCE TESTS
  // ============================================================

  describe('Inheritance', () => {
    test('should extend AbstractAIProvider', () => {
      const provider = new ClaudeProvider('test-key');

      expect(provider).toBeInstanceOf(AbstractAIProvider);
    });

    test('should be instanceof ClaudeProvider', () => {
      const provider = new ClaudeProvider('test-key');

      expect(provider).toBeInstanceOf(ClaudeProvider);
    });

    test('should have inherited methods from AbstractAIProvider', () => {
      const provider = new ClaudeProvider('test-key');

      expect(typeof provider.getInfo).toBe('function');
      expect(typeof provider.getName).toBe('function');
      expect(typeof provider.validate).toBe('function');
      expect(typeof provider.testConnection).toBe('function');
      expect(typeof provider.generateWithRetry).toBe('function');
      expect(typeof provider.streamWithProgress).toBe('function');
    });

    test('should call parent constructor', () => {
      const provider = new ClaudeProvider({
        apiKey: 'test-key',
        model: 'custom-model'
      });

      expect(provider.config).toBeDefined();
      expect(provider.model).toBe('custom-model');
    });
  });

  // ============================================================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ============================================================

  describe('Abstract Method Implementations', () => {
    describe('getDefaultModel()', () => {
      test('should return Claude Sonnet 4 model', () => {
        const provider = new ClaudeProvider('test-key');

        expect(provider.getDefaultModel()).toBe('claude-sonnet-4-20250514');
      });

      test('should be used as default model in constructor', () => {
        const provider = new ClaudeProvider({ apiKey: 'test-key' });

        expect(provider.model).toBe('claude-sonnet-4-20250514');
      });
    });

    describe('getApiKeyEnvVar()', () => {
      test('should return ANTHROPIC_API_KEY', () => {
        const provider = new ClaudeProvider('test-key');

        expect(provider.getApiKeyEnvVar()).toBe('ANTHROPIC_API_KEY');
      });
    });

    describe('complete()', () => {
      test('should call Anthropic messages.create', async () => {
        mockCreate.mockResolvedValue({
          content: [{ text: 'Response text' }]
        });

        const provider = new ClaudeProvider('test-key');
        await provider.complete('Test prompt');

        expect(mockCreate).toHaveBeenCalledTimes(1);
      });

      test('should pass prompt to Anthropic API', async () => {
        mockCreate.mockResolvedValue({
          content: [{ text: 'Response' }]
        });

        const provider = new ClaudeProvider('test-key');
        await provider.complete('Test prompt');

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: [{ role: 'user', content: 'Test prompt' }]
          })
        );
      });

      test('should use merged options from parent', async () => {
        mockCreate.mockResolvedValue({
          content: [{ text: 'Response' }]
        });

        const provider = new ClaudeProvider({
          apiKey: 'test-key',
          model: 'custom-model',
          temperature: 0.8,
          maxTokens: 2048
        });

        await provider.complete('Test');

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            model: 'custom-model',
            temperature: 0.8,
            max_tokens: 2048
          })
        );
      });

      test('should allow method-level options to override instance config', async () => {
        mockCreate.mockResolvedValue({
          content: [{ text: 'Response' }]
        });

        const provider = new ClaudeProvider({
          apiKey: 'test-key',
          model: 'default-model'
        });

        await provider.complete('Test', { model: 'override-model' });

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            model: 'override-model'
          })
        );
      });

      test('should return text from response', async () => {
        mockCreate.mockResolvedValue({
          content: [{ text: 'Expected response text' }]
        });

        const provider = new ClaudeProvider('test-key');
        const result = await provider.complete('Test');

        expect(result).toBe('Expected response text');
      });

      test('should return empty string if no content', async () => {
        mockCreate.mockResolvedValue({
          content: []
        });

        const provider = new ClaudeProvider('test-key');
        const result = await provider.complete('Test');

        expect(result).toBe('');
      });

      test('should handle response without content property', async () => {
        mockCreate.mockResolvedValue({});

        const provider = new ClaudeProvider('test-key');
        const result = await provider.complete('Test');

        expect(result).toBe('');
      });

      test('should format errors using formatError()', async () => {
        const anthropicError = new Error('API Error');
        anthropicError.status = 401;

        mockCreate.mockRejectedValue(anthropicError);

        const provider = new ClaudeProvider('test-key');

        await expect(provider.complete('Test')).rejects.toThrow(AIProviderError);
      });
    });

    describe('stream()', () => {
      test('should create streaming request', async () => {
        const mockStream = {
          async *[Symbol.asyncIterator]() {
            yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'chunk1' } };
          }
        };

        mockCreate.mockResolvedValue(mockStream);

        const provider = new ClaudeProvider('test-key');
        const generator = provider.stream('Test prompt');

        // Consume generator
        for await (const chunk of generator) {
          // Should yield
        }

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            stream: true
          })
        );
      });

      test('should yield text deltas', async () => {
        const mockStream = {
          async *[Symbol.asyncIterator]() {
            yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'chunk1' } };
            yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'chunk2' } };
            yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'chunk3' } };
          }
        };

        mockCreate.mockResolvedValue(mockStream);

        const provider = new ClaudeProvider('test-key');
        const chunks = [];

        for await (const chunk of provider.stream('Test')) {
          chunks.push(chunk);
        }

        expect(chunks).toEqual(['chunk1', 'chunk2', 'chunk3']);
      });

      test('should skip non-text-delta events', async () => {
        const mockStream = {
          async *[Symbol.asyncIterator]() {
            yield { type: 'message_start' };
            yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'text' } };
            yield { type: 'content_block_stop' };
          }
        };

        mockCreate.mockResolvedValue(mockStream);

        const provider = new ClaudeProvider('test-key');
        const chunks = [];

        for await (const chunk of provider.stream('Test')) {
          chunks.push(chunk);
        }

        expect(chunks).toEqual(['text']);
      });

      test('should use merged options from parent', async () => {
        const mockStream = {
          async *[Symbol.asyncIterator]() {
            yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'chunk' } };
          }
        };

        mockCreate.mockResolvedValue(mockStream);

        const provider = new ClaudeProvider({
          apiKey: 'test-key',
          model: 'stream-model',
          maxTokens: 1024
        });

        const generator = provider.stream('Test');
        for await (const chunk of generator) {
          // Consume
        }

        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({
            model: 'stream-model',
            max_tokens: 1024,
            stream: true
          })
        );
      });

      test('should format streaming errors', async () => {
        const streamError = new Error('Stream error');
        streamError.status = 429;

        mockCreate.mockRejectedValue(streamError);

        const provider = new ClaudeProvider('test-key');

        await expect(async () => {
          for await (const chunk of provider.stream('Test')) {
            // Should not reach here
          }
        }).rejects.toThrow(AIProviderError);
      });
    });
  });

  // ============================================================
  // CAPABILITY DETECTION
  // ============================================================

  describe('Capability Detection', () => {
    test('supportsStreaming() should return true', () => {
      const provider = new ClaudeProvider('test-key');

      expect(provider.supportsStreaming()).toBe(true);
    });

    test('supportsFunctionCalling() should return true', () => {
      const provider = new ClaudeProvider('test-key');

      expect(provider.supportsFunctionCalling()).toBe(true);
    });

    test('supportsChat() should return true', () => {
      const provider = new ClaudeProvider('test-key');

      expect(provider.supportsChat()).toBe(true);
    });

    test('supportsVision() should return false', () => {
      const provider = new ClaudeProvider('test-key');

      expect(provider.supportsVision()).toBe(false);
    });

    test('getInfo() should include correct capabilities', () => {
      const provider = new ClaudeProvider('test-key');
      const info = provider.getInfo();

      expect(info.capabilities).toEqual({
        streaming: true,
        functionCalling: true,
        chat: true,
        vision: false
      });
    });
  });

  // ============================================================
  // ERROR HANDLING
  // ============================================================

  describe('Error Handling', () => {
    describe('formatError()', () => {
      test('should map 401 status to INVALID_API_KEY', async () => {
        const error = new Error('Invalid authentication');
        error.status = 401;

        mockCreate.mockRejectedValue(error);

        const provider = new ClaudeProvider('test-key');

        try {
          await provider.complete('Test');
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AIProviderError);
          expect(err.code).toBe(AIProviderError.INVALID_API_KEY);
          expect(err.httpStatus).toBe(401);
        }
      });

      test('should map 429 status to RATE_LIMIT', async () => {
        const error = new Error('Rate limit exceeded');
        error.status = 429;

        mockCreate.mockRejectedValue(error);

        const provider = new ClaudeProvider('test-key');

        try {
          await provider.complete('Test');
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AIProviderError);
          expect(err.code).toBe(AIProviderError.RATE_LIMIT);
          expect(err.httpStatus).toBe(429);
        }
      });

      test('should map 500+ status to SERVICE_UNAVAILABLE', async () => {
        const error = new Error('Server error');
        error.status = 503;

        mockCreate.mockRejectedValue(error);

        const provider = new ClaudeProvider('test-key');

        try {
          await provider.complete('Test');
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AIProviderError);
          expect(err.code).toBe(AIProviderError.SERVICE_UNAVAILABLE);
          expect(err.httpStatus).toBe(503);
        }
      });

      test('should handle errors without status code', async () => {
        const error = new Error('Generic error');

        mockCreate.mockRejectedValue(error);

        const provider = new ClaudeProvider('test-key');

        try {
          await provider.complete('Test');
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AIProviderError);
          expect(err.message).toContain('Generic error');
        }
      });

      test('should mark operational errors as operational', async () => {
        const error = new Error('Rate limit');
        error.status = 429;

        mockCreate.mockRejectedValue(error);

        const provider = new ClaudeProvider('test-key');

        try {
          await provider.complete('Test');
          fail('Should have thrown');
        } catch (err) {
          expect(err.isOperational).toBe(true);
        }
      });

      test('should return AIProviderError as-is if already formatted', async () => {
        const existingError = new AIProviderError(
          AIProviderError.INVALID_API_KEY,
          'Already formatted',
          true,
          401
        );

        mockCreate.mockRejectedValue(existingError);

        const provider = new ClaudeProvider('test-key');

        try {
          await provider.complete('Test');
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBe(existingError);
          expect(err.code).toBe(AIProviderError.INVALID_API_KEY);
          expect(err.message).toBe('Already formatted');
        }
      });

      test('should map 400 status to INVALID_REQUEST', async () => {
        const error = new Error('Invalid parameters');
        error.status = 400;

        mockCreate.mockRejectedValue(error);

        const provider = new ClaudeProvider('test-key');

        try {
          await provider.complete('Test');
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AIProviderError);
          expect(err.code).toBe(AIProviderError.INVALID_REQUEST);
          expect(err.httpStatus).toBe(400);
        }
      });

      test('should map 500 status to SERVICE_UNAVAILABLE', async () => {
        const error = new Error('Internal server error');
        error.status = 500;

        mockCreate.mockRejectedValue(error);

        const provider = new ClaudeProvider('test-key');

        try {
          await provider.complete('Test');
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AIProviderError);
          expect(err.code).toBe(AIProviderError.SERVICE_UNAVAILABLE);
          expect(err.httpStatus).toBe(500);
        }
      });

      test('should map 502 status to SERVICE_UNAVAILABLE', async () => {
        const error = new Error('Bad gateway');
        error.status = 502;

        mockCreate.mockRejectedValue(error);

        const provider = new ClaudeProvider('test-key');

        try {
          await provider.complete('Test');
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AIProviderError);
          expect(err.code).toBe(AIProviderError.SERVICE_UNAVAILABLE);
          expect(err.httpStatus).toBe(502);
        }
      });

      test('should map 504 status to SERVICE_UNAVAILABLE', async () => {
        const error = new Error('Gateway timeout');
        error.status = 504;

        mockCreate.mockRejectedValue(error);

        const provider = new ClaudeProvider('test-key');

        try {
          await provider.complete('Test');
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AIProviderError);
          expect(err.code).toBe(AIProviderError.SERVICE_UNAVAILABLE);
          expect(err.httpStatus).toBe(504);
        }
      });

      test('should handle unknown status codes', async () => {
        const error = new Error('Unknown error');
        error.status = 418; // I'm a teapot

        mockCreate.mockRejectedValue(error);

        const provider = new ClaudeProvider('test-key');

        try {
          await provider.complete('Test');
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AIProviderError);
          expect(err.code).toBe('UNKNOWN_ERROR');
          expect(err.httpStatus).toBe(418);
          expect(err.message).toContain('418');
        }
      });

      test('should detect API key errors in message', async () => {
        const error = new Error('Authentication failed: invalid API key');

        mockCreate.mockRejectedValue(error);

        const provider = new ClaudeProvider('test-key');

        try {
          await provider.complete('Test');
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AIProviderError);
          expect(err.code).toBe(AIProviderError.INVALID_API_KEY);
        }
      });

      test('should detect authentication errors in message', async () => {
        const error = new Error('Authentication required');

        mockCreate.mockRejectedValue(error);

        const provider = new ClaudeProvider('test-key');

        try {
          await provider.complete('Test');
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AIProviderError);
          expect(err.code).toBe(AIProviderError.INVALID_API_KEY);
        }
      });

      test('should detect rate limit errors in message', async () => {
        const error = new Error('Rate limit exceeded, please slow down');

        mockCreate.mockRejectedValue(error);

        const provider = new ClaudeProvider('test-key');

        try {
          await provider.complete('Test');
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AIProviderError);
          expect(err.code).toBe(AIProviderError.RATE_LIMIT);
        }
      });

      test('should detect network errors in message', async () => {
        const error = new Error('Network connection failed');

        mockCreate.mockRejectedValue(error);

        const provider = new ClaudeProvider('test-key');

        try {
          await provider.complete('Test');
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AIProviderError);
          expect(err.code).toBe(AIProviderError.NETWORK_ERROR);
        }
      });

      test('should detect connection errors in message', async () => {
        const error = new Error('Connection timeout');

        mockCreate.mockRejectedValue(error);

        const provider = new ClaudeProvider('test-key');

        try {
          await provider.complete('Test');
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AIProviderError);
          expect(err.code).toBe(AIProviderError.NETWORK_ERROR);
        }
      });

      test('should detect context length errors in message', async () => {
        const error = new Error('Context length exceeded maximum limit');

        mockCreate.mockRejectedValue(error);

        const provider = new ClaudeProvider('test-key');

        try {
          await provider.complete('Test');
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AIProviderError);
          expect(err.code).toBe(AIProviderError.CONTEXT_LENGTH_EXCEEDED);
        }
      });

      test('should detect "too long" context errors in message', async () => {
        const error = new Error('Prompt is too long for this model');

        mockCreate.mockRejectedValue(error);

        const provider = new ClaudeProvider('test-key');

        try {
          await provider.complete('Test');
          fail('Should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(AIProviderError);
          expect(err.code).toBe(AIProviderError.CONTEXT_LENGTH_EXCEEDED);
        }
      });
    });
  });

  // ============================================================
  // BACKWARD COMPATIBILITY
  // ============================================================

  describe('Backward Compatibility', () => {
    test('getModel() should still work (legacy method)', () => {
      const provider = new ClaudeProvider('test-key');

      expect(provider.getModel()).toBe('claude-sonnet-4-20250514');
    });

    test('getModel() should return default model', () => {
      const provider = new ClaudeProvider({
        apiKey: 'test-key',
        model: 'custom-model'
      });

      // getModel() returns the default, not instance model
      expect(provider.getModel()).toBe('claude-sonnet-4-20250514');
      expect(provider.model).toBe('custom-model');
    });

    test('testConnection() should work (inherited from parent)', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Response' }]
      });

      const provider = new ClaudeProvider('test-key');
      const result = await provider.testConnection();

      expect(result).toBe(true);
    });

    test('testConnection() should return false on error', async () => {
      mockCreate.mockRejectedValue(new Error('Connection failed'));

      const provider = new ClaudeProvider('test-key');
      const result = await provider.testConnection();

      expect(result).toBe(false);
    });

    test('complete() signature unchanged', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Response' }]
      });

      const provider = new ClaudeProvider('test-key');

      // Old usage should still work
      const result = await provider.complete('Test prompt', {
        model: 'claude-sonnet-4-20250514',
        maxTokens: 4096
      });

      expect(result).toBe('Response');
    });

    test('stream() signature unchanged', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'chunk' } };
        }
      };

      mockCreate.mockResolvedValue(mockStream);

      const provider = new ClaudeProvider('test-key');

      // Old usage should still work
      const chunks = [];
      for await (const chunk of provider.stream('Test', { maxTokens: 100 })) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // OPTIONS MERGING
  // ============================================================

  describe('Options Merging', () => {
    test('should use instance defaults when no method options', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Response' }]
      });

      const provider = new ClaudeProvider({
        apiKey: 'test-key',
        model: 'instance-model',
        temperature: 0.5,
        maxTokens: 2048
      });

      await provider.complete('Test');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'instance-model',
          temperature: 0.5,
          max_tokens: 2048
        })
      );
    });

    test('should allow method options to override instance config', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Response' }]
      });

      const provider = new ClaudeProvider({
        apiKey: 'test-key',
        model: 'instance-model',
        temperature: 0.5
      });

      await provider.complete('Test', {
        model: 'method-model',
        temperature: 0.9
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'method-model',
          temperature: 0.9
        })
      );
    });

    test('should partially override options', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Response' }]
      });

      const provider = new ClaudeProvider({
        apiKey: 'test-key',
        model: 'instance-model',
        temperature: 0.5,
        maxTokens: 2048
      });

      await provider.complete('Test', {
        temperature: 0.9
        // model and maxTokens should use instance defaults
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'instance-model',
          temperature: 0.9,
          max_tokens: 2048
        })
      );
    });
  });

  // ============================================================
  // ENHANCED FEATURES
  // ============================================================

  describe('Enhanced Chat Support', () => {
    test('should support chat() method with messages array', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Chat response' }]
      });

      const provider = new ClaudeProvider('test-key');

      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' }
      ];

      const result = await provider.chat(messages);

      expect(result).toBe('Chat response');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.any(Array)
        })
      );
    });

    test('should convert system role to user for Claude API', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Response' }]
      });

      const provider = new ClaudeProvider('test-key');

      const messages = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' }
      ];

      await provider.chat(messages);

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[0].role).toBe('user');
    });

    test('should return empty string if no content in chat response', async () => {
      mockCreate.mockResolvedValue({
        content: []
      });

      const provider = new ClaudeProvider('test-key');

      const messages = [{ role: 'user', content: 'Hello' }];
      const result = await provider.chat(messages);

      expect(result).toBe('');
    });

    test('should handle chat response without content property', async () => {
      mockCreate.mockResolvedValue({});

      const provider = new ClaudeProvider('test-key');

      const messages = [{ role: 'user', content: 'Hello' }];
      const result = await provider.chat(messages);

      expect(result).toBe('');
    });

    test('should format chat errors using formatError()', async () => {
      const error = new Error('Chat API error');
      error.status = 500;

      mockCreate.mockRejectedValue(error);

      const provider = new ClaudeProvider('test-key');

      const messages = [{ role: 'user', content: 'Hello' }];

      await expect(provider.chat(messages)).rejects.toThrow(AIProviderError);
    });
  });

  // ============================================================
  // INTEGRATION WITH PARENT CLASS
  // ============================================================

  describe('Integration with AbstractAIProvider', () => {
    test('should use parent validate() method', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Response' }]
      });

      const provider = new ClaudeProvider('test-key');
      const isValid = await provider.validate();

      expect(isValid).toBe(true);
      expect(mockCreate).toHaveBeenCalled();
    });

    test('should use parent generateWithRetry()', async () => {
      let callCount = 0;
      mockCreate.mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          const error = new Error('Temporary error');
          error.status = 429;
          throw error;
        }
        return { content: [{ text: 'Success' }] };
      });

      const provider = new ClaudeProvider('test-key');
      const result = await provider.generateWithRetry('Test', {}, 3);

      expect(result).toBe('Success');
      expect(callCount).toBe(2);
    });

    test('should use parent getName()', () => {
      const provider = new ClaudeProvider('test-key');

      expect(provider.getName()).toBe('ClaudeProvider');
    });

    test('should use parent getInfo()', () => {
      const provider = new ClaudeProvider({
        apiKey: 'test-key',
        model: 'test-model',
        temperature: 0.8
      });

      const info = provider.getInfo();

      expect(info.name).toBe('ClaudeProvider');
      expect(info.model).toBe('test-model');
      expect(info.temperature).toBe(0.8);
      expect(info.capabilities).toBeDefined();
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================

  describe('Edge Cases', () => {
    test('should handle null options in complete()', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Response' }]
      });

      const provider = new ClaudeProvider('test-key');
      const result = await provider.complete('Test', null);

      expect(result).toBe('Response');
    });

    test('should handle undefined options in complete()', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Response' }]
      });

      const provider = new ClaudeProvider('test-key');
      const result = await provider.complete('Test', undefined);

      expect(result).toBe('Response');
    });

    test('should handle empty prompt', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Response' }]
      });

      const provider = new ClaudeProvider('test-key');
      const result = await provider.complete('');

      expect(result).toBe('Response');
    });

    test('should handle very long prompts', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Response' }]
      });

      const provider = new ClaudeProvider('test-key');
      const longPrompt = 'a'.repeat(100000);

      await provider.complete(longPrompt);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: longPrompt }]
        })
      );
    });

    test('should handle temperature 0', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Response' }]
      });

      const provider = new ClaudeProvider({
        apiKey: 'test-key',
        temperature: 0
      });

      await provider.complete('Test');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0
        })
      );
    });

    test('should handle temperature 1', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Response' }]
      });

      const provider = new ClaudeProvider({
        apiKey: 'test-key',
        temperature: 1
      });

      await provider.complete('Test');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 1
        })
      );
    });
  });

  // ============================================================
  // RATE LIMITING
  // ============================================================

  describe('Rate Limiting', () => {
    test('should work without rate limit configuration', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Response' }]
      });

      const provider = new ClaudeProvider({
        apiKey: 'test-key'
      });

      expect(provider.rateLimiter).toBeNull();

      const result = await provider.complete('Test');
      expect(result).toBe('Response');
    });

    test('should initialize rate limiter when configured', () => {
      const provider = new ClaudeProvider({
        apiKey: 'test-key',
        rateLimit: {
          tokensPerInterval: 50,
          interval: 'minute'
        }
      });

      expect(provider.rateLimiter).toBeDefined();
      expect(provider.rateLimiter).not.toBeNull();
    });

    test('should apply rate limiting to complete()', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Response' }]
      });

      const provider = new ClaudeProvider({
        apiKey: 'test-key',
        rateLimit: {
          tokensPerInterval: 2,
          interval: 100
        }
      });

      // Check that rate limiter is initialized
      expect(provider.rateLimiter).not.toBeNull();
      expect(provider.rateLimiter.getTokensRemaining()).toBe(2);

      // Make 2 rapid requests to exhaust tokens
      for (let i = 0; i < 2; i++) {
        await provider.complete('Test');
      }

      // Tokens should be exhausted
      expect(provider.rateLimiter.getTokensRemaining()).toBeCloseTo(0, 0); // refill drift between calls

      // Next request should wait for refill
      const startTime = Date.now();
      await provider.complete('Test');
      const elapsed = Date.now() - startTime;

      // Should have waited for at least one refill (half interval for 1 token)
      expect(elapsed).toBeGreaterThanOrEqual(45);
    });

    test('should apply rate limiting to stream()', async () => {
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'chunk' } };
        }
      };

      mockCreate.mockResolvedValue(mockStream);

      const provider = new ClaudeProvider({
        apiKey: 'test-key',
        rateLimit: {
          tokensPerInterval: 2,
          interval: 100
        }
      });

      // Check that rate limiter is initialized
      expect(provider.rateLimiter).not.toBeNull();
      expect(provider.rateLimiter.getTokensRemaining()).toBe(2);

      // Make 2 rapid stream requests to exhaust tokens
      for (let i = 0; i < 2; i++) {
        const generator = provider.stream('Test');
        for await (const chunk of generator) {
          // Consume
        }
      }

      // Tokens should be exhausted
      expect(provider.rateLimiter.getTokensRemaining()).toBeCloseTo(0, 0); // refill drift between calls

      // Next request should wait for refill
      const startTime = Date.now();
      const generator = provider.stream('Test');
      for await (const chunk of generator) {
        // Consume
      }
      const elapsed = Date.now() - startTime;

      // Should have waited for rate limit
      expect(elapsed).toBeGreaterThanOrEqual(45);
    });

    test('should apply rate limiting to chat()', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Response' }]
      });

      const provider = new ClaudeProvider({
        apiKey: 'test-key',
        rateLimit: {
          tokensPerInterval: 2,
          interval: 100
        }
      });

      const messages = [{ role: 'user', content: 'Hello' }];

      // Check that rate limiter is initialized
      expect(provider.rateLimiter).not.toBeNull();
      expect(provider.rateLimiter.getTokensRemaining()).toBe(2);

      // Make 2 rapid chat requests to exhaust tokens
      for (let i = 0; i < 2; i++) {
        await provider.chat(messages);
      }

      // Tokens should be exhausted
      expect(provider.rateLimiter.getTokensRemaining()).toBeCloseTo(0, 0); // refill drift between calls

      // Next request should wait for refill
      const startTime = Date.now();
      await provider.chat(messages);
      const elapsed = Date.now() - startTime;

      // Should have waited for rate limit
      expect(elapsed).toBeGreaterThanOrEqual(45);
    });

    test('should support fireImmediately mode', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Response' }]
      });

      const provider = new ClaudeProvider({
        apiKey: 'test-key',
        rateLimit: {
          tokensPerInterval: 5,
          interval: 1000,
          fireImmediately: true
        }
      });

      // Make 5 requests to exhaust limit
      for (let i = 0; i < 5; i++) {
        await provider.complete('Test');
      }

      // Next requests should still work (go negative)
      const startTime = Date.now();
      await provider.complete('Test');
      const elapsed = Date.now() - startTime;

      // Should NOT wait in fireImmediately mode
      expect(elapsed).toBeLessThan(50);
    });

    test('should support burst configuration', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Response' }]
      });

      const provider = new ClaudeProvider({
        apiKey: 'test-key',
        rateLimit: {
          tokensPerInterval: 10,
          interval: 100,
          bucketSize: 20  // Allow burst
        }
      });

      // Should allow burst of 20 requests immediately
      const startTime = Date.now();
      for (let i = 0; i < 20; i++) {
        await provider.complete('Test');
      }
      const elapsed = Date.now() - startTime;

      // All 20 should complete quickly (no waiting)
      expect(elapsed).toBeLessThan(50);
    });

    test('should respect different rate limits per instance', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Response' }]
      });

      const provider1 = new ClaudeProvider({
        apiKey: 'test-key',
        rateLimit: {
          tokensPerInterval: 10,
          interval: 1000
        }
      });

      const provider2 = new ClaudeProvider({
        apiKey: 'test-key',
        rateLimit: {
          tokensPerInterval: 50,
          interval: 1000
        }
      });

      // Each provider should have its own rate limiter
      expect(provider1.rateLimiter).not.toBe(provider2.rateLimiter);

      // Provider 1 should be limited after 10 requests
      for (let i = 0; i < 10; i++) {
        await provider1.complete('Test');
      }

      // Provider 2 should still have tokens available
      expect(provider2.rateLimiter.getTokensRemaining()).toBe(50);
    });

    test('should handle rate limiting with retries', async () => {
      mockCreate.mockResolvedValue({
        content: [{ text: 'Response' }]
      });

      const provider = new ClaudeProvider({
        apiKey: 'test-key',
        rateLimit: {
          tokensPerInterval: 5,
          interval: 100
        }
      });

      // Rate limiter should work with generateWithRetry
      const result = await provider.generateWithRetry('Test', {}, 3);
      expect(result).toBe('Response');
    });
  });
});
