import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useTimerStore } from "../../stores/timer";
import { api } from "../../services/tauriApi";
import type { ActiveTimer, TimeEntry } from "../../types/index";

vi.mock("../../services/tauriApi", () => ({
  api: {
    getActiveTimer: vi.fn(),
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

const fakeTimer: ActiveTimer = {
  entryId: 1,
  taskId: 10,
  taskName: "Write tests",
  projectId: 5,
  projectName: "TimeTracker",
  projectColor: "#4caf50",
  startTime: "2026-03-10T08:00:00Z",
};

const fakeEntry: TimeEntry = {
  id: 1,
  taskId: 10,
  startTime: "2026-03-10T08:00:00Z",
  archived: 0,
  createdAt: "2026-03-10T08:00:00Z",
  updatedAt: "2026-03-10T08:00:00Z",
};

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe("useTimerStore", () => {
  describe("fetchActiveTimer", () => {
    it("sets activeEntry, isRunning, and startedAt when timer is active", async () => {
      mockApi.getActiveTimer.mockResolvedValue(fakeTimer);
      const store = useTimerStore();
      await store.fetchActiveTimer();
      expect(store.activeEntry).toEqual(fakeTimer);
      expect(store.isRunning).toBe(true);
      expect(store.startedAt).toBe(fakeTimer.startTime);
    });

    it("clears state when no active timer", async () => {
      mockApi.getActiveTimer.mockResolvedValue(null);
      const store = useTimerStore();
      // Pre-populate state
      store.activeEntry = fakeTimer;
      store.isRunning = true;
      store.startedAt = fakeTimer.startTime;

      await store.fetchActiveTimer();
      expect(store.activeEntry).toBeNull();
      expect(store.isRunning).toBe(false);
      expect(store.startedAt).toBeNull();
    });
  });

  describe("startTimer", () => {
    it("calls api.startTimer then fetches active timer", async () => {
      mockApi.startTimer.mockResolvedValue(fakeEntry);
      mockApi.getActiveTimer.mockResolvedValue(fakeTimer);
      const store = useTimerStore();
      await store.startTimer({ taskId: 10 });
      expect(mockApi.startTimer).toHaveBeenCalledWith(10, undefined);
      expect(mockApi.getActiveTimer).toHaveBeenCalled();
      expect(store.isRunning).toBe(true);
    });

    it("passes notes through to api.startTimer when provided", async () => {
      mockApi.startTimer.mockResolvedValue(fakeEntry);
      mockApi.getActiveTimer.mockResolvedValue(fakeTimer);
      const store = useTimerStore();
      await store.startTimer({ taskId: 10, notes: "focused work" });
      expect(mockApi.startTimer).toHaveBeenCalledWith(10, "focused work");
    });
  });

  describe("stopTimer", () => {
    it("calls api.stopTimer and clears state", async () => {
      const stoppedEntry: TimeEntry = { ...fakeEntry, endTime: "2026-03-10T09:00:00Z" };
      mockApi.stopTimer.mockResolvedValue(stoppedEntry);
      const store = useTimerStore();
      store.activeEntry = fakeTimer;
      store.isRunning = true;
      store.startedAt = fakeTimer.startTime;

      await store.stopTimer();
      expect(mockApi.stopTimer).toHaveBeenCalled();
      expect(store.activeEntry).toBeNull();
      expect(store.isRunning).toBe(false);
      expect(store.startedAt).toBeNull();
    });
  });

  describe("initial state", () => {
    it("has no active entry and is not running", () => {
      const store = useTimerStore();
      expect(store.activeEntry).toBeNull();
      expect(store.isRunning).toBe(false);
      expect(store.startedAt).toBeNull();
    });

    it("does not expose elapsedSeconds", () => {
      const store = useTimerStore();
      // elapsedSeconds must NOT be in the store per architecture rules
      expect((store as unknown as Record<string, unknown>).elapsedSeconds).toBeUndefined();
    });
  });
});
