# Playwright Testing Agent Decision Matrix

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: playwright.

## Quick Selection Guide

Choose between `playwright-test-engineer` and `playwright-mcp-frontend-tester` based on your testing needs:

| Requirement | Test Engineer | MCP Frontend Tester |
|-------------|---------------|-------------------|
| **Traditional E2E Testing** | ✅ Primary | ⚙️ Capable |
| **Visual Regression Testing** | ✅ Good | ✅ Primary |
| **UX/UI Analysis** | ⚙️ Basic | ✅ Primary |
| **Test Infrastructure** | ✅ Primary | ⚙️ Basic |
| **Cross-browser Testing** | ✅ Primary | ✅ Good |
| **Performance Testing** | ⚙️ Basic | ✅ Primary |
| **Accessibility Testing** | ✅ Good | ✅ Primary |
| **Real-time Browser Control** | ⚙️ Limited | ✅ Primary |
| **CI/CD Integration** | ✅ Primary | ⚙️ Limited |
| **Test Automation** | ✅ Primary | ⚙️ Manual |
| **Screenshot Analysis** | ✅ Good | ✅ Primary |
| **API Testing** | ✅ Primary | ❌ Limited |
| **Page Object Patterns** | ✅ Primary | ⚙️ Basic |

**Legend:**
- ✅ **Primary**: Best choice, core expertise
- ✅ **Good**: Strong capability
- ⚙️ **Capable/Basic**: Can handle but not specialized
- ❌ **Limited**: Minimal capability

## Detailed Agent Comparison

### playwright-test-engineer

**Primary Use Cases:**
- **Automated Test Suites**: Building comprehensive E2E test automation
- **CI/CD Integration**: Tests that run in pipelines
- **API Testing**: Backend endpoint validation
- **Test Infrastructure**: Framework setup, parallel execution
- **Page Object Models**: Maintainable test architecture
- **Cross-browser Automation**: Systematic browser testing

**Strengths:**
- Test framework architecture and organization
- CI/CD pipeline integration
- Parallel test execution optimization
- Page Object Model implementation
- Test data management strategies
- Comprehensive error handling
- API and backend testing capabilities

**Output Style:**
- Test code and framework structure
- Configuration files and CI setup
- Test reports and metrics
- Debugging and trace information

### playwright-mcp-frontend-tester

**Primary Use Cases:**
- **Visual Regression Testing**: Pixel-perfect UI comparisons
- **UX Analysis**: User experience evaluation
- **Performance Monitoring**: Core Web Vitals measurement
- **Accessibility Audits**: WCAG compliance checking
- **Real-time Testing**: Interactive browser control
- **Screenshot Analysis**: Visual validation and comparison
- **Frontend Quality Assurance**: UI/UX validation

**Strengths:**
- MCP browser control integration
- Visual comparison and analysis
- Performance metrics collection
- Accessibility compliance checking
- Real-time user experience feedback
- Interactive testing capabilities
- Detailed visual documentation

**Output Style:**
- Visual test reports with screenshots
- Performance metrics and analysis
- Accessibility audit results
- UX improvement recommendations

## Selection Decision Tree

### 1. What is your primary testing goal?

#### Test Automation & CI/CD
→ **playwright-test-engineer**
- Need automated test suites
- CI/CD pipeline integration
- Systematic regression testing
- Large-scale test management

#### Visual & UX Validation
→ **playwright-mcp-frontend-tester**
- Visual regression detection
- UI/UX quality assurance
- Performance monitoring
- Accessibility compliance

### 2. What type of application are you testing?

#### API-Heavy Applications
→ **playwright-test-engineer**
- Backend API testing
- Integration testing
- Data validation
- Business logic verification

#### Frontend-Heavy Applications
→ **playwright-mcp-frontend-tester**
- Visual components testing
- User interaction validation
- Performance optimization
- Accessibility compliance

### 3. What is your team structure?

#### Development Team (Automated Testing)
→ **playwright-test-engineer**
- Developers writing tests
- CI/CD integration needed
- Test maintenance required
- Code-first approach

