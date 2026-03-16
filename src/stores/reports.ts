import { defineStore } from "pinia";
import { ref } from "vue";
import { api } from "../services/tauriApi";
import type { ReportFilter, ReportData } from "../types/index";

export const useReportsStore = defineStore("reports", () => {
  const reportData = ref<ReportData | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const filter = ref<ReportFilter>({
    dateFrom: new Date(new Date().setDate(new Date().getDate() - 7))
      .toISOString()
      .split("T")[0],
    dateTo: new Date().toISOString().split("T")[0],
  });

  async function fetchReport(f?: ReportFilter): Promise<void> {
    if (f) filter.value = f;
    loading.value = true;
    error.value = null;
    try {
      reportData.value = await api.getReport(filter.value);
    } catch (e) {
      error.value = String(e);
    } finally {
      loading.value = false;
    }
  }

  return { reportData, loading, error, filter, fetchReport };
});
