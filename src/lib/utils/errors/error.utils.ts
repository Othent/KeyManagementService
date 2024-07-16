import { isAxiosError } from "axios";
import { ErrorResponseData, OthentError, OthentErrorID } from "./error";

function isErrorResponseData(data: unknown): data is ErrorResponseData {
  return (
    typeof data === "object" &&
    (data as ErrorResponseData).error === true &&
    !!(data as ErrorResponseData).id &&
    !!OthentErrorID[(data as ErrorResponseData).id]
  );
}

export function parseErrorResponse(error: unknown) {
  if (isAxiosError(error)) {
    const data = error.response?.data;

    if (!isErrorResponseData(data)) {
      return error;
    }

    const { id, developerMessage, cause } = data;

    let causeError: Error | undefined;

    if (cause) {
      causeError = new Error(cause.message);
      causeError.name = cause.name;
      causeError.stack = cause.stack;
    }

    return new OthentError(id, developerMessage || "", causeError, true);
  }

  if (error instanceof Error) {
    return error;
  }

  // TODO: Replace with custom error like the one on the server:
  return new Error("Unknown error");
}
