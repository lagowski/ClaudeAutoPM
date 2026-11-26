# UI Framework Agent Decision Matrix

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: react, vue, angular.

## Quick Selection Guide

Use this matrix to choose the right UI framework agent based on your project requirements:

| Requirement | MUI React | Chakra UI | Ant Design | Bootstrap | TailwindCSS |
|-------------|-----------|-----------|------------|-----------|-------------|
| **Material Design** | ✅ Primary | ❌ | ❌ | ❌ | ⚙️ Custom |
| **Enterprise Apps** | ✅ Good | ⚙️ Moderate | ✅ Primary | ⚙️ Moderate | ✅ Good |
| **Rapid Prototyping** | ✅ Good | ✅ Excellent | ✅ Good | ✅ Excellent | ⚙️ Moderate |
| **Design System Flexibility** | ⚙️ Moderate | ✅ Excellent | ⚙️ Limited | ⚙️ Moderate | ✅ Excellent |
| **Learning Curve** | ⚙️ Moderate | ✅ Easy | ⚙️ Moderate | ✅ Easy | ⚠️ Steep |
| **Bundle Size** | ⚠️ Large | ✅ Small | ⚠️ Large | ✅ Small | ✅ Optimized |
| **Accessibility** | ✅ Built-in | ✅ Built-in | ✅ Built-in | ⚙️ Manual | ⚙️ Manual |
| **React Integration** | ✅ Native | ✅ Native | ✅ Native | ⚙️ Wrapper | ⚙️ Classes |
| **Complex Data Tables** | ✅ DataGrid | ⚙️ Basic | ✅ ProTable | ⚙️ Basic | ⚙️ Custom |
| **Admin Dashboards** | ✅ Good | ⚙️ Moderate | ✅ Excellent | ✅ Good | ✅ Good |
| **Marketing Sites** | ⚙️ Moderate | ✅ Good | ❌ Poor | ✅ Excellent | ✅ Excellent |
| **Mobile-First** | ✅ Good | ✅ Good | ⚙️ Moderate | ✅ Excellent | ✅ Excellent |

**Legend:**
- ✅ **Primary/Excellent**: Best choice for this use case
- ✅ **Good**: Strong option with good support
- ⚙️ **Moderate/Custom**: Possible but requires more work
- ⚠️ **Limited/Challenge**: Has limitations or trade-offs
- ❌ **Poor/Not Suitable**: Not recommended for this use case

## Detailed Selection Criteria

### Project Type

#### Enterprise Applications
**Primary Choice: react-ui-expert**
- Pre-built complex components (ProTable, ProForm)
- Enterprise-grade data management
- Professional design language
- Built-in admin patterns

**Alternative: react-frontend-engineer**
- Material Design consistency
- DataGrid for complex tables
- Strong TypeScript support
- Large ecosystem

#### Startup/MVP
**Primary Choice: react-ui-expert**
- Fastest development time
- Extensive pre-built templates
- Strong community resources
- Easy developer onboarding

**Alternative: react-frontend-engineer**
- Modern developer experience
- Excellent component composition
- Built-in accessibility
- Smaller bundle size

#### Design-Heavy Applications
**Primary Choice: tailwindcss-expert**
- Maximum design flexibility
- Custom design systems
- Utility-first approach
- Optimal performance

**Alternative: react-frontend-engineer**
- Styled-system approach
- Design tokens
- Easy customization
- Good performance

### Team Expertise

#### Junior Developers
1. **react-ui-expert** - Familiar patterns, extensive docs
2. **react-frontend-engineer** - Intuitive API, good defaults
3. **react-frontend-engineer** - Material Design guidelines

#### Senior/Design Teams
1. **tailwindcss-expert** - Full control, custom systems
2. **react-frontend-engineer** - Balanced flexibility/productivity
3. **react-frontend-engineer** - Advanced patterns, customization

### Technical Requirements

#### Performance Critical
1. **tailwindcss-expert** - Purged CSS, optimal bundles
2. **react-frontend-engineer** - Tree-shakeable, efficient
3. **react-ui-expert** - Minimal JS overhead

