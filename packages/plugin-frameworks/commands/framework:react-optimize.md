# react:optimize

Optimize React application performance with Context7-verified patterns for hooks, memoization, and rendering optimization.

## Description

Analyzes and optimizes React applications following official React best practices:
- Component memoization (React.memo, useMemo, useCallback)
- Render optimization and unnecessary re-renders
- Hook dependency optimization
- Context value optimization
- List rendering performance
- Code splitting and lazy loading

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: react.

## Usage

```bash
/react:optimize [options]
```

## Options

- `--path <directory>` - Path to React components (default: ./src)
- `--analyze-only` - Analyze without applying changes
- `--output <file>` - Write optimization report
- `--focus <area>` - Focus area: hooks, rendering, context, lists
- `--aggressive` - Apply aggressive optimizations (requires review)

## Examples

### Analyze Component Performance
```bash
/react:optimize --analyze-only --output perf-report.md
```

### Optimize Hooks and Memoization
```bash
/react:optimize --focus hooks
```

### Optimize Context Usage
```bash
/react:optimize --focus context
```

### Full Optimization with Report
```bash
/react:optimize --output optimizations.md
```

## Optimization Patterns

### 1. useMemo for Expensive Calculations

**Pattern from Context7 (/reactjs/react.dev):**

```javascript
// BEFORE: Expensive calculation runs on every render
function TodoList({ todos, tab, theme }) {
  const visibleTodos = filterTodos(todos, tab); // ❌ Runs every render

  return (
    <div className={theme}>
      <List items={visibleTodos} />
    </div>
  );
}

// AFTER: useMemo caches the result
import { useMemo } from 'react';

function TodoList({ todos, tab, theme }) {
  const visibleTodos = useMemo(
    () => filterTodos(todos, tab),
    [todos, tab] // ✅ Only recalculates when dependencies change
  );

  return (
    <div className={theme}>
      <List items={visibleTodos} />
    </div>
  );
}
```

**Benefits:**
- Skips expensive calculations when dependencies unchanged
- Prevents unnecessary child component re-renders
- Improves overall application responsiveness

**When to Use:**
- Expensive filtering/transformation operations
- Complex calculations derived from props/state
- Values passed to memoized child components

### 2. React.memo for Component Optimization

**Pattern from Context7:**

```javascript
// BEFORE: Component re-renders on every parent render
function List({ items }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.text}</li>
      ))}
    </ul>
  );
}

// AFTER: React.memo prevents unnecessary re-renders
import { memo } from 'react';

const List = memo(function List({ items }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.text}</li>
      ))}
    </ul>
  );
});
```

**When to Use:**
- Component renders expensive UI
- Props change infrequently
- Component receives same props repeatedly

### 3. useCallback for Function Stability

**Pattern from Context7:**

```javascript
// BEFORE: Function recreated on every render
function ProductPage({ productId, referrer }) {
  const handleSubmit = (orderDetails) => {
    post('/product/' + productId + '/buy', {
      referrer,
      orderDetails
    });
  };

  return <Form onSubmit={handleSubmit} />; // ❌ New function every render
}

// AFTER: useCallback memoizes function
import { useCallback } from 'react';

function ProductPage({ productId, referrer }) {
  const handleSubmit = useCallback((orderDetails) => {
    post('/product/' + productId + '/buy', {
      referrer,
      orderDetails
    });
  }, [productId, referrer]); // ✅ Stable function reference

  return <Form onSubmit={handleSubmit} />;
}
```

**Benefits:**
- Prevents memoized child components from re-rendering
- Stable function references for useEffect dependencies
- Essential for custom hooks returning functions

### 4. Optimize Context Value

**Pattern from Context7:**

```javascript
// BEFORE: Context value object recreated every render
function MyApp() {
  const [currentUser, setCurrentUser] = useState(null);

  const login = (response) => {
    storeCredentials(response.credentials);
    setCurrentUser(response.user);
  };

  // ❌ New object on every render = all consumers re-render
  return (
    <AuthContext.Provider value={{ currentUser, login }}>
      <Page />
    </AuthContext.Provider>
  );
}

// AFTER: Memoize context value
import { useCallback, useMemo } from 'react';

function MyApp() {
  const [currentUser, setCurrentUser] = useState(null);

  const login = useCallback((response) => {
    storeCredentials(response.credentials);
    setCurrentUser(response.user);
  }, []); // ✅ Stable function

  const contextValue = useMemo(() => ({
    currentUser,
    login
  }), [currentUser, login]); // ✅ Stable object

  return (
    <AuthContext.Provider value={contextValue}>
      <Page />
    </AuthContext.Provider>
  );
}
```

