import { HttpError } from "./http-error";

export class ValidationError extends HttpError {
  constructor(
    public message: string,
    public details: Record<string, string>,
  ) {
    super(message, 400);
    this.name = "ValidationError";
    Error.captureStackTrace(this, this.constructor);
  }
}
