# CoachEasy Design System

A production-ready, mobile-first design system built on Mantine for coaching and fitness applications.

## 🎯 Design Principles

1. **Mobile-First**: Optimized for touch targets (44px minimum) and small screens
2. **Space-Efficient**: Compact layouts with 4px/8px grid system
3. **Accessible**: WCAG 2.1 AA compliant contrast ratios
4. **Performance**: GPU-accelerated animations, minimal repaints
5. **Consistent**: Unified spacing, typography, and interaction patterns

## 🎨 Color System

### Brand Colors
- **Primary Blue** (`brand`): Professional, trustworthy - main interactive elements
- **Success Green** (`success`): Achievement, health metrics, positive outcomes
- **Error Red** (`error`): Alerts, validation errors, critical states
- **Warning Orange** (`warning`): Attention needed, moderate alerts
- **Neutral Gray** (`gray`): UI hierarchy, text, backgrounds

### Semantic Colors
```tsx
// Text colors
--mantine-color-text-primary: #0f172a    // Headings, primary content
--mantine-color-text-secondary: #475569  // Body text, descriptions
--mantine-color-text-tertiary: #94a3b8   // Captions, metadata
--mantine-color-text-muted: #cbd5e1      // Disabled, placeholder

// Surface colors
--surface-primary: #ffffff               // Main backgrounds
--surface-secondary: #f8fafc            // Cards, elevated sections
--surface-tertiary: #f1f5f9             // Subtle backgrounds

// Border colors
--border-subtle: #e2e8f0                // Dividers, light borders
--border-default: #cbd5e1               // Input borders
--border-strong: #94a3b8                // Strong emphasis
```

## 📏 Typography

### Mobile-First Scale
```tsx
// Body text
--text-xs: 0.75rem    (12px)  // Captions, timestamps
--text-sm: 0.8125rem  (13px)  // Secondary text
--text-base: 0.875rem (14px)  // Primary body (mobile)
--text-md: 1rem       (16px)  // Emphasized body
--text-lg: 1.125rem   (18px)  // Subheadings

// Headings (responsive)
H1: 1.5rem → 2rem → 2.5rem   (24px → 32px → 40px)
H2: 1.25rem → 1.75rem → 2rem (20px → 28px → 32px)
H3: 1.125rem → 1.25rem       (18px → 20px)
H4: 1rem                     (16px)
```

### Font Families
- **Primary**: Inter Variable (body text)
- **Headings**: Inter Variable (enhanced)
- **Monospace**: Roboto Mono Variable (code, data)
- **Logo**: Nunito (brand identity)

## 🔲 Spacing System

Based on 4px base unit for perfect alignment:

```tsx
--space-1: 0.25rem   (4px)   // Minimal spacing
--space-2: 0.5rem    (8px)   // Small gaps
--space-3: 0.75rem   (12px)  // Compact spacing
--space-4: 1rem      (16px)  // Standard spacing
--space-6: 1.5rem    (24px)  // Section spacing
--space-8: 2rem      (32px)  // Large spacing
--space-12: 3rem     (48px)  // Page sections
```

## 👆 Touch Targets

All interactive elements meet accessibility guidelines:

```tsx
--touch-target-min: 44px         // Minimum (Apple/Google)
--touch-target-comfortable: 48px // Recommended
--touch-target-large: 56px       // Prominent actions

// Component heights
--input-height: 44px
--button-height-md: 44px
--button-height-lg: 52px
```

## 🎭 Component Variants

### Buttons
```tsx
size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
variant: 'filled' | 'light' | 'outline' | 'subtle' | 'transparent'
```

- **Filled**: Primary actions (CTAs, submit)
- **Light**: Secondary actions in context
- **Outline**: Alternative actions, cancel
- **Subtle**: Tertiary actions, less emphasis
- **Transparent**: Navigation, minimal UI

### Inputs
```tsx
size: 'sm' | 'md' | 'lg'
```

- **sm (36px)**: Compact forms, inline editing
- **md (44px)**: Standard forms (default)
- **lg (52px)**: Prominent inputs, hero forms

## 📐 Border Radius

```tsx
--radius-sm: 4px    // Compact elements
--radius-md: 6px    // Default (inputs, buttons)
--radius-lg: 8px    // Cards
--radius-xl: 12px   // Modals, large containers
--radius-full: 9999px // Pills, avatars
```

## 🌓 Shadows

