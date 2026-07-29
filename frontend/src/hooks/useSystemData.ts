import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { BackupInfo, DiagnosticsSummary, HealthSummary } from "../types/app";

interface UseSystemDataOptions {
  baseUrl: string;
  activePage: string;
  diagnostics: DiagnosticsSummary | null;
  selectedBackup: string;
  setHealthSummary: Dispatch<SetStateAction<HealthSummary | null>>;
  setHealthLoading: Dispatch<SetStateAction<boolean>>;
  setBackupList: Dispatch<SetStateAction<BackupInfo[]>>;
  setBackupLoading: Dispatch<SetStateAction<boolean>>;
  setSelectedBackup: Dispatch<SetStateAction<string>>;
  setDiagnostics: Dispatch<SetStateAction<DiagnosticsSummary | null>>;
  setDiagnosticsLoading: Dispatch<SetStateAction<boolean>>;
  refreshAll: () => Promise<void>;
  showToast: (type: "info" | "success" | "error", title: string, message: string) => void;
  showMessage: (title: string, message: string) => void;
}

export function useSystemData(options: UseSystemDataOptions) {
  const {
    baseUrl,
    diagnostics,
    selectedBackup,
    setHealthSummary,
    setHealthLoading,
    setBackupList,
    setBackupLoading,
    setSelectedBackup,
    setDiagnostics,
    setDiagnosticsLoading,
    refreshAll,
    showToast,
    showMessage,
  } = options;

  const loadHealthSummary = useCallback(async () => {
    setHealthLoading(true);
    try {
      const response = await fetch(`${baseUrl}/health/summary`);
      if (!response.ok) throw new Error(`Health HTTP ${response.status}`);
      setHealthSummary(await response.json());
    } catch (error) {
      console.error("Health summary load failed:", error);
      setHealthSummary(null);
    } finally {
      setHealthLoading(false);
    }
  }, [baseUrl, setHealthLoading, setHealthSummary]);

  const loadBackups = useCallback(async () => {
    setBackupLoading(true);
    try {
      const response = await fetch(`${baseUrl}/system/backups`);
      if (!response.ok) throw new Error(`Backup list HTTP ${response.status}`);
      const data = await response.json();
      const backups = Array.isArray(data?.backups) ? data.backups : [];
      setBackupList(backups);
      if (backups.length > 0 && !selectedBackup) setSelectedBackup(backups[0].name);
    } catch (error) {
      console.error("Backup list load failed:", error);
      setBackupList([]);
    } finally {
      setBackupLoading(false);
    }
  }, [baseUrl, selectedBackup, setBackupList, setBackupLoading, setSelectedBackup]);

  const loadDiagnostics = useCallback(async () => {
    setDiagnosticsLoading(true);
    try {
      const response = await fetch(`${baseUrl}/system/diagnostics`);
      if (!response.ok) throw new Error(`Diagnostics HTTP ${response.status}`);
      setDiagnostics(await response.json());
    } catch (error) {
      console.error("Diagnostics load failed:", error);
      setDiagnostics(null);
    } finally {
      setDiagnosticsLoading(false);
    }
  }, [baseUrl, setDiagnostics, setDiagnosticsLoading]);

  const handleRunMaintenanceNow = useCallback(async () => {
    try {
      setDiagnosticsLoading(true);
      const response = await fetch(`${baseUrl}/system/maintenance/run`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trigger: "manual-ui" }) });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || response.statusText);
      }
      showToast("success", "Maintenance", "Sedmično održavanje je pokrenuto ručno i završeno.");
      await Promise.all([loadHealthSummary(), loadBackups(), loadDiagnostics(), refreshAll()]);
    } catch (error) {
      console.error("Manual maintenance run failed:", error);
      showToast("error", "Maintenance", `Pokretanje održavanja nije uspjelo: ${String((error as Error)?.message || error)}`);
    } finally {
      setDiagnosticsLoading(false);
    }
  }, [baseUrl, loadBackups, loadDiagnostics, loadHealthSummary, refreshAll, setDiagnosticsLoading, showToast]);

  const handleShowDiagnosticsSnapshot = useCallback(() => {
    if (!diagnostics) {
      showMessage("Diagnostics", "Diagnostics podaci nisu učitani.");
      return;
    }
    showMessage("Diagnostics snapshot", JSON.stringify(diagnostics, null, 2));
  }, [diagnostics, showMessage]);

  const handleDownloadDiagnosticsSnapshot = useCallback(() => {
    if (!diagnostics) {
      showMessage("Diagnostics", "Diagnostics podaci nisu učitani.");
      return;
    }
    const snapshot = JSON.stringify(diagnostics, null, 2);
    const blob = new Blob([snapshot], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.href = url;
    link.download = `diagnostics-${stamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("success", "Diagnostics", "Diagnostics snapshot je preuzet kao JSON fajl.");
  }, [diagnostics, showToast, showMessage]);

  const handleCreateBackup = useCallback(async () => {
    try {
      setBackupLoading(true);
      const response = await fetch(`${baseUrl}/system/backups`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: "manual-ui" }) });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || response.statusText);
      }
      showToast("success", "Backup", "Backup baze je uspješno kreiran.");
      await loadBackups();
    } catch (error) {
      console.error("Create backup failed:", error);
      showToast("error", "Backup", `Backup nije uspio: ${String((error as Error)?.message || error)}`);
    } finally {
      setBackupLoading(false);
    }
  }, [baseUrl, loadBackups, setBackupLoading, showToast]);

  const handleRestoreBackup = useCallback(async () => {
    if (!selectedBackup) {
      showToast("info", "Restore", "Odaberi backup za restore.");
      return;
    }
    const confirmed = window.confirm(`Restore iz backupa ${selectedBackup} će prepisati trenutno stanje baze. Nastaviti?`);
    if (!confirmed) return;
    try {
      setBackupLoading(true);
      const response = await fetch(`${baseUrl}/system/backups/restore`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileName: selectedBackup }) });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || response.statusText);
      }
      showToast("success", "Restore", "Restore je završen. Osvježavam stanje...");
      await refreshAll();
      await loadBackups();
    } catch (error) {
      console.error("Restore backup failed:", error);
      showToast("error", "Restore", `Restore nije uspio: ${String((error as Error)?.message || error)}`);
    } finally {
      setBackupLoading(false);
    }
  }, [baseUrl, loadBackups, refreshAll, selectedBackup, setBackupLoading, showToast]);

  return {
    loadHealthSummary,
    loadBackups,
    loadDiagnostics,
    handleRunMaintenanceNow,
    handleShowDiagnosticsSnapshot,
    handleDownloadDiagnosticsSnapshot,
    handleCreateBackup,
    handleRestoreBackup,
  };
}
