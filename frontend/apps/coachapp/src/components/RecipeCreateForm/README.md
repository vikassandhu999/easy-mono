# RecipeCreateForm

A comprehensive form component for creating recipes with a modern tabbed interface for ingredients, instructions, and nutrition information.

## Features

- **Tabbed Interface**: Clean organization of ingredients, instructions, and nutrition info
- **Dynamic Ingredients**: Add/remove ingredients with structured input fields
- **Flexible Instructions**: Choose between structured steps or free-form text
- **Complete Nutrition Tracking**: All essential macro and micronutrients
- **Form Validation**: Comprehensive validation with error handling
- **React Query Integration**: Seamless API calls with loading states
- **Responsive Design**: Mobile-first approach with Mantine components
- **Real-time Notifications**: Success/error feedback

## Usage

```tsx
import { RecipeCreateForm } from './RecipeCreateForm';

function App() {
  return (
    <RecipeCreateForm
      submitText="Create Recipe"
      onSuccess={(recipe) => console.log('Created:', recipe)}
      onError={(error) => console.error('Error:', error)}
    />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| submitText | string | Yes | Text for submit button |
| onSuccess | (recipe: any) => void | No | Success callback |
| onError | (error: any) => void | No | Error callback |

## Tabbed Interface

The form features three main tabs:

### 1. Ingredients Tab

- **Add Ingredient**: Structured input with name, amount, and unit fields
- **Add as Text**: Option for free-form ingredient entry
- **Dynamic Management**: Easy add/remove ingredients with validation
- **Form Integration**: Automatically syncs with form state

### 2. Instructions Tab

- **Structured Steps**: Numbered step-by-step instructions with individual text areas
- **Add as Text**: Traditional single text area for instructions
- **Flexible Approach**: Choose the format that works best for your recipe
- **Auto-numbering**: Steps automatically renumber when items are removed

### 3. Nutrition Info Tab

- **Complete Macros**: Calories, protein, carbs, fats
- **Micronutrients**: Fiber, sugar tracking
- **Per Serving**: All values calculated per serving
- **Optional Fields**: Nutrition information is optional but encouraged

## Form Fields

### Basic Information

- **Recipe Name**: Required, 3-255 characters
- **Description**: Optional, up to 500 characters
- **Recipe Image**: Visual preview placeholder

### Recipe Details

- **Difficulty Level**: Easy, Medium, Hard (chip select)
- **Servings**: Number of people served (1-20)
- **Timing**:
  - Prep Time: Ingredient preparation time
  - Cook Time: Actual cooking/baking time
  - Total Time: Auto-calculated sum

### Categories

- **Meal Types**: Breakfast, Lunch, Dinner, etc. (multi-select chips)
- **Cooking Methods**: Baking, Grilling, Stovetop, etc. (multi-select chips)  
- **Diet Types**: Vegetarian, Vegan, Gluten Free, etc. (multi-select chips)

## API Integration

The form uses React Query for robust API handling:

```tsx
// Automatic error handling with notifications
onError: (error) => {
  notifications.show({
    title: 'Error',
    message: 'Failed to create recipe. Please try again.',
    color: 'red'
  });
}

// Success handling with cache invalidation
onSuccess: (result) => {
  notifications.show({
    title: 'Success', 
    message: 'Recipe created successfully!',
    color: 'green'
  });
  queryClient.invalidateQueries({queryKey: ['contents']});
}
```

## Validation Rules

Comprehensive validation ensures data quality:

- **Name**: Required, 3-255 characters
- **Description**: Optional, max 500 characters  
- **Instructions**: Optional (handled by tabbed interface)
- **Duration**: Must be greater than 0
- **Servings**: Must be greater than 0
- **Prep/Cook Time**: Must be 0 or greater

## Component Structure

```txt
RecipeCreateForm/
├── RecipeCreateForm.tsx          # Main form component
├── RecipeTabbedSection.tsx       # Tabbed interface for ingredients/instructions/nutrition
├── RecipeCreateFormDemo.tsx      # Usage example
└── README.md                     # This documentation
```

## Dependencies

- `@mantine/core`: UI components and layout
- `@mantine/form`: Form state management and validation
- `@mantine/notifications`: Toast notifications
- `@tanstack/react-query`: API state management
- `@tabler/icons-react`: Icons for UI elements