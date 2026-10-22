const MAX_ENTRIES = 256
const MAX_BYTES = 256 * 1024

export const STORAGE_COMPATIBILITY_SCRIPT = `
(() => {
  const maxEntries = ${MAX_ENTRIES};
  const maxBytes = ${MAX_BYTES};

  function quotaError() {
    const error = new Error('The temporary preview storage quota was exceeded.');
    error.name = 'QuotaExceededError';
    return error;
  }

  function createStorage() {
    const values = new Map();
    let bytes = 0;
    const storage = {
      get length() {
        return values.size;
      },
      clear() {
        values.clear();
        bytes = 0;
      },
      getItem(key) {
        const value = values.get(String(key));
        return value === undefined ? null : value;
      },
      key(index) {
        if (!Number.isInteger(index) || index < 0) return null;
        return Array.from(values.keys())[index] ?? null;
      },
      removeItem(key) {
        const normalizedKey = String(key);
        const value = values.get(normalizedKey);
        if (value === undefined) return;
        values.delete(normalizedKey);
        bytes -= normalizedKey.length + value.length;
      },
      setItem(key, value) {
        const normalizedKey = String(key);
        const normalizedValue = String(value);
        const previousValue = values.get(normalizedKey);
        const nextBytes =
          bytes -
          (previousValue === undefined
            ? 0
            : normalizedKey.length + previousValue.length) +
          normalizedKey.length +
          normalizedValue.length;
        if (
          (previousValue === undefined && values.size >= maxEntries) ||
          nextBytes > maxBytes
        ) {
          throw quotaError();
        }
        values.set(normalizedKey, normalizedValue);
        bytes = nextBytes;
      },
    };
    return storage;
  }

  function install(name) {
    const storage = createStorage();
    try {
      Object.defineProperty(window, name, {
        configurable: true,
        enumerable: true,
        get: () => storage,
      });
      return window[name] === storage;
    } catch {
      return false;
    }
  }

  install('localStorage');
  install('sessionStorage');
})();
`
