import { Buffer } from "buffer";

function padString(input: string): string {
  let segmentLength = 4;
  let stringLength = input.length;
  let diff = stringLength % segmentLength;

  if (!diff) {
    return input;
  }

  let position = stringLength;
  let padLength = segmentLength - diff;
  let paddedStringLength = stringLength + padLength;
  let buffer = Buffer.alloc(paddedStringLength);

  buffer.write(input);

  while (padLength--) {
    buffer.write("=", position++);
  }

  return buffer.toString();
}

function encode(input: string | Buffer, encoding: string = "utf8"): string {
  if (Buffer.isBuffer(input)) {
    return fromBase64(input.toString("base64"));
  }
  // @ts-ignore
  return fromBase64(Buffer.from(input as string, encoding).toString("base64"));
}

function decode(base64url: string, encoding: string = "utf8"): string {
  // @ts-ignore
  return Buffer.from(toBase64(base64url), "base64").toString(encoding);
}

function toBase64(base64url: string | Buffer): string {
  // We this to be a string so we can do .replace on it. If it's
  // already a string, this is a noop.
  base64url = base64url.toString();
  return padString(base64url).replace(/\-/g, "+").replace(/_/g, "/");
}

function fromBase64(base64: string): string {
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function toBuffer(base64url: string): Buffer {
  return Buffer.from(toBase64(base64url), "base64");
}

// TODO: Verify (test) these utils return the same values as the new ones:

export const base64Utils = {
  encode,
  decode,
  toBase64,
  fromBase64,
  toBuffer,
};
