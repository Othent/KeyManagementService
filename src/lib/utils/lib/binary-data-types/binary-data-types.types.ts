// BINARY DATA TYPES:

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

export type BinaryDataType =
  | ArrayBuffer
  | ArrayBufferView
  | TypedArray
  | DataView
  | Buffer;

// BASE 64:

// Let's use branded types here to make sure we always know what we are working with:

export type StringSourceType =
  | "string"
  | "B64String"
  | "B64UrlString"
  | "B64StringOrUrlString";

export type B64String = string & { __brand: "B64String" };

export type B64UrlString = string & { __brand: "B64UrlString" };

// export type VerifiedUTF16String = string & { __brand: "VerifiedUTF16String" };
