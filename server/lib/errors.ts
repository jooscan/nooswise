/**
 * Errors thrown anywhere below the route layer carry their own HTTP status, so handlers
 * do not each need to translate failure modes into responses.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static notFound(what = 'Split') {
    return new ApiError(404, 'not_found', `${what} not found`);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, 'bad_request', message, details);
  }

  /** Used when a delete is refused because other rows still reference the target. */
  static conflict(message: string, details?: unknown) {
    return new ApiError(409, 'conflict', message, details);
  }
}

export function toErrorResponse(err: unknown): {
  status: number;
  body: { error: string; code: string; details?: unknown };
} {
  if (err instanceof ApiError) {
    return {
      status: err.status,
      body: { error: err.message, code: err.code, details: err.details },
    };
  }
  return {
    status: 500,
    body: { error: 'Internal server error', code: 'internal_error' },
  };
}