**Benefits:**
- Prevents unnecessary re-renders of all context consumers
- Critical for frequently updated contexts
- Improves app-wide performance

### 5. Optimize useEffect Dependencies

**Pattern from Context7:**

```javascript
// BEFORE: useEffect runs on every render due to object dependency
function ChatRoom({ roomId }) {
  const [message, setMessage] = useState('');

  const options = {
    serverUrl: 'https://localhost:1234',
    roomId: roomId
  }; // ❌ New object every render

  useEffect(() => {
    const connection = createConnection(options);
    connection.connect();
    return () => connection.disconnect();
  }, [options]); // ❌ options changes every render
}

// AFTER: Memoize object dependency
import { useMemo } from 'react';

function ChatRoom({ roomId }) {
  const [message, setMessage] = useState('');

  const options = useMemo(() => ({
    serverUrl: 'https://localhost:1234',
    roomId: roomId
  }), [roomId]); // ✅ Only changes when roomId changes

  useEffect(() => {
    const connection = createConnection(options);
    connection.connect();
    return () => connection.disconnect();
  }, [options]); // ✅ Stable reference
}
```

### 6. Memoize JSX for Complex Children

**Pattern from Context7:**

```javascript
// BEFORE: Child component re-renders unnecessarily
export default function TodoList({ todos, tab, theme }) {
  const visibleTodos = useMemo(() => filterTodos(todos, tab), [todos, tab]);

  return (
    <div className={theme}>
      <List items={visibleTodos} /> {/* ❌ Re-renders when theme changes */}
    </div>
  );
}

// AFTER: Memoize JSX node
export default function TodoList({ todos, tab, theme }) {
  const visibleTodos = useMemo(() => filterTodos(todos, tab), [todos, tab]);

  const children = useMemo(
    () => <List items={visibleTodos} />,
    [visibleTodos]
  ); // ✅ List only re-renders when visibleTodos changes

  return (
    <div className={theme}>
      {children}
    </div>
  );
}
```

### 7. Optimize State Updater Functions

**Pattern from Context7:**

```javascript
// BEFORE: todos dependency causes unnecessary callback recreation
function TodoList() {
  const [todos, setTodos] = useState([]);

  const handleAddTodo = useCallback((text) => {
    const newTodo = { id: nextId++, text };
    setTodos([...todos, newTodo]); // ❌ Depends on todos
  }, [todos]); // ❌ Callback recreated when todos changes
}

// AFTER: Use updater function
function TodoList() {
  const [todos, setTodos] = useState([]);

  const handleAddTodo = useCallback((text) => {
    const newTodo = { id: nextId++, text };
    setTodos(todos => [...todos, newTodo]); // ✅ No todos dependency
  }, []); // ✅ Stable callback
}
```

### 8. Optimize List Rendering

**Pattern from Context7:**

```javascript
// BEFORE: List items re-render on every parent change
function ReportList({ items }) {
  return (
    <div>
      {items.map(item => (
        <Report key={item.id} item={item} />
      ))}
    </div>
  );
}

function Report({ item }) {
  function handleClick() {
    sendReport(item);
  }

  return (
    <figure>
      <Chart onClick={handleClick} />
    </figure>
  );
}

// AFTER: Memoize list items
import { memo } from 'react';

function ReportList({ items }) {
  return (
    <div>
      {items.map(item => (
        <Report key={item.id} item={item} />
      ))}
    </div>
  );
}

const Report = memo(function Report({ item }) {
  function handleClick() {
    sendReport(item);
  }

  return (
    <figure>
      <Chart onClick={handleClick} />
    </figure>
  );
});
```

## Common Anti-Patterns

### 1. Missing useMemo Return Value

```javascript
// ❌ INCORRECT: No return value
function Component({ data }) {
  const processed = useMemo(() => {
    data.forEach(item => console.log(item));
    // Missing return!
  }, [data]);

  return <div>{processed}</div>; // Always undefined
}

// ✅ CORRECT: Explicit return
function Component({ data }) {
  const processed = useMemo(() => {
    return data.map(item => item.value);
  }, [data]);

  return <div>{processed.join(', ')}</div>;
}
```

### 2. Incomplete Dependencies

