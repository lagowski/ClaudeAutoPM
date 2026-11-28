/**
 * ClaudeProvider - Anthropic Claude API Integration
 *
 * Extends AbstractAIProvider to provide Claude-specific AI capabilities
 * with full backward compatibility for existing code.
 *
 * Documentation Queries:
 * - mcp://context7/anthropic/sdk - Anthropic SDK patterns
 * - mcp://context7/anthropic/streaming - Streaming best practices
 * - mcp://context7/nodejs/async-generators - Async generator patterns
 *
 * @extends AbstractAIProvider
 *
 * @example
 * // Legacy usage (backward compatible)
 * const provider = new ClaudeProvider('sk-ant-...');
 * const result = await provider.complete('Hello');
 *
 * @example
 * // Enhanced usage with config
 * const provider = new ClaudeProvider({
 *   apiKey: 'sk-ant-...',
 *   model: 'claude-sonnet-5-5',
 *   temperature: 0.7,
 *   maxTokens: 4096
 * });
 *
 * @example
 * // Using environment variable
 * process.env.ANTHROPIC_API_KEY = 'sk-ant-...';
 * const provider = new ClaudeProvider({});
 */

const Anthropic = require('@anthropic-ai/sdk');
const AbstractAIProvider = require('./AbstractAIProvider');
const AIProviderError = require('../errors/AIProviderError');

/**
 * ClaudeProvider class for Anthropic Claude API integration
 *
 * @class ClaudeProvider
 * @extends AbstractAIProvider
 */
class ClaudeProvider extends AbstractAIProvider {
  /**
   * Create a new ClaudeProvider instance
   *
   * Supports two constructor signatures for backward compatibility:
   * 1. new ClaudeProvider('api-key')  <- Legacy
   * 2. new ClaudeProvider({ apiKey: 'key', ...options })  <- Enhanced
   *
   * @param {string|Object} [config={}] - API key string or configuration object
   * @param {string} [config.apiKey] - Anthropic API key (or use ANTHROPIC_API_KEY env var)
   * @param {string} [config.model] - Model to use (default: ANTHROPIC_MODEL env var, else
   *   ClaudeProvider.DEFAULT_MODEL)
   * @param {number} [config.maxTokens] - Maximum tokens (default: 4096)
   * @param {number} [config.temperature] - Temperature (default: 0.7)
   *
   * @throws {Error} If API key is not provided and ANTHROPIC_API_KEY env var is not set
   */
  constructor(config = {}) {
    // Handle backward compatibility: string API key as first parameter
    if (typeof config === 'string') {
      config = { apiKey: config };
    }

    // Call parent constructor (handles config normalization and defaults)
    super(config);

    // Validate API key is available after parent constructor
    if (!this.apiKey) {
      throw new Error(
        'API key is required for ClaudeProvider. ' +
        'Provide it via constructor or set ANTHROPIC_API_KEY environment variable.'
      );
    }

    // Initialize Anthropic client with API key
    this.client = new Anthropic({ apiKey: this.apiKey });
  }

  // ============================================================
  // ABSTRACT METHOD IMPLEMENTATIONS (Required by AbstractAIProvider)
  // ============================================================

  /**
   * Get the default model identifier for Claude
   *
   * The ANTHROPIC_MODEL environment variable overrides the built-in alias.
   *
   * @returns {string} Default Claude model
   */
  getDefaultModel() {
    return process.env.ANTHROPIC_MODEL || ClaudeProvider.DEFAULT_MODEL;
  }

  /**
   * Get the environment variable name for API key
   *
   * @returns {string} Environment variable name
   */
  getApiKeyEnvVar() {
    return 'ANTHROPIC_API_KEY';
  }

