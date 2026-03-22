# AI Agent UI/UX Validation & Correction Prompt

## Instructions for AI Agent

You are a UI/UX validation agent. Systematically review the React/Mantine codebase and apply corrections according to each checkpoint below. For each category, validate EVERY point and apply fixes in a single comprehensive update.

## Validation Checklist

### 1. FUNDAMENTALS

- [ ] **Usability Risk Assessment**
  - Remove thin, light grey text (ensure contrast ratio ≥4.5:1 for small text, ≥3:1 for large text)
  - Add labels to all icons (except in navigation/cards where context is clear)
  - Ensure headings aren't colored like links (avoid brand color on non-interactive elements)
  - Verify all form fields have visible labels (not just placeholders)
- [ ] **Interaction Cost Minimization**
  - Ensure buttons are ≥48pt tall for mobile touch targets
  - Position primary CTAs at bottom of mobile screens (thumb-reachable)
  - Use steppers instead of dropdowns for numeric inputs
  - Keep related actions within close proximity
- [ ] **Cognitive Load Reduction**
  - Break complex forms into multiple steps
  - Group related information with appropriate spacing
  - Remove unnecessary decorative elements
  - Ensure consistent icon styles (all outlined or all filled, not mixed)

- [ ] **Accessibility Compliance (WCAG 2.1 AA)**
  - Text contrast: 4.5:1 minimum for body text
  - UI elements contrast: 3:1 minimum
  - All interactive elements keyboard accessible
  - Focus states clearly visible with outline
  - Error states use icon + color (not color alone)

### 2. LESS IS MORE

- [ ] **Information Architecture**
  - Remove repeated information/text
  - Eliminate redundant visual styles
  - Use progressive disclosure for secondary content
  - Ensure important actions are visible (not hidden in menus)
- [ ] **Visual Simplification**
  - Remove decorative borders/lines that don't group content
  - Eliminate unnecessary animations
  - Avoid multiple colors without purpose
  - Remove white space that doesn't aid grouping

### 3. COLOR SYSTEM

- [ ] **Brand Color Application**
  ```tsx
  // Mantine theme configuration check:
  - Brand color ONLY on interactive elements (buttons, links)
  - Never on headings or static text
  - Contrast ratio ≥4.5:1 against backgrounds
  ```
- [ ] **Color Palette Validation**
  - Text strong: Very dark grey (90% opacity black on white)
  - Text weak: Medium grey (60% opacity black on white)
  - Stroke strong: Form borders (45% opacity, 3:1 contrast)
  - Stroke weak: Decorative dividers (10% opacity)
  - Fill: Light background (4% opacity)
- [ ] **System Colors**
  - Error: Red with icon indicator
  - Warning: Amber with icon indicator
  - Success: Green with icon indicator
  - Never rely on color alone for meaning

### 4. LAYOUT & SPACING

- [ ] **Spacing System** (Mobile-first at @1x using points)
  ```tsx
  // Mantine spacing tokens:
  XS: 8pt
  S: 16pt
  M: 24pt
  L: 32pt
  XL: 48pt
  XXL: 80pt
  ```
- [ ] **Visual Hierarchy**
  - Headings more prominent than body text
  - Primary actions visually stronger than secondary
  - Related items grouped with less spacing than between groups
  - White space generous around content blocks
- [ ] **Alignment**
  - Text left-aligned (except centered modals/cards)
  - Buttons left-aligned (mobile) or follow form width
  - Form fields in single column on mobile
  - 12-column grid for larger screens

### 5. TYPOGRAPHY

- [ ] **Type Scale Implementation**
  ```tsx
  // Mantine typography scale:
  Heading 1: 40px/48px bold
  Heading 2: 32px/40px bold
  Heading 3: 24px/32px bold
  Heading 4: 20px/28px bold
  Body: 16px/24px regular (1.5 line-height)
  Small: 14px/20px regular
  ```
- [ ] **Readability**
  - Single sans-serif font family
  - Only regular and bold weights
  - Line height ≥1.5 for body text
  - Max line length 45-75 characters
  - No pure black on white (use 90% black)

### 6. COPYWRITING

- [ ] **Text Content**
  - Sentence case everywhere (not Title Case)
  - Concise language (remove unnecessary words)
  - Front-loaded important information
  - No "my" in form labels
  - Numbers as numerals (not spelled out)
- [ ] **Labels & Messages**
  - Button text describes action ("Save changes" not "OK")
  - Error messages explain how to fix
  - Link text describes destination
  - Form hints above fields (not placeholders)

### 7. BUTTONS

- [ ] **Button Hierarchy**
  ```tsx
  // Mantine Button variants:
  Primary: Filled with brand color (one per view)
  Secondary: Outlined or light fill
  Tertiary: Text only or ghost
  ```
