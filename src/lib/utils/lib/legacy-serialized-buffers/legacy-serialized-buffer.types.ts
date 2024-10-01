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
