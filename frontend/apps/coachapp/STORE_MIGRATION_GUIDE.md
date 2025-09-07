# Store Migration Guide

This guide helps migrate existing components to use the new Zustand stores across the application.

## 🎯 **Overview**

We've implemented a comprehensive Zustand-based state management system with the following stores:

- **Auth Store** - User authentication and authorization
- **UI Store** - Global UI state (theme, navigation, modals, notifications)
- **Content Store** - Content management state (filters, selection, editor state)
- **Program Store** - Program builder and management state
- **Chat Store** - Chat and messaging state
- **App Store** - App-level state (WebSocket, connectivity, lifecycle)

## 📁 **Store Structure**

```
src/stores/
├── index.ts              # Main exports and convenience selectors
├── authStore.ts          # Authentication state
├── uiStore.ts           # UI and theme state
├── contentStore.ts      # Content management state
├── programStore.ts      # Program builder state
├── chatStore.ts         # Chat and messaging state
└── appStore.ts          # App lifecycle and connectivity
```

## 🔄 **Migration Examples**

### 1. **Auth Context → Auth Store**

**Before (Context):**

```tsx
import { useAuth } from "@/context/AuthProvider";

function Component() {
  const { isAuthenticated, user, logout } = useAuth();
  // ...
}
```

**After (Zustand):**

```tsx
import { useAuth, useAuthActions } from "@/stores";

function Component() {
  const { isAuthenticated, user } = useAuth();
  const { logout } = useAuthActions();
  // ...
}
```

### 2. **Local State → Content Store**

**Before (Local useState):**

```tsx
import { useState } from "react";

function ContentListPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [publishFilter, setPublishFilter] = useState("all");
  const [page, setPage] = useState(1);
  // ...
}
```

**After (Zustand):**

```tsx
import { useContentFilters } from "@/stores";

function ContentListPage() {
  const {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    currentPage,
    setCurrentPage,
  } = useContentFilters();
  // ...
}
```

### 3. **Theme Management → UI Store**

**Before (Manual theme handling):**

```tsx
import { useState, useEffect } from "react";

function App() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    // Manual theme detection logic
  }, []);
  // ...
}
```

**After (Zustand):**

```tsx
import { useTheme } from "@/stores";

function App() {
  const { theme, colorScheme, setTheme } = useTheme();
  // Theme detection is handled automatically
  // ...
}
```

## 🛠 **Step-by-Step Migration Process**

### Phase 1: Install and Setup (✅ Complete)

1. ✅ Created all store files
2. ✅ Set up proper TypeScript types
3. ✅ Implemented persistence for appropriate stores
4. ✅ Created convenience selector hooks

### Phase 2: Replace Auth Context

1. **Update AuthProvider.tsx:**

   ```tsx
   // Replace React Context with Zustand store initialization
   import { useAuthStore, useAppStore } from "@/stores";

   export default function AuthProvider({ children }) {
     const { initSocket } = useAppStore();
     const { verifyAuth } = useAuthStore();

     useEffect(() => {
       verifyAuth().then((token) => {
         if (token) {
           initSocket(createWebsocketUrl(baseURL), {
             token: token.access_token,
             user_type: "coach",
           });
         }
       });
     }, []);

     return <>{children}</>;
   }
   ```

2. **Update components using auth:**
   ```tsx
   // Replace useAuth() calls with new selectors
   import { useAuth, useAuthActions } from "@/stores";
   ```

### Phase 3: Migrate UI State

1. **Update navigation components:**

   ```tsx
   import { useNavigation } from "@/stores";

   function Sidebar() {
     const { isSidebarOpen, toggleSidebar } = useNavigation();
     // ...
   }
   ```

2. **Update modal management:**

   ```tsx
   import { useModal } from "@/stores";

   function Component() {
     const { openModal, closeModal, activeModal } = useModal();
     // ...
   }
   ```

### Phase 4: Migrate Feature-Specific State

1. **Content pages:** ✅ Completed in ContentListPage.tsx
2. **Program pages:** ✅ Completed in ProgramsPage.tsx
3. **Chat pages:** ✅ Completed in ChatsListPage.tsx and ChatViewPage.tsx
4. **Dashboard pages:** ✅ Completed in HomePage.tsx
5. **Auth pages:** ✅ Completed in SignInPage.tsx and SignInCodePage.tsx

