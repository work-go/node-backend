export type ErrorStatusCodes = 200 | 401 | 403 | 404 | 500;

export class HttpError extends Error {
  constructor(
    public message: string,
    public meta: { cause?: string; statusCode: ErrorStatusCodes },
  ) {
    super(message);
    this.name = "HttpError";
    Error.captureStackTrace(this, this.constructor);
  }
}
