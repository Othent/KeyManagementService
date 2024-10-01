// SDK:
// If you are looking at the code, this is probably where you'd want to start.

export { Othent } from "./lib/othent/othent";
export type * from "./lib/othent/othent.types";

// Config:

export {
  DEFAULT_OTHENT_CONFIG,
  DEFAULT_OTHENT_OPTIONS,
  DEFAULT_APP_INFO,
  DEFAULT_GATEWAY_CONFIG,
  DEFAULT_DISPATCH_NODE,
  DEFAULT_COOKIE_KEY,
  DEFAULT_LOCAL_STORAGE_KEY,
  // CLIENT_NAME,     // Already exported as static member
  // CLIENT_VERSION,  // Already exported as static member
  // ANALYTICS_TAGS,  // Not needed (only used internally)
} from "./lib/config/config.constants";

export type * from "./lib/config/config.types";

// Auth0:
// Almost everything here is internal.

export type {
  Auth0Provider,
  Auth0Sub,
  Auth0ProviderLabel,
  Auth0WalletAddressLabel,
  ANSDomain,
  OthentWalletAddressLabel,
  UserDetails,
} from "./lib/auth/auth0.types";

// TODO: Add this to the docs:
export { PROVIDER_LABELS } from "./lib/auth/auth0.constants";

// ArConnect:
// Export ArConnnect types that are also used to type params on `Othent`.

export type {
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
export type * from "./lib/utils/typescript/url.types";

// LIB (these should eventually be moved to their own repos):

// Legacy serialized buffer types. Exported for backwards compatibility / easier migration.

export type {
  BufferObject,
  LegacyBufferRecord,
  LegacyBufferObject,
  LegacyBufferData,
} from "./lib/utils/lib/legacy-serialized-buffers/legacy-serialized-buffer.types";

export {
  isLegacyBufferObject,
  isBufferObject,
  toLegacyBufferRecord,
  toLegacyBufferObject,
} from "./lib/utils/lib/legacy-serialized-buffers/legacy-serialized-buffer.utils";

// Buffer utils & transforms:

export type * from "./lib/utils/lib/binary-data-types/binary-data-types.types";
export * from "./lib/utils/lib/binary-data-types/binary-data-types.utils";