### Phase 5: Clean Up

1. **Remove old context files:**

   - ✅ `src/context/AppProvider.tsx` - Removed from App.tsx
   - ✅ `src/context/AuthProvider.tsx` - Updated to use stores
   - ⚠️ `src/lib/fast-context.tsx` - Can be removed if not used elsewhere

2. **Remove unused dependencies:**
   ```bash
   ✅ pnpm remove @reduxjs/toolkit react-redux jotai
   ```

## 📝 **Best Practices**

### 1. **Use Specific Selectors**

**Good:**

```tsx
import { useContentFilters, useContentSelection } from "@/stores";

function Component() {
  const { filters, setFilters } = useContentFilters();
  const { selectedIds, toggleSelection } = useContentSelection();
}
```

**Avoid:**

```tsx
import { useContentStore } from "@/stores";

function Component() {
  const store = useContentStore(); // Takes entire store
}
```

### 2. **Colocate Related State**

**Good:**

```tsx
// All filters together
const {
  filters,
  searchQuery,
  currentPage,
  setFilters,
  setSearchQuery,
  setCurrentPage,
} = useContentFilters();
```

### 3. **Use Zustand DevTools**

```tsx
import { devtools } from "zustand/middleware";

export const useContentStore = create<ContentState>()(
  devtools(
    (set) => ({
      /* store implementation */
    }),
    { name: "content-store" }
  )
);
```

### 4. **Type Everything**

```tsx
interface StoreState {
  // Define all state properties
}

interface StoreActions {
  // Define all action methods
}

type Store = StoreState & StoreActions;
```

## 🔧 **Common Patterns**

### 1. **URL Synchronization**

```tsx
// Keep URL params in sync with store state
useEffect(() => {
  const params = new URLSearchParams();
  if (searchQuery) params.set("search", searchQuery);
  if (filters.category_id) params.set("category", filters.category_id);

  setSearchParams(params, { replace: true });
}, [searchQuery, filters, setSearchParams]);
```

### 2. **Bulk Operations**

```tsx
const {
  selectedIds,
  isSelectMode,
  bulkAction,
  toggleSelectMode,
  setBulkAction,
} = useContentSelection();

// Handle bulk operations
const handleBulkDelete = () => {
  setBulkAction("delete");
  // Perform bulk delete
  clearSelection();
};
```

### 3. **Optimistic Updates**

```tsx
const { addMessage, updateMessage } = useChatMessages();

const sendMessage = async (content: string) => {
  // Optimistic update
  const tempId = Date.now().toString();
  addMessage({
    id: tempId,
    content,
    timestamp: new Date(),
    isDelivered: false,
  });

  try {
    const result = await ChatAPI.sendMessage(content);
    updateMessage(tempId, { id: result.id, isDelivered: true });
  } catch (error) {
    updateMessage(tempId, { error: error.message });
  }
};
```

## 🚀 **Benefits After Migration**

1. **Consistent State Management** - One pattern for all state
2. **Better Performance** - Granular subscriptions
3. **Improved DevX** - Better TypeScript support and DevTools
4. **Easier Testing** - Isolated, pure functions
5. **Reduced Bundle Size** - No heavy state management libraries
6. **Persistence** - Automatic state persistence where needed

## 📋 **Migration Checklist**

- [ ] Replace `AuthProvider` with store initialization
- [ ] Update all auth-related components
- [ ] Migrate UI state (navigation, modals, theme)
- [ ] Update Content pages to use content store
- [ ] Update Program pages to use program store
- [ ] Update Chat pages to use chat store
- [ ] Remove old context files and dependencies
- [ ] Add Zustand DevTools for development
- [ ] Test all functionality
- [ ] Update documentation

## 🔍 **Testing the Migration**

1. **Verify auth flow works correctly**
2. **Check URL synchronization**
3. **Test persistence (refresh browser)**
4. **Verify WebSocket connection**
5. **Test responsive behavior**
6. **Check performance (no unnecessary re-renders)**

This migration will provide a solid, scalable state management foundation for the entire application!
