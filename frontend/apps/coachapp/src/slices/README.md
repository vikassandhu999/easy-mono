# Slices Directory 🍰

## Overview

The `slices` directory contains Redux Toolkit slices that manage client-side application state. These slices handle state that needs to persist across components and page navigations, particularly UI state and temporary data that hasn't been synced with the backend yet.

## Directory Structure

```
slices/
└── [slice-name].ts          # Individual slice files
```

## Core Concepts

### What are Slices?

Redux Toolkit slices are a way to organize Redux logic. Each slice:

- Manages a specific piece of application state
- Contains reducers (functions that update state)
- Automatically generates action creators
- Can be persisted to localStorage using redux-persist

### When to Use Slices vs Services

- **Use Slices for:**
  - UI state (modals, sidebars, themes)
  - Temporary/draft data
  - Optimistic updates
  - Client-only state
  - Cross-component communication

- **Use Services (RTK Query) for:**
  - Server data fetching
  - API calls
  - Cached server state
  - Data synchronization

## Current Slices

The specific slices in use will vary based on your application's needs. Each slice manages a distinct piece of application state.

## Usage Guide

### 1. Importing and Using Slice Actions

```typescript
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { actionOne, actionTwo, actionThree } from "@/slices/exampleSlice";

function ExampleComponent() {
  const dispatch = useAppDispatch();

  // Dispatch a simple action
  const handleSimpleAction = () => {
    dispatch(actionOne());
  };

  // Dispatch action with payload
  const handleActionWithPayload = (data: any) => {
    dispatch(actionTwo(data));
  };

  // Async action pattern
  const handleAsyncAction = async () => {
    try {
      const result = await someAsyncOperation();
      dispatch(actionThree(result));
    } catch (error) {
      console.error("Action failed:", error);
    }
  };
}
```

### 2. Selecting State from Slices

```typescript
import { useAppSelector } from '@/store/hooks';

function ExampleComponent() {
  // Select entire slice state
  const entireSliceState = useAppSelector(state => state.sliceName);

  // Select specific property
  const specificProperty = useAppSelector(
    state => state.sliceName.propertyName
  );

  // Select with default value
  const dataWithDefault = useAppSelector(
    state => state.sliceName.data || []
  );

  return (
    <div>
      {dataWithDefault.map(item => (
        <div key={item.id}>
          {item.name}
        </div>
      ))}
    </div>
  );
}
```

### 3. Using with TypeScript

```typescript
import { RootState } from "@/store";

// Define your state interface
interface ExampleState {
  items: Item[];
  loading: boolean;
  error: string | null;
}

// Type-safe selector
const selectItems = (state: RootState): Item[] => {
  return state.example.items;
};

// Parameterized selector
const selectItemById =
  (id: string) =>
  (state: RootState): Item | undefined => {
    return state.example.items.find((item) => item.id === id);
  };

// Usage in component
function MyComponent() {
  const items = useAppSelector(selectItems);
  const specificItem = useAppSelector(selectItemById("item-123"));
}
```

## Creating New Slices

### Step 1: Create the Slice File

Create a new file in the `slices/` directory:

```typescript
// slices/uiSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UiState {
  sidebarOpen: boolean;
  theme: "light" | "dark";
  activeModal: string | null;
}

const initialState: UiState = {
  sidebarOpen: true,
  theme: "light",
  activeModal: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setTheme: (state, action: PayloadAction<"light" | "dark">) => {
      state.theme = action.payload;
    },
    openModal: (state, action: PayloadAction<string>) => {
      state.activeModal = action.payload;
    },
    closeModal: (state) => {
      state.activeModal = null;
    },
  },
});

export const { toggleSidebar, setTheme, openModal, closeModal } =
  uiSlice.actions;
export default uiSlice.reducer;
```

### Step 2: Add to Store

Register the slice in the store configuration:

```typescript
// store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import uiReducer from "@/slices/uiSlice";

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    // ... other reducers
  },
});
```

### Step 3: Add Persistence (Optional)

If the slice needs to persist data:

```typescript
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";

const persistConfig = {
  key: "coacheasy_ui",
  storage,
  version: 1,
  whitelist: ["theme", "sidebarOpen"], // Only persist specific fields
};

export const UiReducerPersisted = persistReducer(
  persistConfig,
  uiSlice.reducer,
);
```

## Best Practices

### 1. Slice Organization

- **One slice per feature/domain**: Keep slices focused on a single concern
- **Clear naming**: Use descriptive names that indicate what state the slice manages
- **Type everything**: Always define TypeScript interfaces for state and payloads

### 2. State Design

```typescript
// ✅ Good: Normalized state
interface State {
  entities: Record<string, Entity>;
  ids: string[];
  selectedId: string | null;
}

// ❌ Bad: Nested state
interface State {
  data: {
    items: {
      nested: {
        values: any[];
      };
    };
  };
}
```

