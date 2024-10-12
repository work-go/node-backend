import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { ZodIssue } from "zod";

export type ErrorField = string;
export type FieldError = string;

const ErrorFieldNameMap: Record<ErrorField, string> = {};

const formatErrorField = (field: ErrorField) => {
  const correspondingFieldName = ErrorFieldNameMap[field];
  if (correspondingFieldName !== undefined) return correspondingFieldName;
  return field;
};

export const mapZodIssuesToErrorMessages = (issues: ZodIssue[]) => {
  return issues.reduce((errors, issue) => {
    const fieldName: ErrorField = issue.path
      .map((path) => formatErrorField(path.toString()))
      .join(",");

    return {
      ...errors,
      [fieldName]: issue.message,
    };
  }, {} as Record<ErrorField, FieldError>);
};

const PrismaKnownErrorMap = {
  P2002: [{ target: "email", message: "Email already exists" }],
} as const;

export const mapPrismaErrorToErrorMessages = (
  error: PrismaClientKnownRequestError
) => {
  const modelName = error.meta!.modelName as string;
  const targets = error.meta!.target as string[];

  if (!(PrismaKnownErrorMap as Record<string, any>)[error.code]) throw error;

  const codeErrors =
    PrismaKnownErrorMap[error.code as keyof typeof PrismaKnownErrorMap];

  const modelSpecificErrors = codeErrors.filter((e) =>
    "modelName" in e ? e.modelName === modelName : false
  );

  const correspondingModelSpecificError = modelSpecificErrors.find((e) =>
    targets.includes(e.target)
  );

  if (correspondingModelSpecificError)
    return {
      [correspondingModelSpecificError.target]:
        correspondingModelSpecificError.message,
    };

  const correspondingGeneralError = codeErrors.find((e) =>
    targets.includes(e.target)
  );

  if (correspondingGeneralError)
    return {
      [correspondingGeneralError.target]: correspondingGeneralError.message,
    };

  throw error;
};