  /**
   * Complete a prompt synchronously (wait for full response)
   *
   * Uses parent's _mergeOptions to combine instance config with method options.
   * Method-level options take precedence over instance config.
   *
   * Automatically applies rate limiting if configured in constructor.
   *
   * @param {string} prompt - The prompt to complete
   * @param {Object} [options={}] - Optional configuration
   * @param {string} [options.model] - Model to use (overrides instance model)
   * @param {number} [options.maxTokens] - Maximum tokens (overrides instance maxTokens)
   * @param {number} [options.temperature] - Temperature (overrides instance temperature)
   *
   * @returns {Promise<string>} The completed text
   * @throws {AIProviderError} On API errors
   */
  async complete(prompt, options = {}) {
    return this._withRateLimit(async () => {
      // Merge instance config with method options
      const finalOptions = this._mergeOptions(options);

      try {
        const response = await this.client.messages.create({
          model: finalOptions.model,
          max_tokens: finalOptions.maxTokens,
          temperature: finalOptions.temperature,
          messages: [{ role: 'user', content: prompt }]
        });

        // Extract text from response
        if (response.content && response.content.length > 0) {
          return response.content[0].text || '';
        }

        return '';
      } catch (error) {
        // Format error using parent's formatError + Claude-specific mapping
        throw this.formatError(error);
      }
    });
  }

