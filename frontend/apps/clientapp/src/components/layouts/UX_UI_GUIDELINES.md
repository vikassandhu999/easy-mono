# UX/UI Design Guidelines
**Coaching Platform Design System**

*Based on "Practical UI" principles and mobile-first accessibility standards*

---

## 🎯 Core Principles

### 1. **Visual Hierarchy & Information Architecture**
```
Primary Information → Secondary Details → Actions
```
- **Title**: `font-weight: 600`, larger size, high contrast
- **Subtitle**: `font-weight: 400`, medium size, dimmed color
- **Metadata**: `font-size: 11-12px`, light weight, muted color
- **Actions**: Consistent sizing, proper color semantics

### 2. **Spacing & Layout (8px Grid System)**
```css
/* Consistent spacing relationships */
xs: 4px   /* Tight spacing within elements */
sm: 8px   /* Component internal spacing */
md: 16px  /* Standard component gaps */
lg: 24px  /* Section separation */
xl: 32px  /* Major layout divisions */
```

### 3. **Touch-First Interaction Design**
- **Minimum touch targets**: `48pt` (36px minimum, 48px preferred)
- **Interactive spacing**: `8px` minimum between touch targets
- **Hover states**: Subtle elevation and background changes
- **Active states**: Immediate visual feedback

---

## 🎨 Design Tokens

### **Color Semantics**
```css
/* Status Colors - Consistent across all components */
--success: #40c057    /* Active states, confirmations */
--warning: #fab005    /* Draft states, cautions */
--danger: #fa5252     /* Destructive actions, errors */
--info: #339af0       /* Neutral information, counts */
--muted: #868e96      /* Secondary text, metadata */
```

### **Elevation System**
```css
/* Card elevations for depth perception */
--shadow-sm: 0 1px 3px rgba(0,0,0,0.05)      /* Resting state */
--shadow-md: 0 4px 12px rgba(0,0,0,0.12)     /* Hover/focus state */
--shadow-lg: 0 8px 24px rgba(0,0,0,0.15)     /* Active/selected state */
```

### **Typography Scale**
```css
/* Consistent text sizing hierarchy */
--text-xs: 11px      /* taxonomy, small labels */
--text-sm: 13px      /* Secondary text, descriptions */
--text-base: 14px    /* Body text, main content */
--text-lg: 16px      /* Prominent text, titles */
--text-xl: 18px      /* Page headings */
```

---

## 📱 Mobile-First Rules

### **Layout Patterns**
1. **Cards over Lists**: For complex data (programs, sessions, content)
2. **Simple Lists**: For basic data (contacts, tags, settings)
3. **Compact Mode**: For dense information on small screens

### **Responsive Breakpoints**
```css
/* Mobile-first approach */
@media (min-width: 768px) { /* Tablet+ adjustments */ }
@media (min-width: 1024px) { /* Desktop+ adjustments */ }
```

### **Touch Interaction Guidelines**
- **Swipe gestures**: Enable where appropriate (delete, archive)
- **Long press**: Secondary actions on mobile
- **Pull to refresh**: For list-based views
- **Infinite scroll**: Preferred over pagination on mobile

---

## 🔧 Component Patterns

### **List/Card Component Structure**
```tsx
// Standard component anatomy
<Container>
  <Header>
    <Title />
    <PrimaryBadge />
  </Header>
  
  <Content>
    <Description />
    <SecondaryBadges />
  </Content>
  
  <Footer>
    <Metadata />
    <Actions />
  </Footer>
</Container>
```

### **Information Density Levels**
| Level | Use Case | Components |
|-------|----------|------------|
| **High** | Dashboard overview | Compact lists, summary cards |
| **Medium** | Main content lists | Standard cards, detailed lists |
| **Low** | Detail views | Expanded cards, full forms |

---

## ♿ Accessibility Standards

### **WCAG AA Compliance**
- **Color contrast**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Keyboard navigation**: Full functionality without mouse
- **Screen readers**: Proper ARIA labels and semantic markup
- **Focus indicators**: Visible 2px outline with high contrast

### **Semantic Markup**
```tsx
// Proper HTML structure
<article role="listitem">          // Card containers
  <h3>Title</h3>                   // Main heading
  <p>Description</p>               // Content description
  <nav aria-label="Actions">       // Action menus
    <button type="button">Edit</button>
  </nav>
</article>
```

---

## 🎭 Animation & Transitions

### **Performance-First Animations**
```css
/* Smooth, hardware-accelerated transitions */
transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1),
           box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);

/* Hover effects */
transform: translateY(-2px);      /* Subtle lift */
box-shadow: var(--shadow-md);     /* Enhanced depth */
```

### **Animation Principles**
- **Duration**: 200-300ms for micro-interactions
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` for natural feel
- **Purpose**: Provide feedback, guide attention, maintain context

---

## 📐 Layout Guidelines

### **Content Organization**
1. **Scan Pattern**: Support Z-pattern and F-pattern reading
2. **Grouping**: Related items within 16px proximity
3. **Separation**: Unrelated sections with 24px+ gaps
4. **Alignment**: Consistent left/right alignment within sections

### **Responsive Containers**
```css
/* Container width constraints */
.mobile-container { max-width: 100%; padding: 16px; }
.tablet-container { max-width: 768px; padding: 24px; }
.desktop-container { max-width: 1200px; padding: 32px; }
```

---

## 🚀 Implementation Checklist

### **For Every New Component:**
- [ ] Follows 8px spacing grid
- [ ] Implements proper touch targets (48pt minimum)
- [ ] Includes hover/focus/active states
- [ ] Supports keyboard navigation
- [ ] Uses semantic color system
- [ ] Provides loading states
- [ ] Handles empty states gracefully
- [ ] Works on mobile-first breakpoints

### **For Complex Lists/Cards:**
- [ ] Clear visual hierarchy (title → subtitle → metadata)
- [ ] Consistent action placement (top-right menu)
- [ ] Appropriate information density
- [ ] Status indicators using color semantics
- [ ] Metadata formatted consistently
- [ ] Badge system for quick scanning

---

## 🎯 Quick Decision Framework

### **Card vs. List Item?**
```
Complex data + Multiple actions + Mobile-first = Card
Simple data + Quick scanning + Dense layout = List Item
```

### **Layout Density?**
```
Overview/Dashboard = Compact
Main content areas = Standard
Detail/Focus views = Expanded
```

### **Color Choice?**
```
Status indication = Semantic colors (green/yellow/red)
Information badges = Neutral colors (blue/gray)
Interactive elements = Brand colors
```

---

## 💡 Pro Tips

1. **Cognitive Load**: Group related info, separate unrelated info
2. **Scanning**: Support quick visual scanning with consistent patterns
3. **Feedback**: Provide immediate feedback for all interactions
4. **Context**: Maintain user context during state changes
5. **Performance**: Prioritize smooth interactions over visual complexity

---

*These guidelines ensure consistent, accessible, and user-friendly interfaces across the entire coaching platform. Apply these principles to all new components and gradually refactor existing ones for optimal UX.*