#### QA/Design Team (Manual + Visual)
→ **playwright-mcp-frontend-tester**
- QA analysts and designers
- Visual validation focus
- UX quality assurance
- Report-first approach

### 4. What are your testing priorities?

#### Functional Testing Priority
→ **playwright-test-engineer**
- User journey validation
- Feature functionality
- Integration testing
- Regression prevention

#### Quality Assurance Priority
→ **playwright-mcp-frontend-tester**
- Visual consistency
- Performance optimization
- Accessibility compliance
- User experience quality

## Use Case Examples

### Example 1: E-commerce Platform Testing
**Requirements**: User journeys, cart functionality, checkout process, payment integration
**Choice**: playwright-test-engineer
**Reasoning**: Complex user flows, integration testing, CI/CD automation needed

### Example 2: Design System Validation
**Requirements**: Component visual consistency, accessibility compliance, responsive behavior
**Choice**: playwright-mcp-frontend-tester
**Reasoning**: Visual regression, accessibility audits, cross-device testing

### Example 3: SaaS Dashboard Testing
**Requirements**: Both functional testing and visual validation needed
**Choice**: Use both agents
**Approach**: 
- playwright-test-engineer for user flows and functionality
- playwright-mcp-frontend-tester for visual regression and UX validation

### Example 4: Mobile App Testing
**Requirements**: Responsive design, touch interactions, performance on mobile
**Choice**: playwright-mcp-frontend-tester
**Reasoning**: Device emulation, performance testing, responsive validation

### Example 5: Enterprise Application
**Requirements**: Complex workflows, data validation, cross-browser compatibility
**Choice**: playwright-test-engineer
**Reasoning**: Business logic testing, data integrity, systematic browser testing

## When to Use Both Agents

Consider using both agents when you need:

1. **Comprehensive Testing Strategy**
   - Functional testing (playwright-test-engineer)
   - Visual/UX validation (playwright-mcp-frontend-tester)

2. **Different Team Needs**
   - Developers need automated tests (playwright-test-engineer)
   - QA/Design needs visual validation (playwright-mcp-frontend-tester)

3. **Full Development Lifecycle**
   - Development phase: playwright-test-engineer
   - QA/Pre-release: playwright-mcp-frontend-tester

4. **Complex Applications**
   - Backend/API testing: playwright-test-engineer
   - Frontend/UI testing: playwright-mcp-frontend-tester

## Migration and Integration

### From Manual Testing to Automation
**Path**: Start with playwright-mcp-frontend-tester → Add playwright-test-engineer
**Reasoning**: Visual validation first, then automate repetitive tests

### From Basic E2E to Comprehensive Testing
**Path**: playwright-test-engineer → Add playwright-mcp-frontend-tester
**Reasoning**: Build test foundation, then add visual/UX validation

### Existing Playwright Setup
**Enhancement**: Add playwright-mcp-frontend-tester for visual regression
**Reasoning**: Enhance existing automation with visual validation

## Quick Decision Questions

1. **Do you need automated test suites that run in CI/CD?**
   - Yes → playwright-test-engineer
   - No → playwright-mcp-frontend-tester

2. **Is visual consistency and UX quality your primary concern?**
   - Yes → playwright-mcp-frontend-tester
   - No → playwright-test-engineer

3. **Do you need to test APIs and backend functionality?**
   - Yes → playwright-test-engineer
   - No → Either agent suitable

4. **Do you need real-time browser control and analysis?**
   - Yes → playwright-mcp-frontend-tester
   - No → playwright-test-engineer

5. **Is your focus on performance and accessibility?**
   - Yes → playwright-mcp-frontend-tester
   - No → playwright-test-engineer

## Integration with Other Agents

### playwright-test-engineer works well with:
- react-frontend-engineer (component testing)
- fastapi-backend-engineer (API testing)
- github-operations-specialist (CI/CD integration)

### playwright-mcp-frontend-tester works well with:
- ux-design-expert (UX validation)
- react-frontend-engineer (component validation)
- tailwindcss-expert (responsive testing)