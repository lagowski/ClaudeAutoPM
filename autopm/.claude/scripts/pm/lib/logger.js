/**
 * Logging utility for PM scripts
 * Provides consistent colored output across all PM commands
 */

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m'
};

/**
 * Log an info message
 * @param {string} message - The message to log
 */
function logInfo(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

/**
 * Log a success message
 * @param {string} message - The message to log
 */
function logSuccess(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

/**
 * Log a warning message
 * @param {string} message - The message to log
 */
function logWarning(message) {
  console.warn(`${colors.yellow}⚠${colors.reset} ${message}`);
}

/**
 * Log an error message
 * @param {string} message - The message to log
 * @param {Error} [error] - Optional error object for details
 */
function logError(message, error) {
  console.error(`${colors.red}❌${colors.reset} ${message}`);
  if (error && error.message) {
    console.error(`${colors.gray}   ${error.message}${colors.reset}`);
  }
  if (error && error.stack && process.env.DEBUG) {
    console.error(`${colors.gray}${error.stack}${colors.reset}`);
  }
}

/**
 * Log a debug message (only shown if DEBUG env var is set)
 * @param {string} message - The message to log
 */
function logDebug(message) {
  if (process.env.DEBUG) {
    console.log(`${colors.gray}[DEBUG]${colors.reset} ${message}`);
  }
}

/**
 * Export colors for custom formatting
 */
const logColors = colors;

module.exports = {
  logInfo,
  logSuccess,
  logWarning,
  logError,
  logDebug,
  colors: logColors
};
