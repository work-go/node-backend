import { HttpError } from "./http-error";

export class AuthenticationError extends HttpError {
  constructor(public message: string) {
    super(message, 401);
    this.name = "AuthenticationError";
    Error.captureStackTrace(this, this.constructor);
  }
}
