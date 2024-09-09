import {
  B64String,
  b64ToUint8Array,
  B64UrlString,
} from "../../utils/arweaveUtils";

export interface CommonEncodedRequestData {
  encodedData: string;
}

/**
 * @deprecated
 */
export type LegacyBufferRecord = Record<number, number>;

/**
 * @deprecated
 */
export interface LegacyBufferObject {
  type: "Buffer";
  data: number[];
}

/**
 * Alias of `LegacyBufferObject`.
 *
 * @deprecated
 */
export type BufferObject = LegacyBufferObject;

/**
 * JSON-compatible representation of a Buffer.
 * @deprecated This type will soon be removed and the code will be updated to work exclusively with native binary data types (e.g. `Uint8Array`).
 */
export type LegacyBufferData = LegacyBufferRecord | LegacyBufferObject;

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

// TODO: This lacks support for B64String | B64UrlString as the old version might send `string` back (from `decrypt`):

export function normalizeBufferDataWithNull(
  data?:
    | LegacyBufferRecord
    | LegacyBufferObject
    | B64String
    | B64UrlString
    | null,
) {
  if (data === null || data === undefined) return null;

  if (typeof data === "string") {
    return b64ToUint8Array(data);
  }

  if (isLegacyBufferObject(data)) {
    return new Uint8Array(data.data);
  }

  return new Uint8Array(Object.values(data));
}

export function toLegacyBufferRecord(buffer: Uint8Array): LegacyBufferRecord {
  return Object.fromEntries(Object.entries(Array.from(buffer)));
}

export function toLegacyBufferObject(buffer: Uint8Array): LegacyBufferObject {
  return {
    type: "Buffer",
    data: Array.from(buffer),
  };
}
