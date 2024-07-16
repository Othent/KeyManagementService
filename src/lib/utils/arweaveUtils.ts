import * as B64js from "base64-js";

// BINARY DATA TYPES:

export type Base64UrlString = string;

export type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  // | Float16Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

export type BinaryDataType = ArrayBuffer | TypedArray | DataView | Buffer;

export function binaryDataTypeToString(buffer: BinaryDataType): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
}

export function binaryDataTypeOrStringToString(
  source: string | BinaryDataType,
) {
  return typeof source === "string" ? source : binaryDataTypeToString(source);
}

export function binaryDataTypeOrStringToBinaryDataType(
  source: string | BinaryDataType,
) {
  return typeof source === "string" ? stringToUint8Array(source) : source;
}

export function stringToUint8Array(string: string): Uint8Array {
  return new TextEncoder().encode(string);
}

// export function bufferToUint8Array(buffer: Buffer): Uint8Array {
//   return new Uint8Array(new Uint8Array(buffer.buffer));
//
//   // Note that simply doing:
//   // return new Uint8Array(buffer.buffer);
//   // The old Buffer and the new Uint8Array will share the same data/memory, so changes to one also affect the other.
// }

// BASE 64:

export function b64UrlToBuffer(b64UrlString: string): Uint8Array {
  return new Uint8Array(B64js.toByteArray(b64UrlDecode(b64UrlString)));
}

export function bufferTob64(buffer: Uint8Array): string {
  return B64js.fromByteArray(new Uint8Array(buffer));
}

export function bufferTob64Url(buffer: Uint8Array): string {
  return b64UrlEncode(bufferTob64(buffer));
}

export function b64UrlEncode(b64UrlString: string): string {
  return b64UrlString
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/\=/g, "");
}

export function b64UrlDecode(b64UrlString: string): string {
  b64UrlString = b64UrlString.replace(/\-/g, "+").replace(/\_/g, "/");
  let padding;
  b64UrlString.length % 4 == 0
    ? (padding = 0)
    : (padding = 4 - (b64UrlString.length % 4));
  return b64UrlString.concat("=".repeat(padding));
}

// HASH:

export async function hash(
  data: Uint8Array,
  algorithm: string = "SHA-256",
): Promise<Uint8Array> {
  let digest = await crypto.subtle.digest(algorithm, data);
  return new Uint8Array(digest);
}

// ADDRESS:

export async function ownerToAddress(owner: string): Promise<string> {
  return bufferTob64Url(await hash(b64UrlToBuffer(owner)));
}
