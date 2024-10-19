import { HttpError } from "./http-error";

export class AuthorizationError extends HttpError {
  constructor(public message: string) {
    super(message, 403);
    this.name = "AuthorizationError";
    Error.captureStackTrace(this, this.constructor);
  }
}
