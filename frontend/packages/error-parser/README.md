# @easy/error-parser

API error parser for the Easy coaching platform. This package provides utilities to parse and handle API errors in a consistent way across the Easy monorepo.

## Features

- 🎯 Parse API errors into human-readable messages
- 🔍 Extract field-level validation errors
- 📊 Flatten nested error structures with dot notation
- ✅ Type-safe error handling
- 🚀 Factory functions for convenient usage

## Installation

This package is part of the Easy monorepo and uses workspace references.

```bash
# Add to your app's package.json
{
  "dependencies": {
    "@easy/error-parser": "workspace:^"
  }
}
```

Then run:
```bash
npm install
```

## Usage

### Factory Function (Recommended)

Use the `parseError` factory function to avoid creating new instances:

```typescript
import { parseError } from '@easy/error-parser';

try {
  // API call
  await api.createRecipe(data);
} catch (error) {
  const parser = parseError(error);
  
  // Get human-readable message
  const message = parser.humanize();
  console.error(message);
  
  // Get field-level errors
  const fieldErrors = parser.getFieldErrors();
  // { "recipe_ingredients.0.quantity": ["must be greater than 0"] }
  
  // Check specific field
  if (parser.hasFieldError('name')) {
    const nameError = parser.getFieldError('name');
    // "Name is required"
  }
}
```

### Convenience Functions

For one-off usage without creating a parser instance:

```typescript
import { humanizeError, getFieldErrors, getFieldError } from '@easy/error-parser';

try {
  await api.updateClient(id, data);
} catch (error) {
  // Quick message
  const message = humanizeError(error);
  showNotification(message);
  
  // Quick field errors
  const fields = getFieldErrors(error);
  setFormErrors(fields);
  
  // Single field error
  const emailError = getFieldError(error, 'email');
}
```

### Class Instance (If Needed)

You can still use the class directly:

```typescript
import APIErrorParser from '@easy/error-parser';

const parser = new APIErrorParser(error);
const message = parser.humanize();
```

## API Reference

### Factory Functions

#### `parseError(err: WrappedError): APIErrorParser`
Creates a new parser instance from a wrapped error.

#### `humanizeError(err: WrappedError): string`
Returns a human-readable error message.

#### `getFieldErrors(err: WrappedError): Record<string, string[]> | null`
Returns all field-level validation errors.

#### `getFieldError(err: WrappedError, fieldName: string): string | null`
Returns the first error message for a specific field.

#### `isValidationError(err: WrappedError): boolean`
Checks if the error is a validation error.

### Parser Methods

#### `humanize(): string`
Returns a human-readable error message based on the error type.

#### `getFieldErrors(): Record<string, string[]> | null`
Returns field-level validation errors as a flattened map with dot notation.

**Example:**
```typescript
{
  "recipe_ingredients.0.quantity": ["must be greater than 0"],
  "recipe_ingredients.1.ingredient_id": ["is required"],
  "name": ["is required", "must be at least 3 characters"]
}
```

#### `getFieldError(fieldName: string): string | null`
Returns the first error message for a specific field.

#### `getAllFieldErrors(fieldName: string): string[]`
Returns all error messages for a specific field.

#### `hasFieldError(fieldName: string): boolean`
Checks if a specific field has errors.

#### `getRawError(): APIError`
Returns the raw error object.

#### `getStatusCode(): number`
Returns the HTTP status code as a number (404, 403, 422, 400, 500).

#### `isValidationError(): boolean`
Checks if the error is a validation error (`invalid_input`).

#### `isAuthError(): boolean`
Checks if the error is an authorization error (`unauthorized`).

#### `isNotFoundError(): boolean`
Checks if the error is a not found error (`not_found`).

## Error Types

### APIError Interface

```typescript
interface APIError {
  error_code: 'internal_error' | 'invalid_code' | 'invalid_input' | 'not_found' | 'unauthorized';
  error_detail: null | Record<string, any> | { fields?: Record<string, any> };
  error_message: string;
  status: 'bad_request' | 'forbidden' | 'not_found' | 'unprocessable_entity';
}
```

### WrappedError Interface

```typescript
interface WrappedError {
  data: APIError;
}
```

## Examples

### Form Validation

```typescript
import { parseError } from '@easy/error-parser';

const handleSubmit = async (formData) => {
  try {
    await api.createNutritionPlan(formData);
  } catch (error) {
    const parser = parseError(error);
    
    if (parser.isValidationError()) {
      const fieldErrors = parser.getFieldErrors();
      
      // Set errors on form fields
      Object.entries(fieldErrors).forEach(([field, errors]) => {
        form.setFieldError(field, errors[0]);
      });
    } else {
      // Show general error
      showNotification({
        title: 'Error',
        message: parser.humanize(),
        color: 'red'
      });
    }
  }
};
```

### Nested Field Errors

The parser automatically flattens nested errors:

```typescript
// API returns:
{
  error_detail: {
    fields: {
      recipe_ingredients: [
        { quantity: ["must be greater than 0"] },
        { ingredient_id: ["is required"] }
      ]
    }
  }
}

// Parser returns:
{
  "recipe_ingredients.0.quantity": ["must be greater than 0"],
  "recipe_ingredients.1.ingredient_id": ["is required"]
}
```

### Error Display

```typescript
import { humanizeError } from '@easy/error-parser';

try {
  await api.deleteIngredient(id);
} catch (error) {
  const message = humanizeError(error);
  // "The requested resource was not found."
  // "You are not authorized to perform this action."
  // "Please correct 2 fields and try again."
  
  toast.error(message);
}
```

## Utilities

### `capitalizeWords(str: string): string`

Capitalizes the first letter of each word in a string.

```typescript
import { capitalizeWords } from '@easy/error-parser';

capitalizeWords('recipe ingredients quantity');
// "Recipe Ingredients Quantity"
```

## License

ISC
