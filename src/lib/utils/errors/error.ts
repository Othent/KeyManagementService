// Error serialization sent by the backend:

export interface BasicErrorData {
  name: string;
  message: string;
  stack?: string;
}

export interface ErrorResponseData {
  error: true;
  id: OthentErrorID;
  developerMessage?: string;
  cause?: BasicErrorData;
}

// Same as backend (KMS-server-new):

export enum OthentErrorID {
  Unexpected = "Unexpected",
  Validation = "Validation",
  UserCreation = "UserCreation",
  Encryption = "Encryption",
  Decryption = "Decryption",
  Signing = "Signing",
  PublicKey = "PublicKey",
}

// Custom Othent error class for the client/frontend:

export class OthentError extends Error {
  id: OthentErrorID;
  developerMessage: string;
  cause?: Error;

  constructor(
    id: OthentErrorID,
    developerMessage: string,
    error?: unknown,
    fromServer = false,
  ) {
    super();

    // Native error props:
    this.name = id;
    this.message = developerMessage || "";

    if (fromServer) {
      this.stack = `${id} (from server): ${developerMessage}\n`;
    } else {
      Error.captureStackTrace(this); // Sets this.stack
    }

    // Custom OthentServerError props:
    this.id = id;
    this.developerMessage = developerMessage;

    if (error instanceof Error) {
      this.cause = error;
    } else if (typeof error === "string" || typeof error === "number") {
      this.cause = new Error(`${error}`);
    }
  }
}
