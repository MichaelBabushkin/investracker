// Utility function to parse backend validation errors
export interface BackendError {
  type: string;
  loc: (string | number)[];
  msg: string;
  input?: any;
  ctx?: any;
  url?: string;
}

export interface BackendErrorResponse {
  detail: string | BackendError[];
}

export function parseBackendError(error: any): string {
  // If error response exists
  if (error?.response?.data) {
    const errorData = error.response.data;
    
    // If detail is a string, return it directly
    if (typeof errorData.detail === 'string') {
      return errorData.detail;
    }
    
    // If detail is an array of validation errors
    if (Array.isArray(errorData.detail)) {
      const validationErrors = errorData.detail as BackendError[];
      
      // Convert validation errors to readable messages
      const errorMessages = validationErrors.map((err) => {
        const field = err.loc[err.loc.length - 1]; // Get the field name (last item in loc array)
        const fieldName = typeof field === 'string' ? field.charAt(0).toUpperCase() + field.slice(1) : field;
        return `${fieldName}: ${err.msg}`;
      });
      
      // Join multiple errors with line breaks
      return errorMessages.join('\n');
    }
    
    // If detail exists but is not string or array
    if (errorData.detail) {
      return 'An error occurred. Please try again.';
    }
    
    // If no detail but has message
    if (errorData.message) {
      return errorData.message;
    }
  }
  
  // Network or other errors
  if (error?.message) {
    return error.message;
  }
  
  // Fallback for unknown errors
  return 'An unexpected error occurred. Please try again.';
}
