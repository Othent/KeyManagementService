import type Arweave from "arweave/web";
import { UrlString } from "../utils/typescript/url.types";
import { UserDetails } from "../auth/auth0.types";
import { OthentError } from "../utils/errors/error";
import { Tag as WarpBundleTag } from "warp-arbundles";

// EVENTS:

export type OthentEventType = "auth" | "error";

export type AuthListener = (
  userDetails: UserDetails | null,
  isAuthenticated: boolean,
) => void;

export type ErrorListener = (err: Error | OthentError) => void;

export type EventListenersByType = {
  auth: AuthListener;
  error: ErrorListener;
};

// DISPATCH:

export interface DispatchOptions {
  arweave?: Arweave;
  node?: UrlString;
}

export interface ArDriveBundledTransactionResponseData {
  id: string;
  timestamp: number;
  winc: string;
  version: string;
  deadlineHeight: number;
  dataCaches: string[];
  fastFinalityIndexes: string[];
  public: string;
  signature: string;
  owner: string;
}

export interface ArDriveBundledTransactionData
  extends ArDriveBundledTransactionResponseData {
  type: "BUNDLED";
}

export interface UploadedTransactionData {
  type: "BASE";
  id: string;
  signature: string;
  owner: string;
}

// DATA ITEM:

export type TagData = WarpBundleTag;

export interface DataItem {
  data: string | Uint8Array;
  target?: string;
  anchor?: string;
  tags?: TagData[];
}
