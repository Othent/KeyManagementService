export function isPromise<T>(obj: Promise<T> | unknown): obj is Promise<T> {
  return (
    !!obj &&
    (typeof obj === "object" || typeof obj === "function") &&
    typeof (obj as any).then === "function"
  );
}