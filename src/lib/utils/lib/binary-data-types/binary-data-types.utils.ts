import * as B64js from "base64-js";
import {
  B64String,
  B64UrlString,
  BinaryDataType,
  StringSourceType,
} from "./binary-data-types.types";

// CONVERSION FUNCTIONS:

// Anything to Uint8Array:

export function uInt8ArrayFrom(
  source: string,
  stringSourceType: "string",
): Uint8Array;
export function uInt8ArrayFrom(
  source: B64String,
  stringSourceType: "B64String",
): Uint8Array;
export function uInt8ArrayFrom(
  source: B64UrlString,
  stringSourceType: "B64UrlString",
): Uint8Array;
export function uInt8ArrayFrom(
  source: B64String | B64UrlString,
  stringSourceType: "B64StringOrUrlString",
): Uint8Array;
export function uInt8ArrayFrom(source: BinaryDataType): Uint8Array;
export function uInt8ArrayFrom(
  source: string | B64String | B64UrlString | BinaryDataType,
  stringSourceType?: StringSourceType,
): Uint8Array {
  if (typeof source === "string") {
    if (stringSourceType === "string")
      return new TextEncoder().encode(source as string);
    if (stringSourceType === "B64String")
      return B64js.toByteArray(source as B64String);
    if (
      stringSourceType === "B64UrlString" ||
      stringSourceType === "B64StringOrUrlString"
    )
      return B64js.toByteArray(b64UrlDecode(source as B64UrlString));

    throw new Error("Unknown `stringSourceType`.");
  }

  if (source instanceof Uint8Array) {
    return source;
  }

  if (
    source instanceof Buffer ||
    source instanceof DataView ||
    ArrayBuffer.isView(source)
  ) {
    return new Uint8Array(source.buffer);
  }

  if (source instanceof ArrayBuffer) {
    return new Uint8Array(source);
  }

  throw new Error("Cannot parse `source`.");
}

export const UI8A = { from: uInt8ArrayFrom };

// Anything to B64:

export function b64From(source: string | BinaryDataType): B64String {
  return B64js.fromByteArray(
    typeof source === "string"
      ? UI8A.from(source, "string")
      : UI8A.from(source),
  ) as B64String;
}

export const B64 = { from: b64From };

// Anything to B64Url:

export function b64UrlFrom(source: string | BinaryDataType): B64UrlString {
  return b64UrlEncode(B64.from(source));
}

export function b64UrlEncode(str: B64String | B64UrlString): B64UrlString {
  return str
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/\=/g, "") as B64UrlString;
}

export function b64UrlDecode(str: B64String | B64UrlString): B64String {
  const padding = str.length % 4 == 0 ? 0 : 4 - (str.length % 4);

  return str
    .replace(/\-/g, "+")
    .replace(/\_/g, "/")
    .concat("=".repeat(padding)) as B64String;
}

export const B64Url = {
  from: b64UrlFrom,
  encode: b64UrlEncode,
  decode: b64UrlDecode,
};

// Anything to BinaryDataType:

export function binaryDataTypeFrom<T extends BinaryDataType>(
  source: string | T,
) {
  return typeof source === "string" ? UI8A.from(source, "string") : source;
}

export const BDT = { from: binaryDataTypeFrom };

// Old stuff:

// export function binaryDataTypeToString(buffer: BinaryDataType): string {
//   return new TextDecoder().decode(buffer);
// }

// export function bufferToUint8Array(buffer: Buffer): Uint8Array {
//   return new Uint8Array(new Uint8Array(buffer.buffer));
//
//   // Note that simply doing:
//   // return new Uint8Array(buffer.buffer);
//   // The old Buffer and the new Uint8Array will share the same data/memory, so changes to one also affect the other.
// }
