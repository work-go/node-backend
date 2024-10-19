export type ErrorStatusCodes = 200 | 400 | 401 | 403 | 404 | 500;

export class HttpError extends Error {
  constructor(
    public message: string,
    public statusCode: ErrorStatusCodes,
  ) {
    super(message);
    this.name = "HttpError";
    Error.captureStackTrace(this, this.constructor);
  }
}
