import { AxiosError } from 'axios';

/**
 * Type guard to check if error is an Axios error
 *
 * @param error - The error object to check
 * @returns True if the error is an Axios error, false otherwise
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as { isAxiosError: unknown }).isAxiosError === true
  );
}

/**
 * Extracts error details from an unknown error object
 * Prioritizes Axios error response data, falls back to error message
 *
 * @param error - The error object to extract details from
 * @returns The extracted error details (data or message)
 */
export function extractErrorDetails(error: unknown): unknown {
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError;
    // Return response.data if available, otherwise return the error message
    if (axiosError.response?.data) {
      return axiosError.response.data;
    }
    return axiosError.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return error;
}

/**
 * Type guard to check if an error is a 404 Not Found error
 *
 * @param error - The error object to check
 * @returns True if the error is a 404, false otherwise
 */
export function is404Error(error: unknown): boolean {
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError;
    return axiosError.response?.status === 404;
  }
  return false;
}
