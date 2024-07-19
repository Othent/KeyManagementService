export interface CommonEncodedRequestData {
  encodedData: string;
}

/**
 * JSON-compatible representation of a Buffer.
 * @deprecated This type will soon be removed and the code will be updated to work exclusively with native binary data types (e.g. `Uint8Array`).
 */
export interface BufferObject {
  type: "Buffer";
  data: number[];
}

export function isBufferObject(obj: any): obj is BufferObject {
  return (
    obj.type === "Buffer" &&
    Array.isArray(obj.data) &&
    typeof obj[0] === "number"
  );
}
