import "@testing-library/jest-dom";

// Mock crypto.randomUUID if not available in Node test environment
if (!globalThis.crypto) {
  // @ts-expect-error Mocking crypto for test runner
  globalThis.crypto = {};
}

if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () =>
    "00000000-0000-4000-8000-000000000000".replace(/0/g, () =>
      Math.floor(Math.random() * 16).toString(16)
    ) as `${string}-${string}-${string}-${string}-${string}`;
}
