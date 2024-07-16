import * as B64js from "base64-js";

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

export type BinaryDataType = ArrayBuffer | TypedArray | DataView;

export function concatBuffers(
  buffers: Uint8Array[] | ArrayBuffer[],
): Uint8Array {
  let total_length = 0;

  for (let i = 0; i < buffers.length; i++) {
    total_length += buffers[i].byteLength;
  }

  let temp = new Uint8Array(total_length);
  let offset = 0;

  temp.set(new Uint8Array(buffers[0]), offset);
  offset += buffers[0].byteLength;

  for (let i = 1; i < buffers.length; i++) {
    temp.set(new Uint8Array(buffers[i]), offset);
    offset += buffers[i].byteLength;
  }

  return temp;
}

export function b64UrlToString(b64UrlString: string): string {
  let buffer = b64UrlToBuffer(b64UrlString);

  return bufferToString(buffer);
}

export function bufferToString(buffer: BinaryDataType): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
}

export function stringToBuffer(string: string): Uint8Array {
  return new TextEncoder().encode(string);
}

export function stringToB64Url(string: string): string {
  return bufferTob64Url(stringToBuffer(string));
}

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

export async function hash(
  data: Uint8Array,
  algorithm: string = "SHA-256",
): Promise<Uint8Array> {
  let digest = await crypto.subtle.digest(algorithm, data);
  return new Uint8Array(digest);
}

export async function ownerToAddress(owner: string): Promise<string> {
  return bufferTob64Url(await hash(b64UrlToBuffer(owner)));
}
