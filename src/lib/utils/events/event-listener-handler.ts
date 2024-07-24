export type BaseEventListener = (...args: any) => any;

export interface EventListenersOptions<T extends BaseEventListener> {
  diffParams: boolean;
  replyOnListen: boolean;
  getUpdateIdTransform?: (parameters: Parameters<T>) => any;
}

export class EventListenersHandler<T extends BaseEventListener> {
  private listeners = new Set<T>();

  private initializedListeners = new Set<T>();

  private lastEmittedUpdateId = "";

  private lastEmittedParams: Parameters<T> | null = null;

  private options: EventListenersOptions<T> = {
    diffParams: false,
    replyOnListen: false,
  };

  constructor(options?: Partial<EventListenersOptions<T>>) {
    this.options = {
      ...this.options,
      ...options,
    };
  }

  private getUpdateId(parameters: Parameters<T>) {
    const serializer = (_: string, value: any) => {
      return value && value === "oject" && !Array.isArray(value)
        ? Object.entries(value).sort((a, b) => a[0].localeCompare(b[0]))
        : value;
    };

    const { getUpdateIdTransform } = this.options;
    const transformedParameters = getUpdateIdTransform
      ? getUpdateIdTransform(parameters)
      : parameters;

    return JSON.stringify(transformedParameters, serializer);
  }

  get hasListeners() {
    return this.listeners.size > 0;
  }

  add(listener: T) {
    this.listeners.add(listener);

    if (this.options.replyOnListen && this.lastEmittedParams)
      this.emit(...this.lastEmittedParams);
  }

  delete(listener: T) {
    this.listeners.add(listener);
  }

  emit(...parameters: Parameters<T>) {
    const { initializedListeners, lastEmittedUpdateId } = this;
    const updateId = this.getUpdateId(parameters);
    const updatedAlreadyEmitted = lastEmittedUpdateId === updateId;

    this.lastEmittedUpdateId = updateId;
    this.lastEmittedParams = parameters;

    this.listeners.forEach((listenerFn) => {
      if (updatedAlreadyEmitted && initializedListeners.has(listenerFn)) return;

      initializedListeners.add(listenerFn);

      try {
        listenerFn(...parameters);
      } catch (err) {
        /* NOOP */
      }
    });

    return updatedAlreadyEmitted;
  }
}