#### Accessibility Required
1. **react-frontend-engineer** - Accessibility-first design
2. **react-frontend-engineer** - ARIA compliance built-in
3. **react-ui-expert** - Enterprise accessibility

#### Mobile-First
1. **tailwindcss-expert** - Mobile-first utilities
2. **react-ui-expert** - Mobile-first grid
3. **react-frontend-engineer** - Responsive design patterns

### Industry/Domain

#### Financial Services
**Primary: react-ui-expert**
- Data-heavy interfaces
- Professional appearance
- Complex forms/tables
- Enterprise features

#### Healthcare
**Primary: react-frontend-engineer**
- Accessibility compliance
- Professional UI standards
- Form-heavy applications
- Data visualization

#### E-commerce
**Primary: tailwindcss-expert**
- Custom brand designs
- Performance critical
- Unique user experiences
- Marketing integration

#### SaaS Products
**Primary: react-frontend-engineer**
- Modern user expectations
- Dashboard interfaces
- Component flexibility
- Development velocity

### Migration Considerations

#### From Bootstrap → TailwindCSS
- **Reason**: More design control, modern utilities
- **Agent**: tailwindcss-expert
- **Effort**: High (complete rewrite)
- **Benefits**: Better performance, design flexibility

#### From Material-UI v4 → v5
- **Reason**: Keep existing investment
- **Agent**: react-frontend-engineer
- **Effort**: Moderate (migration guide available)
- **Benefits**: Better performance, new features

#### From Custom CSS → Component Library
- **Reason**: Faster development, consistency
- **Agent**: react-frontend-engineer (modern) or react-ui-expert (familiar)
- **Effort**: Moderate to High
- **Benefits**: Accessibility, maintainability

## Decision Framework Questions

Ask these questions to determine the best agent:

1. **What is the primary use case?**
   - Admin dashboard → react-ui-expert
   - Marketing site → react-ui-expert or tailwindcss-expert
   - SaaS product → react-frontend-engineer or react-frontend-engineer

2. **What is the team's experience level?**
   - Junior team → react-ui-expert or react-frontend-engineer
   - Senior team → tailwindcss-expert or react-frontend-engineer

3. **How important is design flexibility?**
   - Critical → tailwindcss-expert
   - Important → react-frontend-engineer
   - Standard → react-frontend-engineer or react-ui-expert
   - Basic → react-ui-expert

4. **What are the performance requirements?**
   - Critical → tailwindcss-expert or react-frontend-engineer
   - Important → react-frontend-engineer (with optimization)
   - Standard → react-ui-expert or react-frontend-engineer

5. **Is accessibility a requirement?**
   - Critical → react-frontend-engineer or react-ui-expert
   - Important → react-ui-expert
   - Standard → react-ui-expert or tailwindcss-expert (with extra work)

6. **What type of data interfaces are needed?**
   - Complex tables → react-ui-expert or react-frontend-engineer
   - Forms → All frameworks suitable
   - Charts/visualization → react-frontend-engineer or tailwindcss-expert
   - Simple content → react-ui-expert or react-frontend-engineer

## Agent Selection Examples

### Example 1: B2B SaaS Dashboard
**Requirements**: Professional look, complex data tables, user management, responsive
**Choice**: react-ui-expert
**Reasoning**: ProTable for data, enterprise components, professional design

### Example 2: Consumer Mobile App
**Requirements**: Custom design, performance, mobile-first, unique branding
**Choice**: tailwindcss-expert
**Reasoning**: Custom design system, mobile-first utilities, performance

### Example 3: Startup MVP
**Requirements**: Fast development, standard UI patterns, small team, limited budget
**Choice**: react-ui-expert
**Reasoning**: Fastest development, familiar patterns, extensive resources

### Example 4: Design System Creation
**Requirements**: Component library, design tokens, accessibility, maintainability
**Choice**: react-frontend-engineer
**Reasoning**: Built for design systems, accessibility-first, component composition

### Example 5: Material Design Application
**Requirements**: Google Material Design, complex components, data visualization
**Choice**: react-frontend-engineer
**Reasoning**: Official Material Design implementation, advanced components