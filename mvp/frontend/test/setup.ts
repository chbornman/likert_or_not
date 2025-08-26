import { beforeAll, afterEach, afterAll } from "bun:test";
import "@testing-library/jest-dom";

// Register happy-dom globally for DOM support
import { GlobalRegistrator } from "@happy-dom/global-registrator";
GlobalRegistrator.register();

// Setup DOM environment before any tests run
beforeAll(() => {
  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Only setup window properties if window exists (DOM environment)
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }

  // Mock localStorage for all environments
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value.toString(); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      get length() { return Object.keys(store).length; },
      key: (index: number) => Object.keys(store)[index] || null,
    };
  })();

  // Mock sessionStorage
  const sessionStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value.toString(); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      get length() { return Object.keys(store).length; },
      key: (index: number) => Object.keys(store)[index] || null,
    };
  })();

  // Assign to global
  global.localStorage = localStorageMock as any;
  global.sessionStorage = sessionStorageMock as any;

  // Also assign to window if it exists
  if (typeof window !== 'undefined') {
    (window as any).localStorage = localStorageMock;
    (window as any).sessionStorage = sessionStorageMock;
  }
});

afterEach(() => {
  if (global.localStorage) {
    global.localStorage.clear();
  }
  if (global.sessionStorage) {
    global.sessionStorage.clear();
  }
});

afterAll(() => {
  // Cleanup
});