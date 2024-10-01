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
    return UI8A.from(data, "B64StringOrUrlString");
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