  /**
   * Stream a prompt response (async generator for real-time feedback)
   *
   * Uses parent's _mergeOptions to combine instance config with method options.
   * Method-level options take precedence over instance config.
   *
   * Automatically applies rate limiting if configured in constructor.
   *
   * @param {string} prompt - The prompt to complete
   * @param {Object} [options={}] - Optional configuration
   * @param {string} [options.model] - Model to use (overrides instance model)
   * @param {number} [options.maxTokens] - Maximum tokens (overrides instance maxTokens)
   * @param {number} [options.temperature] - Temperature (overrides instance temperature)
   *
   * @yields {string} Text chunks as they arrive
   * @throws {AIProviderError} On API errors
   */
  async *stream(prompt, options = {}) {
    // Apply rate limiting before initiating stream
    if (this.rateLimiter) {
      await this.rateLimiter.removeTokens(1);
    }

    // Merge instance config with method options
    const finalOptions = this._mergeOptions(options);

    try {
      const stream = await this.client.messages.create({
        model: finalOptions.model,
        max_tokens: finalOptions.maxTokens,
        temperature: finalOptions.temperature,
        stream: true,
        messages: [{ role: 'user', content: prompt }]
      });

      // Yield text deltas as they arrive
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta &&
          event.delta.type === 'text_delta'
        ) {
          yield event.delta.text;
        }
      }
    } catch (error) {
      // Format error using parent's formatError + Claude-specific mapping
      throw this.formatError(error);
    }
  }

  // ============================================================
  // CAPABILITY OVERRIDES
  // ============================================================

  /**
   * Check if Claude supports streaming
   *
   * @returns {boolean} True (Claude supports streaming)
   */
  supportsStreaming() {
    return true;
  }

  /**
   * Check if Claude supports function calling
   *
   * @returns {boolean} True (Claude supports tools/function calling)
   */
  supportsFunctionCalling() {
    return true;
  }

  /**
   * Check if Claude supports chat format
   *
   * @returns {boolean} True (Claude has native chat format)
   */
  supportsChat() {
    return true;
  }

  /**
   * Check if Claude supports vision/image inputs
   *
   * @returns {boolean} False (not implemented yet)
   */
  supportsVision() {
    return false;
  }

  // ============================================================
  // ENHANCED ERROR HANDLING
  // ============================================================

  /**
   * Format Anthropic API errors into AIProviderError
   *
   * Maps Anthropic-specific error codes and HTTP statuses to AIProviderError codes.
   * Falls back to parent's formatError for unknown errors.
   *
   * @param {Error} error - The error to format
   * @returns {AIProviderError} Formatted error with appropriate code and metadata
   */
  formatError(error) {
    // Already an AIProviderError, return as-is
    if (error instanceof AIProviderError) {
      return error;
    }

    // Map Anthropic HTTP status codes to AIProviderError codes
    if (error.status) {
      switch (error.status) {
        case 401:
          return new AIProviderError(
            AIProviderError.INVALID_API_KEY,
            'Invalid Anthropic API key or authentication failed',
            true,
            401
          );

        case 429:
          return new AIProviderError(
            AIProviderError.RATE_LIMIT,
            'Claude API rate limit exceeded. Please retry after a delay.',
            true,
            429
          );

        case 500:
        case 502:
        case 503:
        case 504:
          return new AIProviderError(
            AIProviderError.SERVICE_UNAVAILABLE,
            `Claude API service temporarily unavailable (${error.status})`,
            true,
            error.status
          );

        case 400:
          return new AIProviderError(
            AIProviderError.INVALID_REQUEST,
            error.message || 'Invalid request parameters',
            true,
            400
          );

        default:
          // Unknown status code, wrap in generic error
          return new AIProviderError(
            'UNKNOWN_ERROR',
            `Claude API error (${error.status}): ${error.message}`,
            true,
            error.status
          );
      }
    }

    // No status code, check for specific error types
    if (error.message) {
      const lowerMessage = error.message.toLowerCase();

      if (lowerMessage.includes('api key') || lowerMessage.includes('authentication')) {
        return new AIProviderError(
          AIProviderError.INVALID_API_KEY,
          error.message,
          true
        );
      }

      if (lowerMessage.includes('rate limit')) {
        return new AIProviderError(
          AIProviderError.RATE_LIMIT,
          error.message,
          true
        );
      }

      if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
        return new AIProviderError(
          AIProviderError.NETWORK_ERROR,
          error.message,
          true
        );
      }

      if (lowerMessage.includes('context') || lowerMessage.includes('too long')) {
        return new AIProviderError(
          AIProviderError.CONTEXT_LENGTH_EXCEEDED,
          error.message,
          true
        );
      }
    }

    // Fall back to parent's error handling
    return super.formatError(error);
  }

  // ============================================================
  // ENHANCED CHAT SUPPORT
  // ============================================================

  /**
   * Chat completion with message history
   *
   * Overrides parent's fallback implementation to use Claude's native chat format.
   * Converts system role to user role (Claude requirement).
   *
   * Automatically applies rate limiting if configured in constructor.
   *
   * @param {Array<{role: string, content: string}>} messages - Chat messages
   * @param {Object} [options={}] - Optional configuration
   *
   * @returns {Promise<string>} Completion response
   * @throws {AIProviderError} On API errors
   */
  async chat(messages, options = {}) {
    return this._withRateLimit(async () => {
      // Merge instance config with method options
      const finalOptions = this._mergeOptions(options);

      try {
        // Convert system role to user (Claude doesn't support system role in messages array)
        const claudeMessages = messages.map(msg => ({
          role: msg.role === 'system' ? 'user' : msg.role,
          content: msg.content
        }));

        const response = await this.client.messages.create({
          model: finalOptions.model,
          max_tokens: finalOptions.maxTokens,
          temperature: finalOptions.temperature,
          messages: claudeMessages
        });

        // Extract text from response
        if (response.content && response.content.length > 0) {
          return response.content[0].text || '';
        }

        return '';
      } catch (error) {
        throw this.formatError(error);
      }
    });
  }

  // ============================================================
  // BACKWARD COMPATIBILITY METHODS
  // ============================================================

  /**
   * Generate text completion (alias for complete)
   *
   * Provides a more generic interface name for consistency with other services.
   * This is an alias for complete() with identical functionality.
   *
   * @param {string} prompt - The prompt to complete
   * @param {Object} [options={}] - Optional configuration
   * @returns {Promise<string>} The completed text
   * @throws {AIProviderError} On API errors
   */
  async generate(prompt, options = {}) {
    return await this.complete(prompt, options);
  }

  /**
   * Get the current model being used (legacy method for backward compatibility)
   *
   * Note: This returns the default model, not the instance model.
   * For instance model, use provider.model property.
   *
   * @returns {string} The default model name
   * @deprecated Use getDefaultModel() or access provider.model instead
   */
  getModel() {
    return this.getDefaultModel();
  }

  /**
   * Test the API connection (inherited from AbstractAIProvider)
   *
   * This method is provided by the parent class and works by making a test
   * complete() call. Included here for documentation completeness.
   *
   * @returns {Promise<boolean>} True if connection is successful
   */
  // testConnection() is inherited from AbstractAIProvider
}

// Model alias (not a dated snapshot id) so the default does not go stale.
ClaudeProvider.DEFAULT_MODEL = 'claude-sonnet-5-5';

module.exports = ClaudeProvider;
