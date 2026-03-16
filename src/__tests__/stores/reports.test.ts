import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useReportsStore } from "../../stores/reports";
import { api } from "../../services/tauriApi";
import type { ReportData } from "../../types/index";

vi.mock("../../services/tauriApi", () => ({
  api: {
    getReport: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

const fakeData: ReportData = {
  projects: [
    {
      projectId: 1,
      projectName: "TimeTracker",
      projectColor: "#4caf50",
      totalSeconds: 3600,
      tasks: [
        {
          taskId: 10,
          taskName: "Write tests",
          totalSeconds: 3600,
          entryCount: 2,
          entries: [],
        },
      ],
    },
  ],
  totalSeconds: 3600,
};

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe("useReportsStore", () => {
  describe("fetchReport", () => {
    it("loads report data from api", async () => {
      mockApi.getReport.mockResolvedValue(fakeData);
      const store = useReportsStore();
      await store.fetchReport({ dateFrom: "2026-03-01", dateTo: "2026-03-10" });
      expect(store.reportData).toEqual(fakeData);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });

    it("updates filter when new filter is passed", async () => {
      mockApi.getReport.mockResolvedValue({ projects: [], totalSeconds: 0 });
      const store = useReportsStore();
      const newFilter = { dateFrom: "2026-02-01", dateTo: "2026-02-28", projectId: 5 };
      await store.fetchReport(newFilter);
      expect(store.filter).toEqual(newFilter);
      expect(mockApi.getReport).toHaveBeenCalledWith(newFilter);
    });

    it("uses existing filter when no filter argument passed", async () => {
      mockApi.getReport.mockResolvedValue(fakeData);
      const store = useReportsStore();
      const initialFilter = store.filter;
      await store.fetchReport();
      expect(mockApi.getReport).toHaveBeenCalledWith(initialFilter);
    });

    it("sets error when api throws", async () => {
      mockApi.getReport.mockRejectedValue(new Error("query failed"));
      const store = useReportsStore();
      await store.fetchReport({ dateFrom: "2026-03-01", dateTo: "2026-03-10" });
      expect(store.error).toBe("Error: query failed");
      expect(store.loading).toBe(false);
    });

    it("filters by projectId when provided", async () => {
      mockApi.getReport.mockResolvedValue(fakeData);
      const store = useReportsStore();
      await store.fetchReport({ dateFrom: "2026-03-01", dateTo: "2026-03-10", projectId: 1 });
      expect(mockApi.getReport).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 1 })
      );
    });
  });

  describe("initial state", () => {
    it("has null reportData and default date range", () => {
      const store = useReportsStore();
      expect(store.reportData).toBeNull();
      expect(store.filter.dateFrom).toBeTruthy();
      expect(store.filter.dateTo).toBeTruthy();
    });
  });
});
