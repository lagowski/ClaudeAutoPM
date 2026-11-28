/**
 * AbstractAIProvider Tests (Jest)
 *
 * Following TDD methodology - Tests written FIRST
 * Test Pattern: AAA (Arrange, Act, Assert)
 * Coverage Goal: 100% of abstract base class functionality
 */

const AbstractAIProvider = require('../../../lib/ai-providers/AbstractAIProvider');
const AIProviderError = require('../../../lib/errors/AIProviderError');

// Test implementation for testing abstract class
class TestProvider extends AbstractAIProvider {
  constructor(config) {
    super(config);
  }

  async complete(prompt, options = {}) {
    return `Response to: ${prompt}`;
  }

  async *stream(prompt, options = {}) {
    yield 'chunk1';
    yield 'chunk2';
  }

  getDefaultModel() {
    return 'test-model-v1';
  }

  getApiKeyEnvVar() {
    return 'TEST_API_KEY';
  }
}

// Test implementation that doesn't implement abstract methods
// Provides stubs for constructor but leaves methods unimplemented
class IncompleteProvider extends AbstractAIProvider {
  constructor(config) {
    super(config);
  }

  // Stub implementations for constructor to work
  getDefaultModel() {
    return 'incomplete-model';
  }

  getApiKeyEnvVar() {
    return 'INCOMPLETE_API_KEY';
  }

  // Note: complete() and stream() are intentionally NOT implemented
}

