# RecipeCreateForm Component

The RecipeCreateForm is a complete form component for creating new recipe content in the Coach app.

## Features

### Form Fields
- **Recipe Name**: Required text input (3-255 characters)
- **Description**: Optional textarea for recipe description
- **Difficulty Level**: Select dropdown (Easy, Medium, Hard)
- **Servings**: Number input for serving count (1-20)
- **Prep Time**: Number input for preparation time in minutes
- **Cook Time**: Number input for cooking time in minutes  
- **Total Time**: Auto-calculated readonly field (prep + cook time)
- **Instructions**: Required textarea for step-by-step instructions

### Validation
- All required fields are validated
- Character limits enforced
- Numeric constraints applied
- Real-time validation feedback

### Data Transformation
The form automatically transforms user input into the correct `CreateContentProps` format expected by the backend API:

```typescript
{
  name: string;
  description?: string;
  type: 'recipe';
  instructions: string;
  instructions_type: 'text';
  duration: number;
  recipe_metadata: {
    servings: number;
    difficulty: string;
    prep_time_minutes: number;
    cook_time_minutes: number;
    total_time_minutes: number;
    // ... other required metadata fields with defaults
  };
}
```

## Usage

```tsx
import { RecipeCreateForm } from '@/components/RecipeCreateForm';
import { useContentsQueries } from '@/hooks/useContentsQueries';

function MyComponent() {
  const { createContentMutation } = useContentsQueries();

  const handleRecipeSubmit = async (data: CreateContentProps) => {
    await createContentMutation.mutateAsync(data);
    // Handle success (e.g., close drawer, show notification)
  };

  return (
    <RecipeCreateForm
      onSubmit={handleRecipeSubmit}
      submitText="Create Recipe"
    />
  );
}
```

## Integration with RecipeCreateDrawer

The form is already integrated with the `RecipeCreateDrawer` component and can be used in any drawer or modal context.

## API Compatibility

The form outputs data that matches the backend's `NewContentInput` structure for recipe content type, ensuring seamless integration with the content creation API.