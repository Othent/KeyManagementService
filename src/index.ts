import { Buffer } from "buffer";

// TODO: Polyfill. Should we overwrite a global like this from a library?
window.Buffer = Buffer;

// SDK:
// If you are looking at the code, this is probably where you'd want to start.

export { Othent } from "./lib/othent/othent";
export * from "./lib/othent/othent.types";

// Config:

export {
  DEFAULT_OTHENT_CONFIG,
  DEFAULT_OTHENT_OPTIONS,
  DEFAULT_GATEWAY_CONFIG,
  DEFAULT_DISPATCH_NODE,
  DEFAULT_COOKIE_KEY,
  DEFAULT_LOCAL_STORAGE_KEY,
  // CLIENT_NAME,     // Already exported as static member
  // CLIENT_VERSION,  // Already exported as static member
  // ANALYTICS_TAGS,  // Not needed
} from "./lib/config/config.constants";

export * from "./lib/config/config.types";

// Auth0:
// Almost everything here is internal.

export { OthentWalletAddressName, UserDetails } from "./lib/auth/auth0.types";

// API:
// Export for backwards compatibility / easier migration.

export {
  BufferObject,
  isBufferObject,
} from "./lib/othent-kms-client/operations/common.types";

// ArConnect:
// Export ArConnnect types that are also used to type params on `Othent`.

export {
  PermissionType,
  // DispatchResult   // We have our own
  // AppInfo          // We have our own
  GatewayConfig,
  SignMessageOptions,
  // DataItem         // We have our own
} from "./lib/utils/arconnect/arconnect.types";

// Errors:
export { OthentErrorID, OthentError } from "./lib/utils/errors/error";

// Misc.:
export * from "./lib/utils/typescript/url.types";

// Buffer utils & transforms:
// TODO: Export everything from arweaveUtils, rename to bufferUtils or similar, add tests, consider adding them into a namespace/object (like in bufferUtils.ts).
export * from "./lib/utils/arweaveUtils";
