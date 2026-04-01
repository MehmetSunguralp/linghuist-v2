declare module 'next-pwa' {
  type NextPwaOptions = {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
  };

  type NextPlugin<T = unknown> = (config: T) => T;

  function nextPwa(options?: NextPwaOptions): NextPlugin;

  export = nextPwa;
}
