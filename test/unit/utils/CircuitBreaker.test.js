/**
 * CircuitBreaker Tests (Jest)
 *
 * Following TDD methodology - Tests written FIRST
 * Test Pattern: AAA (Arrange, Act, Assert)
 * Coverage Goal: 100% of circuit breaker functionality
 *
 * Circuit Breaker Pattern:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, reject immediately
 * - HALF_OPEN: Testing recovery, allow limited requests
 *
 * State Transitions:
 * CLOSED → OPEN (after failureThreshold consecutive failures)
 * OPEN → HALF_OPEN (after timeout expires)
 * HALF_OPEN → CLOSED (after successThreshold successes)
 * HALF_OPEN → OPEN (on any failure)
 */

const { CircuitBreaker, States } = require('../../../lib/utils/CircuitBreaker');

describe('CircuitBreaker', () => {
  describe('Initialization', () => {
    test('Should initialize with default configuration', () => {
      // Arrange & Act
      const breaker = new CircuitBreaker();

      // Assert
      expect(breaker.failureThreshold).toBe(5);
      expect(breaker.successThreshold).toBe(2);
      expect(breaker.timeout).toBe(60000);
      expect(breaker.halfOpenTimeout).toBe(30000);
      expect(breaker.getState()).toBe(States.CLOSED);
    });

    test('Should initialize with custom configuration', () => {
      // Arrange & Act
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        successThreshold: 1,
        timeout: 5000,
        halfOpenTimeout: 2000
      });

      // Assert
      expect(breaker.failureThreshold).toBe(3);
      expect(breaker.successThreshold).toBe(1);
      expect(breaker.timeout).toBe(5000);
      expect(breaker.halfOpenTimeout).toBe(2000);
    });

    test('Should start in CLOSED state', () => {
      // Arrange & Act
      const breaker = new CircuitBreaker();

      // Assert
      expect(breaker.getState()).toBe(States.CLOSED);
    });

    test('Should initialize failure count to 0', () => {
      // Arrange & Act
      const breaker = new CircuitBreaker();

      // Assert
      expect(breaker.failureCount).toBe(0);
    });

    test('Should initialize success count to 0', () => {
      // Arrange & Act
      const breaker = new CircuitBreaker();

      // Assert
      expect(breaker.successCount).toBe(0);
    });
  });

  describe('State: CLOSED', () => {
    test('Should execute function successfully in CLOSED state', async () => {
      // Arrange
      const breaker = new CircuitBreaker();
      const fn = jest.fn().mockResolvedValue('success');

      // Act
      const result = await breaker.execute(fn);

      // Assert
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('Should remain CLOSED after successful execution', async () => {
      // Arrange
      const breaker = new CircuitBreaker();
      const fn = jest.fn().mockResolvedValue('success');

      // Act
      await breaker.execute(fn);

      // Assert
      expect(breaker.getState()).toBe(States.CLOSED);
    });

    test('Should remain CLOSED after single failure', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Act
      try {
        await breaker.execute(fn);
      } catch (e) {
        // Expected
      }

      // Assert
      expect(breaker.getState()).toBe(States.CLOSED);
      expect(breaker.failureCount).toBe(1);
    });

    test('Should increment failure count on error', async () => {
      // Arrange
      const breaker = new CircuitBreaker();
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Act
      try {
        await breaker.execute(fn);
      } catch (e) {
        // Expected
      }

      // Assert
      expect(breaker.failureCount).toBe(1);
    });

    test('Should transition to OPEN after failureThreshold failures', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Act - Execute 3 times to hit threshold
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch (e) {
          // Expected
        }
      }

      // Assert
      expect(breaker.getState()).toBe(States.OPEN);
      expect(breaker.failureCount).toBe(3);
    });

    test('Should reset failure count on success', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      let callCount = 0;
      const fn = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('fail'));
        }
        return Promise.resolve('success');
      });

      // Act - 2 failures, then success
      try {
        await breaker.execute(fn);
      } catch (e) {
        // Expected
      }
      try {
        await breaker.execute(fn);
      } catch (e) {
        // Expected
      }
      await breaker.execute(fn); // Success

      // Assert
      expect(breaker.failureCount).toBe(0); // Reset on success
      expect(breaker.getState()).toBe(States.CLOSED);
    });

    test('Should propagate errors from executed function', async () => {
      // Arrange
      const breaker = new CircuitBreaker();
      const error = new Error('Custom error');
      const fn = jest.fn().mockRejectedValue(error);

      // Act & Assert
      await expect(breaker.execute(fn)).rejects.toThrow('Custom error');
    });
  });

  describe('State: OPEN', () => {
    test('Should reject immediately in OPEN state', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Act - Trigger OPEN state
      try {
        await breaker.execute(fn);
      } catch (e) {
        // Expected
      }
      try {
        await breaker.execute(fn);
      } catch (e) {
        // Expected
      }

      // Assert - Should be OPEN
      expect(breaker.getState()).toBe(States.OPEN);

      // Act - Try to execute again
      const newFn = jest.fn().mockResolvedValue('success');
      await expect(breaker.execute(newFn)).rejects.toThrow('Circuit breaker is OPEN');
      expect(newFn).not.toHaveBeenCalled(); // Function should not execute
    });

    test('Should not execute function when OPEN', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 1 });
      const failFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Act - Open circuit
      try {
        await breaker.execute(failFn);
      } catch (e) {
        // Expected
      }

      // Assert - Try new function
      const successFn = jest.fn().mockResolvedValue('success');
      try {
        await breaker.execute(successFn);
      } catch (e) {
        // Expected
      }
      expect(successFn).not.toHaveBeenCalled();
    });

    test('Should set nextAttempt time when transitioning to OPEN', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 1, timeout: 5000 });
      const beforeTime = Date.now();
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Act
      try {
        await breaker.execute(fn);
      } catch (e) {
        // Expected
      }

      // Assert
      expect(breaker.getState()).toBe(States.OPEN);
      expect(breaker.nextAttempt).toBeGreaterThan(beforeTime);
      expect(breaker.nextAttempt).toBeLessThanOrEqual(beforeTime + 6000); // ~5s timeout
    });

    test('Should transition to HALF_OPEN after timeout', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 1, timeout: 100 });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Act - Open circuit
      try {
        await breaker.execute(fn);
      } catch (e) {
        // Expected
      }
      expect(breaker.getState()).toBe(States.OPEN);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Try to execute again
      const successFn = jest.fn().mockResolvedValue('success');
      await breaker.execute(successFn);

      // Assert
      expect(breaker.getState()).toBe(States.HALF_OPEN);
    });

    test('Should remain OPEN before timeout expires', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 1, timeout: 10000 });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Act - Open circuit
      try {
        await breaker.execute(fn);
      } catch (e) {
        // Expected
      }

      // Assert - Still within timeout
      const successFn = jest.fn();
      await expect(breaker.execute(successFn)).rejects.toThrow('Circuit breaker is OPEN');
      expect(breaker.getState()).toBe(States.OPEN);
    });
  });

  describe('State: HALF_OPEN', () => {
    async function openCircuit(breaker) {
      const fn = jest.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < breaker.failureThreshold; i++) {
        try {
          await breaker.execute(fn);
        } catch (e) {
          // Expected
        }
      }
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, breaker.timeout + 50));
    }

    test('Should allow function execution in HALF_OPEN state', async () => {
      // Arrange
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        timeout: 100,
        successThreshold: 1
      });
      await openCircuit(breaker);

      // Act - Execute in HALF_OPEN
      const fn = jest.fn().mockResolvedValue('success');
      await breaker.execute(fn);

      // Assert
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('Should transition to CLOSED after successThreshold successes', async () => {
      // Arrange
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        timeout: 100,
        successThreshold: 2
      });
      await openCircuit(breaker);

      // Act - First success (HALF_OPEN)
      const fn = jest.fn().mockResolvedValue('success');
      await breaker.execute(fn);
      expect(breaker.getState()).toBe(States.HALF_OPEN);
      expect(breaker.successCount).toBe(1);

      // Second success (should close circuit)
      await breaker.execute(fn);

      // Assert
      expect(breaker.getState()).toBe(States.CLOSED);
      expect(breaker.successCount).toBe(0); // Reset after closing
    });

    test('Should transition to OPEN on any failure in HALF_OPEN', async () => {
      // Arrange
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        timeout: 100,
        successThreshold: 2
      });
      await openCircuit(breaker);

      // Act - First success
      const successFn = jest.fn().mockResolvedValue('success');
      await breaker.execute(successFn);
      expect(breaker.getState()).toBe(States.HALF_OPEN);

      // Failure in HALF_OPEN
      const failFn = jest.fn().mockRejectedValue(new Error('fail'));
      try {
        await breaker.execute(failFn);
      } catch (e) {
        // Expected
      }

      // Assert
      expect(breaker.getState()).toBe(States.OPEN);
    });

    test('Should reset success count on failure in HALF_OPEN', async () => {
      // Arrange
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 100,
        successThreshold: 2
      });
      await openCircuit(breaker);

      // Act - Success then failure
      const successFn = jest.fn().mockResolvedValue('success');
      await breaker.execute(successFn);
      expect(breaker.successCount).toBe(1);

      const failFn = jest.fn().mockRejectedValue(new Error('fail'));
      try {
        await breaker.execute(failFn);
      } catch (e) {
        // Expected
      }

      // Assert
      expect(breaker.successCount).toBe(0);
    });

    test('Should increment success count only in HALF_OPEN', async () => {
      // Arrange
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        timeout: 100,
        successThreshold: 2
      });
      await openCircuit(breaker);

      // Act - Success in HALF_OPEN
      const fn = jest.fn().mockResolvedValue('success');
      await breaker.execute(fn);

      // Assert
      expect(breaker.successCount).toBe(1);
    });

    test('Should not increment success count in CLOSED state', async () => {
      // Arrange
      const breaker = new CircuitBreaker();
      const fn = jest.fn().mockResolvedValue('success');

      // Act
      await breaker.execute(fn);

      // Assert
      expect(breaker.successCount).toBe(0);
    });
  });

  describe('reset()', () => {
    test('Should reset circuit to CLOSED state', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 1 });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Open circuit
      try {
        await breaker.execute(fn);
      } catch (e) {
        // Expected
      }
      expect(breaker.getState()).toBe(States.OPEN);

      // Act
      breaker.reset();

      // Assert
      expect(breaker.getState()).toBe(States.CLOSED);
    });

    test('Should reset failure count', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 5 });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Add some failures
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch (e) {
          // Expected
        }
      }
      expect(breaker.failureCount).toBe(3);

      // Act
      breaker.reset();

      // Assert
      expect(breaker.failureCount).toBe(0);
    });

    test('Should reset success count', async () => {
      // Arrange
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        timeout: 100,
        successThreshold: 3
      });

      // Open circuit
      const failFn = jest.fn().mockRejectedValue(new Error('fail'));
      try {
        await breaker.execute(failFn);
      } catch (e) {
        // Expected
      }

      // Wait for HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 150));

      // Add success
      const successFn = jest.fn().mockResolvedValue('success');
      await breaker.execute(successFn);
      expect(breaker.successCount).toBe(1);

      // Act
      breaker.reset();

      // Assert
      expect(breaker.successCount).toBe(0);
    });

    test('Should allow execution after reset', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 1 });
      const failFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Open circuit
      try {
        await breaker.execute(failFn);
      } catch (e) {
        // Expected
      }

      // Act
      breaker.reset();

      // Assert
      const successFn = jest.fn().mockResolvedValue('success');
      const result = await breaker.execute(successFn);
      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    test('Should handle very low failure threshold (1)', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 1 });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Act
      try {
        await breaker.execute(fn);
      } catch (e) {
        // Expected
      }

      // Assert
      expect(breaker.getState()).toBe(States.OPEN);
    });

    test('Should handle very low success threshold (1)', async () => {
      // Arrange
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        timeout: 100,
        successThreshold: 1
      });
      const failFn = jest.fn().mockRejectedValue(new Error('fail'));

      // Open circuit
      try {
        await breaker.execute(failFn);
      } catch (e) {
        // Expected
      }

      // Wait for HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 150));

      // Act - Single success should close
      const successFn = jest.fn().mockResolvedValue('success');
      await breaker.execute(successFn);

      // Assert
      expect(breaker.getState()).toBe(States.CLOSED);
    });

    test('Should handle very short timeout', async () => {
      // Arrange
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        timeout: 10
      });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Act - Open circuit
      try {
        await breaker.execute(fn);
      } catch (e) {
        // Expected
      }

      // Wait minimal time
      await new Promise(resolve => setTimeout(resolve, 20));

      // Assert - Should allow retry
      const successFn = jest.fn().mockResolvedValue('success');
      await breaker.execute(successFn);
      expect(breaker.getState()).toBe(States.HALF_OPEN);
    });

    test('Should handle synchronous function execution', async () => {
      // Arrange
      const breaker = new CircuitBreaker();
      const fn = jest.fn().mockImplementation(() => {
        return Promise.resolve('sync result');
      });

      // Act
      const result = await breaker.execute(fn);

      // Assert
      expect(result).toBe('sync result');
    });

    test('Should handle function that throws synchronously', async () => {
      // Arrange
      const breaker = new CircuitBreaker();
      const fn = jest.fn().mockImplementation(() => {
        throw new Error('sync error');
      });

      // Act & Assert
      await expect(breaker.execute(fn)).rejects.toThrow('sync error');
      expect(breaker.failureCount).toBe(1);
    });

    test('Should handle multiple concurrent executions', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 5 });
      const fn = jest.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(() => resolve('success'), 10));
      });

      // Act - Execute multiple in parallel
      const promises = Array(10).fill(null).map(() => breaker.execute(fn));
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(10);
      results.forEach(result => expect(result).toBe('success'));
      expect(breaker.getState()).toBe(States.CLOSED);
    });

    test('Should handle rapid state transitions', async () => {
      // Arrange
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 50,
        successThreshold: 1
      });

      // Act - Rapid failure → OPEN
      const failFn = jest.fn().mockRejectedValue(new Error('fail'));
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(failFn);
        } catch (e) {
          // Expected
        }
      }
      expect(breaker.getState()).toBe(States.OPEN);

      // Wait for HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 60));

      // Success → CLOSED
      const successFn = jest.fn().mockResolvedValue('success');
      await breaker.execute(successFn);

      // Assert
      expect(breaker.getState()).toBe(States.CLOSED);
    });

    test('Should handle errors with custom properties', async () => {
      // Arrange
      const breaker = new CircuitBreaker();
      const customError = new Error('Custom');
      customError.code = 'CUSTOM_CODE';
      customError.statusCode = 500;
      const fn = jest.fn().mockRejectedValue(customError);

      // Act & Assert
      try {
        await breaker.execute(fn);
      } catch (error) {
        expect(error.code).toBe('CUSTOM_CODE');
        expect(error.statusCode).toBe(500);
      }
    });
  });

  describe('Configuration Validation', () => {
    test('Should use defaults for undefined options', () => {
      // Arrange & Act
      const breaker = new CircuitBreaker({
        failureThreshold: undefined,
        successThreshold: undefined
      });

      // Assert
      expect(breaker.failureThreshold).toBe(5);
      expect(breaker.successThreshold).toBe(2);
    });

    test('Should accept zero timeout (immediate retry)', () => {
      // Arrange & Act
      const breaker = new CircuitBreaker({ timeout: 0 });

      // Assert
      expect(breaker.timeout).toBe(0);
    });

    test('Should preserve custom configuration', () => {
      // Arrange
      const config = {
        failureThreshold: 10,
        successThreshold: 5,
        timeout: 120000,
        halfOpenTimeout: 60000
      };

      // Act
      const breaker = new CircuitBreaker(config);

      // Assert
      expect(breaker.failureThreshold).toBe(10);
      expect(breaker.successThreshold).toBe(5);
      expect(breaker.timeout).toBe(120000);
      expect(breaker.halfOpenTimeout).toBe(60000);
    });
  });

  describe('States Export', () => {
    test('Should export States constants', () => {
      // Assert
      expect(States).toBeDefined();
      expect(States.CLOSED).toBe('CLOSED');
      expect(States.OPEN).toBe('OPEN');
      expect(States.HALF_OPEN).toBe('HALF_OPEN');
    });

    test('Should use States constants in getState()', () => {
      // Arrange
      const breaker = new CircuitBreaker();

      // Assert
      expect(breaker.getState()).toBe(States.CLOSED);
    });
  });

  describe('Failure Tracking', () => {
    test('Should track consecutive failures correctly', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 5 });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Act & Assert
      for (let i = 1; i <= 4; i++) {
        try {
          await breaker.execute(fn);
        } catch (e) {
          // Expected
        }
        expect(breaker.failureCount).toBe(i);
        expect(breaker.getState()).toBe(States.CLOSED);
      }

      // 5th failure should open circuit
      try {
        await breaker.execute(fn);
      } catch (e) {
        // Expected
      }
      expect(breaker.failureCount).toBe(5);
      expect(breaker.getState()).toBe(States.OPEN);
    });

    test('Should not count failures when circuit is OPEN', async () => {
      // Arrange
      const breaker = new CircuitBreaker({ failureThreshold: 1 });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Act - Open circuit
      try {
        await breaker.execute(fn);
      } catch (e) {
        // Expected
      }
      expect(breaker.failureCount).toBe(1);

      // Try to execute when OPEN (won't actually execute fn)
      try {
        await breaker.execute(fn);
      } catch (e) {
        // Expected
      }

      // Assert - Count should not increase
      expect(breaker.failureCount).toBe(1);
    });
  });

  describe('Time-Based Behavior', () => {
    test('Should calculate nextAttempt correctly', async () => {
      // Arrange
      const timeout = 5000;
      const breaker = new CircuitBreaker({ failureThreshold: 1, timeout });
      const beforeTime = Date.now();
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Act
      try {
        await breaker.execute(fn);
      } catch (e) {
        // Expected
      }
      const afterTime = Date.now();

      // Assert
      expect(breaker.nextAttempt).toBeGreaterThanOrEqual(beforeTime + timeout);
      expect(breaker.nextAttempt).toBeLessThanOrEqual(afterTime + timeout + 10); // Small buffer
    });

    test('Should respect timeout period precisely', async () => {
      // Arrange
      const timeout = 200;
      const breaker = new CircuitBreaker({ failureThreshold: 1, timeout });
      const fn = jest.fn().mockRejectedValue(new Error('fail'));

      // Act - Open circuit
      try {
        await breaker.execute(fn);
      } catch (e) {
        // Expected
      }

      // Wait just before timeout
      await new Promise(resolve => setTimeout(resolve, timeout - 50));

      // Assert - Should still be OPEN
      const testFn = jest.fn();
      try {
        await breaker.execute(testFn);
      } catch (e) {
        expect(e.message).toBe('Circuit breaker is OPEN');
      }

      // Wait until after timeout
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should now allow execution
      const successFn = jest.fn().mockResolvedValue('success');
      await breaker.execute(successFn);
      expect(successFn).toHaveBeenCalled();
    });
  });
});