### 3. Action Naming

```typescript
// ✅ Good: Clear, action-oriented names
(setUser, addItem, removeItem, toggleSidebar);

// ❌ Bad: Vague or state-oriented names
(update, change, data, handle);
```

### 4. Selector Patterns

```typescript
// Create reusable selectors
export const selectDataById = (id: string) => (state: RootState) =>
  state.slice.entities[id];

export const selectIsLoading = (state: RootState) => state.slice.loading;

export const selectHasData = (state: RootState) => {
  return state.slice.data && state.slice.data.length > 0;
};
```

### 5. Avoid Side Effects in Reducers

```typescript
// ✅ Good: Pure reducer
addLabel: (state, action) => {
  state.labels.push(action.payload);
};

// ❌ Bad: Side effects in reducer
addLabel: (state, action) => {
  state.labels.push(action.payload);
  localStorage.setItem("labels", JSON.stringify(state.labels)); // Don't do this!
  console.log("Label added"); // Don't do this!
};
```

## Integration with Services

Slices often work together with RTK Query services:

```typescript
// After successful API call, update local state
const [createItem] = useCreateItemMutation();
const dispatch = useAppDispatch();

const handleCreate = async (itemData) => {
  try {
    const result = await createItem(itemData).unwrap();

    // Update local state after successful save
    dispatch(updateLocalState({ id: result.id }));
  } catch (error) {
    // Handle error
  }
};
```

## Persistence Configuration

The app uses `redux-persist` for localStorage persistence:

```typescript
const persistConfig = {
  key: "coacheasy_[slice_name]", // Unique key for localStorage
  storage, // localStorage by default
  version: 1, // Version for migrations
  whitelist: ["field1", "field2"], // Fields to persist
  blacklist: ["tempData"], // Fields to exclude
  migrate: (state) => {
    // Migration function (optional)
    // Handle version upgrades
    return Promise.resolve(state);
  },
};
```

## Common Patterns

### Optimistic Updates

```typescript
const optimisticSlice = createSlice({
  name: "optimistic",
  initialState: { items: [], pending: [] },
  reducers: {
    addOptimistic: (state, action) => {
      state.pending.push(action.payload);
    },
    confirmOptimistic: (state, action) => {
      const item = state.pending.find((i) => i.id === action.payload);
      if (item) {
        state.items.push(item);
        state.pending = state.pending.filter((i) => i.id !== action.payload);
      }
    },
    revertOptimistic: (state, action) => {
      state.pending = state.pending.filter((i) => i.id !== action.payload);
    },
  },
});
```

### Form State Management

```typescript
const formSlice = createSlice({
  name: "form",
  initialState: {
    values: {},
    errors: {},
    touched: {},
    isSubmitting: false,
  },
  reducers: {
    updateField: (state, action) => {
      state.values[action.payload.field] = action.payload.value;
      state.touched[action.payload.field] = true;
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
    },
    resetForm: () => initialState,
  },
});
```

## Testing Slices

```typescript
import exampleReducer, { addItem, removeItem } from "./exampleSlice";

describe("exampleSlice", () => {
  it("should add item", () => {
    const initialState = { items: [] };
    const action = addItem({
      id: "1",
      name: "Test Item",
    });

    const state = exampleReducer(initialState, action);

    expect(state.items).toHaveLength(1);
    expect(state.items[0].name).toBe("Test Item");
  });

  it("should remove item", () => {
    const initialState = { items: [{ id: "1", name: "Test" }] };
    const action = removeItem("1");

    const state = exampleReducer(initialState, action);

    expect(state.items).toHaveLength(0);
  });
});
```

## Troubleshooting

### Issue: State not persisting

**Solution**: Check if the reducer is wrapped with `persistReducer` and included in the store configuration.

### Issue: State not updating

**Solution**: Ensure you're using Redux Toolkit's Immer-powered reducers correctly. Direct mutations are allowed within createSlice.

### Issue: TypeScript errors

**Solution**: Use the typed hooks (`useAppSelector`, `useAppDispatch`) instead of plain Redux hooks.

### Issue: Performance problems with large state

**Solution**: Consider normalizing state structure and using createSelector for memoized selectors.

## Migration Notes

When migrating existing Redux code to slices:

1. Convert action types to slice actions
2. Convert reducers to slice reducers
3. Update components to use new action creators
4. Add TypeScript types
5. Configure persistence if needed

## Support

For slice-related questions:

1. Review Redux Toolkit documentation: https://redux-toolkit.js.org/
2. Check redux-persist docs for persistence: https://github.com/rt2zz/redux-persist
3. Use Redux DevTools for debugging state changes
4. Contact the frontend team for app-specific patterns
