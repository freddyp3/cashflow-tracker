import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement ResizeObserver — provide a mock that fires immediately
globalThis.ResizeObserver = class ResizeObserver {
  private cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
  }
  observe(target: Element) {
    // Fire callback with a fake entry that has a non-zero width
    this.cb(
      [{ contentRect: { width: 800, height: 600 } } as unknown as ResizeObserverEntry],
      this,
    );
  }
  unobserve() {}
  disconnect() {}
};