- [ ] **Button States**
  - Default: 100% opacity
  - Hover: 80% opacity or elevated shadow
  - Press: Return to default appearance
  - Focus: Visible outline
  - Disabled: 20% opacity (avoid when possible)
- [ ] **Button Behavior**
  - Minimum 48pt height on mobile
  - Full width on mobile screens
  - Destructive actions require confirmation
  - Loading states for async operations

### 8. FORMS

- [ ] **Form Layout**
  - Single column on mobile
  - Labels above fields (not inline)
  - Optional fields marked (prefer required fields only)
  - Related fields grouped under headings
- [ ] **Form Fields**
  - Border contrast ≥3:1
  - Match field width to expected input
  - Use native inputs when possible
  - Radio buttons for 2-5 options (not dropdowns)
  - Steppers for numbers
- [ ] **Validation**
  - Inline validation on blur
  - Clear error messages with icons
  - Success states for completed fields
  - Disable submit until valid (with clear indication why)

### 9. MOBILE-FIRST RESPONSIVE

- [ ] **Touch Optimization**
  - 48pt minimum touch targets
  - Swipeable where appropriate
  - Bottom sheet modals on mobile
  - Thumb-zone consideration for CTAs
- [ ] **Responsive Behavior**
  - Start with mobile design (@1x)
  - Progressive enhancement for larger screens
  - Maintain functionality across breakpoints
  - Test at 320px minimum width

### 10. UNIVERSAL UX PRINCIPLES

- [ ] **Consistency**
  - Same patterns throughout app
  - Predictable navigation
  - Consistent terminology
  - Standard platform conventions
- [ ] **Feedback**
  - Loading states for all async operations
  - Success confirmations for actions
  - Clear error states with recovery paths
  - Hover/active states on interactive elements
- [ ] **Error Prevention**
  - Confirmation for destructive actions
  - Undo capabilities where possible
  - Clear constraints before errors occur
  - Helpful defaults and suggestions
- [ ] **User Control**
  - Back/cancel always available
  - Clear exit points from flows
  - Editable after submission
  - Preferences remembered

## Implementation in React/Mantine

### Required Mantine Theme Setup

```tsx
const theme = createTheme({
  // Typography
  fontFamily: 'system-ui, -apple-system, sans-serif',
  headings: {
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '40px', lineHeight: '48px' },
      h2: { fontSize: '32px', lineHeight: '40px' },
      h3: { fontSize: '24px', lineHeight: '32px' },
      h4: { fontSize: '20px', lineHeight: '28px' },
    },
  },

  // Spacing scale
  spacing: {
    xs: '8px',   // 8pt
    sm: '16px',  // 16pt
    md: '24px',  // 24pt
    lg: '32px',  // 32pt
    xl: '48px',  // 48pt
  },

  // Colors
  primaryColor: 'brand',
  colors: {
    brand: [...], // Your brand color scale
    dark: [...],  // Monochromatic greys
  },

  // Components
  components: {
    Button: {
      defaultProps: {
        size: 'lg', // Minimum 48pt height
      },
    },
    TextInput: {
      styles: {
        input: {
          borderColor: 'var(--mantine-color-dark-3)', // 3:1 contrast
        },
      },
    },
  },
});
```

### Validation Process

1. **Scan all components** for violations
2. **Group similar fixes** across files
3. **Apply corrections** systematically
4. **Verify accessibility** with contrast ratios
5. **Test responsive behavior** at 320px, 768px, 1024px
6. **Document changes** with rationale

### Priority Order

1. **Critical**: Accessibility violations (contrast, keyboard access)
2. **High**: Usability issues (touch targets, cognitive load)
3. **Medium**: Visual hierarchy and consistency
4. **Low**: Polish and micro-interactions

## Output Format

When applying corrections, provide:

1. File path and component name
2. Specific violation found
3. Constitutional guideline reference
4. Applied correction with code
5. Rationale for the change

## Example Correction

```tsx
// FILE: components/Button.tsx
// VIOLATION: Button height 40px (below 48pt minimum)
// GUIDELINE: Fundamentals - Interaction Cost (48pt touch targets)
// CORRECTION:
<Button
  size="lg" // Changed from "md" - ensures 48pt height
  fullWidth // Added for mobile optimization
  className={classes.primaryButton}
>
  Start Workout // Changed from "Begin" - more descriptive
</Button>
// RATIONALE: Improves touch accessibility and reduces interaction cost
```

Remember: Apply ALL validations and corrections in a single comprehensive pass. Each checkpoint must be verified and fixed according to the constitutional guidelines.
