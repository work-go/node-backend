import { ErrorStatusCodes, HttpError } from "./http-error";

export class HttpInputError extends HttpError {
  constructor(
    public message: string,
    public meta: {
      cause?: string;
      statusCode: ErrorStatusCodes;
      details: Record<string, string>;
    }
  ) {
    super(message, meta);
    this.name = "HttpInputError";
  }
}