Subtle elevation for modern, clean aesthetic:

```tsx
--shadow-xs: Minimal (badges, tags)
--shadow-sm: Light (cards)
--shadow-md: Standard (dropdowns)
--shadow-lg: Prominent (modals)
--shadow-xl: Maximum (sheets)
```

## ⚡ Transitions

Performance-optimized durations:

```tsx
--duration-fast: 100ms    // Micro-interactions
--duration-normal: 150ms  // Default
--duration-slow: 200ms    // Smooth transitions
--duration-slower: 300ms  // Emphasized motion
```

## 📱 Responsive Breakpoints

Mobile-first with progressive enhancement:

```tsx
xs: 480px   (30em)  // Small phones
sm: 768px   (48em)  // Tablets portrait
md: 1024px  (64em)  // Tablets landscape
lg: 1280px  (80em)  // Desktops
xl: 1440px  (90em)  // Large desktops
```

Typography scales up at each breakpoint for optimal readability.

## 🚀 Usage

### Basic Setup
```tsx
import { MantineProvider } from '@mantine/core';
import { theme } from './theme';

function App() {
  return (
    <MantineProvider theme={theme}>
      {/* Your app */}
    </MantineProvider>
  );
}
```

### Using CSS Variables
```tsx
import './theme/default-css-variables.css';

// In your styles
.custom-element {
  padding: var(--space-4);
  font-size: var(--text-base);
  color: var(--mantine-color-text-primary);
  border-radius: var(--radius-md);
}
```

### Component Styling
```tsx
<Button
  size="md"           // 44px height (touch-friendly)
  variant="filled"    // Primary action
  radius="md"         // 6px rounded
>
  Submit
</Button>

<TextInput
  size="md"          // 44px height
  label="Email"      // Styled consistently
  description="We'll never share your email"
  error="Invalid email"
/>
```

## 🎨 Brand Identity

### Logo Component
```tsx
<span className="logo">
  <span className="logo-primary">Coach</span>
  <span className="logo-accent">Easy</span>
</span>
```

Sizes: `logo-sm`, `logo-md`, `logo-lg`  
Dark variant: Add `on-dark` class

## ♿ Accessibility

- **Contrast**: All text meets WCAG 2.1 AA (4.5:1 minimum)
- **Focus**: Visible focus indicators (2px outline, 2px offset)
- **Touch**: 44px minimum touch targets
- **Motion**: Respects `prefers-reduced-motion`
- **Typography**: Readable sizes, adequate line height

## 🔧 Customization

### Override Variables
```css
:root {
  --mantine-color-brand-6: #your-brand-color;
  --space-4: 1.25rem; /* Increase spacing */
}
```

### Extend Theme
```tsx
import { theme as baseTheme } from './theme';

export const customTheme = {
  ...baseTheme,
  colors: {
    ...baseTheme.colors,
    custom: [...], // Add custom color
  },
};
```

## 📦 Included Components

All Mantine components are pre-styled with consistent:
- Typography (labels, descriptions, errors)
- Spacing (padding, margins)
- Colors (semantic usage)
- Interactions (hover, focus, active)
- Accessibility (ARIA, keyboard)

## 🎯 Best Practices

1. **Use semantic colors**: `color="brand"` not hardcoded hex
2. **Use spacing variables**: `var(--space-4)` not `16px`
3. **Mobile-first**: Design for small screens, enhance for large
4. **Touch-friendly**: Use `size="md"` or larger for touch interfaces
5. **Consistent radius**: Use theme radius, don't hardcode
6. **Test accessibility**: Check contrast, keyboard navigation, screen readers

## 🐛 Common Issues

### Text too small on mobile?
✅ Base font is 14px (0.875rem) - optimal for mobile readability

### Buttons too small to tap?
✅ Use `size="md"` (44px) or larger for primary actions

### Spacing feels tight?
✅ This is intentional for mobile - use `--space-5` or higher for breathing room

### Need more contrast?
✅ Use `--mantine-color-text-primary` for important text

## 📚 Resources

- [Mantine Documentation](https://mantine.dev)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Apple HIG Touch Targets](https://developer.apple.com/design/human-interface-guidelines/inputs)
- [Material Design Touch Targets](https://m3.material.io/foundations/accessible-design/accessibility-basics)

---

**Version**: 1.0.0  
**Last Updated**: November 27, 2025  
**Maintainer**: CoachEasy Team
