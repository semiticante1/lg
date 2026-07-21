import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { createAppTheme } from './theme';
import AppLayout from './components/AppLayout';
import ScheduleBuilderModal from "./components/ScheduleBuilderModal";
import DeviceDiscoveryModal from "./components/DeviceDiscoveryModal";
import DeviceEditorModal from "./components/DeviceEditorModal";
import ToastContainer from "./components/ToastContainer";
import type {
  Device,
  AuditLogEntry,
  DeviceHistoryEntry,
  DeviceSchedule,
  DiscoveredDevice,
  Group,
  HealthSummary,
  MessageModalState,
  BackupInfo,
  DiagnosticsSummary,
  ToastMessage,
} from "./types/app";
import {
  formatPowerText,
  formatStatusText,
  isValidIp,
  isValidMac,
} from "./utils/device";
import {
  getActionLabel,
  getAvailableActionsForDevice,
  isCronValid,
} from "./utils/schedule";

type ScheduleStep = {
  action: string;
  params?: Record<string, unknown>;
  delayMs?: number;
  waitForReadyMs?: number;
  settleMs?: number;
};

type DeviceApiShape = Device & {
  power_state?: string;
};

type BulkPowerResult = {
  poweredOn?: boolean;
  poweredOff?: boolean;
};

const DashboardPage = lazy(() => import('./components/Dashboard'));
const DevicesPage = lazy(() => import('./components/Devices'));
const GroupsPage = lazy(() => import('./components/Groups'));
const AuditPage = lazy(() => import('./components/Audit'));
const SettingsPage = lazy(() => import('./components/Settings'));

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const activePage = (() => {
    switch (location.pathname) {
      case "/":
        return "dashboard";
      case "/devices":
        return "devices";
      case "/groups":
        return "groups";
      case "/audit":
        return "audit";
      case "/settings":
        return "settings";
      default:
        return "notfound";
    }
  })();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [deviceIp, setDeviceIp] = useState("");
  const [deviceMac, setDeviceMac] = useState("");
  const [deviceBrand, setDeviceBrand] = useState("generic");
  const [modalGroupId, setModalGroupId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupName, setGroupName] = useState("");
  const [deviceHistory, setDeviceHistory] = useState<Record<number, DeviceHistoryEntry[]>>({});
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [deviceSchedules, setDeviceSchedules] = useState<Record<number, DeviceSchedule[]>>({});
  const [scheduleCron, setScheduleCron] = useState("0 7 * * *");
  const [scheduleAction, setScheduleAction] = useState("poweron");
  const [scheduleUseTime, setScheduleUseTime] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleTarget, setScheduleTarget] = useState("");
  const [scheduleDescription, setScheduleDescription] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleSequence, setScheduleSequence] = useState<ScheduleStep[]>([]);
  const [currentStepAction, setCurrentStepAction] = useState("poweron");
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [detailTab, setDetailTab] = useState<"info" | "schedule">("info");
  const [groupFilter, setGroupFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [powerFilter, setPowerFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [registrationFrom, setRegistrationFrom] = useState("");
  const [registrationTo, setRegistrationTo] = useState("");
  const [backendUrl, setBackendUrl] = useState("http://localhost:5000");
  const [schedulerOn, setSchedulerOn] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditDeviceFilter, setAuditDeviceFilter] = useState<string>("all");
  const [auditGroupFilter, setAuditGroupFilter] = useState<string>("all");
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize] = useState(10);
  const [auditTotalCount, setAuditTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = window.localStorage.getItem("appTheme");
      if (saved === "dark" || saved === "light") return saved as "dark" | "light";
    } catch {
      // ignore storage errors
    }
    return "dark";
  });
  const initialLoadRef = useRef(false);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssignGroupModal, setShowAssignGroupModal] = useState(false);
  const [selectedAssignGroupId, setSelectedAssignGroupId] = useState<number | null>(null);
  const [volumeValue, setVolumeValue] = useState("100");
  const [launchTarget, setLaunchTarget] = useState("");
  const [messageModal, setMessageModal] = useState<MessageModalState | null>(null);
  const [showScheduleBuilder, setShowScheduleBuilder] = useState(false);

  const normalizeVolumeValue = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === "") return "";
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) return "";
    const rounded = Math.round(parsed);
    return String(Math.min(100, Math.max(0, rounded)));
  };

  const handleVolumeValueChange = (value: string) => {
    setVolumeValue(normalizeVolumeValue(value));
  };
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [selectedDiscoveredDevices, setSelectedDiscoveredDevices] = useState<Set<string>>(new Set());
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [backupList, setBackupList] = useState<BackupInfo[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState("");
  const [diagnostics, setDiagnostics] = useState<DiagnosticsSummary | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const diagnosticsAlertCountRef = useRef(0);
  const discoveryInitiatedRef = useRef(false);
  const forcedOffIdsRef = useRef<Set<number>>(new Set());
  const confirmedOnAfterForcedOffRef = useRef<Set<number>>(new Set());
  const devicesRef = useRef<Device[]>([]);
  const refreshAllRef = useRef<() => Promise<void>>(async () => {});
  const loadDevicesRef = useRef<() => Promise<void>>(async () => {});
  const loadHealthSummaryRef = useRef<() => Promise<void>>(async () => {});
  const loadBackupsRef = useRef<() => Promise<void>>(async () => {});
  const loadDiagnosticsRef = useRef<() => Promise<void>>(async () => {});
  const loadDeviceSchedulesRef = useRef<(deviceId: number) => Promise<void>>(async () => {});
  const handleStartDiscoveryRef = useRef<() => Promise<void>>(async () => {});

  const baseUrl = backendUrl.replace(/\/$/, "");
  devicesRef.current = devices;

  // theme is initialized synchronously from localStorage above

  useEffect(() => {
    window.localStorage.setItem("appTheme", theme);
  }, [theme]);

  // Keep theme class on body so CSS variables apply globally (body uses --body-bg)
  useEffect(() => {
    try {
      document.body.classList.remove('theme-light', 'theme-dark');
      document.body.classList.add(`theme-${theme}`);
    } catch {
      // ignore DOM/classList errors
    }
    return () => {
      try {
        document.body.classList.remove('theme-light', 'theme-dark');
      } catch {
        // ignore DOM/classList errors
      }
    };
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === "light" ? "dark" : "light";
      try {
        window.localStorage.setItem("appTheme", next);
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const resolvePowerStateWithForcedOff = (
    incoming: { id: number; powerState?: string; power_state?: string; status?: string },
    fallback?: Device
  ) => {
    const rawPower = incoming.powerState || incoming.power_state || fallback?.powerState || "Off";
    const normalizedPower = String(rawPower).toLowerCase();
    let resolved: "On" | "Off" = normalizedPower === "on" ? "On" : "Off";

    if (forcedOffIdsRef.current.has(incoming.id)) {
      if (resolved === "On") {
        const normalizedStatus = String(incoming.status || fallback?.status || "").toLowerCase();
        const confirmedBackOn = normalizedStatus === "online";
        if (confirmedOnAfterForcedOffRef.current.has(incoming.id)) {
          forcedOffIdsRef.current.delete(incoming.id);
          confirmedOnAfterForcedOffRef.current.delete(incoming.id);
          return "On";
        }
        if (confirmedBackOn) {
          confirmedOnAfterForcedOffRef.current.add(incoming.id);
        }
        return "Off";
      }
      confirmedOnAfterForcedOffRef.current.delete(incoming.id);
      return "Off";
    }

    return resolved;
  };


  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    void refreshAllRef.current();
  }, []);

  const loadAuditLogs = async (deviceId?: string, groupId?: string, page = auditPage, pageSize = auditPageSize) => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(pageSize));
      if (deviceId && deviceId !== "all") {
        params.set("deviceId", deviceId);
      }
      if (groupId && groupId !== "all") {
        params.set("groupId", groupId);
      }

      const response = await fetch(`${baseUrl}/audit-logs?${params.toString()}`);
      const data = await response.json();
      const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      const total = typeof data?.total === "number" ? data.total : items.length;
      setAuditLogs(items);
      setAuditTotalCount(total);
      setAuditPage(page);
    } catch (error) {
      console.error("Učitavanje audit loga nije uspjelo:", error);
      setAuditLogs([]);
      setAuditTotalCount(0);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      await loadDevicesRef.current();
      setLastRefresh(new Date().toLocaleTimeString());
      setStatusMessage("Automatsko osvježenje statusa");
      setTimeout(() => setStatusMessage(""), 2000);
    }, 12000);

    return () => clearInterval(interval);
  }, [baseUrl]);

  // WebSocket client to receive immediate device state updates from backend
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let reconnectAttempts = 0;
    let keepTrying = true;
    let cleanupRequested = false;

    const wsUrl = baseUrl.replace(/^http/, 'ws');

    let didOpen = false;

    const connect = async () => {
      try {
        const healthResponse = await fetch(`${baseUrl}/health/summary`, { cache: 'no-store' });
        if (!healthResponse.ok) {
          throw new Error(`Health check failed with status ${healthResponse.status}`);
        }
      } catch (e) {
        if (!keepTrying) return;
        reconnectAttempts += 1;
        const timeout = Math.min(1000 * 2 ** reconnectAttempts, 30000);
        reconnectTimer = window.setTimeout(connect, timeout);
        console.warn('WS backend not ready, retrying...', e);
        return;
      }

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          didOpen = true;
          console.log('WS connected to', wsUrl);
          reconnectAttempts = 0;
        };

        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.type === 'device:update' && msg.device) {
              const dev = msg.device;
              const current = devicesRef.current.find((x) => x.id === dev.id);
              const resolvedPowerState = resolvePowerStateWithForcedOff(dev, current);
              setDevices((prev) => prev.map((d) => (d.id === dev.id ? { ...d, ...dev, powerState: resolvedPowerState } : d)));
              recordDeviceEvent({ ...(current || dev), powerState: resolvedPowerState }, 'State updated from server');
            } else if (msg.type === 'devices:init' && Array.isArray(msg.devices)) {
              setDevices(
                msg.devices.map((raw: unknown) => {
                  const d = raw as DeviceApiShape;
                  const current = devicesRef.current.find((x) => x.id === d.id);
                  const resolvedPowerState = resolvePowerStateWithForcedOff(d, current);
                  return { ...d, powerState: resolvedPowerState };
                })
              );
            }
          } catch (e) {
            console.error('WS message parse error', e);
          }
        };

        ws.onclose = () => {
          if (cleanupRequested) return;
          if (!didOpen) return;
          console.log('WS closed');
          if (!keepTrying) return;
          reconnectAttempts += 1;
          const timeout = Math.min(1000 * 2 ** reconnectAttempts, 30000);
          reconnectTimer = window.setTimeout(connect, timeout);
        };

        ws.onerror = (e) => {
          if (cleanupRequested) return;
          if (!didOpen) {
            console.warn('WS connection failed, retrying...');
            return;
          }
          console.error('WS error', e);
        };
      } catch (e) {
        console.error('WS init failed', e);
        if (keepTrying) {
          reconnectAttempts += 1;
          const timeout = Math.min(1000 * 2 ** reconnectAttempts, 30000);
          reconnectTimer = window.setTimeout(connect, timeout);
        }
      }
    };

    connect();

    return () => {
      keepTrying = false;
      cleanupRequested = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (ws && ws.readyState !== WebSocket.CLOSING && ws.readyState !== WebSocket.CLOSED) {
        try {
          ws.close();
        } catch (e) {
          console.warn('WS cleanup failed', e);
        }
      }
    };
  }, [baseUrl]);

  async function refreshAll() {
    setLoading(true);
    await Promise.all([
      loadDevices(),
      loadGroups(),
      loadAuditLogs(auditDeviceFilter, auditGroupFilter),
      loadHealthSummary(),
    ]);
    setLoading(false);
    setLastRefresh(new Date().toLocaleTimeString());
    setStatusMessage("Status osvježen");
    setTimeout(() => setStatusMessage(""), 2000);
  }

  const loadHealthSummary = async () => {
    setHealthLoading(true);
    try {
      const response = await fetch(`${baseUrl}/health/summary`);
      if (!response.ok) {
        throw new Error(`Health HTTP ${response.status}`);
      }
      const data = await response.json();
      setHealthSummary(data);
    } catch (error) {
      console.error("Health summary load failed:", error);
      setHealthSummary(null);
    } finally {
      setHealthLoading(false);
    }
  };

  const loadBackups = async () => {
    setBackupLoading(true);
    try {
      const response = await fetch(`${baseUrl}/system/backups`);
      if (!response.ok) {
        throw new Error(`Backup list HTTP ${response.status}`);
      }
      const data = await response.json();
      const backups = Array.isArray(data?.backups) ? data.backups : [];
      setBackupList(backups);
      if (backups.length > 0 && !selectedBackup) {
        setSelectedBackup(backups[0].name);
      }
    } catch (error) {
      console.error("Backup list load failed:", error);
      setBackupList([]);
    } finally {
      setBackupLoading(false);
    }
  };

  const loadDiagnostics = async () => {
    setDiagnosticsLoading(true);
    try {
      const response = await fetch(`${baseUrl}/system/diagnostics`);
      if (!response.ok) {
        throw new Error(`Diagnostics HTTP ${response.status}`);
      }
      const data = await response.json();
      setDiagnostics(data);
    } catch (error) {
      console.error("Diagnostics load failed:", error);
      setDiagnostics(null);
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  const handleRunMaintenanceNow = async () => {
    try {
      setDiagnosticsLoading(true);
      const response = await fetch(`${baseUrl}/system/maintenance/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "manual-ui" }),
      });

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
  };

  const handleShowDiagnosticsSnapshot = () => {
    if (!diagnostics) {
      showMessage("Diagnostics", "Diagnostics podaci nisu učitani.");
      return;
    }

    const snapshot = JSON.stringify(diagnostics, null, 2);
    showMessage("Diagnostics snapshot", snapshot);
  };

  const handleDownloadDiagnosticsSnapshot = () => {
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
  };

  const handleCreateBackup = async () => {
    try {
      setBackupLoading(true);
      const response = await fetch(`${baseUrl}/system/backups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "manual-ui" }),
      });

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
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) {
      showToast("info", "Restore", "Odaberi backup za restore.");
      return;
    }

    const confirmed = window.confirm(
      `Restore iz backupa ${selectedBackup} će prepisati trenutno stanje baze. Nastaviti?`
    );
    if (!confirmed) {
      return;
    }

    try {
      setBackupLoading(true);
      const response = await fetch(`${baseUrl}/system/backups/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: selectedBackup }),
      });

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
  };

  useEffect(() => {
    if (activePage === "settings") {
      const timer = window.setTimeout(() => {
        void loadHealthSummaryRef.current();
        void loadBackupsRef.current();
        void loadDiagnosticsRef.current();
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [activePage, baseUrl]);

  async function loadDevices() {
    try {
      const response = await fetch(`${baseUrl}/devices`);
      const data = (await response.json()) as DeviceApiShape[];
      const mappedDevices = data.map((device) => {
        const current = devicesRef.current.find((d) => d.id === device.id);
        const resolvedPowerState = resolvePowerStateWithForcedOff(device, current);
        return {
          ...device,
          brand: device.brand || "generic",
          powerState: resolvedPowerState,
          selected: false,
        };
      });

      setDevices(mappedDevices);
      mappedDevices.forEach((device) => {
        recordDeviceEvent(device, `Automatska provjera statusa: ${device.status}`);
      });
    } catch (error) {
      console.error("Učitavanje uređaja nije uspjelo:", error);
    }
  }

  const loadGroups = async () => {
    try {
      const response = await fetch(`${baseUrl}/groups`);
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error("Ucitavanje grupa nije uspjelo:", error);
    }
  };

  const loadDeviceSchedules = async (deviceId: number) => {
    try {
      const response = await fetch(`${baseUrl}/devices/${deviceId}/schedules`);
      const data = await response.json();
      setDeviceSchedules((prev) => ({ ...prev, [deviceId]: data }));
    } catch (error) {
      console.error("Učitavanje rasporeda nije uspjelo:", error);
      setDeviceSchedules((prev) => ({ ...prev, [deviceId]: [] }));
    }
  };

  useEffect(() => {
    if (selectedDeviceId !== null) {
      const timer = window.setTimeout(() => {
        void loadDeviceSchedulesRef.current(selectedDeviceId);
        setDetailTab("info");
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [selectedDeviceId, baseUrl]);

  const getDeviceSchedules = (deviceId: number) => deviceSchedules[deviceId] || [];

  const getAvailableActions = getAvailableActionsForDevice;

  const clearScheduleForm = () => {
    setScheduleCron("0 7 * * *");
    setScheduleAction("poweron");
    setScheduleTarget("");
    setScheduleDescription("");
    setScheduleEnabled(true);
    setEditingScheduleId(null);
    setScheduleSequence([]);
    setScheduleUseTime(false);
    setScheduleTime("");
  };

  const cronValid = isCronValid(scheduleCron);

  const handleEditSchedule = (schedule: DeviceSchedule) => {
    const actionParams = (schedule.action_params ?? {}) as Record<string, unknown>;
    const available = getAvailableActions(selectedDevice);
    const supportedAction = available.some((action) => action.value === schedule.action)
      ? schedule.action
      : available[0]?.value || "poweron";

    setEditingScheduleId(schedule.id);
    setScheduleCron(schedule.cron);
    setScheduleAction(supportedAction);
    setScheduleTarget(
      supportedAction === "launchApp"
        ? typeof actionParams.target === "string"
          ? actionParams.target
          : ""
        : supportedAction === "setVolume"
        ? typeof actionParams.volume === "number" || typeof actionParams.volume === "string"
          ? String(actionParams.volume)
          : ""
        : ""
    );
    setScheduleDescription(schedule.description || "");
    setScheduleEnabled(schedule.enabled);
    setDetailTab("schedule");
    // populate sequence if stored as sequence
    try {
      const params = actionParams;
      if (schedule.action === "sequence" && Array.isArray(params.sequence)) {
        setScheduleSequence(params.sequence.map((s) => ({ ...(s as ScheduleStep) })));
      } else {
        setScheduleSequence([]);
      }
    } catch {
      setScheduleSequence([]);
    }
    // detect simple HH:MM cron form like "MM HH * * *" and present friendly time
    try {
      const parts = schedule.cron ? schedule.cron.trim().split(/\s+/) : [];
      if (parts.length >= 5 && parts[2] === "*" && parts[3] === "*" && parts[4] === "*") {
        const minute = parts[0];
        const hour = parts[1];
        if (/^\d{1,2}$/.test(minute) && /^\d{1,2}$/.test(hour)) {
          setScheduleUseTime(true);
          setScheduleTime(`${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`);
        }
      }
    } catch {
      // ignore cron parsing errors
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!selectedDeviceId) {
      return;
    }

    try {
      await fetch(`${baseUrl}/devices/${selectedDeviceId}/schedules/${scheduleId}`, {
        method: "DELETE",
      });
      await loadDeviceSchedules(selectedDeviceId);
      showMessage("Info", "Raspored obrisan.");
    } catch (error) {
      console.error("Brisanje rasporeda nije uspjelo:", error);
      showMessage("Greška", "Greška pri brisanju rasporeda.");
    }
  };

  const handleToggleSchedule = async (schedule: DeviceSchedule) => {
    if (!selectedDeviceId) {
      return;
    }

    try {
      await fetch(`${baseUrl}/devices/${selectedDeviceId}/schedules/${schedule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cron: schedule.cron,
          action: schedule.action,
          action_params: schedule.action_params || {},
          description: schedule.description || "",
          enabled: !schedule.enabled,
        }),
      });
      await loadDeviceSchedules(selectedDeviceId);
    } catch (error) {
      console.error("Ažuriranje rasporeda nije uspjelo:", error);
      showMessage("Greška", "Greška pri ažuriranju rasporeda.");
    }
  };

  const fetchScheduleLogs = async (schedule: DeviceSchedule) => {
    if (!selectedDeviceId) {
      showMessage("Greška", "Nema odabranog uređaja.");
      return;
    }

    const formatScheduleStatus = (status: string) => {
      const normalized = String(status || "").toLowerCase();
      if (normalized === "success") return "Uspješno";
      if (normalized === "failed") return "Neuspješno";
      if (normalized === "running") return "U toku";
      return status || "Nepoznato";
    };

    const formatScheduleDetails = (details: unknown) => {
      if (!details) return "Bez dodatnih detalja.";

      const raw = typeof details === "string" ? details : JSON.stringify(details);
      if (!raw) return "Bez dodatnih detalja.";

      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (typeof parsed.error === "string" && parsed.error.trim()) {
          return `Greška: ${parsed.error}`;
        }
        if (typeof parsed.action === "string" && parsed.action.trim()) {
          return `Akcija: ${parsed.action}`;
        }
        if (typeof parsed.step === "string" && parsed.step.trim()) {
          return `Korak: ${parsed.step}`;
        }
        return JSON.stringify(parsed, null, 2);
      } catch {
        return raw;
      }
    };

    const formatScheduleTimestamp = (createdAt: string) => {
      const date = new Date(createdAt);
      if (Number.isNaN(date.getTime())) {
        return createdAt;
      }
      return date.toLocaleString();
    };

    try {
      const response = await fetch(`${baseUrl}/devices/${selectedDeviceId}/schedules/${schedule.id}/logs`);
      if (!response.ok) {
        showMessage('Greška', 'Ne mogu dohvatiti logove.');
        return;
      }
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        showMessage('Logovi', 'Nema zapisa za ovaj raspored.');
        return;
      }

      const text = data
        .map((run: { created_at?: string; status?: string; details?: unknown }) => {
          const when = formatScheduleTimestamp(run.created_at || "");
          const status = formatScheduleStatus(run.status || "");
          const details = formatScheduleDetails(run.details);
          return `${when} | ${status}\n${details}`;
        })
        .join("\n\n");

      showMessage('Logovi rasporeda', text);
    } catch (e) {
      console.error('Dohvat logova nije uspio', e);
      showMessage('Greška', 'Dohvat logova nije uspio');
    }
  };

    const handleTriggerSchedule = async (schedule: DeviceSchedule) => {
      if (!selectedDeviceId) return;
      try {
        const resp = await fetch(`${baseUrl}/devices/${selectedDeviceId}/schedules/${schedule.id}/trigger`, { method: 'POST' });
        if (!resp.ok) {
          showMessage('Greška', 'Ne mogu pokrenuti raspored.');
          return;
        }
        showMessage('Info', 'Raspored je pokrenut (manualni trigger).');
      } catch (e) {
        console.error('Trigger rasporeda nije uspio', e);
        showMessage('Greška', 'Trigger rasporeda nije uspio');
      }
    };

    const handleSaveScheduleBuilder = async (data: { hour: number; minute: number; days: number[]; cron: string }) => {
      if (!selectedDeviceId) {
        showMessage("Greška", "Nema odabranog uređaja.");
        return;
      }

      setScheduleCron(data.cron);
      
      // Validate action
      const available = getAvailableActions(selectedDevice);
      if (!available.some((action) => action.value === scheduleAction)) {
        showMessage("Greška", "Odabrana akcija nije podržana za ovaj uređaj.");
        return;
      }

      // Build payload
      let payload:
        | {
            cron: string;
            actions: ScheduleStep[];
            description: string;
            enabled: boolean;
          }
        | {
            cron: string;
            action: string;
            action_params: Record<string, unknown>;
            description: string;
            enabled: boolean;
          };
      if (Array.isArray(scheduleSequence) && scheduleSequence.length > 0) {
        payload = {
          cron: data.cron,
          actions: scheduleSequence.map((s) => ({
            action: s.action,
            params: s.params || {},
            delayMs: s.delayMs || undefined,
            waitForReadyMs: s.waitForReadyMs || undefined,
            settleMs: s.settleMs || undefined,
          })),
          description: scheduleDescription.trim(),
          enabled: scheduleEnabled,
        };
      } else {
        payload = {
          cron: data.cron,
          action: scheduleAction,
          action_params:
            scheduleAction === "launchApp"
              ? { target: scheduleTarget.trim() }
              : scheduleAction === "setVolume"
              ? { volume: Number(scheduleTarget) }
              : {},
          description: scheduleDescription.trim(),
          enabled: scheduleEnabled,
        };
      }

      try {
        const url = editingScheduleId
          ? `${baseUrl}/devices/${selectedDeviceId}/schedules/${editingScheduleId}`
          : `${baseUrl}/devices/${selectedDeviceId}/schedules`;
        const method = editingScheduleId ? "PUT" : "POST";
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          showMessage("Greška", errorData?.error || "Neuspješno spremanje rasporeda.");
          return;
        }

        await loadDeviceSchedules(selectedDeviceId);
        clearScheduleForm();
        showMessage("Info", "Raspored je uspješno spremljen!");
      } catch (error) {
        console.error("Greška pri spremanju rasporeda:", error);
        showMessage("Greška", "Greška pri spremanju rasporeda.");
      }
    };

  function recordDeviceEvent(device: Device, note: string) {
    setDeviceHistory((prevHistory) => {
      const existing = prevHistory[device.id] || [];
      const now = new Date();
      const entry: DeviceHistoryEntry = {
        timestamp: now.toLocaleTimeString(),
        time: now.getTime(),
        status: device.status,
        note,
      };
      return {
        ...prevHistory,
        [device.id]: [entry, ...existing].slice(0, 10),
      };
    });
  };

  const clearModalFields = () => {
    setDeviceName("");
    setDeviceIp("");
    setDeviceMac("");
    setDeviceBrand("generic");
    setModalGroupId(null);
  };

  const removeToast = (id: string) => {
    setToastMessages((prev) => prev.filter((t) => t.id !== id));
  };

  const showToast = (type: 'info' | 'success' | 'error', title: string, message: string) => {
    // prevent duplicate toasts for the same type/title/message
    setToastMessages((prev) => {
      const exists = prev.some((t) => t.type === type && t.title === title && t.message === message);
      if (exists) return prev;
      const id = Date.now().toString();
      return [...prev, { id, type, title, message }];
    });
  };

  const showMessage = (title: string, message: string) => {
    const type = title === "Greška" ? "error" : title === "Info" ? "info" : "success";
    showToast(type, title, message);
  };

  useEffect(() => {
    if (!diagnostics) {
      return;
    }

    const threshold = diagnostics.config.runtimeIssueAlertThreshold ?? 8;
    const issueCount = Array.isArray(diagnostics.runtimeIssues) ? diagnostics.runtimeIssues.length : 0;

    if (issueCount >= threshold && issueCount !== diagnosticsAlertCountRef.current) {
      diagnosticsAlertCountRef.current = issueCount;
      showToast(
        "error",
        "Diagnostics upozorenje",
        `Backend je zabilježio ${issueCount} runtime issue zapisa (prag ${threshold}). Pokreni maintenance i provjeri snapshot.`
      );
    }

    if (issueCount < threshold) {
      diagnosticsAlertCountRef.current = issueCount;
    }
  }, [diagnostics]);

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => Promise<void> | void,
    confirmText = "Potvrdi",
    cancelText = "Odustani"
  ) => {
    setMessageModal({ title, message, confirmText, cancelText, onConfirm });
  };

  const closeMessageModal = () => setMessageModal(null);

  const handleMessageConfirm = async () => {
    if (!messageModal?.onConfirm) {
      closeMessageModal();
      return;
    }

    await messageModal.onConfirm();
    closeMessageModal();
  };

  const handleSave = async () => {
    if (!deviceName || !deviceIp || !deviceMac) {
      showMessage("Greška", "Popuni sva polja");
      return;
    }

    if (!isValidIp(deviceIp)) {
      showMessage("Greška", "IP adresa nije ispravna. Unesi format 192.168.1.10.");
      return;
    }

    if (!isValidMac(deviceMac)) {
      showMessage("Greška", "MAC adresa nije ispravna. Unesi format AA:BB:CC:DD:EE:FF.");
      return;
    }

    const payload = {
      name: deviceName,
      ip: deviceIp,
      mac: deviceMac,
      brand: deviceBrand,
      groupId: modalGroupId,
    };

    try {
      if (editingId !== null) {
        const response = await fetch(`${baseUrl}/devices/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          showMessage(
            "Greška",
            `Greška pri uređivanju uređaja: ${errorData?.error || response.statusText}`
          );
          return;
        }

        setDevices(
          devices.map((device) =>
            device.id === editingId
              ? {
                  ...device,
                  name: deviceName,
                  ip: deviceIp,
                  mac: deviceMac,
                  brand: deviceBrand,
                  groupId: modalGroupId,
                  groupName:
                    groups.find((group) => group.id === modalGroupId)
                      ?.name || null,
                }
              : device
          )
        );
        setEditingId(null);
      } else {
        const response = await fetch(`${baseUrl}/devices`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          showMessage(
            "Greška",
            `Greška pri dodavanju uređaja: ${errorData?.error || response.statusText}`
          );
          return;
        }

        const newDevice = await response.json();

        setDevices([
          ...devices,
          {
            ...newDevice,
            brand: newDevice.brand || "generic",
            powerState: newDevice.powerState || newDevice.power_state || "Off",
            selected: false,
            groupId: modalGroupId,
            groupName:
              groups.find((group) => group.id === modalGroupId)?.name || null,
          },
        ]);
      }

      clearModalFields();
      setShowModal(false);
      setStatusMessage("Uređaj je uspješno spremljen.");
      setTimeout(() => setStatusMessage(""), 2500);
    } catch (error) {
      console.error("Spremanje uređaja nije uspjelo:", error);
      showMessage("Greška", "Greška pri spremanju uređaja. Provjeri je li backend pokrenut.");
    }
  };

  const applyOptimisticPowerOffState = (ids: number[]) => {
    if (ids.length === 0) return;
    setDevices((prev) =>
      prev.map((device) =>
        ids.includes(device.id) ? { ...device, powerState: "Off", power_state: "Off" } : device
      )
    );
  };

  const handlePowerOnAll = async () => {
    try {
      const response = await fetch(`${baseUrl}/devices/poweron-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        showMessage(
          "Greška",
          `Nije uspjelo paljenje svih TV-a: ${errorData?.error || response.statusText}`
        );
        return;
      }

      const data = (await response.json()) as { results?: BulkPowerResult[] };
      const results = data.results ?? [];
      const successCount = results.filter((item) => item.poweredOn).length;
      forcedOffIdsRef.current.clear();
      setStatusMessage(`Poslano WOL svim uređajima. Uspješno upaljeno ${successCount} od ${results.length}.`);
      setTimeout(() => setStatusMessage(""), 4000);
      await refreshAll();
    } catch (error) {
      console.error("Greska pri paljenju svih TV-a:", error);
      showMessage("Greška", "Greška pri paljenju svih TV-a.");
    }
  };

  const handlePowerOffDevice = async (id: number) => {
    // Optimistic UI update: mark device as Off immediately
    const device = devices.find((d) => d.id === id);
    if (device) {
      forcedOffIdsRef.current.add(id);
        confirmedOnAfterForcedOffRef.current.delete(id);
      setStatusMessage("Zahtjev za gašenje poslan (status ažuriran lokalno).");
      setTimeout(() => setStatusMessage(""), 3000);
    }

    try {
      const response = await fetch(`${baseUrl}/devices/${id}/poweroff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        forcedOffIdsRef.current.delete(id);
        const errorData = await response.json().catch(() => null);
        const errorMsg = errorData?.reason || errorData?.error || `Greška: ${response.statusText}`;
        showMessage("Greška pri gašenju", errorMsg);
        // Re-sync from server to ensure correct state
        await refreshAll();
        return;
      }

      const data = await response.json();
      if (!data.success) {
        forcedOffIdsRef.current.delete(id);
        showMessage("Gašenje nije uspjelo", data.reason || "Nepoznata greška");
        await refreshAll();
        return;
      }

      // backend accepted the request; keep the optimistic UI state
      return;
    } catch (error) {
      forcedOffIdsRef.current.delete(id);
      console.error("Greska pri gašenju uređaja:", error);
      showMessage("Greška", "Greška pri gašenju uređaja.");
      // On error, reload device states
      await refreshAll();
    }
  };

  const handlePowerOnDevice = async (id: number) => {
    showToast("info", "Uključivanje", "Šaljem WoL paket za paljenje TV-a...");
    // Optimistic UI update: mark device as On immediately
    forcedOffIdsRef.current.delete(id);
    confirmedOnAfterForcedOffRef.current.delete(id);
    const device = devices.find((d) => d.id === id);
    if (device) {
      setDevices((prev) =>
        prev.map((d) => (d.id === id ? { ...d, powerState: "On", power_state: "On" } : d))
      );
      recordDeviceEvent({ ...device, powerState: "On" }, "Manual power on requested");
    }

    try {
      const response = await fetch(`${baseUrl}/devices/${id}/poweron`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMsg = errorData?.reason || errorData?.error || `Greška: ${response.statusText}`;
        showToast("error", "Greška", `Nije uspjelo paljenje: ${errorMsg}`);
        await refreshAll();
        return;
      }

      const data = await response.json();
      if (data.success) {
        showToast("success", "Zahtjev poslan", "WoL paket poslan. TV će se upaliti ako je WoL aktivan (Quick Start+ u postavkama TV-a).");
      } else {
        showToast("error", "Nije uspjelo", `Paljenje nije potvrđeno: ${data.reason || "Provjeri je li 'Quick Start+' uključen u postavkama LG TV-a"}.`);
      }
      await refreshAll();
    } catch (error) {
      console.error("Greska pri paljenju uređaja:", error);
      showToast("error", "Greška", "Greška pri paljenju uređaja.");
      await refreshAll();
    }
  };

  const handleRestartDevice = async (id: number) => {
    showToast("info", "Restart", "Šaljem naredbu za restart TV-a...");
    try {
      const response = await fetch(`${baseUrl}/devices/${id}/restart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMsg = errorData?.reason || errorData?.error || `Greška: ${response.statusText}`;
        showToast("error", "Greška", `Nije uspio restart: ${errorMsg}`);
        return;
      }

      const data = await response.json();
      if (data.restarted && data.method === "webos") {
        showToast("success", "Restart pokrenuto", "TV se gasi... pokrenut će se automatski za otprilike 15-30 sekundi.");
      } else if (data.restarted) {
        showToast("success", "Restart poslan", `Zahtjev poslan za ${data.name || "uređaj"}.`);
      } else {
        showToast("info", "Restart zahtjev", "Restart zahtjev je poslan, ali nije potvrđen. Ako TV ima WoL, trebao bi se pokrenuti za nekoliko sekundi.");
      }
      await refreshAll();
    } catch (error) {
      console.error("Greska pri restartu uređaja:", error);
      showToast("error", "Greška", "Greška pri restartu uređaja.");
    }
  };

  const handleStartDiscovery = async () => {
    setDiscoveryLoading(true);
    setDiscoveredDevices([]);
    setSelectedDiscoveredDevices(new Set());

    try {
      const retryDelays = [0, 800, 1600];
      const clickId = `scan-${Date.now()}`;

      const discoverOnce = async (attempt: number) => {
        const response = await fetch(
          `${baseUrl}/devices/discover?clickId=${encodeURIComponent(clickId)}&clientAttempt=${attempt + 1}`,
          {
            headers: {
              "X-Discovery-Click-Id": clickId,
              "X-Discovery-Client-Attempt": String(attempt + 1),
            },
          }
        );
        const traceId = response.headers.get("X-Discovery-Trace-Id") || "n/a";

        if (!response.ok) {
          const responseText = await response.text().catch(() => "");
          let errorMessage = `HTTP ${response.status}`;
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData?.error || errorData?.message || errorMessage;
          } catch {
            if (responseText) {
              errorMessage = responseText;
            }
          }
          console.error(
            `[Discovery][${clickId}] Attempt ${attempt + 1} failed. status=${response.status}, traceId=${traceId}, error=${errorMessage}`
          );
          throw new Error(`[trace ${traceId}] ${errorMessage}`);
        }

        const data = await response.json();
        if (!data?.success) {
          const message = data?.error || "Discovery request failed";
          console.error(
            `[Discovery][${clickId}] Attempt ${attempt + 1} returned unsuccessful payload. traceId=${data?.traceId || traceId}, error=${message}`
          );
          throw new Error(`[trace ${data?.traceId || traceId}] ${message}`);
        }

        console.info(
          `[Discovery][${clickId}] Attempt ${attempt + 1} success. traceId=${data?.traceId || traceId}, count=${Array.isArray(data?.devices) ? data.devices.length : 0}`
        );

        return data;
      };

      let data: { success: boolean; devices?: Array<{ ip: string }>; error?: string } | null = null;
      let lastError: unknown = null;

      for (let attempt = 0; attempt < retryDelays.length; attempt++) {
        try {
          if (retryDelays[attempt] > 0) {
            await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
          }
          data = await discoverOnce(attempt);
          break;
        } catch (attemptError) {
          lastError = attemptError;
          console.warn(`[Discovery][${clickId}] Skeniranje nije uspjelo (pokušaj ${attempt + 1}/${retryDelays.length})`, attemptError);
        }
      }

      if (!data) {
        throw lastError || new Error("Skeniranje nije uspjelo");
      }

      if (data.success && data.devices) {
        setDiscoveredDevices(data.devices);
        if (data.devices.length === 0) {
          showToast("info", "Skeniranje", "Nisu pronađeni TV uređaji na mreži");
        } else {
          showToast("success", "Skeniranje", `Pronađeno ${data.devices.length} TV uređaja`);
        }
      }
    } catch (error) {
      console.error("Discovery error:", error);
      showToast("error", "Greška", "Greška pri skeniranju");
    } finally {
      setDiscoveryLoading(false);
    }
  };

  const handleAddDiscoveredDevices = async () => {
    if (selectedDiscoveredDevices.size === 0) {
      showToast("info", "Skeniranje", "Odaberi barem jedan TV");
      return;
    }

    try {
      let successCount = 0;
      let failureCount = 0;

      for (const ip of selectedDiscoveredDevices) {
        const device = discoveredDevices.find((d) => d.ip === ip);
        if (!device) continue;

        const candidateMac = (device.mac || "").trim();
        // Allow devices without valid MAC - backend will use fallback
        // Only skip if MAC validation fails AND backend requires it
        
        try {
          const response = await fetch(`${baseUrl}/devices`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: device.name || `TV (${ip})`,
              ip: device.ip,
              mac: candidateMac || `02:${ip.split(".").map(p => parseInt(p).toString(16).padStart(2, "0")).join(":")}`,
              brand: device.brand || "generic",
              groupId: null,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            const errData = await response.json().catch(() => ({}));
            console.error(`Failed to add device ${ip}:`, errData?.error);
            failureCount++;
          }
        } catch (err) {
          console.error(`Error adding device ${ip}:`, err);
          failureCount++;
        }
      }

      setShowDiscoveryModal(false);
      setSelectedDiscoveredDevices(new Set());
      setDiscoveredDevices([]);

      if (successCount > 0) {
        showToast("success", "Uspješno dodano", `${successCount} TV-a dodano u bazu`);
        await refreshAll();
      }

      if (failureCount > 0) {
        showToast(
          "error",
          "Greška pri dodavanju",
          `${failureCount} uređaj(a) nije dodano jer MAC nije bio validan ili greška pri dodavanju. Pokreni skeniranje ponovo dok je TV uključen.`
        );
      }
    } catch (error) {
      console.error("Add discovered devices error:", error);
      showToast("error", "Greška", "Greška pri dodavanju TV-a");
    }
  };

  const closeDiscoveryModal = () => {
    setShowDiscoveryModal(false);
    setDiscoveredDevices([]);
    setSelectedDiscoveredDevices(new Set());
  };

  const handleSendDeviceAction = async (id: number, action: string, params: Record<string, unknown> = {}) => {
    if (!id || !action) return;
    try {
      const device = devices.find((d) => d.id === id);
      if (!device) {
        showMessage("Greška", "Uređaj nije pronađen.");
        return;
      }
      const response = await fetch(`${baseUrl}/devices/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          action_params: params,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        showMessage("Greška", errorData?.error || "Nije moguće poslati akciju uređaju.");
        return;
      }
      showMessage("Info", `Akcija ${action} poslana.`);
    } catch (error) {
      console.error("Greška pri slanju akcije uređaju:", error);
      showMessage("Greška", "Akcija uređaju nije uspjela.");
    }
  };

  const handlePowerOffAll = async () => {
    if (devices.length > 0) {
      devices.forEach((device) => forcedOffIdsRef.current.add(device.id));
      applyOptimisticPowerOffState(devices.map((device) => device.id));
    }

    try {
      const response = await fetch(`${baseUrl}/devices/poweroff-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        showMessage(
          "Greška",
          `Nije uspjelo gašenje svih TV-a: ${errorData?.error || response.statusText}`
        );
        await refreshAll();
        return;
      }

      const data = (await response.json()) as { results?: BulkPowerResult[] };
      const results = data.results ?? [];
      const successCount = results.filter((item) => item.poweredOff).length;
      setStatusMessage(`Poslano gašenje svih uređaja. Ugašeno ${successCount} od ${results.length}.`);
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (error) {
      console.error("Greska pri gašenju svih TV-a:", error);
      showMessage("Greška", "Greška pri gašenju svih TV-a.");
      await refreshAll();
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`${baseUrl}/devices/${id}`, {
      method: "DELETE",
    });

    setDevices(devices.filter((device) => device.id !== id));

    if (selectedDeviceId === id) {
      setSelectedDeviceId(null);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setShowDeleteConfirm(false);
        setShowAssignGroupModal(false);
        setMessageModal(null);
        setShowScheduleBuilder(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      // other outside-click handlers remain for modals
    };

    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Auto-trigger discovery when modal opens
  useEffect(() => {
    if (showDiscoveryModal && !discoveryLoading && discoveredDevices.length === 0 && !discoveryInitiatedRef.current) {
      discoveryInitiatedRef.current = true;
      void handleStartDiscoveryRef.current();
    }
    
    // Reset the flag when modal closes
    if (!showDiscoveryModal) {
      discoveryInitiatedRef.current = false;
    }
  }, [showDiscoveryModal, discoveryLoading, discoveredDevices.length]);

  const handleViewDevice = async (id: number) => {
    const dev = devices.find((d) => d.id === id) || null;
    if (dev) {
      setSelectedDeviceId(id);
      setDetailTab("schedule");
    }
  };

  const handleClearSelection = () => {
    setSelectedDeviceId(null);
  };

  const confirmDelete = async () => {
    if (pendingDelete === null) return;
    await handleDelete(pendingDelete);
    setPendingDelete(null);
    setShowDeleteConfirm(false);
  };

  const cancelDelete = () => {
    setPendingDelete(null);
    setShowDeleteConfirm(false);
  };

  const openAssignGroupModal = () => {
    const selectedDevices = devices.filter((device) => device.selected);
    if (selectedDevices.length === 0) {
      showMessage("Greška", "Označi uređaje prije dodjeljivanja grupe.");
      return;
    }

    if (groups.length === 0) {
      showMessage("Greška", "Nema dostupnih grupa. Kreiraj grupu prvo.");
      return;
    }

    setSelectedAssignGroupId(null);
    setShowAssignGroupModal(true);
  };

  const assignGroupToSelected = async () => {
    if (selectedAssignGroupId === null) {
      showMessage("Greška", "Izaberi grupu za dodjelu.");
      return;
    }

    await fetch(`${baseUrl}/groups/${selectedAssignGroupId}/devices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        deviceIds: devices.filter((device) => device.selected).map((device) => device.id),
      }),
    });

    await refreshAll();
    setShowAssignGroupModal(false);
    setSelectedAssignGroupId(null);
  };

  const toggleDevice = (id: number) => {
    setDevices(
      devices.map((device) =>
        device.id === id
          ? { ...device, selected: !device.selected }
          : device
      )
    );
  };

  const handleDeleteSelectedConfirmed = async () => {
    const selectedDevices = devices.filter((device) => device.selected);

    if (selectedDevices.length === 0) {
      showMessage("Greška", "Nema označenih uređaja.");
      return;
    }

    await Promise.all(
      selectedDevices.map((device) =>
        fetch(`${baseUrl}/devices/${device.id}`, {
          method: "DELETE",
        })
      )
    );

    setDevices(devices.filter((device) => !device.selected));
  };

  const handleDeleteSelected = () => {
    const selectedDevices = devices.filter((device) => device.selected);

    if (selectedDevices.length === 0) {
      showMessage("Greška", "Nema označenih uređaja.");
      return;
    }

    showConfirm(
      "Potvrda brisanja",
      "Obrisati označene uređaje?",
      handleDeleteSelectedConfirmed,
      "Obriši",
      "Odustani"
    );
  };

  const handleRestartSelected = async () => {
    const selectedIds = devices
      .filter((device) => device.selected)
      .map((device) => device.id);

    if (selectedIds.length === 0) {
      showMessage("Greška", "Nema označenih uređaja.");
      return;
    }

    showToast("info", "Restart", `Saljem naredbu za restart ${selectedIds.length} uredaj(a)...`);

    await fetch(`${baseUrl}/devices/restart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: selectedIds }),
    });

    showToast("success", "Restart pokrenuto", `Restart pokrenut za ${selectedIds.length} uređaj(a). WebOS TV-i se gase i pale automatski za otprilike 15-30 sekundi.`);
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      showMessage("Greška", "Unesite naziv grupe.");
      return;
    }

    await fetch(`${baseUrl}/groups`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: groupName.trim() }),
    });

    setGroupName("");
    loadGroups();
    showMessage("Info", "Grupa je kreirana.");
  };

  const handleRestartGroup = async (groupId: number) => {
    showToast("info", "Restart grupe", "Šaljem naredbu za restart svih uređaja u grupi...");
    await fetch(`${baseUrl}/groups/${groupId}/restart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    showToast("success", "Restart pokrenuto", "WebOS TV-i se gase i pale automatski za otprilike 15-30 sekundi.");
  };

  const handlePowerOnGroup = async (groupId: number) => {
    try {
      const response = await fetch(`${baseUrl}/groups/${groupId}/poweron`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        showMessage(
          "Greška",
          `Nije uspjelo paljenje grupe: ${errorData?.error || response.statusText}`
        );
        return;
      }

      const data = (await response.json()) as { results?: Array<{ poweredOn?: boolean }> };
      const count = (data.results ?? []).filter((item) => item.poweredOn).length;
      const groupDeviceIds = devices.filter((device) => device.groupId === groupId).map((device) => device.id);
      groupDeviceIds.forEach((id) => forcedOffIdsRef.current.delete(id));
      showMessage("Info", `Poslano paljenje grupe. Uspješno upaljeno ${count} uređaja.`);
      await refreshAll();
    } catch (error) {
      console.error("Greška pri paljenju grupe:", error);
      showMessage("Greška", "Greška pri paljenju grupe.");
    }
  };

  const handlePowerOffGroup = async (groupId: number) => {
    const groupDeviceIds = devices.filter((device) => device.groupId === groupId).map((device) => device.id);
    if (groupDeviceIds.length > 0) {
      groupDeviceIds.forEach((id) => forcedOffIdsRef.current.add(id));
      applyOptimisticPowerOffState(groupDeviceIds);
    }

    try {
      const response = await fetch(`${baseUrl}/groups/${groupId}/poweroff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        showMessage(
          "Greška",
          `Nije uspjelo gašenje grupe: ${errorData?.error || response.statusText}`
        );
        await refreshAll();
        return;
      }

      const data = (await response.json()) as { results?: Array<{ poweredOff?: boolean }> };
      const successCount = (data.results ?? []).filter((item) => item.poweredOff).length;
      showMessage("Info", `Poslano gašenje grupe. Ugašeno ${successCount} uređaja.`);
    } catch (error) {
      console.error("Greška pri gašenju grupe:", error);
      showMessage("Greška", "Greška pri gašenju grupe.");
      await refreshAll();
    }
  };

  const handleOpenModal = () => {
    setEditingId(null);
    clearModalFields();
    setShowModal(true);
  };

  const handleOpenAuditForDevice = async (deviceId: number) => {
    setAuditDeviceFilter(String(deviceId));
    setAuditGroupFilter("all");
    setAuditPage(1);
    navigate('/audit');
    await loadAuditLogs(String(deviceId), "all", 1, auditPageSize);
  };

  const handleOpenAuditForGroup = async (groupId: number) => {
    setAuditGroupFilter(String(groupId));
    setAuditDeviceFilter("all");
    setAuditPage(1);
    navigate('/audit');
    await loadAuditLogs("all", String(groupId), 1, auditPageSize);
  };

  refreshAllRef.current = refreshAll;
  loadDevicesRef.current = loadDevices;
  loadHealthSummaryRef.current = loadHealthSummary;
  loadBackupsRef.current = loadBackups;
  loadDiagnosticsRef.current = loadDiagnostics;
  loadDeviceSchedulesRef.current = loadDeviceSchedules;
  handleStartDiscoveryRef.current = handleStartDiscovery;

  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.name.toLowerCase().includes(search.toLowerCase()) ||
      device.ip.includes(search) ||
      device.mac.toLowerCase().includes(search.toLowerCase());

    const matchesGroup =
      groupFilter === null ||
      (groupFilter === -1 ? device.groupId === null : device.groupId === groupFilter);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "online" && device.status === "Online") ||
      (statusFilter === "offline" && device.status === "Offline");

    const matchesPower =
      powerFilter === "all" ||
      (powerFilter === "on" && device.powerState === "On") ||
      (powerFilter === "off" && device.powerState === "Off");

    const lastActive = device.last_active_at ? new Date(device.last_active_at) : null;
    const now = new Date();
    const matchesActivity = (() => {
      switch (activityFilter) {
        case "active24h":
          return lastActive ? now.getTime() - lastActive.getTime() <= 1000 * 60 * 60 * 24 : false;
        case "active7d":
          return lastActive ? now.getTime() - lastActive.getTime() <= 1000 * 60 * 60 * 24 * 7 : false;
        case "inactive7d":
          return lastActive ? now.getTime() - lastActive.getTime() > 1000 * 60 * 60 * 24 * 7 : true;
        case "inactive30d":
          return lastActive ? now.getTime() - lastActive.getTime() > 1000 * 60 * 60 * 24 * 30 : true;
        default:
          return true;
      }
    })();

    const createdAt = device.created_at ? new Date(device.created_at) : null;
    const fromDate = registrationFrom ? new Date(registrationFrom) : null;
    const toDate = registrationTo ? new Date(registrationTo) : null;
    const matchesRegistrationFrom =
      !fromDate || (createdAt ? createdAt >= fromDate : false);
    const matchesRegistrationTo =
      !toDate || (createdAt ? createdAt <= toDate : false);

    return (
      matchesSearch &&
      matchesGroup &&
      matchesStatus &&
      matchesPower &&
      matchesActivity &&
      matchesRegistrationFrom &&
      matchesRegistrationTo
    );
  });

  const selectedDevice = devices.find((device) => device.id === selectedDeviceId) || null;
  const selectedDeviceHistory = selectedDevice
    ? deviceHistory[selectedDevice.id] || []
    : [];

  const recentDeviceEvents = Object.entries(deviceHistory)
    .flatMap(([deviceId, entries]) =>
      entries.map((entry) => ({
        deviceId: Number(deviceId),
        ...entry,
        deviceName: devices.find((device) => device.id === Number(deviceId))?.name || `Uređaj ${deviceId}`,
      }))
    )
    .sort((a, b) => b.time - a.time)
    .slice(0, 4);

  const groupStatusSummary = groups.map((group) => {
    const members = devices.filter((device) => device.groupId === group.id);
    const onlineCount = members.filter((device) => device.status === "Online").length;
    return {
      ...group,
      onlineCount,
      offlineCount: members.length - onlineCount,
    };
  });

  const muiTheme = createAppTheme(theme);
  const pageFallback = (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="body1" color="text.secondary">Učitavanje stranice...</Typography>
    </Container>
  );

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <AppLayout
        theme={theme}
        toggleTheme={toggleTheme}
        loading={loading}
        refreshAll={refreshAll}
        handlePowerOnAll={handlePowerOnAll}
        handlePowerOffAll={handlePowerOffAll}
        handleOpenModal={handleOpenModal}
        lastRefresh={lastRefresh}
      >
        {activePage === "dashboard" && (
          <Suspense fallback={pageFallback}>
            <DashboardPage
              devices={devices}
              groupStatusSummary={groupStatusSummary}
              recentDeviceEvents={recentDeviceEvents}
            />
          </Suspense>
        )}
        {activePage === "groups" && (
          <Suspense fallback={pageFallback}>
            <GroupsPage
              groupStatusSummary={groupStatusSummary}
              groupName={groupName}
              setGroupName={setGroupName}
              handleCreateGroup={handleCreateGroup}
              handleRestartGroup={handleRestartGroup}
              handlePowerOnGroup={handlePowerOnGroup}
              handlePowerOffGroup={handlePowerOffGroup}
              handleOpenAuditForGroup={handleOpenAuditForGroup}
            />
          </Suspense>
        )}
        {activePage === "audit" && (
          <Suspense fallback={pageFallback}>
            <AuditPage
              auditDeviceFilter={auditDeviceFilter}
              setAuditDeviceFilter={setAuditDeviceFilter}
              auditGroupFilter={auditGroupFilter}
              setAuditGroupFilter={setAuditGroupFilter}
              loadAuditLogs={loadAuditLogs}
              auditLoading={auditLoading}
              devices={devices}
              groups={groups}
              auditLogs={auditLogs}
              auditPage={auditPage}
              setAuditPage={setAuditPage}
              auditPageSize={auditPageSize}
              auditTotalCount={auditTotalCount}
            />
          </Suspense>
        )}
        {activePage === "settings" && (
          <Suspense fallback={pageFallback}>
            <SettingsPage
              backendUrl={backendUrl}
              setBackendUrl={setBackendUrl}
              schedulerOn={schedulerOn}
              setSchedulerOn={setSchedulerOn}
              loadHealthSummary={loadHealthSummary}
              healthLoading={healthLoading}
              healthSummary={healthSummary}
              handleCreateBackup={handleCreateBackup}
              backupLoading={backupLoading}
              loadBackups={loadBackups}
              backupList={backupList}
              selectedBackup={selectedBackup}
              setSelectedBackup={setSelectedBackup}
              handleRestoreBackup={handleRestoreBackup}
              handleRunMaintenanceNow={handleRunMaintenanceNow}
              diagnosticsLoading={diagnosticsLoading}
              loadDiagnostics={loadDiagnostics}
              handleShowDiagnosticsSnapshot={handleShowDiagnosticsSnapshot}
              handleDownloadDiagnosticsSnapshot={handleDownloadDiagnosticsSnapshot}
              diagnostics={diagnostics}
              showMessage={showMessage}
            />
          </Suspense>
        )}
        {activePage === "devices" && (
          <Suspense fallback={pageFallback}>
            <DevicesPage
              devices={devices}
              groups={groups}
              search={search}
              setSearch={setSearch}
              groupFilter={groupFilter}
              setGroupFilter={setGroupFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              powerFilter={powerFilter}
              setPowerFilter={setPowerFilter}
              activityFilter={activityFilter}
              setActivityFilter={setActivityFilter}
              registrationFrom={registrationFrom}
              setRegistrationFrom={setRegistrationFrom}
              registrationTo={registrationTo}
              setRegistrationTo={setRegistrationTo}
              selectedDevice={selectedDevice}
              handleClearSelection={handleClearSelection}
              handleRestartSelected={handleRestartSelected}
              handleDeleteSelected={handleDeleteSelected}
              openAssignGroupModal={openAssignGroupModal}
              loading={loading}
              filteredDevices={filteredDevices}
              toggleDevice={toggleDevice}
              formatPowerText={formatPowerText}
              formatStatusText={formatStatusText}
              handleViewDevice={handleViewDevice}
              setEditingId={setEditingId}
              setDeviceName={setDeviceName}
              setDeviceIp={setDeviceIp}
              setDeviceMac={setDeviceMac}
              setModalGroupId={setModalGroupId}
              setShowModal={setShowModal}
              handleOpenAuditForDevice={handleOpenAuditForDevice}
              handleRestartDevice={handleRestartDevice}
              setPendingDelete={setPendingDelete}
              setShowDeleteConfirm={setShowDeleteConfirm}
              showDeleteConfirm={showDeleteConfirm}
              cancelDelete={cancelDelete}
              confirmDelete={confirmDelete}
              showAssignGroupModal={showAssignGroupModal}
              setShowAssignGroupModal={setShowAssignGroupModal}
              selectedAssignGroupId={selectedAssignGroupId}
              setSelectedAssignGroupId={setSelectedAssignGroupId}
              assignGroupToSelected={assignGroupToSelected}
              messageModal={messageModal}
              setMessageModal={setMessageModal}
              closeMessageModal={closeMessageModal}
              handleMessageConfirm={handleMessageConfirm}
              selectedDeviceHistory={selectedDeviceHistory}
              volumeValue={volumeValue}
              setVolumeValue={handleVolumeValueChange}
              launchTarget={launchTarget}
              setLaunchTarget={setLaunchTarget}
              detailTab={detailTab}
              setDetailTab={setDetailTab}
              getDeviceSchedules={getDeviceSchedules}
              getAvailableActions={getAvailableActions}
              getActionLabel={getActionLabel}
              handleToggleSchedule={handleToggleSchedule}
              fetchScheduleLogs={fetchScheduleLogs}
              handleTriggerSchedule={handleTriggerSchedule}
              handleEditSchedule={handleEditSchedule}
              handleDeleteSchedule={handleDeleteSchedule}
              setShowScheduleBuilder={setShowScheduleBuilder}
              scheduleCron={scheduleCron}
              setScheduleCron={setScheduleCron}
              scheduleUseTime={scheduleUseTime}
              setScheduleUseTime={setScheduleUseTime}
              scheduleTime={scheduleTime}
              setScheduleTime={setScheduleTime}
              cronValid={cronValid}
              scheduleAction={scheduleAction}
              setScheduleAction={setScheduleAction}
              scheduleTarget={scheduleTarget}
              setScheduleTarget={setScheduleTarget}
              currentStepAction={currentStepAction}
              setCurrentStepAction={setCurrentStepAction}
              handlePowerOnDevice={handlePowerOnDevice}
              handlePowerOffDevice={handlePowerOffDevice}
              handleSendDeviceAction={handleSendDeviceAction}
              getAvailableActionsForDevice={getAvailableActionsForDevice}
              showMessage={showMessage}
            />
          </Suspense>
        )}
                {activePage === "notfound" && (
          <Container maxWidth="sm" sx={{ py: 6 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>404 - Stranica nije pronadena</Typography>
            <Typography variant="body1" color="text.secondary">Stranica koju tražiš ne postoji.</Typography>
          </Container>
        )}

      <DeviceEditorModal
        isOpen={showModal}
        editingId={editingId}
        deviceName={deviceName}
        deviceIp={deviceIp}
        deviceMac={deviceMac}
        deviceBrand={deviceBrand}
        modalGroupId={modalGroupId}
        groups={groups}
        onDeviceNameChange={setDeviceName}
        onDeviceIpChange={setDeviceIp}
        onDeviceMacChange={setDeviceMac}
        onDeviceBrandChange={setDeviceBrand}
        onModalGroupIdChange={setModalGroupId}
        onClose={() => setShowModal(false)}
        onOpenDiscovery={() => {
          setShowModal(false);
          setShowDiscoveryModal(true);
        }}
        onSave={handleSave}
      />

      <Snackbar
        open={loading}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: { xs: 1.5, sm: 2 } }}
      >
        <Alert
          severity="info"
          icon={<CircularProgress size={16} color="inherit" />}
          sx={{ width: '100%' }}
        >
          Osvježavanje...
        </Alert>
      </Snackbar>
      <Snackbar
        open={Boolean(statusMessage)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: { xs: loading ? 9 : 1.5, sm: loading ? 10 : 2 } }}
      >
        <Alert severity="info" sx={{ width: '100%' }}>
          {statusMessage}
        </Alert>
      </Snackbar>
      
      <DeviceDiscoveryModal
        isOpen={showDiscoveryModal}
        discoveryLoading={discoveryLoading}
        discoveredDevices={discoveredDevices}
        selectedDiscoveredDevices={selectedDiscoveredDevices}
        onClose={closeDiscoveryModal}
        onRetryDiscovery={handleStartDiscovery}
        onAddSelected={handleAddDiscoveredDevices}
        onSelectionChange={setSelectedDiscoveredDevices}
      />

      {/* Schedule Builder Modal */}
      <ScheduleBuilderModal
        isOpen={showScheduleBuilder}
        onClose={() => setShowScheduleBuilder(false)}
        onSave={handleSaveScheduleBuilder}
        onCronChange={setScheduleCron}
        currentCron={scheduleCron}
        action={getActionLabel(scheduleAction)}
        deviceName={selectedDevice?.name || "Uređaj"}
      />
      
      <ToastContainer messages={toastMessages} onRemove={removeToast} />
      </AppLayout>
    </ThemeProvider>
  );
}

export default App;

