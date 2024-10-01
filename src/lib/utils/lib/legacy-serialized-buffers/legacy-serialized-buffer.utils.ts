import {
  B64String,
  B64UrlString,
} from "../binary-data-types/binary-data-types.types";
import { UI8A } from "../binary-data-types/binary-data-types.utils";
import {
  LegacyBufferData,
  LegacyBufferObject,
  BufferObject,
  LegacyBufferRecord,
} from "./legacy-serialized-buffer.types";

// TYPE GUARDS:

export function isLegacyBufferObject(
  legacyBufferData: LegacyBufferData,
): legacyBufferData is LegacyBufferObject {
  return (
    !!legacyBufferData &&
    typeof legacyBufferData === "object" &&
    (legacyBufferData as LegacyBufferObject).type === "Buffer" &&
    Array.isArray((legacyBufferData as LegacyBufferObject).data)
  );
}

/**
 * Alias of `isLegacyBufferObject`.
 */
export function isBufferObject(obj: any): obj is BufferObject {
  return isLegacyBufferObject(obj);
}

// CONVERSION:

export function toLegacyBufferRecord(buffer: Uint8Array): LegacyBufferRecord {
  return Object.fromEntries(Object.entries(Array.from(buffer)));
}

export function toLegacyBufferObject(buffer: Uint8Array): LegacyBufferObject {
  return {
    type: "Buffer",
    data: Array.from(buffer),
  };
}

// NORMALIZATION:

// TODO: Update the ping endpoint in the other PR.

export function normalizeLegacyBufferDataOrB64(
  data?: null,
  treatStringsAsB64?: boolean,
): null;
export function normalizeLegacyBufferDataOrB64(
  data:
    | LegacyBufferRecord
    | LegacyBufferObject
    | string
    | B64String
    | B64UrlString,
  treatStringsAsB64?: boolean,
): Uint8Array;
export function normalizeLegacyBufferDataOrB64(
  data?:
    | null
    | LegacyBufferRecord
    | LegacyBufferObject
    | string
    | B64String
    | B64UrlString,
  treatStringsAsB64 = false,
): null | Uint8Array {
  if (data === null || data === undefined) return null;

  if (typeof data === "string") {
    return treatStringsAsB64
      ? UI8A.from(data, "B64StringOrUrlString")
      : UI8A.from(data, "string");
  }

  if (isLegacyBufferObject(data)) {
    return new Uint8Array(data.data);
  }

  return new Uint8Array(Object.values(data));
}
