# PM Scripts Library

This directory contains shared utilities for PM command scripts.

## Logger

The `logger.js` module provides consistent, colored logging across all PM commands.

### Usage

```javascript
const { logInfo, logSuccess, logWarning, logError, logDebug } = require('./lib/logger');

// Info message (blue ℹ icon)
logInfo('Processing task...');

// Success message (green ✓ icon)
logSuccess('Task completed successfully');

// Warning message (yellow ⚠ icon)
logWarning('Task may require attention');

// Error message (red ❌ icon)
logError('Failed to process task', error);
// The error parameter is optional and will display error.message and stack (if DEBUG=1)

// Debug message (only shown if DEBUG=1)
logDebug('Detailed debug information');
```

### Environment Variables

- `DEBUG=1` - Enable debug logging and full error stack traces

### Color Constants

If you need custom formatting, you can import the colors:

```javascript
const { colors } = require('./lib/logger');

console.log(`${colors.blue}Custom message${colors.reset}`);
```

Available colors:
- `colors.red`
- `colors.green`
- `colors.yellow`
- `colors.blue`
- `colors.cyan`
- `colors.gray`
- `colors.reset`

## Migration Guide

To migrate existing PM scripts to use the logger:

1. Import the logger at the top of your file:
   ```javascript
   const { logError, logWarning, logInfo, logSuccess } = require('./lib/logger');
   ```

2. Replace `console.error()` calls:
   ```javascript
   // Before
   console.error('Error:', err.message);

   // After
   logError('Error description', err);
   ```

3. Add error handling to promise chains:
   ```javascript
   // Before
   const results = await Promise.all(promises);

   // After
   const promises = items.map(item =>
     processItem(item).catch(err => {
       logWarning(`Failed to process ${item.name}`, err);
       return defaultValue;
     })
   );
   const results = await Promise.all(promises);
   ```
