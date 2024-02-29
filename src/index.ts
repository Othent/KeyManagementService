// functions
export * from "./lib/mapping/connect";
export * from "./lib/mapping/decrypt";
export * from "./lib/mapping/disconnect";
export * from "./lib/mapping/encrypt";
export * from "./lib/mapping/getActiveAddress";
export * from "./lib/mapping/getActivePublicKey";
export * from "./lib/mapping/getWalletNames";
export * from "./lib/mapping/sign";
export * from "./lib/mapping/signature";
export * from "./lib/mapping/dispatch";
export * from "./lib/mapping/signMessage";
export * from "./lib/mapping/verifyMessage";
export * from "./lib/mapping/signDataItem";
// types
export * from "./types/mapping/connect";

import { Buffer } from "buffer";
window.Buffer = Buffer;
