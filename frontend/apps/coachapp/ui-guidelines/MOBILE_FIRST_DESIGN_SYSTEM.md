# Mobile-First Design System & Guidelines

This document outlines the design principles and implementation patterns used to create a space-efficient, mobile-first experience in the CoachApp.

## Core Principles

### 1. Mobile-First Architecture
- **Default to Mobile**: All styles are written for mobile screens first (base styles).
- **Progressive Enhancement**: Use `@media (min-width: 768px)` to adjust layouts for tablet and desktop screens.
- **Vertical Stacking**: Content stacks vertically by default on mobile to accommodate narrow widths.

### 2. Space Efficiency
- **Compact Spacing**: Use a tight 4px grid system (`--ce-space-1` = 4px).
- **Collapsible Sections**: Hide dense or secondary information (like Nutrition facts) behind toggles/accordions.
- **Density**: Reduce padding and margins on mobile while maintaining legibility.

### 3. Touch-Friendly Targets
- **Hit Areas**: Ensure interactive elements have sufficient hit areas (min 44px height where possible).
- **Full Width**: Inputs and buttons often span the full width on mobile for easier interaction.

## CSS Variables System

We use a set of CSS variables defined in `src/theme/default-css-variables.css` to ensure consistency.

### Spacing Scale
| Variable | Value | Usage |
|----------|-------|-------|
| `--ce-space-1` | 4px | Tight grouping (icon + text) |
| `--ce-space-2` | 8px | Component internal spacing |
| `--ce-space-3` | 12px | Section spacing |
| `--ce-space-4` | 16px | Container padding |
| `--ce-space-5` | 24px | Major section gaps |

### Typography
| Variable | Value | Usage |
|----------|-------|-------|
| `--text-xs` | 12px | Metadata, secondary text |
| `--text-sm` | 14px | Body text, inputs |
| `--text-base` | 16px | Headings, major labels |

## Component Patterns

### 1. Forms (e.g., RecipeForm)
- **Layout**: Single column vertical stack on mobile.
- **Labels**: Placed above inputs, using `--text-sm` and `--font-semibold`.
- **Grids**: Use CSS Grid for numeric inputs (Time, Servings) to fit multiple on one line.
  ```css
  .metaGrid {
    display: grid;
    grid-template-columns: repeat(2, 1fr); /* 2 cols on mobile */
    gap: var(--ce-space-3);
  }
  @media (min-width: 768px) {
    .metaGrid { grid-template-columns: repeat(3, 1fr); }
  }
  ```

### 2. Lists & Collections (e.g., Ingredients)
- **Rows**: Compact rows with flexbox alignment.
- **Indexing**: Use small badges/circles for numbered steps.
- **Actions**: Use subtle icon buttons for secondary actions (delete/edit).
- **Search**: Inline search results that are easily tappable.

### 3. Navigation (e.g., DaySelector)
- **Context**: Use clear labels (Sun, Mon, Tue) instead of abstract numbers.
- **Grouping**: Group by logical units (Weeks).
- **Visual Feedback**: Clear active states using brand colors.

### 4. Cards & Containers (e.g., MealCard)
- **Borders**: Subtle borders (`--border-subtle`) to define areas without heavy shadows.
- **Headers**: Clear headers with actions (Add, Collapse) aligned to the right.
- **Content**: Collapsible bodies to manage screen real estate.

## Implementation Guide

### CSS Modules
We use CSS Modules for component-scoped styling.

```tsx
import classes from './styles.module.css';

// Usage
<div className={classes.container}>
  <span className={classes.title}>Title</span>
</div>
```

### Common Class Structures
- `.container` / `.section`: Main wrappers
- `.header` / `.titleRow`: Flex containers for titles and actions
- `.list` / `.grid`: Content layout containers
- `.item`: Individual repeatable elements

### Responsive Breakpoints
- **Mobile**: Default (0px - 767px)
- **Tablet**: `min-width: 768px`
- **Desktop**: `min-width: 1024px`

## Migration Checklist
When refactoring a component to this system:
1. [ ] Create `styles.module.css`
2. [ ] Replace Mantine layout components (`Stack`, `Group`, `SimpleGrid`) with semantic HTML `div`s and CSS classes.
3. [ ] Apply CSS variables for all spacing and colors.
4. [ ] Ensure inputs are full-width on mobile.
5. [ ] Check touch targets.
6. [ ] Verify tablet/desktop scaling.
