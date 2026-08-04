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

const VEHICLE_UNREACHABLE_MESSAGES = [
  'context deadline exceeded',
  'vehicle unavailable',
  'timeout',
];
const VEHICLE_UNREACHABLE_STATUS_CODES = [408, 504];
const VEHICLE_UNREACHABLE_ERROR_CODES = ['ECONNABORTED', 'ETIMEDOUT'];

function extractResponseMessages(responseData: unknown): string {
  if (typeof responseData === 'string') {
    return responseData;
  }

  if (!responseData || typeof responseData !== 'object') {
    return '';
  }

  const { error, error_description: errorDescription } = responseData as {
    error?: unknown;
    error_description?: unknown;
  };

  return [error, errorDescription]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
}

function containsUnreachableMessage(responseData: unknown): boolean {
  const details = extractResponseMessages(responseData).toLowerCase();

  if (!details) {
    return false;
  }

  return VEHICLE_UNREACHABLE_MESSAGES.some((message) => details.includes(message));
}

/**
 * Type guard to check if an error means the vehicle could not be reached in time
 * Covers Tesla's "context deadline exceeded" responses (asleep or offline vehicle),
 * gateway timeout statuses and client-side request timeouts
 *
 * @param error - The error object to check
 * @returns True if the error is an expected timeout rather than an internal bug
 */
export function isVehicleUnreachableError(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false;
  }

  const axiosError = error as AxiosError;

  if (axiosError.code && VEHICLE_UNREACHABLE_ERROR_CODES.includes(axiosError.code)) {
    return true;
  }

  const status = axiosError.response?.status;
  if (status && VEHICLE_UNREACHABLE_STATUS_CODES.includes(status)) {
    return true;
  }

  return containsUnreachableMessage(axiosError.response?.data);
}

/**
 * Type guard to check if an error indicates a revoked Tesla token
 * Checks for both 401 status and specific "token revoked" message
 *
 * @param error - The error object to check
 * @returns True if the error indicates token revocation, false otherwise
 */
export function isTokenRevokedError(error: unknown): boolean {
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError;

    if (axiosError.response?.status !== 401) {
      return false;
    }

    const responseData = axiosError.response?.data;
    if (
      responseData &&
      typeof responseData === 'object' &&
      'error' in responseData
    ) {
      const errorMessage = (responseData as { error: unknown }).error;
      return (
        typeof errorMessage === 'string' &&
        errorMessage.toLowerCase().includes('token revoked')
      );
    }

    return false;
  }
  return false;
}
