# Enhanced Typography System

This document explains the customized typography system based on UX/UI best practices from the Practical UI design guidelines.

## Key Typography Principles Applied

### 1. Font Selection
- **Primary Font**: Inter Variable (sans-serif) for all text
- **Monospace Font**: Roboto Mono Variable for code
- **Heading Font**: Inter Variable (consistent with body text)

### 2. Font Weights
- **Normal**: 400 (regular) - for body text
- **Bold**: 600 (semi-bold) - for headings and emphasis
- ❌ Avoid thin (100-300) and extra-bold (700+) weights

### 3. Font Sizes (Type Scale)
- **xs**: 12px - for small labels, captions
- **sm**: 14px - for secondary text
- **md**: 16px - minimum for body text
- **lg**: 18px - recommended for long-form content
- **xl**: 20px - for larger text
- **xxl**: 24px - for subheadings
- **xxxl**: 28px - for major headings

### 4. Line Heights
- **Body Text**: 1.6 (at least 1.5 for accessibility)
- **Headings**: 1.2 (tighter for better visual hierarchy)
- **Display Text**: 1.1 (tightest for large text)

### 5. Letter Spacing
- **Tight**: -0.02em for large headings (h1, h2)
- **Normal**: 0 for most text
- **Wide**: 0.02em for small caps or special cases

### 6. Text Colors
- **Primary**: #1a1a1a (soft black, not pure black)
- **Secondary**: #6b7280 (medium grey)
- **Tertiary**: #9ca3af (light grey)
- **Inverse**: #ffffff (white on dark backgrounds)
- **Disabled**: #d1d5db (very light grey)

## CSS Variables Reference

### Typography Variables
```css
/* Font Families */
--mantine-font-family: 'Inter Variable', sans-serif;
--mantine-font-family-headings: 'Inter Variable', sans-serif;

/* Font Weights */
--mantine-font-weight-normal: 400;
--mantine-font-weight-bold: 600;

/* Font Sizes */
--mantine-font-size-xs: 0.75rem;   /* 12px */
--mantine-font-size-sm: 0.875rem;  /* 14px */
--mantine-font-size-md: 1rem;      /* 16px */
--mantine-font-size-lg: 1.125rem;  /* 18px */
--mantine-font-size-xl: 1.25rem;   /* 20px */

/* Line Heights */
--mantine-line-height-body: 1.6;
--mantine-line-height-heading: 1.2;
--mantine-line-height-display: 1.1;

/* Letter Spacing */
--mantine-letter-spacing-tight: -0.02em;
--mantine-letter-spacing-normal: 0;
--mantine-letter-spacing-wide: 0.02em;

/* Text Colors */
--mantine-color-text-primary: #1a1a1a;
--mantine-color-text-secondary: #6b7280;
--mantine-color-text-tertiary: #9ca3af;
```

### Body Text Variables
```css
--mantine-text-body-font-size: var(--mantine-font-size-lg);
--mantine-text-body-line-height: var(--mantine-line-height-body);
--mantine-text-body-font-weight: var(--mantine-font-weight-normal);
--mantine-text-body-color: var(--mantine-color-text-primary);

/* Optimal line length for readability */
--mantine-text-max-width: 65ch;
```

## Usage Guidelines

### 1. Body Text
```css
.body-text {
  font-size: var(--mantine-text-body-font-size);  /* 18px */
  line-height: var(--mantine-text-body-line-height);  /* 1.6 */
  color: var(--mantine-text-body-color);
  max-width: var(--mantine-text-max-width);  /* 65 characters */
}
```

### 2. Headings
```css
/* H1 - Large display headings */
h1 {
  font-size: var(--mantine-h1-font-size);  /* 34px */
  line-height: var(--mantine-line-height-display);  /* 1.1 */
  letter-spacing: var(--mantine-letter-spacing-tight);
}

/* H4 - Card titles, section headings */
h4 {
  font-size: var(--mantine-h4-font-size);  /* 18px */
  line-height: var(--mantine-line-height-heading);  /* 1.2 */
}
```

### 3. Secondary Text
```css
.secondary-text {
  font-size: var(--mantine-text-small-font-size);
  color: var(--mantine-color-text-secondary);
}
```

## Card Component Typography

The CustomCard component demonstrates proper typography hierarchy:

1. **Title**: Uses h4 size with bold weight
2. **Subtitle**: Secondary color, smaller size
3. **Body**: Optimized 18px size with 1.6 line height
4. **Meta**: Small text for timestamps/metadata

## Accessibility Considerations

✅ **Text contrast**: All text meets WCAG AA standards
✅ **Font size**: Minimum 16px for body text
✅ **Line height**: At least 1.5 for body text
✅ **Line length**: Maximum 65 characters for optimal readability
✅ **Font choice**: Sans-serif for better screen readability

## Best Practices

1. **Use consistent font weights**: Only 400 and 600
2. **Optimize for reading**: 18px for long-form content
3. **Create clear hierarchy**: Use size, weight, and color
4. **Limit line length**: 45-75 characters (65ch optimal)
5. **Left-align text**: Better for readability than center/justify
6. **Avoid pure black**: Use soft black (#1a1a1a) instead
7. **Test on devices**: Ensure readability across all screen sizes

## Responsive Adjustments

```css
@media (max-width: 768px) {
  /* Reduce heading sizes on mobile */
  .card-title {
    font-size: var(--mantine-h5-font-size);
  }
  
  /* Adjust body text for mobile */
  .card-body {
    font-size: var(--mantine-font-size-md);
  }
}
```

This typography system ensures consistent, accessible, and beautiful text across your application while following proven UX/UI design principles.
