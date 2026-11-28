/**
 * AIProviderError Tests (Jest)
 *
 * Following TDD methodology - Tests written FIRST
 * Test Pattern: AAA (Arrange, Act, Assert)
 * Coverage Goal: 100% of error handling scenarios
 */

const AIProviderError = require('../../../lib/errors/AIProviderError');

describe('AIProviderError', () => {
  describe('Constructor', () => {
    test('Should create error with all required properties', () => {
      // Arrange & Act
      const error = new AIProviderError('INVALID_API_KEY', 'Invalid API key provided');

      // Assert
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AIProviderError);
      expect(error.name).toBe('AIProviderError');
      expect(error.code).toBe('INVALID_API_KEY');
      expect(error.message).toBe('Invalid API key provided');
      expect(error.isOperational).toBe(true);
    });

    test('Should set isOperational to false when specified', () => {
      // Arrange & Act
      const error = new AIProviderError('UNKNOWN_ERROR', 'Something went wrong', false);

      // Assert
      expect(error.isOperational).toBe(false);
    });

    test('Should default isOperational to true', () => {
      // Arrange & Act
      const error = new AIProviderError('RATE_LIMIT', 'Rate limit exceeded');

      // Assert
      expect(error.isOperational).toBe(true);
    });

    test('Should capture stack trace', () => {
      // Arrange & Act
      const error = new AIProviderError('SERVICE_UNAVAILABLE', 'Service is down');

      // Assert
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AIProviderError');
      expect(error.stack).toContain('Service is down');
    });

    test('Should set httpStatus when provided', () => {
      // Arrange & Act
      const error = new AIProviderError('RATE_LIMIT', 'Too many requests', true, 429);

      // Assert
      expect(error.httpStatus).toBe(429);
    });

    test('Should leave httpStatus undefined when not provided', () => {
      // Arrange & Act
      const error = new AIProviderError('INVALID_API_KEY', 'Bad key');

      // Assert
      expect(error.httpStatus).toBeUndefined();
    });
  });

  describe('Prototype Chain', () => {
    test('Should maintain proper prototype chain', () => {
      // Arrange & Act
      const error = new AIProviderError('TEST_ERROR', 'Test message');

      // Assert
      expect(Object.getPrototypeOf(error)).toBe(AIProviderError.prototype);
      expect(error instanceof AIProviderError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });

    test('Should work with instanceof checks', () => {
      // Arrange & Act
      const error = new AIProviderError('TEST_ERROR', 'Test message');

      // Assert
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AIProviderError).toBe(true);
    });

    test('Should not be instance of other error types', () => {
      // Arrange & Act
      const error = new AIProviderError('TEST_ERROR', 'Test message');

      // Assert
      expect(error instanceof TypeError).toBe(false);
      expect(error instanceof RangeError).toBe(false);
    });
  });

  describe('Error Codes', () => {
    test('Should accept INVALID_API_KEY code', () => {
      // Arrange & Act
      const error = new AIProviderError('INVALID_API_KEY', 'Bad key');

      // Assert
      expect(error.code).toBe('INVALID_API_KEY');
    });

    test('Should accept RATE_LIMIT code', () => {
      // Arrange & Act
      const error = new AIProviderError('RATE_LIMIT', 'Too many requests');

      // Assert
      expect(error.code).toBe('RATE_LIMIT');
    });

    test('Should accept SERVICE_UNAVAILABLE code', () => {
      // Arrange & Act
      const error = new AIProviderError('SERVICE_UNAVAILABLE', 'Service down');

      // Assert
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
    });

    test('Should accept NETWORK_ERROR code', () => {
      // Arrange & Act
      const error = new AIProviderError('NETWORK_ERROR', 'Connection failed');

      // Assert
      expect(error.code).toBe('NETWORK_ERROR');
    });

    test('Should accept INVALID_REQUEST code', () => {
      // Arrange & Act
      const error = new AIProviderError('INVALID_REQUEST', 'Bad request');

      // Assert
      expect(error.code).toBe('INVALID_REQUEST');
    });

    test('Should accept CONTEXT_LENGTH_EXCEEDED code', () => {
      // Arrange & Act
      const error = new AIProviderError('CONTEXT_LENGTH_EXCEEDED', 'Too long');

      // Assert
      expect(error.code).toBe('CONTEXT_LENGTH_EXCEEDED');
    });

    test('Should accept CONTENT_POLICY_VIOLATION code', () => {
      // Arrange & Act
      const error = new AIProviderError('CONTENT_POLICY_VIOLATION', 'Blocked');

      // Assert
      expect(error.code).toBe('CONTENT_POLICY_VIOLATION');
    });

    test('Should accept custom error codes', () => {
      // Arrange & Act
      const error = new AIProviderError('CUSTOM_ERROR', 'Custom message');

      // Assert
      expect(error.code).toBe('CUSTOM_ERROR');
    });
  });

  describe('Error Message', () => {
    test('Should preserve error message', () => {
      // Arrange
      const message = 'This is a detailed error message';

      // Act
      const error = new AIProviderError('TEST_ERROR', message);

      // Assert
      expect(error.message).toBe(message);
    });

    test('Should handle empty message', () => {
      // Arrange & Act
      const error = new AIProviderError('TEST_ERROR', '');

      // Assert
      expect(error.message).toBe('');
    });

    test('Should handle multiline messages', () => {
      // Arrange
      const message = 'Line 1\nLine 2\nLine 3';

      // Act
      const error = new AIProviderError('TEST_ERROR', message);

      // Assert
      expect(error.message).toBe(message);
    });
  });

  describe('toString()', () => {
    test('Should return formatted error string', () => {
      // Arrange
      const error = new AIProviderError('RATE_LIMIT', 'Too many requests');

      // Act
      const result = error.toString();

      // Assert
      expect(result).toContain('AIProviderError');
      expect(result).toContain('RATE_LIMIT');
      expect(result).toContain('Too many requests');
    });

    test('Should include code in string representation', () => {
      // Arrange
      const error = new AIProviderError('INVALID_API_KEY', 'Bad key');

      // Act
      const result = error.toString();

      // Assert
      expect(result).toContain('INVALID_API_KEY');
    });
  });

  describe('Static Properties', () => {
    test('Should expose error codes as static properties', () => {
      // Assert
      expect(AIProviderError.INVALID_API_KEY).toBe('INVALID_API_KEY');
      expect(AIProviderError.RATE_LIMIT).toBe('RATE_LIMIT');
      expect(AIProviderError.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
      expect(AIProviderError.NETWORK_ERROR).toBe('NETWORK_ERROR');
      expect(AIProviderError.INVALID_REQUEST).toBe('INVALID_REQUEST');
      expect(AIProviderError.CONTEXT_LENGTH_EXCEEDED).toBe('CONTEXT_LENGTH_EXCEEDED');
      expect(AIProviderError.CONTENT_POLICY_VIOLATION).toBe('CONTENT_POLICY_VIOLATION');
      expect(AIProviderError.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR');
    });
  });

  describe('JSON Serialization', () => {
    test('Should serialize to JSON correctly', () => {
      // Arrange
      const error = new AIProviderError('RATE_LIMIT', 'Too many requests', true, 429);

      // Act
      const json = JSON.stringify(error);
      const parsed = JSON.parse(json);

      // Assert
      expect(parsed.name).toBe('AIProviderError');
      expect(parsed.code).toBe('RATE_LIMIT');
      expect(parsed.message).toBe('Too many requests');
      expect(parsed.isOperational).toBe(true);
      expect(parsed.httpStatus).toBe(429);
    });

    test('Should include all custom properties in JSON', () => {
      // Arrange
      const error = new AIProviderError('TEST_ERROR', 'Test message', false, 500);

      // Act
      const json = JSON.parse(JSON.stringify(error));

      // Assert
      expect(json).toHaveProperty('name');
      expect(json).toHaveProperty('code');
      expect(json).toHaveProperty('message');
      expect(json).toHaveProperty('isOperational');
      expect(json).toHaveProperty('httpStatus');
    });
  });

  describe('Error Handling Scenarios', () => {
    test('Should be catchable in try-catch', () => {
      // Arrange
      const throwError = () => {
        throw new AIProviderError('TEST_ERROR', 'Test message');
      };

      // Act & Assert
      expect(throwError).toThrow(AIProviderError);
      expect(throwError).toThrow('Test message');
    });

    test('Should be distinguishable from standard errors', () => {
      // Arrange
      let caughtError;

      try {
        throw new AIProviderError('TEST_ERROR', 'Test message');
      } catch (error) {
        caughtError = error;
      }

      // Assert
      expect(caughtError instanceof AIProviderError).toBe(true);
      expect(caughtError instanceof Error).toBe(true);
    });

    test('Should preserve code property when caught', () => {
      // Arrange
      let caughtError;

      try {
        throw new AIProviderError('RATE_LIMIT', 'Too many requests');
      } catch (error) {
        caughtError = error;
      }

      // Assert
      expect(caughtError.code).toBe('RATE_LIMIT');
    });

    test('Should preserve isOperational flag when caught', () => {
      // Arrange
      let caughtError;

      try {
        throw new AIProviderError('TEST_ERROR', 'Test', false);
      } catch (error) {
        caughtError = error;
      }

      // Assert
      expect(caughtError.isOperational).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('Should handle null message', () => {
      // Arrange & Act
      const error = new AIProviderError('TEST_ERROR', null);

      // Assert
      expect(error.message).toBe('null');
    });

    test('Should handle undefined message', () => {
      // Arrange & Act
      const error = new AIProviderError('TEST_ERROR', undefined);

      // Assert
      // Note: Error constructor converts undefined to empty string
      expect(error.message).toBe('');
    });

    test('Should handle numeric message', () => {
      // Arrange & Act
      const error = new AIProviderError('TEST_ERROR', 123);

      // Assert
      expect(error.message).toBe('123');
    });

    test('Should handle object message', () => {
      // Arrange & Act
      const error = new AIProviderError('TEST_ERROR', { detail: 'error' });

      // Assert
      expect(error.message).toContain('object');
    });
  });
});
