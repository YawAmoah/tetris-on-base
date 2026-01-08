// Polyfill localStorage for SSR
if (typeof window === "undefined") {
  const localStoragePolyfill = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  };

  // Assign to global object for SSR - localStorage is not defined in Node.js
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).localStorage = localStoragePolyfill;
}