```javascript
// ❌ INCORRECT: Missing dependencies
function Component({ data, filter }) {
  const filtered = useMemo(
    () => data.filter(filter),
    [data] // Missing 'filter' dependency
  );

  return <List items={filtered} />;
}

// ✅ CORRECT: Complete dependencies
function Component({ data, filter }) {
  const filtered = useMemo(
    () => data.filter(filter),
    [data, filter] // All dependencies included
  );

  return <List items={filtered} />;
}
```

### 3. Over-Memoization

```javascript
// ❌ UNNECESSARY: Memoizing primitive values
function Component({ count }) {
  const doubled = useMemo(() => count * 2, [count]); // Overkill
  return <div>{doubled}</div>;
}

// ✅ BETTER: Simple calculation
function Component({ count }) {
  const doubled = count * 2; // Fast enough
  return <div>{doubled}</div>;
}
```

## Optimization Output

```
⚛️  React Performance Optimization Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Components Analyzed: 45
Optimization Opportunities: 12

🎯 Hook Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️  TodoList.jsx (line 23)
     Missing useMemo for expensive filterTodos call
     💡 Recommendation: Wrap filterTodos in useMemo
     ⚡ Impact: Prevents 15 re-calculations per second

  ⚠️  ProductPage.jsx (line 45)
     handleSubmit function recreated on every render
     💡 Recommendation: Wrap in useCallback
     ⚡ Impact: Prevents Form re-render (150ms saved)

🔄 Rendering Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠️  List.jsx
     Component re-renders with same props
     💡 Recommendation: Wrap with React.memo
     ⚡ Impact: 70% fewer renders (3000 → 900/min)

  ⚠️  Report.jsx
     List items re-render unnecessarily
     💡 Recommendation: Memoize Report component
     ⚡ Impact: Improves list scrolling performance

📦 Context Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ❌ AuthContext.Provider (App.jsx line 12)
     Context value object recreated every render
     💡 Recommendation: Memoize with useMemo
     ⚡ Impact: Critical - all 23 consumers re-render

  ⚠️  ThemeContext.Provider (App.jsx line 28)
     login function not memoized
     💡 Recommendation: Wrap with useCallback
     ⚡ Impact: Prevents theme consumers from re-rendering

🔗 Dependency Issues
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ❌ ChatRoom.jsx (line 34)
     useEffect depends on object that changes every render
     💡 Recommendation: Memoize options object
     ⚡ Impact: Prevents connection reconnects

  ⚠️  DataFetcher.jsx (line 67)
     Missing filter dependency in useMemo
     💡 Recommendation: Add filter to dependency array
     ⚡ Impact: Prevents stale data bugs

Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Total Optimizations: 12

  🔴 Critical: 2 (fix immediately)
  🟡 High Impact: 5 (recommended)
  🟢 Low Impact: 5 (optional)

  Estimated Performance Improvement: 40-60%
  Estimated Render Reduction: 70%

  Run with --aggressive to apply all optimizations
```

## Implementation

This command uses the **@react-frontend-engineer** agent:

1. Query Context7 for React performance patterns
2. Analyze component tree and render patterns
3. Detect expensive calculations and re-renders
4. Identify missing memoization opportunities
5. Validate hook dependencies
6. Generate optimization recommendations
7. Optionally apply automated fixes

## Best Practices Applied

Based on Context7 documentation from `/reactjs/react.dev`:

1. **useMemo** - Cache expensive calculations
2. **useCallback** - Stable function references
3. **React.memo** - Prevent component re-renders
4. **Context Optimization** - Memoize context values
5. **Dependency Management** - Complete dependency arrays
6. **JSX Memoization** - Cache complex JSX trees
7. **Updater Functions** - Reduce callback dependencies
8. **List Optimization** - Memoize list item components

## Related Commands

- `/nextjs:optimize` - Next.js specific optimizations
- `/perf:analyze` - Deep performance profiling
- `/bundle:optimize` - Bundle size optimization
- `/lighthouse:audit` - Lighthouse performance audit

## Troubleshooting

### useMemo Not Working
- Verify dependencies are complete
- Check if calculation is actually expensive
- Ensure return value is provided

### useCallback Causing Issues
- Verify all used variables are in dependencies
- Check if memoization is necessary
- Consider using updater functions

### React.memo Not Preventing Re-renders
- Verify props are stable (use useMemo/useCallback)
- Check if component uses context (context updates bypass memo)
- Consider custom comparison function

## Version History

- v2.0.0 - Initial Schema v2.0 release with Context7 integration
- React hooks optimization patterns
- Context value memoization
- Dependency array validation
