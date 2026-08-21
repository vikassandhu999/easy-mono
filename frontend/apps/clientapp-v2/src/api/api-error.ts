/**
 * Thrown by every query/mutation on a non-2xx response. Carries the parsed
 * error body under `data` — the shape `@/api/shared` helpers read.
 */
export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, data: unknown) {
    const message =
      data && typeof data === 'object' && 'error_message' in data && typeof data.error_message === 'string'
        ? data.error_message
        : `Request failed with status ${status}`;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}
