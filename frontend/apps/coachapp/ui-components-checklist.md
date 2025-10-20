# UI Components Checklist

> Reference checklist of perfected components. AI agents should use these as the source of truth for design consistency.

## ✅ Completed Components

### Pages
- [x] **Plans List Page** - `src/views/plans/ListPage/ListPage.tsx`
- [ ] **Plan Builder Page** - `src/views/plans/BuilderPage/BuilderPage.tsx`
- [x] **Clients List Page** - `src/views/clients/ListPage/ListPage.tsx`
- [ ] Client Detail Page - `src/views/clients/DetailPage/DetailPage.tsx`
- [ ] Sessions List Page - `src/views/sessions/ListPage/ListPage.tsx`
- [ ] Session Detail Page - `src/views/sessions/DetailPage/DetailPage.tsx`
- [ ] Dashboard Page - `src/views/dashboard/DashboardPage.tsx`
- [ ] Settings Page - `src/views/settings/SettingsPage.tsx`

### Headers & Navigation
- [x] **List Header with Filters** - `src/views/plans/ListPage/ListHeader.tsx`
- [x] **List Header (Simple)** - `src/views/clients/ListPage/Header.tsx`
- [ ] Detail Header with Actions - `src/components/layouts/DetailHeader.tsx`
- [ ] Tab Navigation - `src/components/TabNav/TabNav.tsx`
- [ ] Breadcrumb Navigation - `src/components/Breadcrumb/Breadcrumb.tsx`

### Cards & List Items
- [x] **Plan List Item Card** - `src/components/PlanListItem/PlanListItem.tsx`
- [x] **Client List Item Card** - `src/components/ClientListItem/ClientListItem.tsx`
- [x] **Exercise Card** - `src/components/Content/ExerciseCard.tsx`
- [x] **Recipe Card** - `src/components/Content/RecipeCard.tsx`
- [ ] Session Card - `src/components/SessionCard/SessionCard.tsx`
- [ ] Stat Card - `src/components/StatCard/StatCard.tsx`
- [ ] Activity Card - `src/components/ActivityCard/ActivityCard.tsx`

### Forms & Inputs
- [x] **Plan Creation Drawer (Multi-step)** - `src/views/plans/ListPage/PlanCreateDrawer.tsx`
- [x] **Invite Client Drawer (Single-step)** - `src/components/InviteClientDrawer/index.tsx`
- [ ] Client Onboarding Form - `src/components/ClientOnboardingForm/ClientOnboardingForm.tsx`
- [ ] Session Builder Form - `src/components/SessionBuilder/SessionBuilder.tsx`
- [ ] Inline Edit Field - `src/components/InlineEdit/InlineEdit.tsx`
- [ ] Search Input with Debounce - `src/components/SearchInput/SearchInput.tsx`

### Drawers & Modals
- [x] **Full-screen Creation Drawer** - `src/views/plans/ListPage/PlanCreateDrawer.tsx`
- [ ] Edit Drawer - `src/components/EditDrawer/EditDrawer.tsx`
- [ ] Confirmation Modal - `src/components/ConfirmationModal/ConfirmationModal.tsx`
- [ ] Selection Drawer - `src/components/SelectionDrawer/SelectionDrawer.tsx`

### Empty States
- [x] **List Empty State** - `src/components/EmptyState/ListEmpty.tsx`
- [x] **Search Empty State** - `src/components/EmptyState/SearchEmpty.tsx`
- [ ] Error State - `src/components/EmptyState/ErrorState.tsx`
- [ ] Loading State - `src/components/LoadingState/LoadingState.tsx`

### Data Display
- [x] **Infinite Scroll List** - `src/components/RecordsList/RecordsList.tsx`
- [ ] Data Table - `src/components/DataTable/DataTable.tsx`
- [ ] Timeline View - `src/components/Timeline/Timeline.tsx`
- [ ] Calendar View - `src/components/Calendar/Calendar.tsx`

### Layout Components
- [x] **Page Paper Container** - `src/components/containers/PagePaper.tsx`
- [x] **Heading Container** - `src/components/containers/HeadingContainer.tsx`
- [x] **Padding Container** - `src/components/containers/PaddingContainer.tsx`
- [ ] Fixed Bottom Bar - `src/components/FixedBottomBar/FixedBottomBar.tsx`
- [ ] Sidebar Layout - `src/components/layouts/SidebarLayout.tsx`

## 🎨 Design Patterns Used

### Established Patterns
- [x] URL state for drawers and filters
- [x] Debounced search (300ms)
- [x] Infinite scroll with "Load more" button
- [x] Zero-gap list items with bottom borders
- [x] Hover: translateY(-1px) with shadow
- [x] Container max-width: 560px for forms
- [x] Touch targets: minimum 44x44px
- [x] Transitions: 150ms ease
- [x] Multi-step forms with URL state
- [x] Controlled component pattern
- [x] Optimistic updates for better UX
- [x] Dynamic empty states based on context

### Spacing System
- [x] Page padding: xs (mobile) / lg (desktop)
- [x] Section gaps: sm, md, lg
- [x] Card padding: lg
- [x] List item padding: lg

### Color Usage
- [x] Brand color only on interactive elements
- [x] Gray.0 for content backgrounds
- [x] Gray.3 for borders
- [x] Dimmed text for secondary content

## 📋 Component Checklist Instructions

**For AI Agents:**
1. Check this list before creating new components
2. If a similar component exists and is checked, copy its patterns exactly
3. If unchecked, follow the general design patterns listed
4. Maintain consistency with checked components

**For Developers:**
- Check off components when they meet all criteria:
  - Design finalized and approved
  - All states handled (loading, error, empty, success)
  - Responsive and accessible
  - Performance optimized
  - Code reviewed and tested

---

**Last Updated**: 2025-10-20  
**Note**: Bold items are perfected and should be used as reference for design consistency.