describe('AbstractAIProvider', () => {
  beforeEach(() => {
    // Clear environment variables
    delete process.env.TEST_API_KEY;
    delete process.env.CUSTOM_KEY;
  });

  describe('Abstract Class Enforcement', () => {
    test('Should throw error when instantiated directly', () => {
      // Arrange & Act
      const instantiateAbstract = () => new AbstractAIProvider({});

      // Assert
      expect(instantiateAbstract).toThrow('Cannot instantiate abstract class');
    });

    test('Should allow instantiation of subclass', () => {
      // Arrange & Act
      const provider = new TestProvider({ apiKey: 'test-key' });

      // Assert
      expect(provider).toBeInstanceOf(AbstractAIProvider);
      expect(provider).toBeInstanceOf(TestProvider);
    });
  });

  describe('Constructor - Config Object', () => {
    test('Should initialize with config object', () => {
      // Arrange & Act
      const provider = new TestProvider({
        apiKey: 'test-key',
        model: 'custom-model',
        maxTokens: 2048,
        temperature: 0.5
      });

      // Assert
      expect(provider.apiKey).toBe('test-key');
      expect(provider.model).toBe('custom-model');
      expect(provider.maxTokens).toBe(2048);
      expect(provider.temperature).toBe(0.5);
    });

    test('Should use defaults when config is empty', () => {
      // Arrange
      process.env.TEST_API_KEY = 'env-key';

      // Act
      const provider = new TestProvider({});

      // Assert
      expect(provider.apiKey).toBe('env-key');
      expect(provider.model).toBe('test-model-v1');
      expect(provider.maxTokens).toBe(4096);
      expect(provider.temperature).toBe(0.7);
    });

    test('Should read apiKey from environment variable', () => {
      // Arrange
      process.env.TEST_API_KEY = 'env-api-key';

      // Act
      const provider = new TestProvider({});

      // Assert
      expect(provider.apiKey).toBe('env-api-key');
    });

    test('Should prefer config apiKey over environment variable', () => {
      // Arrange
      process.env.TEST_API_KEY = 'env-key';

      // Act
      const provider = new TestProvider({ apiKey: 'config-key' });

      // Assert
      expect(provider.apiKey).toBe('config-key');
    });

    test('Should handle undefined config', () => {
      // Arrange
      process.env.TEST_API_KEY = 'env-key';

      // Act
      const provider = new TestProvider();

      // Assert
      expect(provider.apiKey).toBe('env-key');
      expect(provider.config).toEqual({});
    });
  });

  describe('Constructor - Backward Compatibility (String API Key)', () => {
    test('Should accept string as first parameter (backward compatible)', () => {
      // Arrange & Act
      const provider = new TestProvider('simple-api-key');

      // Assert
      expect(provider.apiKey).toBe('simple-api-key');
    });

    test('Should use defaults when only API key string provided', () => {
      // Arrange & Act
      const provider = new TestProvider('simple-key');

      // Assert
      expect(provider.apiKey).toBe('simple-key');
      expect(provider.model).toBe('test-model-v1');
      expect(provider.maxTokens).toBe(4096);
      expect(provider.temperature).toBe(0.7);
    });
  });

  describe('Abstract Method Enforcement', () => {
    test('Should throw error if complete() not implemented', async () => {
      // Arrange
      const provider = new IncompleteProvider({ apiKey: 'test' });

      // Act & Assert
      await expect(provider.complete('test')).rejects.toThrow('must implement complete()');
    });

    test('Should throw error if stream() not implemented', async () => {
      // Arrange
      const provider = new IncompleteProvider({ apiKey: 'test' });

      // Act & Assert
      await expect(async () => {
        for await (const chunk of provider.stream('test')) {
          // Should not reach here
        }
      }).rejects.toThrow('must implement stream()');
    });

    test('Should throw error if getDefaultModel() not implemented', () => {
      // Arrange
      class TrulyIncompleteProvider extends AbstractAIProvider {
        constructor(config) {
          // Can't call super() without getDefaultModel() working
          // This test validates that getDefaultModel() is called during construction
          try {
            super(config);
          } catch (e) {
            throw e;
          }
        }
        getApiKeyEnvVar() { return 'KEY'; }
      }

      // Act & Assert
      expect(() => new TrulyIncompleteProvider({ apiKey: 'test' })).toThrow('must implement getDefaultModel()');
    });

    test('Should throw error if getApiKeyEnvVar() not implemented', () => {
      // Arrange
      class TrulyIncompleteProvider extends AbstractAIProvider {
        constructor(config) {
          // Can't call super() without getApiKeyEnvVar() working
          // This test validates that getApiKeyEnvVar() is called during construction
          try {
            super(config);
          } catch (e) {
            throw e;
          }
        }
        getDefaultModel() { return 'model'; }
      }

      // Act & Assert
      expect(() => new TrulyIncompleteProvider({})).toThrow('must implement getApiKeyEnvVar()');
    });
  });

  describe('Template Method Defaults', () => {
    test('getMaxTokens() should return default 4096', () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });

      // Act
      const maxTokens = provider.getMaxTokens();

      // Assert
      expect(maxTokens).toBe(4096);
    });

    test('getDefaultTemperature() should return default 0.7', () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });

      // Act
      const temperature = provider.getDefaultTemperature();

      // Assert
      expect(temperature).toBe(0.7);
    });

    test('formatError() should wrap errors in AIProviderError', () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });
      const originalError = new Error('Original error');

      // Act
      const formatted = provider.formatError(originalError);

      // Assert
      expect(formatted).toBeInstanceOf(AIProviderError);
      expect(formatted.code).toBe('UNKNOWN_ERROR');
      expect(formatted.message).toContain('Original error');
    });

    test('formatError() should preserve AIProviderError as-is', () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });
      const originalError = new AIProviderError('RATE_LIMIT', 'Too many requests');

      // Act
      const formatted = provider.formatError(originalError);

      // Assert
      expect(formatted).toBe(originalError);
      expect(formatted.code).toBe('RATE_LIMIT');
    });
  });

  describe('Capability Detection', () => {
    test('supportsStreaming() should default to false', () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });

      // Act & Assert
      expect(provider.supportsStreaming()).toBe(false);
    });

    test('supportsFunctionCalling() should default to false', () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });

      // Act & Assert
      expect(provider.supportsFunctionCalling()).toBe(false);
    });

    test('supportsChat() should default to false', () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });

      // Act & Assert
      expect(provider.supportsChat()).toBe(false);
    });

    test('supportsVision() should default to false', () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });

      // Act & Assert
      expect(provider.supportsVision()).toBe(false);
    });

    test('Should allow overriding capability methods', () => {
      // Arrange
      class StreamingProvider extends TestProvider {
        supportsStreaming() {
          return true;
        }
      }
      const provider = new StreamingProvider({ apiKey: 'test' });

      // Act & Assert
      expect(provider.supportsStreaming()).toBe(true);
    });
  });

  describe('getName()', () => {
    test('Should extract name from class name', () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });

      // Act
      const name = provider.getName();

      // Assert
      expect(name).toBe('TestProvider');
    });

    test('Should work with different class names', () => {
      // Arrange
      class CustomAIProvider extends AbstractAIProvider {
        constructor(config) {
          super(config);
        }
        async complete() { return 'test'; }
        async *stream() { yield 'test'; }
        getDefaultModel() { return 'model'; }
        getApiKeyEnvVar() { return 'KEY'; }
      }
      const provider = new CustomAIProvider({ apiKey: 'test' });

      // Act
      const name = provider.getName();

      // Assert
      expect(name).toBe('CustomAIProvider');
    });
  });

  describe('getInfo()', () => {
    test('Should return provider metadata', () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test', model: 'custom-model' });

      // Act
      const info = provider.getInfo();

      // Assert
      expect(info).toHaveProperty('name', 'TestProvider');
      expect(info).toHaveProperty('model', 'custom-model');
      expect(info).toHaveProperty('capabilities');
      expect(info.capabilities).toHaveProperty('streaming', false);
      expect(info.capabilities).toHaveProperty('functionCalling', false);
      expect(info.capabilities).toHaveProperty('chat', false);
      expect(info.capabilities).toHaveProperty('vision', false);
    });

    test('Should include all configured options', () => {
      // Arrange
      const provider = new TestProvider({
        apiKey: 'test',
        model: 'gpt-4',
        maxTokens: 2048,
        temperature: 0.9
      });

      // Act
      const info = provider.getInfo();

      // Assert
      expect(info.model).toBe('gpt-4');
      expect(info.maxTokens).toBe(2048);
      expect(info.temperature).toBe(0.9);
    });
  });

  describe('validate()', () => {
    test('Should test connection by calling complete()', async () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });
      const completeSpy = jest.spyOn(provider, 'complete');

      // Act
      const result = await provider.validate();

      // Assert
      expect(completeSpy).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('Should return false if complete() fails', async () => {
      // Arrange
      class FailingProvider extends TestProvider {
        async complete() {
          throw new Error('Connection failed');
        }
      }
      const provider = new FailingProvider({ apiKey: 'test' });

      // Act
      const result = await provider.validate();

      // Assert
      expect(result).toBe(false);
    });

    test('Should return true if complete() succeeds', async () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });

      // Act
      const result = await provider.validate();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('testConnection()', () => {
    test('Should alias validate()', async () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });
      const validateSpy = jest.spyOn(provider, 'validate');

      // Act
      await provider.testConnection();

      // Assert
      expect(validateSpy).toHaveBeenCalled();
    });

    test('Should return same result as validate()', async () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });

      // Act
      const validateResult = await provider.validate();
      const testResult = await provider.testConnection();

      // Assert
      expect(testResult).toBe(validateResult);
    });
  });

  describe('chat()', () => {
    test('Should convert messages to prompt and call complete()', async () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
        { role: 'user', content: 'How are you?' }
      ];
      const completeSpy = jest.spyOn(provider, 'complete');

      // Act
      await provider.chat(messages);

      // Assert
      expect(completeSpy).toHaveBeenCalled();
      const calledPrompt = completeSpy.mock.calls[0][0];
      expect(calledPrompt).toContain('User: Hello');
      expect(calledPrompt).toContain('Assistant: Hi there');
      expect(calledPrompt).toContain('User: How are you?');
    });

    test('Should pass options to complete()', async () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });
      const messages = [{ role: 'user', content: 'test' }];
      const options = { temperature: 0.5 };
      const completeSpy = jest.spyOn(provider, 'complete');

      // Act
      await provider.chat(messages, options);

      // Assert
      expect(completeSpy).toHaveBeenCalledWith(expect.any(String), options);
    });

    test('Should handle empty messages array', async () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });

      // Act
      const result = await provider.chat([]);

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('generateWithRetry()', () => {
    test('Should return result on first success', async () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });

      // Act
      const result = await provider.generateWithRetry('test prompt', {}, 3);

      // Assert
      expect(result).toBe('Response to: test prompt');
    });

    test('Should retry on failure', async () => {
      // Arrange
      let attempts = 0;
      class RetryProvider extends TestProvider {
        async complete(prompt) {
          attempts++;
          if (attempts < 3) {
            throw new AIProviderError('RATE_LIMIT', 'Rate limited');
          }
          return 'Success';
        }
      }
      const provider = new RetryProvider({ apiKey: 'test' });

      // Act
      const result = await provider.generateWithRetry('test', {}, 5);

      // Assert
      expect(result).toBe('Success');
      expect(attempts).toBe(3);
    });

    test('Should throw after max retries exceeded', async () => {
      // Arrange
      class AlwaysFailProvider extends TestProvider {
        async complete() {
          throw new AIProviderError('SERVICE_UNAVAILABLE', 'Service down');
        }
      }
      const provider = new AlwaysFailProvider({ apiKey: 'test' });

      // Act & Assert
      await expect(provider.generateWithRetry('test', {}, 3)).rejects.toThrow('Service down');
    });

    test('Should wait between retries', async () => {
      // Arrange
      const delays = [];
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((fn, delay) => {
        delays.push(delay);
        return originalSetTimeout(fn, 0);
      });

      let attempts = 0;
      class DelayProvider extends TestProvider {
        async complete() {
          attempts++;
          if (attempts < 2) {
            throw new Error('Fail');
          }
          return 'Success';
        }
      }
      const provider = new DelayProvider({ apiKey: 'test' });

      // Act
      await provider.generateWithRetry('test', {}, 3);

      // Assert
      expect(delays.length).toBeGreaterThan(0);

      // Cleanup
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('generateWithRetry() - Enhanced Configuration', () => {
    // Helper to capture setTimeout calls
    function captureDelays(fn) {
      const delays = [];
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0);
      });

      return {
        execute: async () => {
          try {
            await fn();
          } finally {
            global.setTimeout = originalSetTimeout;
          }
        },
        getDelays: () => delays
      };
    }

    test('Should support config object parameter', async () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });

      // Act
      const result = await provider.generateWithRetry('test', {}, {
        maxAttempts: 3,
        startingDelay: 100
      });

      // Assert
      expect(result).toBe('Response to: test');
    });

    test('Should maintain backward compatibility with number parameter', async () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });

      // Act
      const result = await provider.generateWithRetry('test', {}, 5);

      // Assert
      expect(result).toBe('Response to: test');
    });

    test('Should use exponential backoff with default config', async () => {
      // Arrange
      let attempts = 0;
      class FailProvider extends TestProvider {
        async complete() {
          attempts++;
          if (attempts <= 3) {
            throw new AIProviderError('RATE_LIMIT', 'Rate limit');
          }
          return 'Success';
        }
      }
      const provider = new FailProvider({ apiKey: 'test' });

      const capture = captureDelays(async () => {
        await provider.generateWithRetry('test', {}, {
          maxAttempts: 5,
          startingDelay: 100,
          timeMultiple: 2,
          jitter: 'none'
        });
      });

      // Act
      await capture.execute();
      const delays = capture.getDelays();

      // Assert - Exponential: 100ms, 200ms, 400ms
      expect(delays.length).toBe(3);
      expect(delays[0]).toBe(100);
      expect(delays[1]).toBe(200);
      expect(delays[2]).toBe(400);
    });

    test('Should cap delay at maxDelay', async () => {
      // Arrange
      let attempts = 0;
      class FailProvider extends TestProvider {
        async complete() {
          attempts++;
          if (attempts <= 5) {
            throw new AIProviderError('RATE_LIMIT', 'Rate limit');
          }
          return 'Success';
        }
      }
      const provider = new FailProvider({ apiKey: 'test' });

      const capture = captureDelays(async () => {
        await provider.generateWithRetry('test', {}, {
          maxAttempts: 7,
          startingDelay: 100,
          timeMultiple: 2,
          maxDelay: 500,
          jitter: 'none'
        });
      });

      // Act
      await capture.execute();
      const delays = capture.getDelays();

      // Assert - Should cap at 500ms: 100, 200, 400, 500, 500
      expect(delays.length).toBe(5);
      expect(delays[0]).toBe(100);
      expect(delays[1]).toBe(200);
      expect(delays[2]).toBe(400);
      expect(delays[3]).toBe(500); // Capped
      expect(delays[4]).toBe(500); // Capped
    });

    test('Should apply full jitter', async () => {
      // Arrange
      let attempts = 0;
      class FailProvider extends TestProvider {
        async complete() {
          attempts++;
          if (attempts <= 3) {
            throw new AIProviderError('RATE_LIMIT', 'Rate limit');
          }
          return 'Success';
        }
      }
      const provider = new FailProvider({ apiKey: 'test' });

      const capture = captureDelays(async () => {
        await provider.generateWithRetry('test', {}, {
          maxAttempts: 5,
          startingDelay: 100,
          timeMultiple: 2,
          jitter: 'full'
        });
      });

      // Act
      await capture.execute();
      const delays = capture.getDelays();

      // Assert - Full jitter: random between 0 and calculated delay
      expect(delays.length).toBe(3);
      expect(delays[0]).toBeGreaterThanOrEqual(0);
      expect(delays[0]).toBeLessThanOrEqual(100);
      expect(delays[1]).toBeGreaterThanOrEqual(0);
      expect(delays[1]).toBeLessThanOrEqual(200);
      expect(delays[2]).toBeGreaterThanOrEqual(0);
      expect(delays[2]).toBeLessThanOrEqual(400);
    });

    test('Should apply equal jitter', async () => {
      // Arrange
      let attempts = 0;
      class FailProvider extends TestProvider {
        async complete() {
          attempts++;
          if (attempts <= 2) {
            throw new AIProviderError('RATE_LIMIT', 'Rate limit');
          }
          return 'Success';
        }
      }
      const provider = new FailProvider({ apiKey: 'test' });

      const capture = captureDelays(async () => {
        await provider.generateWithRetry('test', {}, {
          maxAttempts: 5,
          startingDelay: 100,
          timeMultiple: 2,
          jitter: 'equal'
        });
      });

      // Act
      await capture.execute();
      const delays = capture.getDelays();

      // Assert - Equal jitter: calculated ± 50%
      expect(delays.length).toBe(2);
      expect(delays[0]).toBeGreaterThanOrEqual(50);  // 100 - 50%
      expect(delays[0]).toBeLessThanOrEqual(150);    // 100 + 50%
      expect(delays[1]).toBeGreaterThanOrEqual(100); // 200 - 50%
      expect(delays[1]).toBeLessThanOrEqual(300);    // 200 + 50%
    });

    test('Should support delayFirstAttempt option', async () => {
      // Arrange
      let attempts = 0;
      class FailProvider extends TestProvider {
        async complete() {
          attempts++;
          if (attempts <= 2) {
            throw new AIProviderError('RATE_LIMIT', 'Rate limit');
          }
          return 'Success';
        }
      }
      const provider = new FailProvider({ apiKey: 'test' });

      const capture = captureDelays(async () => {
        await provider.generateWithRetry('test', {}, {
          maxAttempts: 4,
          startingDelay: 100,
          timeMultiple: 2,
          jitter: 'none',
          delayFirstAttempt: true
        });
      });

      // Act
      await capture.execute();
      const delays = capture.getDelays();

      // Assert - Should include delay before first attempt
      expect(delays.length).toBe(3); // First attempt + 2 retries
      expect(delays[0]).toBe(100); // Delay before first attempt
    });

    test('Should not delay first attempt by default', async () => {
      // Arrange
      let attempts = 0;
      class FailProvider extends TestProvider {
        async complete() {
          attempts++;
          if (attempts === 1) {
            throw new AIProviderError('RATE_LIMIT', 'Rate limit');
          }
          return 'Success';
        }
      }
      const provider = new FailProvider({ apiKey: 'test' });

      const capture = captureDelays(async () => {
        await provider.generateWithRetry('test', {}, {
          maxAttempts: 3,
          startingDelay: 100,
          jitter: 'none'
        });
      });

      // Act
      await capture.execute();
      const delays = capture.getDelays();

      // Assert - Should only delay between attempts (not before first)
      expect(delays.length).toBe(1); // Only one delay (between 1st and 2nd attempt)
    });
  });

  describe('generateWithRetry() - Error Classification', () => {
    test('Should not retry INVALID_API_KEY errors', async () => {
      // Arrange
      let attempts = 0;
      class InvalidKeyProvider extends TestProvider {
        async complete() {
          attempts++;
          throw new AIProviderError('INVALID_API_KEY', 'Invalid API key');
        }
      }
      const provider = new InvalidKeyProvider({ apiKey: 'test' });

      // Act & Assert
      await expect(provider.generateWithRetry('test', {}, 5))
        .rejects.toThrow('Invalid API key');
      expect(attempts).toBe(1); // Should not retry
    });

    test('Should not retry INVALID_REQUEST errors', async () => {
      // Arrange
      let attempts = 0;
      class InvalidRequestProvider extends TestProvider {
        async complete() {
          attempts++;
          throw new AIProviderError('INVALID_REQUEST', 'Bad request');
        }
      }
      const provider = new InvalidRequestProvider({ apiKey: 'test' });

      // Act & Assert
      await expect(provider.generateWithRetry('test', {}, 5))
        .rejects.toThrow('Bad request');
      expect(attempts).toBe(1); // Should not retry
    });

    test('Should not retry CONTENT_POLICY_VIOLATION errors', async () => {
      // Arrange
      let attempts = 0;
      class PolicyViolationProvider extends TestProvider {
        async complete() {
          attempts++;
          throw new AIProviderError('CONTENT_POLICY_VIOLATION', 'Policy violation');
        }
      }
      const provider = new PolicyViolationProvider({ apiKey: 'test' });

      // Act & Assert
      await expect(provider.generateWithRetry('test', {}, 5))
        .rejects.toThrow('Policy violation');
      expect(attempts).toBe(1); // Should not retry
    });

    test('Should retry RATE_LIMIT errors', async () => {
      // Arrange
      let attempts = 0;
      class RateLimitProvider extends TestProvider {
        async complete() {
          attempts++;
          if (attempts <= 2) {
            throw new AIProviderError('RATE_LIMIT', 'Rate limited');
          }
          return 'Success';
        }
      }
      const provider = new RateLimitProvider({ apiKey: 'test' });

      // Act
      const result = await provider.generateWithRetry('test', {}, 5);

      // Assert
      expect(result).toBe('Success');
      expect(attempts).toBe(3); // Retried twice
    });

    test('Should retry NETWORK_ERROR errors', async () => {
      // Arrange
      let attempts = 0;
      class NetworkErrorProvider extends TestProvider {
        async complete() {
          attempts++;
          if (attempts <= 2) {
            throw new AIProviderError('NETWORK_ERROR', 'Network error');
          }
          return 'Success';
        }
      }
      const provider = new NetworkErrorProvider({ apiKey: 'test' });

      // Act
      const result = await provider.generateWithRetry('test', {}, 5);

      // Assert
      expect(result).toBe('Success');
      expect(attempts).toBe(3); // Retried twice
    });

    test('Should retry SERVICE_UNAVAILABLE errors', async () => {
      // Arrange
      let attempts = 0;
      class ServiceUnavailableProvider extends TestProvider {
        async complete() {
          attempts++;
          if (attempts <= 2) {
            throw new AIProviderError('SERVICE_UNAVAILABLE', 'Service unavailable');
          }
          return 'Success';
        }
      }
      const provider = new ServiceUnavailableProvider({ apiKey: 'test' });

      // Act
      const result = await provider.generateWithRetry('test', {}, 5);

      // Assert
      expect(result).toBe('Success');
      expect(attempts).toBe(3); // Retried twice
    });

    test('Should support custom shouldRetry predicate', async () => {
      // Arrange
      let attempts = 0;
      class CustomErrorProvider extends TestProvider {
        async complete() {
          attempts++;
          throw new AIProviderError('CUSTOM_ERROR', 'Custom error');
        }
      }
      const provider = new CustomErrorProvider({ apiKey: 'test' });

      // Act & Assert - Custom predicate that never retries
      await expect(provider.generateWithRetry('test', {}, {
        maxAttempts: 5,
        shouldRetry: (error, attempt) => false
      })).rejects.toThrow('Custom error');
      expect(attempts).toBe(1); // Should not retry
    });

    test('Should pass error and attempt to shouldRetry predicate', async () => {
      // Arrange
      const retryLog = [];
      let attempts = 0;
      class LoggingProvider extends TestProvider {
        async complete() {
          attempts++;
          if (attempts <= 3) {
            throw new AIProviderError('RATE_LIMIT', 'Rate limited');
          }
          return 'Success';
        }
      }
      const provider = new LoggingProvider({ apiKey: 'test' });

      // Act
      await provider.generateWithRetry('test', {}, {
        maxAttempts: 5,
        shouldRetry: (error, attempt) => {
          retryLog.push({ code: error.code, attempt });
          return true;
        }
      });

      // Assert
      expect(retryLog).toEqual([
        { code: 'RATE_LIMIT', attempt: 2 },
        { code: 'RATE_LIMIT', attempt: 3 },
        { code: 'RATE_LIMIT', attempt: 4 }
      ]);
    });

    test('Should stop retrying when shouldRetry returns false', async () => {
      // Arrange
      let attempts = 0;
      class ConditionalProvider extends TestProvider {
        async complete() {
          attempts++;
          throw new AIProviderError('RATE_LIMIT', 'Rate limited');
        }
      }
      const provider = new ConditionalProvider({ apiKey: 'test' });

      // Act & Assert - Stop after 2 attempts
      await expect(provider.generateWithRetry('test', {}, {
        maxAttempts: 10,
        shouldRetry: (error, attempt) => attempt < 3
      })).rejects.toThrow('Rate limited');
      expect(attempts).toBe(2);
    });
  });

  describe('generateWithRetry() - Configuration Defaults', () => {
    test('Should use default maxAttempts when not specified', async () => {
      // Arrange
      let attempts = 0;
      class CountingProvider extends TestProvider {
        async complete() {
          attempts++;
          if (attempts <= 2) {
            throw new AIProviderError('RATE_LIMIT', 'Rate limit');
          }
          return 'Success';
        }
      }
      const provider = new CountingProvider({ apiKey: 'test' });

      // Act
      await provider.generateWithRetry('test', {}, {});

      // Assert - Default should be 3
      expect(attempts).toBe(3);
    });

    test('Should use default backoff configuration', async () => {
      // Arrange
      let attempts = 0;
      class DefaultsProvider extends TestProvider {
        async complete() {
          attempts++;
          if (attempts <= 2) {
            throw new AIProviderError('RATE_LIMIT', 'Rate limit');
          }
          return 'Success';
        }
      }
      const provider = new DefaultsProvider({ apiKey: 'test' });

      // Act - No config provided
      const result = await provider.generateWithRetry('test', {}, {});

      // Assert
      expect(result).toBe('Success');
      expect(attempts).toBe(3);
    });
  });

  describe('streamWithProgress()', () => {
    test('Should stream chunks and call progress callback', async () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });
      const progressUpdates = [];
      const onProgress = (chunk) => progressUpdates.push(chunk);

      // Act
      const chunks = [];
      for await (const chunk of provider.streamWithProgress('test', onProgress)) {
        chunks.push(chunk);
      }

      // Assert
      expect(chunks).toEqual(['chunk1', 'chunk2']);
      expect(progressUpdates).toEqual(['chunk1', 'chunk2']);
    });

    test('Should work without progress callback', async () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });

      // Act
      const chunks = [];
      for await (const chunk of provider.streamWithProgress('test')) {
        chunks.push(chunk);
      }

      // Assert
      expect(chunks).toEqual(['chunk1', 'chunk2']);
    });

    test('Should pass options to stream()', async () => {
      // Arrange
      class OptionsTestProvider extends TestProvider {
        async *stream(prompt, options) {
          yield JSON.stringify(options);
        }
      }
      const provider = new OptionsTestProvider({ apiKey: 'test' });
      const options = { temperature: 0.5 };

      // Act
      const chunks = [];
      for await (const chunk of provider.streamWithProgress('test', null, options)) {
        chunks.push(chunk);
      }

      // Assert
      const parsedOptions = JSON.parse(chunks[0]);
      expect(parsedOptions.temperature).toBe(0.5);
    });
  });

  describe('Options Merging', () => {
    test('Should have _mergeOptions helper method', () => {
      // Arrange
      const provider = new TestProvider({
        apiKey: 'test',
        temperature: 0.5,
        maxTokens: 1000,
        model: 'base-model'
      });

      // Act
      const merged = provider._mergeOptions({ temperature: 0.9 });

      // Assert
      expect(merged.temperature).toBe(0.9); // Method option overrides
      expect(merged.maxTokens).toBe(1000);  // Instance config preserved
      expect(merged.model).toBe('base-model');  // Instance config preserved
    });

    test('Should preserve all instance options when no method options', () => {
      // Arrange
      const provider = new TestProvider({
        apiKey: 'test',
        temperature: 0.3,
        maxTokens: 500,
        model: 'custom'
      });

      // Act
      const merged = provider._mergeOptions();

      // Assert
      expect(merged.temperature).toBe(0.3);
      expect(merged.maxTokens).toBe(500);
      expect(merged.model).toBe('custom');
    });
  });

  describe('Error Handling', () => {
    test('Should format network errors consistently', () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });
      const networkError = new Error('ECONNREFUSED');

      // Act
      const formatted = provider.formatError(networkError);

      // Assert
      expect(formatted).toBeInstanceOf(AIProviderError);
      expect(formatted.isOperational).toBe(true);
    });

    test('Should preserve error stack traces', () => {
      // Arrange
      const provider = new TestProvider({ apiKey: 'test' });
      const error = new Error('Test error');

      // Act
      const formatted = provider.formatError(error);

      // Assert
      expect(formatted.stack).toBeDefined();
      expect(formatted.stack).toContain('Test error');
    });
  });

  describe('Edge Cases', () => {
    test('Should handle missing apiKey gracefully', () => {
      // Arrange & Act
      const provider = new TestProvider({});

      // Assert
      expect(provider.apiKey).toBeUndefined();
    });

    test('Should handle null config', () => {
      // Arrange
      process.env.TEST_API_KEY = 'env-key';

      // Act
      const provider = new TestProvider(null);

      // Assert
      expect(provider.apiKey).toBe('env-key');
    });

    test('Should handle config with extra properties', () => {
      // Arrange & Act
      const provider = new TestProvider({
        apiKey: 'test',
        customProp: 'custom',
        anotherProp: 123
      });

      // Assert
      expect(provider.apiKey).toBe('test');
      expect(provider.config.customProp).toBe('custom');
      expect(provider.config.anotherProp).toBe(123);
    });
  });
});
