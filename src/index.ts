// functions
export * from "./lib/mapping/connect";
export * from "./lib/mapping/decrypt";
export * from "./lib/mapping/disconnect";
export * from "./lib/mapping/dispatch";
export * from "./lib/mapping/encrypt";
export * from "./lib/mapping/getActiveAddress";
export * from "./lib/mapping/getActivePublicKey";
export * from "./lib/mapping/getUserDetails";
export * from "./lib/mapping/getWalletNames";
export * from "./lib/mapping/reconnect";
export * from "./lib/mapping/sign";
export * from "./lib/mapping/signature";
export * from "./lib/mapping/signDataItem";
export * from "./lib/mapping/signMessage";
export * from "./lib/mapping/verifyMessage";
// types
export * from "./types/mapping/connect";

import { Buffer } from "buffer";
window.Buffer = Buffer;


// Break the build if the env variables are missing:
if (!process.env.auth0ClientDomain || !process.env.auth0ClientId || !process.env.kmsServerBaseUrl) {
    process.exit(1);
}
