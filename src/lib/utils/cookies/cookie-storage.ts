import { mergeOptions } from "../options/options.utils";

export interface CookieOptions {
  secure: boolean;
  domain: boolean | string;
  ttlHours: number;
}

export interface CookieParams {
  secureParam: "secure" | null;
  domainParam: `domain=${string}` | null;
  ttlMs: number;
}

export const DEFAULT_COOKIE_OPTIONS = {
  secure: true,
  domain: true,
  ttlHours: 360,
} as const satisfies CookieOptions;

export type CookieStr =
  | `${string}=${string};`
  | `${string}=${string}; ${string}`;

export class CookieStorage implements Storage {
  static COOKIE_SEPARATOR = /\s*;\s*/;

  static COOKIE_VALUE_SEPARATOR = /\s*=\s*/;

  private secureParam: "secure" | null = null;

  private domainParam: `domain=${string}` | null = null;

  private ttlMs = 1296000000; // 2 weeks

  constructor(cookieOptions: Partial<CookieOptions> = DEFAULT_COOKIE_OPTIONS) {
    const { secureParam, domainParam, ttlMs } = this.parseCookieOptions(
      mergeOptions(cookieOptions, DEFAULT_COOKIE_OPTIONS),
    );

    this.secureParam = secureParam;
    this.domainParam = domainParam;
    this.ttlMs = ttlMs;

    // Indexer method from Storage (`[name: string]: any`):

    return new Proxy(this, {
      get(target: CookieStorage, prop: keyof CookieStorage) {
        return prop in target || typeof prop !== "string"
          ? target[prop]
          : target.getItem(prop);
      },
      ownKeys(target) {
        return document.cookie
          .split(CookieStorage.COOKIE_SEPARATOR)
          .map(
            (cookieStr) =>
              cookieStr.split(CookieStorage.COOKIE_VALUE_SEPARATOR)[0],
          );
      },
      getOwnPropertyDescriptor() {
        return {
          enumerable: true,
          configurable: true,
        };
      },
    });
  }

  private parseCookieOptions({
    secure,
    domain,
    ttlHours,
  }: Partial<CookieOptions> = {}): CookieParams {
    const secureParam = secure
      ? "secure"
      : secure === undefined
        ? this.secureParam
        : null;
    const domainParam = domain
      ? (`domain=${domain === true ? location.host : domain}` as const)
      : domain === undefined
        ? this.domainParam
        : null;
    const ttlMs = ttlHours
      ? ttlHours * 3600000
      : ttlHours === undefined
        ? this.ttlMs
        : 0;

    return {
      secureParam,
      domainParam,
      ttlMs,
    };
  }

  private getCookieParams(cookieOptions?: Partial<CookieOptions>) {
    const { secureParam, domainParam, ttlMs } =
      this.parseCookieOptions(cookieOptions);

    const expirationDate = new Date(Date.now() + ttlMs);
    const expiresParam = `expires=${expirationDate.toUTCString()}`;
    const pathParam = "path=/";

    const cookieParams = [expiresParam, secureParam, domainParam, pathParam]
      .filter(Boolean)
      .join("; ");

    return cookieParams ? (` ${cookieParams};` as const) : "";
  }

  get length(): number {
    return document.cookie
      ? document.cookie.split(CookieStorage.COOKIE_SEPARATOR).length
      : 0;
  }

  key(index: number): string | null {
    const cookieStrAtIndex =
      document.cookie.split(CookieStorage.COOKIE_SEPARATOR)[index] || "";
    const cookieKey = cookieStrAtIndex.split(
      CookieStorage.COOKIE_VALUE_SEPARATOR,
    )[0];

    return cookieKey || null;
  }

  getItem(name: string): string | null {
    const targetCookie = document.cookie
      .split(CookieStorage.COOKIE_SEPARATOR)
      .find((item) => {
        return item.split(CookieStorage.COOKIE_VALUE_SEPARATOR)[0] === name;
      });

    return (
      (targetCookie &&
        targetCookie.split(CookieStorage.COOKIE_VALUE_SEPARATOR)[1]) ||
      null
    );
  }

  setItem<T>(
    key: string,
    value: T,
    cookieOptions?: Partial<CookieOptions>,
  ): CookieStr {
    const serializedValue =
      typeof value === "string" ? value : JSON.stringify(value);
    const cookieParams = this.getCookieParams(cookieOptions);

    if (process.env.NODE_ENV === "development") {
      const actionLabel =
        (cookieOptions?.ttlHours || 1) < 0 ? "Removing" : "Setting";

      console.info(`${actionLabel} cookie ${key}=<VALUE>;${cookieParams}`);
    }

    const cookieStr =
      `${key}=${serializedValue};${cookieParams}` as const satisfies CookieStr;

    document.cookie = cookieStr;

    return cookieStr;
  }

  removeItem(key: string, cookieOptions?: Partial<CookieOptions>) {
    return this.setItem(key, "", { ...cookieOptions, ttlHours: -1 });
  }

  clear() {
    document.cookie.split(CookieStorage.COOKIE_SEPARATOR).forEach((item) => {
      this.removeItem(item.split(CookieStorage.COOKIE_VALUE_SEPARATOR)[0]);
    });
  }
}

let cookieStorage: CookieStorage | null = null;

export function getCookieStorage() {
  if (!cookieStorage) {
    const hostname = typeof location === "undefined" ? "" : location.hostname;
    const isDevelopment =
      process.env.NODE_ENV === "development" && hostname === "localhost";

    cookieStorage = new CookieStorage({
      secure: !isDevelopment,
      domain: isDevelopment ? undefined : hostname,
    });
  }

  return cookieStorage;
}
