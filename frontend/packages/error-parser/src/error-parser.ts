import {capitalizeWords} from './text-utils';

export interface APIError {
  error_code: 'internal_error' | 'invalid_code' | 'invalid_input' | 'not_found' | 'unauthorized';
  error_detail: null | Record<string, any> | {fields?: Record<string, any>};
  error_message: string;
  status: 'bad_request' | 'forbidden' | 'not_found' | 'unprocessable_entity';
}

export interface WrappedError {
  data: APIError;
}

const DEFAULT_ERROR: APIError = {
  error_code: 'internal_error',
  error_detail: null,
  error_message: 'An unexpected error occurred.',
  status: 'bad_request',
};

class APIErrorParser {
  private err: APIError;

  constructor(err: unknown | WrappedError) {
    // Handle various error formats gracefully
    if (err && typeof err === 'object' && 'data' in err && err.data && typeof err.data === 'object') {
      const data = err.data as Record<string, unknown>;
      // Check if it looks like our API error format
      if ('error_code' in data || 'error_message' in data) {
        this.err = err.data as APIError;
      } else {
        this.err = DEFAULT_ERROR;
      }
    } else if (err && typeof err === 'object' && 'message' in err) {
      // Handle standard Error objects or axios errors without proper data
      this.err = {
        ...DEFAULT_ERROR,
        error_message: (err as {message: string}).message,
      };
    } else {
      this.err = DEFAULT_ERROR;
    }
  }

  /**
   * Recursively flattens nested field errors into dot notation
   * e.g., recipe_ingredients[3].quantity -> "recipe_ingredients.3.quantity"
   */
  private flattenFieldErrors(
    obj: any,
    parentPath: string = '',
    result: Record<string, string[]> = {},
  ): Record<string, string[]> {
    if (Array.isArray(obj)) {
      // Handle array: check each item
      obj.forEach((item, index) => {
        const currentPath = parentPath ? `${parentPath}.${index}` : `${index}`;

        if (Array.isArray(item) && typeof item[0] === 'string') {
          // This is an array of error strings
          result[currentPath] = item;
        } else if (typeof item === 'object' && item !== null && Object.keys(item).length > 0) {
          // This is an object with nested errors
          this.flattenFieldErrors(item, currentPath, result);
        }
      });
    } else if (typeof obj === 'object' && obj !== null) {
      // Handle object: recurse into each property
      Object.keys(obj).forEach((key) => {
        const currentPath = parentPath ? `${parentPath}.${key}` : key;
        const value = obj[key];

        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
          // This is an array of error strings
          result[currentPath] = value;
        } else if (typeof value === 'object' && value !== null) {
          // Recurse deeper
          this.flattenFieldErrors(value, currentPath, result);
        }
      });
    }

    return result;
  }

  /**
   * Returns a human-readable error message
   */
  humanize(): string {
    switch (this.err.error_code) {
      case 'not_found':
        return this.str_from_not_found();
      case 'unauthorized':
        return this.str_from_unauthorized();
      case 'invalid_input':
        return this.str_from_invalid_input();
      case 'internal_error':
        return this.str_from_internal_error();
      default:
        return this.err.error_message ?? 'An unexpected error occurred.';
    }
  }

  /**
   * Returns field-level validation errors as a map (flattened with dot notation)
   * e.g., { "recipe_ingredients.3.quantity": ["error message"] }
   */
  getFieldErrors(): null | Record<string, string[]> {
    if (
      this.err.error_code === 'invalid_input' &&
      this.err.error_detail &&
      typeof this.err.error_detail === 'object' &&
      'fields' in this.err.error_detail
    ) {
      const fields = this.err.error_detail.fields;
      if (fields) {
        return this.flattenFieldErrors(fields);
      }
    }
    return null;
  }

  /**
   * Returns the first error message for a specific field
   */
  getFieldError(fieldName: string): null | string {
    const fieldErrors = this.getFieldErrors();
    if (fieldErrors && fieldErrors[fieldName] && fieldErrors[fieldName].length > 0) {
      return fieldErrors[fieldName][0];
    }
    return null;
  }

  /**
   * Returns all error messages for a specific field
   */
  getAllFieldErrors(fieldName: string): string[] {
    const fieldErrors = this.getFieldErrors();
    if (fieldErrors && fieldErrors[fieldName]) {
      return fieldErrors[fieldName];
    }
    return [];
  }

  /**
   * Checks if a specific field has errors
   */
  hasFieldError(fieldName: string): boolean {
    const fieldErrors = this.getFieldErrors();
    return !!(fieldErrors && fieldErrors[fieldName] && fieldErrors[fieldName].length > 0);
  }

  private str_from_not_found(): string {
    // Use backend message if available, otherwise provide default
    if (this.err.error_message) {
      return this.err.error_message;
    }
    return 'The requested resource was not found.';
  }

  private str_from_unauthorized(): string {
    // Use backend message if available, otherwise provide default
    if (this.err.error_message) {
      return this.err.error_message;
    }
    return 'You are not authorized to perform this action.';
  }

  private str_from_invalid_input(): string {
    // If there are field errors, provide a summary
    const fieldErrors = this.getFieldErrors();
    if (fieldErrors) {
      const fieldCount = Object.keys(fieldErrors).length;
      if (fieldCount === 1) {
        const fieldName = Object.keys(fieldErrors)[0];
        const errors = fieldErrors[fieldName];
        // Clean up field path for display (replace dots with spaces)
        const displayName = fieldName.replace(/\./g, ' ').replace(/\d+/g, (match) => `#${match}`);
        return `${capitalizeWords(displayName)}: ${errors.join(', ')}`;
      }
      return `Please correct ${fieldCount} field${fieldCount > 1 ? 's' : ''} and try again.`;
    }

    // Use backend message if available
    if (this.err.error_message) {
      return this.err.error_message;
    }

    return 'The data provided was invalid.';
  }

  private str_from_internal_error(): string {
    // Use backend message if available, otherwise provide default
    if (this.err.error_message) {
      return this.err.error_message;
    }
    return 'An internal error occurred. Please try again later.';
  }

  /**
   * Returns the raw error object
   */
  getRawError(): APIError {
    return this.err;
  }

  /**
   * Returns the HTTP status code as a number
   */
  getStatusCode(): number {
    switch (this.err.status) {
      case 'not_found':
        return 404;
      case 'forbidden':
        return 403;
      case 'unprocessable_entity':
        return 422;
      case 'bad_request':
        return 400;
      default:
        return 500;
    }
  }

  /**
   * Checks if the error is a validation error
   */
  isValidationError(): boolean {
    return this.err.error_code === 'invalid_input';
  }

  /**
   * Checks if the error is an authorization error
   */
  isAuthError(): boolean {
    return this.err.error_code === 'unauthorized';
  }

  /**
   * Checks if the error is a not found error
   */
  isNotFoundError(): boolean {
    return this.err.error_code === 'not_found';
  }
}

// Factory function - use this instead of `new APIErrorParser()`
export const parseError = (err: unknown | WrappedError): APIErrorParser => {
  return new APIErrorParser(err);
};

// Convenience functions for quick access
export const humanizeError = (err: unknown | WrappedError): string => {
  return parseError(err).humanize();
};

export const getFieldErrors = (err: unknown | WrappedError): null | Record<string, string[]> => {
  return parseError(err).getFieldErrors();
};

export const getFieldError = (err: unknown | WrappedError, fieldName: string): null | string => {
  return parseError(err).getFieldError(fieldName);
};

export const isValidationError = (err: unknown | WrappedError): boolean => {
  return parseError(err).isValidationError();
};

export default APIErrorParser;
