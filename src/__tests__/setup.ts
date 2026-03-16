import { vi } from "vitest";

// Mock @tauri-apps/api/core globally for all tests
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Mock @tauri-apps/api/event globally so components that call listen() work in
// jsdom without a real Tauri runtime. Individual tests can override listen with
// vi.mocked(listen).mockImplementation(...) to capture callbacks.
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(vi.fn()),
}));
