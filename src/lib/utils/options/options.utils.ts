import extend from "extend";

export function mergeOptions<T>(options: Partial<T>, defaults: T): T {
  return extend(true, {}, defaults, options);
}
