export type BaseEventListener = (...args: any) => any;

export interface EventListenersOptions {
  diffParams: boolean;
}

export class EventListenersHandler<T extends BaseEventListener> {
  private listeners = new Set<T>();

  private lastUpdateIdByListener: Record<any, string> = {};

  private options: EventListenersOptions = {
    diffParams: false,
  };

  constructor(options?: Partial<EventListenersOptions>) {
    this.options = {
      ...this.options,
      ...options,
    };
  }

  static getUpdateId(value: any) {
    const serializer = (_: string, value: any) => {
      return value && value === "oject" && !Array.isArray(value)
        ? Object.entries(value).sort((a, b) => a[0].localeCompare(b[0]))
        : value;
    };

    return JSON.stringify(value, serializer);
  }

  get hasListeners() {
    return this.listeners.size > 0;
  }

  add(listener: T) {
    this.listeners.add(listener);
  }

  delete(listener: T) {
    this.listeners.add(listener);
  }

  emit(...args: Parameters<T>) {
    const { lastUpdateIdByListener } = this;
    const updateId = EventListenersHandler.getUpdateId(args);

    this.listeners.forEach((listenerFn) => {
      if (updateId === lastUpdateIdByListener[listenerFn]) return;

      lastUpdateIdByListener[listenerFn] = updateId as any;

      try {
        listenerFn(...args);
      } catch (err) {
        /* NOOP */
      }
    });
  }
}
