/**
 * Custom errors and HTTP status mapping. Centralized for consistent API responses.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'AppError'
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400, 'BAD_REQUEST')
    this.name = 'BadRequestError'
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError
}

export function toHttpStatus(err: unknown): number {
  if (isAppError(err)) return err.statusCode
  return 500
}
