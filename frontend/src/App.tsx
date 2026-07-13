import { useEffect, useRef, useState } from "react";
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import RefreshIcon from '@mui/icons-material/Refresh';
import PowerIcon from '@mui/icons-material/Power';
import PowerOffIcon from '@mui/icons-material/PowerOff';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import ArticleIcon from '@mui/icons-material/Article';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import "./App.css";
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
  normalizeCronExpression,
} from "./utils/schedule";

function App() {
  const [activePage, setActivePage] = useState<string>("devices");
  const navigate = useNavigate();

  // Helper component used in Routes to sync URL -> activePage state
  const PageSetter = ({ page }: { page: string }) => {
    useEffect(() => {
      setActivePage(page);
    }, [page]);
    return null;
  };
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
  const [scheduleSequence, setScheduleSequence] = useState<any[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [currentStepAction, setCurrentStepAction] = useState("poweron");
  const [currentStepParam, setCurrentStepParam] = useState("");
  const [currentStepDelay, setCurrentStepDelay] = useState("");
  const [currentStepWaitForReady, setCurrentStepWaitForReady] = useState("");
  const [currentStepSettle, setCurrentStepSettle] = useState("");
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
  const [loading, setLoading] = useState(false);
  // @ts-ignore - unused but may be needed for future use
  const [_tableLoading, _setTableLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = window.localStorage.getItem("appTheme");
      if (saved === "dark" || saved === "light") return saved as "dark" | "light";
    } catch (e) {
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

  const baseUrl = backendUrl.replace(/\/$/, "");

  // theme is initialized synchronously from localStorage above

  useEffect(() => {
    window.localStorage.setItem("appTheme", theme);
  }, [theme]);

  // Keep theme class on body so CSS variables apply globally (body uses --body-bg)
  useEffect(() => {
    try {
      document.body.classList.remove('theme-light', 'theme-dark');
      document.body.classList.add(`theme-${theme}`);
    } catch (e) {}
    return () => {
      try { document.body.classList.remove('theme-light', 'theme-dark'); } catch (e) {}
    };
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === "light" ? "dark" : "light";
      try {
        window.localStorage.setItem("appTheme", next);
      } catch (e) {
        // ignore storage errors
      }
      return next;
    });
  };


  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    refreshAll();
  }, []);

  const loadAuditLogs = async (deviceId?: string, groupId?: string) => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "300");
      if (deviceId && deviceId !== "all") {
        params.set("deviceId", deviceId);
      }
      if (groupId && groupId !== "all") {
        params.set("groupId", groupId);
      }

      const response = await fetch(`${baseUrl}/audit-logs?${params.toString()}`);
      const data = await response.json();
      setAuditLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Učitavanje audit loga nije uspjelo:", error);
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      await loadDevices();
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
              setDevices((prev) => prev.map((d) => (d.id === dev.id ? { ...d, ...dev, powerState: dev.power_state || dev.powerState } : d)));
              recordDeviceEvent({ ...(devices.find((x) => x.id === dev.id) || dev), powerState: dev.power_state || dev.powerState }, 'State updated from server');
            } else if (msg.type === 'devices:init' && Array.isArray(msg.devices)) {
              setDevices(msg.devices.map((d: any) => ({ ...d, powerState: d.power_state || d.powerState || 'Off' })));
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

  const refreshAll = async () => {
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
  };

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
      loadHealthSummary();
      loadBackups();
      loadDiagnostics();
    }
  }, [activePage, baseUrl]);

  const loadDevices = async () => {
    try {
      const response = await fetch(`${baseUrl}/devices`);
      const data = await response.json();
      const mappedDevices = data.map((device: any) => ({
        ...device,
        brand: device.brand || "generic",
        powerState: device.powerState || device.power_state || "Off",
        selected: false,
      }));

      setDevices(mappedDevices);
      mappedDevices.forEach((device: any) => {
        recordDeviceEvent(device, `Automatska provjera statusa: ${device.status}`);
      });
    } catch (error) {
      console.error("Učitavanje uređaja nije uspjelo:", error);
    }
  };

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
      loadDeviceSchedules(selectedDeviceId);
      setDetailTab("info");
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
    const available = getAvailableActions(selectedDevice);
    const supportedAction = available.some((action) => action.value === schedule.action)
      ? schedule.action
      : available[0]?.value || "poweron";

    setEditingScheduleId(schedule.id);
    setScheduleCron(schedule.cron);
    setScheduleAction(supportedAction);
    setScheduleTarget(
      supportedAction === "launchApp"
        ? schedule.action_params?.target || ""
        : supportedAction === "setVolume"
        ? String(schedule.action_params?.volume || "")
        : ""
    );
    setScheduleDescription(schedule.description || "");
    setScheduleEnabled(schedule.enabled);
    setDetailTab("schedule");
    // populate sequence if stored as sequence
    try {
      const params = schedule.action_params || {};
      if (schedule.action === "sequence" && params && Array.isArray(params.sequence)) {
        setScheduleSequence(params.sequence.map((s: any) => ({ ...s })));
      } else {
        setScheduleSequence([]);
      }
    } catch (e) {
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
    } catch (e) {}
  };

  const handleSaveSchedule = async () => {
    if (!selectedDeviceId) {
      showMessage("Greška", "Nema odabranog uređaja za raspored.");
      return;
    }

    // determine cron expression: prefer friendly time if selected
    const cronInput = scheduleUseTime && scheduleTime ? scheduleTime.trim() : scheduleCron.trim();
    if (!cronInput) {
      showMessage("Greška", "Unesi cron izraz ili vrijeme HH:MM.");
      return;
    }

    const normalizedCron = normalizeCronExpression(cronInput);
    if (!normalizedCron || !isCronValid(cronInput)) {
      showMessage("Greška", "Cron izraz nije valjan. Koristi format s 5 polja poput: 0 7 * * * ili vrijeme HH:MM.");
      return;
    }

    if (scheduleAction === "launchApp" && !scheduleTarget.trim()) {
      showMessage("Greška", "Unesi aplikaciju ili URL.");
      return;
    }

    if (scheduleAction === "setVolume") {
      const volume = Number(scheduleTarget);
      if (Number.isNaN(volume) || volume < 0 || volume > 100) {
        showMessage("Greška", "Unesi volumen između 0 i 100.");
        return;
      }
    }

    // Build payload: if sequence steps exist, send as `actions` array
    let payload: any;
    if (Array.isArray(scheduleSequence) && scheduleSequence.length > 0) {
      payload = {
        cron: normalizedCron,
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
        cron: normalizedCron,
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

    const available = getAvailableActions(selectedDevice);
    if (!available.some((action) => action.value === scheduleAction)) {
      showMessage("Greška", "Odabrana akcija nije podržana za ovaj uređaj.");
      return;
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
      showMessage("Info", "Raspored spremljen.");
    } catch (error) {
      console.error("Spremanje rasporeda nije uspjelo:", error);
      showMessage("Greška", "Greška pri spremanju rasporeda.");
    }
  };

  const addStepToSequence = () => {
    const step: any = { action: currentStepAction };
    if (currentStepParam && currentStepAction === "launchApp") {
      step.params = { target: currentStepParam.trim() };
    }
    if (currentStepParam && currentStepAction === "setVolume") {
      const v = Number(currentStepParam);
      if (!Number.isNaN(v)) {
        step.params = { volume: v };
      }
    }
    if (currentStepDelay) step.delayMs = Number(currentStepDelay);
    if (currentStepWaitForReady) step.waitForReadyMs = Number(currentStepWaitForReady);
    if (currentStepSettle) step.settleMs = Number(currentStepSettle);

    setScheduleSequence((prev) => [...prev, step]);

    // reset current step fields
    setCurrentStepParam("");
    setCurrentStepDelay("");
    setCurrentStepWaitForReady("");
    setCurrentStepSettle("");
  };

  const removeStep = (index: number) => {
    setScheduleSequence((prev) => prev.filter((_, i) => i !== index));
  };

  

  const reorderSteps = (from: number, to: number) => {
    setScheduleSequence((prev) => {
      const arr = [...prev];
      if (from < 0 || from >= arr.length) return arr;
      const item = arr.splice(from, 1)[0];
      // if dropping after removal and target index equals length, push to end
      const insertAt = Math.min(Math.max(0, to), arr.length);
      arr.splice(insertAt, 0, item);
      return arr;
    });
    setDragIndex(null);
  };

  const onDragStart = (e: React.DragEvent, idx: number) => {
    try {
      e.dataTransfer.setData('text/plain', String(idx));
      e.dataTransfer.effectAllowed = 'move';
      setDragIndex(idx);
    } catch (err) {}
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData('text/plain'));
    if (!Number.isNaN(from)) reorderSteps(from, idx);
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
      let payload: any;
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

  const recordDeviceEvent = (device: Device, note: string) => {
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

      const data = await response.json();
      const successCount = data.results.filter((item: any) => item.poweredOn).length;
      setStatusMessage(`Poslano WOL svim uređajima. Uspješno upaljeno ${successCount} od ${data.results.length}.`);
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
      applyOptimisticPowerOffState([id]);
      recordDeviceEvent({ ...device, powerState: "Off" }, "Manual power off requested");
      setStatusMessage("Zahtjev za gašenje poslan (status ažuriran lokalno).");
      setTimeout(() => setStatusMessage(""), 3000);
    }

    try {
      const response = await fetch(`${baseUrl}/devices/${id}/poweroff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMsg = errorData?.reason || errorData?.error || `Greška: ${response.statusText}`;
        showMessage("Greška pri gašenju", errorMsg);
        // Re-sync from server to ensure correct state
        await refreshAll();
        return;
      }

      const data = await response.json();
      if (!data.success) {
        showMessage("Gašenje nije uspjelo", data.reason || "Nepoznata greška");
        await refreshAll();
        return;
      }

      // backend accepted the request; keep the optimistic UI state
      return;
    } catch (error) {
      console.error("Greska pri gašenju uređaja:", error);
      showMessage("Greška", "Greška pri gašenju uređaja.");
      // On error, reload device states
      await refreshAll();
    }
  };

  const handlePowerOnDevice = async (id: number) => {
    showToast("info", "Uključivanje", "Šaljem WoL paket za paljenje TV-a...");
    // Optimistic UI update: mark device as On immediately
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

  const handleSendDeviceAction = async (id: number, action: string, params: Record<string, any> = {}) => {
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

      const data = await response.json();
      const successCount = data.results.filter((item: any) => item.poweredOff).length;
      setStatusMessage(`Poslano gašenje svih uređaja. Ugašeno ${successCount} od ${data.results.length}.`);
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

  // View modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewModalDevice, setViewModalDevice] = useState<Device | null>(null);

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewModalDevice(null);
    setSelectedDeviceId(null);
    setDetailTab("info");
  };

  // per-row dropdown was removed; actions are inline now

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setShowViewModal(false);
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

  // Lock body scroll when modals are open
  useEffect(() => {
    const isAnyModalOpen = showModal || showViewModal || showDeleteConfirm || showAssignGroupModal || messageModal || showScheduleBuilder || showDiscoveryModal;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showModal, showViewModal, showDeleteConfirm, showAssignGroupModal, messageModal, showScheduleBuilder, showDiscoveryModal]);

  // Auto-trigger discovery when modal opens
  useEffect(() => {
    if (showDiscoveryModal && !discoveryLoading && discoveredDevices.length === 0 && !discoveryInitiatedRef.current) {
      discoveryInitiatedRef.current = true;
      handleStartDiscovery();
    }
    
    // Reset the flag when modal closes
    if (!showDiscoveryModal) {
      discoveryInitiatedRef.current = false;
    }
  }, [showDiscoveryModal, discoveryLoading, discoveredDevices.length]);

  const handleViewDevice = async (id: number) => {
    const dev = devices.find((d) => d.id === id) || null;
    if (dev) {
      setViewModalDevice(dev);
      setSelectedDeviceId(id);
      setDetailTab("schedule");
      setShowViewModal(true);
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

  const cancelAssignGroup = () => {
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

    showToast("info", "Restart", `Šaljem naredbu za restart ${selectedIds.length} uređaj(a)...`);

    await fetch(`${baseUrl}/devices/restart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: selectedIds }),
    });

    showToast("success", "Restart pokrenuto", `Restart pokrenut za ${selectedIds.length} uređaj(a). WebOS TV-i se gase i pale automatski za otprilike 15-30 sekundi.`);
  };

  // @ts-ignore - unused but may be needed for future use
  const _handleApplySettings = async () => {
    const selectedIds = devices
      .filter((device) => device.selected)
      .map((device) => device.id);

    if (selectedIds.length === 0) {
      showMessage("Greška", "Nema označenih uređaja.");
      return;
    }

    await fetch(`${baseUrl}/devices/settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ids: selectedIds,
        settings: { mode: "professionally managed", updatedAt: new Date() },
      }),
    });

    showMessage("Info", "Promjene poslane za oznacene uredaje.");
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

      const data = await response.json();
      const count = data.results.filter((item: any) => item.poweredOn).length;
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

      const data = await response.json();
      const successCount = data.results.filter((item: any) => item.poweredOff).length;
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
    navigate('/audit');
    await loadAuditLogs(String(deviceId), "all");
  };

  const handleOpenAuditForGroup = async (groupId: number) => {
    setAuditGroupFilter(String(groupId));
    setAuditDeviceFilter("all");
    navigate('/audit');
    await loadAuditLogs("all", String(groupId));
  };

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
  const viewModalDeviceInfo = viewModalDevice || selectedDevice;

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

  const unassignedCount = devices.filter((device) => device.groupId === null).length;
  const groupHealth = groupStatusSummary
    .map((group) => ({
      ...group,
      offlineRatio: group.deviceCount ? group.offlineCount / group.deviceCount : 0,
    }))
    .sort((a, b) => b.offlineRatio - a.offlineRatio)
    .slice(0, 4);

  const recentOfflineEvents = recentDeviceEvents.filter((entry) => entry.status === "Offline").length;
  const dashboardInsights = [
    `Najviše offline ima ${groupHealth[0]?.name || "nijedna grupa"} (${groupHealth[0]?.offlineCount || 0}).`,
    `U mreži je ${unassignedCount} uređaja bez grupe.`,
    `Posljednja 4 događaja: ${recentOfflineEvents} offline zapisa.`,
  ];

  const onlineCount = devices.filter((device) => device.status === "Online").length;
  const offlineCount = devices.filter((device) => device.status === "Offline").length;
  const poweredOnCount = devices.filter((device) => device.powerState === "On").length;
  const selectedCount = devices.filter((device) => device.selected).length;

  const healthScore = devices.length > 0 ? Math.round((onlineCount / devices.length) * 100) : 0;
  const healthStatus = healthScore >= 80 ? "excellent" : healthScore >= 60 ? "good" : healthScore >= 40 ? "warning" : "critical";
  const criticalOfflineDevices = devices.filter((device) => device.status === "Offline").slice(0, 3);
  const hasCritical = offlineCount > 0;

  return (
    <>
      <AppBar position="fixed" color="default" elevation={3}>
        <Toolbar>
          <Typography variant="h6" component="div" style={{ flexGrow: 1 }}>
            Herceg TV Control
          </Typography>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Tooltip title="Refresh">
              <span>
                <IconButton color="inherit" aria-label="refresh" onClick={refreshAll} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Power On All TVs">
              <span>
                <Button color="inherit" startIcon={<PowerIcon />} onClick={handlePowerOnAll}>
                  Upali sve
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Power Off All TVs">
              <span>
                <Button color="inherit" startIcon={<PowerOffIcon />} onClick={handlePowerOffAll}>
                  Isključi sve
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="Add Device">
              <span>
                <Button color="inherit" startIcon={<AddIcon />} onClick={handleOpenModal}>
                  Dodaj
                </Button>
              </span>
            </Tooltip>
            <IconButton color="inherit" aria-label="toggle theme" onClick={toggleTheme}>
              {theme === "light" ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </div>
        </Toolbar>
      </AppBar>

      <div className={`app theme-${theme}`}>
      <aside className="sidebar">
        <h2>TV Upravljač</h2>
        <div className="sidebar-menu">
          <NavLink to="/" end className={({isActive}: {isActive: boolean}) => isActive ? 'active' : ''}>📊 Početna</NavLink>
          <NavLink to="/devices" className={({isActive}: {isActive: boolean}) => isActive ? 'active' : ''}>📺 Uređaji</NavLink>
          <NavLink to="/groups" className={({isActive}: {isActive: boolean}) => isActive ? 'active' : ''}>👥 Grupe</NavLink>
          <NavLink to="/audit" className={({isActive}: {isActive: boolean}) => isActive ? 'active' : ''}>📜 Audit log</NavLink>
          <NavLink to="/settings" className={({isActive}: {isActive: boolean}) => isActive ? 'active' : ''}>⚙️ Postavke</NavLink>
        </div>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<PageSetter page="dashboard" />} />
          <Route path="/devices" element={<PageSetter page="devices" />} />
          <Route path="/groups" element={<PageSetter page="groups" />} />
          <Route path="/audit" element={<PageSetter page="audit" />} />
          <Route path="/settings" element={<PageSetter page="settings" />} />
          <Route path="*" element={<PageSetter page="notfound" />} />
        </Routes>
        {activePage === "dashboard" && (
          <>
            <h1>Početna</h1>
            <div className="stats">
              <div className="stat-card stat-total">
                <div className="stat-card-top">
                  <span className="stat-icon">📦</span>
                  <span className="stat-title">Ukupno uređaja</span>
                </div>
                <div className="stat-number">{devices.length}</div>
                <div className="stat-meta">Sve jedinice</div>
              </div>
              <div className="stat-card stat-online">
                <div className="stat-card-top">
                  <span className="stat-icon">✅</span>
                  <span className="stat-title">Na mreži</span>
                </div>
                <div className="stat-number">{onlineCount}</div>
                <div className="stat-meta">Aktivni uređaji</div>
              </div>
              <div className="stat-card stat-offline">
                <div className="stat-card-top">
                  <span className="stat-icon">⛔</span>
                  <span className="stat-title">Van mreže</span>
                </div>
                <div className="stat-number">{offlineCount}</div>
                <div className="stat-meta">Nedostupni uređaji</div>
              </div>
              <div className="stat-card stat-powered">
                <div className="stat-card-top">
                  <span className="stat-icon">⚡</span>
                  <span className="stat-title">Uključeno</span>
                </div>
                <div className="stat-number">{poweredOnCount}</div>
                <div className="stat-meta">Napajanje aktivno</div>
              </div>
              <div className="stat-card stat-selected">
                <div className="stat-card-top">
                  <span className="stat-icon">🎯</span>
                  <span className="stat-title">Odabrano</span>
                </div>
                <div className="stat-number">{selectedCount}</div>
                <div className="stat-meta">Trenutno označeno</div>
              </div>
            </div>

            {hasCritical && (
              <div className={`alarm-notification alarm-${healthStatus}`}>
                <div className="alarm-header">
                  <span className="alarm-icon">⚠️</span>
                  <span className="alarm-title">UPOZORENJE - Kritični uređaji offline</span>
                </div>
                <div className="alarm-devices">
                  {criticalOfflineDevices.map((device) => (
                    <div key={device.id} className="alarm-device-item">
                      <span className="alarm-dot"></span>
                      <span>{device.name}</span>
                      <span className="alarm-ip">({device.ip})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="health-score-card">
              <div className="health-header">
                <h3>Zdravlje mreže</h3>
                <div className={`health-badge health-${healthStatus}`}>
                  {healthScore}%
                </div>
              </div>
              <div className="health-bar">
                <div className="health-bar-fill" style={{ width: `${healthScore}%` }}></div>
              </div>
              <p className="health-text">
                {healthStatus === "excellent" && "Mreža je u odličnom stanju! Svi uređaji su dostupni."}
                {healthStatus === "good" && "Mreža je u dobrom stanju. Većina uređaja je dostupna."}
                {healthStatus === "warning" && "Mreža zahtjeva pažnju. Nekoliko uređaja je van mreže."}
                {healthStatus === "critical" && "Mreža je u kritičnom stanju! Mnogi uređaji su van mreže."}
              </p>
            </div>

            <div className="dashboard-charts">
              <div className="chart-card">
                <div className="chart-title">Uređaji na mreži</div>
                <div className="chart-bar-container">
                  <div
                    className="chart-bar online"
                    style={{
                      width: `${devices.length ? (onlineCount / devices.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="chart-metrics">
                  <span className="chart-value">{onlineCount}</span>
                  <span className="chart-meta">od {devices.length} ukupno</span>
                </div>
              </div>
              <div className="chart-card">
                <div className="chart-title">Uređaji van mreže</div>
                <div className="chart-bar-container">
                  <div
                    className="chart-bar offline"
                    style={{
                      width: `${devices.length ? (offlineCount / devices.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="chart-metrics">
                  <span className="chart-value">{offlineCount}</span>
                  <span className="chart-meta">od {devices.length} ukupno</span>
                </div>
              </div>
            </div>

            {devices.length > 0 && (
              <div className="pie-chart-container">
                <h2>Distribuacija statusa uređaja</h2>
                <div className="pie-chart-donut-wrapper">
                  <div
                    className="pie-chart-donut"
                    style={{
                      background: `conic-gradient(#22c55e ${devices.length ? (onlineCount / devices.length) * 360 : 0}deg, #f59e0b ${devices.length ? (onlineCount / devices.length) * 360 : 0}deg 360deg)`,
                    }}
                  >
                    <div className="donut-center">
                      <div className="donut-count">{devices.length}</div>
                      <div className="donut-label">uređaja</div>
                    </div>
                  </div>
                  <div className="pie-legend">
                    <div className="pie-legend-item">
                      <span className="pie-legend-dot online"></span>
                      <span>Na mreži ({onlineCount})</span>
                    </div>
                    <div className="pie-legend-item">
                      <span className="pie-legend-dot offline"></span>
                      <span>Van mreže ({offlineCount})</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {groupStatusSummary.length > 0 && (
              <div className="circular-progress-container">
                <h2>Zdravlje grupa po dostupnosti</h2>
                <div className="circular-grid">
                  {groupStatusSummary.slice(0, 4).map((group) => {
                    const healthPercent = group.deviceCount ? (group.onlineCount / group.deviceCount) * 100 : 0;
                    const circumference = 2 * Math.PI * 45;
                    const strokeDashoffset = circumference - (healthPercent / 100) * circumference;
                    return (
                      <div key={group.id} className="circular-progress-card">
                        <svg className="circular-progress" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke={healthPercent > 50 ? '#22c55e' : healthPercent > 20 ? '#f59e0b' : '#ef4444'}
                            strokeWidth="8"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            transform="rotate(-90 50 50)"
                          />
                          <text x="50" y="50" textAnchor="middle" dy="0.3em" fontSize="20" fontWeight="700" fill="#1f2937">
                            {Math.round(healthPercent)}%
                          </text>
                        </svg>
                        <div className="circular-progress-label">
                          <strong>{group.name}</strong>
                          <small>{group.onlineCount}/{group.deviceCount}</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="dashboard-grid">
              <div className="dashboard-panel">
                <h2>Grupe koje trebaju pažnju</h2>
                <p className="form-description">
                  Prati grupe prema udjelu offline uređaja i brzo vidi gdje treba intervenirati.
                </p>
                {groupHealth.length === 0 ? (
                  <p className="empty-log">Nema dovoljno podataka za grupnu analizu.</p>
                ) : (
                  <ul className="group-health-list">
                    {groupHealth.map((group) => (
                      <li key={group.id} className="group-health-item">
                        <div className="group-health-title">
                          <strong>{group.name}</strong>
                          <span>{group.offlineCount}/{group.deviceCount} offline</span>
                        </div>
                        <div className="group-health-bar-container">
                          <div
                            className="group-health-bar"
                            style={{ width: `${group.deviceCount ? (group.offlineRatio * 100).toFixed(0) : 0}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="dashboard-panel">
                <h2>Operativni uvidi</h2>
                <p className="form-description">
                  Kratki pregled najvažnijih stanja i preporuka za akciju.
                </p>
                <ul className="insight-list">
                  {dashboardInsights.map((insight, index) => (
                    <li key={index}>{insight}</li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}

        {activePage === "groups" && (
          <>
            <h1>Grupe uređaja</h1>
            <p className="page-description">
              Grupe služe za organizaciju TV uređaja u logične cjeline.
              Dodaj uređaje u grupu kako bi mogao upravljati cijelom grupom odjednom,
              primjerice restartati sve uređaje u toj grupi.
            </p>
            <div className="group-actions">
              <TextField
                className="small-input"
                placeholder="Naziv nove grupe"
                variant="outlined"
                size="small"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <button type="button" className="add-btn" onClick={handleCreateGroup}>
                Kreiraj grupu
              </button>
            </div>

            <div className="group-list">
              {groupStatusSummary.map((group) => (
                <div className="group-card" key={group.id}>
                  <div className="group-card-title">{group.name}</div>
                  <div>{group.deviceCount} uređaja</div>
                  <div className="group-metrics">
                    <span>Online: {group.onlineCount}</span>
                    <span>Offline: {group.offlineCount}</span>
                  </div>
                  <div className="group-card-actions">
                    <button
                      type="button"
                      className="action-btn restart-btn"
                      onClick={() => handleRestartGroup(group.id)}
                    >
                      Restart grupe
                    </button>
                    <button
                      type="button"
                      className="action-btn poweron-btn"
                      onClick={() => handlePowerOnGroup(group.id)}
                    >
                      Upali grupu
                    </button>
                    <button
                      type="button"
                      className="action-btn poweroff-btn"
                      onClick={() => handlePowerOffGroup(group.id)}
                    >
                      Isključi grupu
                    </button>
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => handleOpenAuditForGroup(group.id)}
                    >
                      Audit log
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activePage === "audit" && (
          <>
            <h1>Audit log</h1>
            <p className="page-description">
              Pregled akcija po uređaju i grupi: ko je pokrenuo, kada je pokrenuto i kakav je ishod.
            </p>

            <div className="filters">
              <FormControl size="small" className="small-select select-box" sx={{ minWidth: 220 }}>
                <Select
                  value={auditDeviceFilter}
                  onChange={(e) => setAuditDeviceFilter(e.target.value)}
                  displayEmpty
                  inputProps={{
                    name: "auditDeviceFilter",
                    id: "audit-device-filter",
                  }}
                >
                  <MenuItem value="all">Svi uređaji</MenuItem>
                  {devices.map((device) => (
                    <MenuItem key={device.id} value={String(device.id)}>
                      {device.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" className="small-select select-box" sx={{ minWidth: 220 }}>
                <Select
                  value={auditGroupFilter}
                  onChange={(e) => setAuditGroupFilter(e.target.value)}
                  displayEmpty
                  inputProps={{
                    name: "auditGroupFilter",
                    id: "audit-group-filter",
                  }}
                >
                  <MenuItem value="all">Sve grupe</MenuItem>
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={String(group.id)}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <button
                type="button"
                className="refresh-btn"
                onClick={() => loadAuditLogs(auditDeviceFilter, auditGroupFilter)}
                disabled={auditLoading}
              >
                {auditLoading ? "Učitavam..." : "Osvježi audit"}
              </button>
            </div>

            <div className="table-wrapper">
              <table className="device-table">
                <thead>
                  <tr>
                    <th>Vrijeme</th>
                    <th>Ko/Izvor</th>
                    <th>Akcija</th>
                    <th>Uređaj</th>
                    <th>Grupa</th>
                    <th>Ishod</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr className="empty-row">
                      <td colSpan={6}>Nema audit zapisa za odabrani filter.</td>
                    </tr>
                  ) : (
                    auditLogs.map((entry) => {
                      const deviceName = entry.device_id
                        ? devices.find((d) => d.id === entry.device_id)?.name || `Uređaj ${entry.device_id}`
                        : "-";
                      const groupName = entry.group_id
                        ? groups.find((g) => g.id === entry.group_id)?.name || `Grupa ${entry.group_id}`
                        : "-";
                      return (
                        <tr key={entry.id}>
                          <td>{new Date(entry.created_at).toLocaleString()}</td>
                          <td>{entry.source || "system"}</td>
                          <td>{entry.action}</td>
                          <td>{deviceName}</td>
                          <td>{groupName}</td>
                          <td>
                            <span className={entry.status.includes("success") ? "status-online" : "status-offline"}>
                              {entry.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activePage === "settings" && (
          <>
            <h1>Postavke</h1>
            <div className="table-wrapper">
              <p>Backend URL:</p>
              <TextField
                className="small-input"
                size="small"
                variant="outlined"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
              />
              <br />
              <br />
              <p>Scheduler:</p>
              <FormControl size="small" className="small-select" sx={{ minWidth: 180 }}>
                <Select
                  value={schedulerOn ? "on" : "off"}
                  onChange={(e) => setSchedulerOn(e.target.value === "on")}
                  inputProps={{
                    name: "schedulerStatus",
                    id: "scheduler-status",
                  }}
                >
                  <MenuItem value="on">Uključen</MenuItem>
                  <MenuItem value="off">Isključen</MenuItem>
                </Select>
              </FormControl>
              <br />
              <br />
              <button
                type="button"
                className="save-btn"
                onClick={() => showMessage("Info", "Postavke spremljene lokalno.")}
              >
                Spremi postavke
              </button>

              <br />
              <br />
              <h3>Health pregled</h3>
              <button type="button" className="refresh-btn" onClick={loadHealthSummary} disabled={healthLoading}>
                {healthLoading ? "Učitavam health..." : "Osvježi health"}
              </button>
              {healthSummary ? (
                <div>
                  <p>Vrijeme: {new Date(healthSummary.timestamp).toLocaleString()}</p>
                  <p>Uređaji online/offline: {healthSummary.devices.online} / {healthSummary.devices.offline}</p>
                  <p>Schedule success 24h: {healthSummary.schedules24h.success}/{healthSummary.schedules24h.total} ({healthSummary.schedules24h.successRate ?? 0}%)</p>
                  <p>Zadnjih grešaka: {healthSummary.recentFailures.length}</p>
                </div>
              ) : (
                <p>Health podaci trenutno nisu dostupni.</p>
              )}

            {String(activePage) === "notfound" && (
              <>
                <h1>404 - Stranica nije pronađena</h1>
                <p className="page-description">Stranica koju tražiš ne postoji.</p>
              </>
            )}

              <br />
              <h3>Backup i restore baze</h3>
              <button type="button" className="save-btn" onClick={handleCreateBackup} disabled={backupLoading}>
                {backupLoading ? "Radim backup..." : "Napravi backup"}
              </button>
              <button type="button" className="refresh-btn" onClick={loadBackups} disabled={backupLoading} style={{ marginLeft: 8 }}>
                Osvježi listu backupa
              </button>
              <br />
              <br />
              <FormControl size="small" className="small-select" sx={{ minWidth: 240 }}>
                <Select
                  value={selectedBackup}
                  onChange={(e) => setSelectedBackup(e.target.value)}
                  disabled={backupLoading || backupList.length === 0}
                  displayEmpty
                  inputProps={{
                    name: "backupSelection",
                    id: "backup-selection",
                  }}
                >
                  {backupList.length === 0 ? (
                    <MenuItem value="">Nema backup fajlova</MenuItem>
                  ) : (
                    backupList.map((backup) => (
                      <MenuItem key={backup.name} value={backup.name}>
                        {backup.name} ({Math.round(backup.sizeBytes / 1024)} KB)
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              <br />
              <br />
              <button
                type="button"
                className="action-btn poweroff-btn"
                onClick={handleRestoreBackup}
                disabled={backupLoading || !selectedBackup}
              >
                {backupLoading ? "Restore u toku..." : "Restore odabranog backupa"}
              </button>

              <br />
              <br />
              <h3>Automatsko održavanje i brza dijagnostika</h3>
              <p>
                Sedmični maintenance se izvršava automatski na backendu. Ovdje možeš ručno pokrenuti maintenance i otvoriti
                dijagnostički snapshot kad se desi greška.
              </p>
              <button
                type="button"
                className="action-btn poweron-btn"
                onClick={handleRunMaintenanceNow}
                disabled={diagnosticsLoading}
              >
                {diagnosticsLoading ? "Maintenance radi..." : "Pokreni maintenance sada"}
              </button>
              <button
                type="button"
                className="refresh-btn"
                onClick={loadDiagnostics}
                disabled={diagnosticsLoading}
                style={{ marginLeft: 8 }}
              >
                Osvježi diagnostics
              </button>
              <button
                type="button"
                className="save-btn"
                onClick={handleShowDiagnosticsSnapshot}
                disabled={!diagnostics}
                style={{ marginLeft: 8 }}
              >
                Prikaži diagnostics snapshot
              </button>
              <button
                type="button"
                className="save-btn"
                onClick={handleDownloadDiagnosticsSnapshot}
                disabled={!diagnostics}
                style={{ marginLeft: 8 }}
              >
                Preuzmi diagnostics JSON
              </button>

              {diagnostics ? (
                <div style={{ marginTop: 12 }}>
                  {diagnostics.runtimeIssues.length >= (diagnostics.config.runtimeIssueAlertThreshold ?? 8) && (
                    <div className="diagnostics-alert-box">
                      ⚠️ Upozorenje: runtime issue count je {diagnostics.runtimeIssues.length}, što prelazi prag {diagnostics.config.runtimeIssueAlertThreshold ?? 8}.
                    </div>
                  )}
                  <p><strong>Zadnji maintenance:</strong> {diagnostics.lastMaintenance?.timestamp ? new Date(diagnostics.lastMaintenance.timestamp).toLocaleString() : "nema"}</p>
                  <p><strong>Trigger:</strong> {diagnostics.lastMaintenance?.trigger || "-"}</p>
                  <p><strong>Status:</strong> {diagnostics.lastMaintenance?.status || "-"}</p>
                  <p><strong>Runtime issue zapisa:</strong> {diagnostics.runtimeIssues.length}</p>
                  <p><strong>Recent failed audit:</strong> {diagnostics.recentFailedAudit.length}</p>
                  <p><strong>Sedmični cron:</strong> {diagnostics.config.weeklyMaintenanceCron}</p>
                </div>
              ) : (
                <p style={{ marginTop: 12 }}>Diagnostics nisu dostupni.</p>
              )}
            </div>
          </>
        )}

        {activePage === "devices" && (
          <>
            <div className="top-bar">
              <div>
                <h1 style={{ color: "green" }}>Uređaji</h1>
                <p className="page-description">
                  Pronađi uređaje brzo, upravljaj grupama i primjeni postavke u nekoliko klikova.
                </p>
                <p className="last-refresh">Zadnje osvježenje: {lastRefresh || "još nije osvježeno"}</p>
              </div>
              {/* Controls moved to global AppBar */}
            </div>


            {showDeleteConfirm && (
              <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}>
                <div className="modal">
                  <h2>Potvrda brisanja</h2>
                  <p>Da li želiš obrisati odabrani uređaj?</p>
                  <div className="modal-buttons">
                    <button type="button" className="save-btn" onClick={confirmDelete}>
                      Da, obriši
                    </button>
                    <button type="button" onClick={cancelDelete}>
                      Ne, poništi
                    </button>
                  </div>
                </div>
              </div>
            )}
            {showAssignGroupModal && (
              <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAssignGroupModal(false); }}>
                <div className="modal">
                  <h2>Dodaj u grupu</h2>
                  <p>Izaberi grupu za označene uređaje:</p>
                  <FormControl size="small" sx={{ minWidth: 260 }}>
                    <Select
                      value={selectedAssignGroupId ?? ""}
                      onChange={(e) =>
                        setSelectedAssignGroupId(
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      displayEmpty
                      inputProps={{ name: 'assignGroup', id: 'assign-group-select' }}
                    >
                      <MenuItem value="">Odaberi grupu</MenuItem>
                      {groups.map((group) => (
                        <MenuItem key={group.id} value={group.id}>
                          {group.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <div className="modal-buttons">
                    <button type="button" className="save-btn" onClick={assignGroupToSelected}>
                      Dodaj u grupu
                    </button>
                    <button type="button" onClick={cancelAssignGroup}>
                      Otkaži
                    </button>
                  </div>
                </div>
              </div>
            )}

            {messageModal && (
              <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setMessageModal(null); }}>
                <div className="modal">
                  <h2>{messageModal.title}</h2>
                  {messageModal.title.toLowerCase().includes("log") ? (
                    <pre className="log-message-content">{messageModal.message}</pre>
                  ) : (
                    <p>{messageModal.message}</p>
                  )}
                  <div className="modal-buttons">
                    {messageModal.onConfirm ? (
                      <>
                        <button type="button" onClick={closeMessageModal}>
                          {messageModal.cancelText || "Odustani"}
                        </button>
                        <button type="button" className="save-btn" onClick={handleMessageConfirm}>
                          {messageModal.confirmText || "Potvrdi"}
                        </button>
                      </>
                    ) : (
                      <button type="button" className="save-btn" onClick={closeMessageModal}>
                        U redu
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="stats">
              <div className="stat-card stat-total">
                <div className="stat-card-top">
                  <span className="stat-icon">📦</span>
                  <span className="stat-title">Ukupno uređaja</span>
                </div>
                <div className="stat-number">{devices.length}</div>
                <div className="stat-meta">Sve jedinice</div>
              </div>
              <div className="stat-card stat-online">
                <div className="stat-card-top">
                  <span className="stat-icon">✅</span>
                  <span className="stat-title">Na mreži</span>
                </div>
                <div className="stat-number">{onlineCount}</div>
                <div className="stat-meta">Aktivni uređaji</div>
              </div>
              <div className="stat-card stat-offline">
                <div className="stat-card-top">
                  <span className="stat-icon">⛔</span>
                  <span className="stat-title">Van mreže</span>
                </div>
                <div className="stat-number">{offlineCount}</div>
                <div className="stat-meta">Nedostupni uređaji</div>
              </div>
              <div className="stat-card stat-powered">
                <div className="stat-card-top">
                  <span className="stat-icon">⚡</span>
                  <span className="stat-title">Uključeno</span>
                </div>
                <div className="stat-number">{poweredOnCount}</div>
                <div className="stat-meta">Napajanje aktivno</div>
              </div>
              <div className="stat-card stat-selected">
                <div className="stat-card-top">
                  <span className="stat-icon">🎯</span>
                  <span className="stat-title">Odabrano</span>
                </div>
                <div className="stat-number">{selectedCount}</div>
                <div className="stat-meta">Trenutno označeno</div>
              </div>
            </div>

            <div className="activity-feed-card">
              <h2>Aktivnosti uređaja</h2>
              <p className="form-description">
                Prati posljednjih 4 automatskih i manuelnih događaja za uređaje.
              </p>
              {recentDeviceEvents.length === 0 ? (
                <p className="empty-log">Nema zabilježenih aktivnosti još.</p>
              ) : (
                <ul className="activity-log">
                  {recentDeviceEvents.map((entry, index) => (
                    <li key={`${entry.deviceId}-${entry.time}-${index}`}>
                      <strong>{entry.timestamp}</strong> - <span>{entry.deviceName}</span> - {entry.status} - {entry.note}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <TextField
              id="device-search"
              name="deviceSearch"
              variant="outlined"
              size="small"
              className="search-box"
              placeholder="Pretraži uređaj..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ '& .MuiInputBase-root': { height: 42 } }}
            />

            <div className="filters">
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <Select
                  native
                  value={groupFilter ?? ""}
                  onChange={(e) =>
                    setGroupFilter(e.target.value ? Number(e.target.value) : null)
                  }
                  inputProps={{
                    name: "filterGroup",
                    id: "filter-group",
                  }}
                  className="small-select select-box"
                >
                  <option value="">Sve grupe</option>
                  <option value="-1">Bez grupe</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  native
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  inputProps={{
                    name: "filterStatus",
                    id: "filter-status",
                  }}
                  className="small-select select-box"
                >
                  <option value="all">Sve statuse</option>
                  <option value="online">Samo online</option>
                  <option value="offline">Samo offline</option>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select
                  native
                  value={powerFilter}
                  onChange={(e) => setPowerFilter(e.target.value)}
                  inputProps={{
                    name: "filterPower",
                    id: "filter-power",
                  }}
                  className="small-select select-box"
                >
                  <option value="all">Sve napajanja</option>
                  <option value="on">Samo upaljeni</option>
                  <option value="off">Samo ugašeni</option>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <Select
                  native
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  inputProps={{
                    name: "filterActivity",
                    id: "filter-activity",
                  }}
                  className="small-select select-box"
                >
                  <option value="all">Sve aktivnosti</option>
                  <option value="active24h">Aktivni 24h</option>
                  <option value="active7d">Aktivni 7d</option>
                  <option value="inactive7d">Neaktivni &gt; 7d</option>
                  <option value="inactive30d">Neaktivni &gt; 30d</option>
                </Select>
              </FormControl>
              <TextField
                id="filter-registered-from"
                name="filterRegisteredFrom"
                type="date"
                size="small"
                className="small-input"
                value={registrationFrom}
                onChange={(e) => setRegistrationFrom(e.target.value)}
                title="Registrirano od"
                slotProps={{
                  input: {
                    sx: { padding: '10px 12px' },
                  },
                }}
                sx={{ width: 180 }}
              />
              <TextField
                id="filter-registered-to"
                name="filterRegisteredTo"
                type="date"
                size="small"
                className="small-input"
                value={registrationTo}
                onChange={(e) => setRegistrationTo(e.target.value)}
                title="Registrirano do"
                slotProps={{
                  input: {
                    sx: { padding: '10px 12px' },
                  },
                }}
                sx={{ width: 180 }}
              />
              {selectedDevice && (
                <Button type="button" className="action-btn" onClick={handleClearSelection}>
                  Zatvori detalje
                </Button>
              )}
            </div>

            <div className="actions">
              <button type="button" className="action-btn restart-btn" onClick={handleRestartSelected}>
                <span className="button-icon">🔄</span> Restart označenih
              </button>
              <button type="button" className="action-btn delete-selected-btn" onClick={handleDeleteSelected}>
                <span className="button-icon">🗑️</span> Obriši odabrane
              </button>
              <button type="button" className="action-btn assign-btn" onClick={openAssignGroupModal}>
                <span className="button-icon">👥</span> Dodaj u grupu
              </button>
            </div>

            <div className="table-wrapper">
              {loading ? (
                <div className="loading-skeleton-container">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="skeleton-row">
                      <div className="skeleton-cell" style={{width: '40px'}}></div>
                      <div className="skeleton-cell" style={{width: '15%'}}></div>
                      <div className="skeleton-cell" style={{width: '10%'}}></div>
                      <div className="skeleton-cell" style={{width: '12%'}}></div>
                      <div className="skeleton-cell" style={{width: '15%'}}></div>
                      <div className="skeleton-cell" style={{width: '10%'}}></div>
                      <div className="skeleton-cell" style={{width: '10%'}}></div>
                      <div className="skeleton-cell" style={{width: '10%'}}></div>
                    </div>
                  ))}
                </div>
              ) : (
              <table className="device-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Naziv</th>
                    <th>Marka</th>
                    <th>IP Adresa</th>
                    <th>MAC Adresa</th>
                    <th>Grupa</th>
                    <th>Registracija</th>
                    <th>Aktivnost</th>
                    <th>Napajanje</th>
                    <th>Status</th>
                    <th>Akcije</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDevices.length === 0 ? (
                    <tr className="empty-row">
                      <td colSpan={11}>
                        Nema uređaja za prikaz. Dodaj novi uređaj ili očisti pretragu.
                      </td>
                    </tr>
                  ) : (
                    filteredDevices.map((device) => (
                      <tr key={device.id}>
                        <td>
                          <Checkbox
                            size="small"
                            checked={device.selected}
                            onChange={() => toggleDevice(device.id)}
                            sx={{ padding: '6px' }}
                          />
                        </td>
                        <td>{device.name}</td>
                        <td>{device.brand || "generic"}</td>
                        <td>{device.ip}</td>
                        <td>{device.mac}</td>
                        <td>{device.groupName || "-"}</td>
                        <td>{device.created_at ? new Date(device.created_at).toLocaleDateString() : "-"}</td>
                        <td>{device.last_active_at ? new Date(device.last_active_at).toLocaleDateString() : "-"}</td>
                        <td>
                          <span
                            className={
                              device.powerState === "On"
                                ? "status-online"
                                : "status-offline"
                            }
                          >
                            {device.powerState === "On" ? "💡" : "⛔"} {formatPowerText(device.powerState)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={
                              device.status === "Online"
                                ? "status-online"
                                : "status-offline"
                            }
                          >
                            {device.status === "Online" ? "🟢" : "🔴"} {formatStatusText(device.status)}
                          </span>
                        </td>
                        <td>
                          <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                            <Tooltip title="Pogledaj">
                              <IconButton size="small" sx={{ color: '#38bdf8', '&:hover': { backgroundColor: 'rgba(56, 189, 248, 0.16)' } }} onClick={() => handleViewDevice(device.id)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Uredi">
                              <IconButton size="small" sx={{ color: '#f59e0b', '&:hover': { backgroundColor: 'rgba(245, 158, 11, 0.16)' } }} onClick={() => {
                                setEditingId(device.id);
                                setDeviceName(device.name);
                                setDeviceIp(device.ip);
                                setDeviceMac(device.mac);
                                setModalGroupId(device.groupId ?? null);
                                setShowModal(true);
                              }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Audit log">
                              <IconButton size="small" sx={{ color: '#64748b', '&:hover': { backgroundColor: 'rgba(100, 116, 139, 0.16)' } }} onClick={() => handleOpenAuditForDevice(device.id)}>
                                <ArticleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Restart">
                              <IconButton size="small" sx={{ color: '#10b981', '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.16)' } }} onClick={() => handleRestartDevice(device.id)}>
                                <RestartAltIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Obriši">
                              <IconButton size="small" sx={{ color: '#ef4444', '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.16)' } }} onClick={() => { setPendingDelete(device.id); setShowDeleteConfirm(true); }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              )}
            </div>
            {selectedDevice && !showViewModal && (
              <div className="device-details-card">
                <h2>Detalji uređaja</h2>
                <p className="form-description">
                  Brzi pregled statusa, grupe i zapisa posljednjih automatskih provjera.
                </p>
                <div className="detail-row">
                  <span>Naziv:</span>
                  <strong>{selectedDevice.name}</strong>
                </div>
                <div className="detail-row">
                  <span>IP adresa:</span>
                  <strong>{selectedDevice.ip}</strong>
                </div>
                <div className="detail-row">
                  <span>MAC adresa:</span>
                  <strong>{selectedDevice.mac}</strong>
                </div>
                <div className="detail-row">
                  <span>Grupa:</span>
                  <strong>{selectedDevice.groupName || "Bez grupe"}</strong>
                </div>
                <div className="detail-row">
                  <span>Napajanje:</span>
                  <strong>{formatPowerText(selectedDevice.powerState)}</strong>
                </div>
                <div className="detail-row">
                  <span>Status:</span>
                  <strong>{formatStatusText(selectedDevice.status)}</strong>
                </div>
                <div className="detail-actions">
                  <button
                    type="button"
                    className="action-btn poweron-btn"
                    onClick={() => handlePowerOnDevice(selectedDevice.id)}
                  >
                    Uključi uređaj
                  </button>
                  <button
                    type="button"
                    className="action-btn poweroff-btn"
                    onClick={() => handlePowerOffDevice(selectedDevice.id)}
                  >
                    Isključi uređaj
                  </button>
                  <button
                    type="button"
                    className="action-btn restart-btn"
                    onClick={() => handleRestartDevice(selectedDevice.id)}
                  >
                    Restart uređaja
                  </button>
                  {(["webos", "samsung"].includes(selectedDevice.brand?.toLowerCase() || "")) && (
                    <>
                      <button
                        type="button"
                        className="action-btn"
                        onClick={() => handleSendDeviceAction(selectedDevice.id, "mute")}
                      >
                        🔇 Mute
                      </button>
                      <button
                        type="button"
                        className="action-btn"
                        onClick={() => handleSendDeviceAction(selectedDevice.id, "unmute")}
                      >
                        🔊 Unmute
                      </button>
                      <button
                        type="button"
                        className="action-btn"
                        onClick={() => handleSendDeviceAction(selectedDevice.id, "volumeUp")}
                      >
                        🔼 Vol+
                      </button>
                      <button
                        type="button"
                        className="action-btn"
                        onClick={() => handleSendDeviceAction(selectedDevice.id, "volumeDown")}
                      >
                        🔽 Vol-
                      </button>
                      <div className="volume-set-row">
                        <TextField
                          type="number"
                          size="small"
                          variant="outlined"
                          value={volumeValue}
                          onChange={(e) => setVolumeValue(e.target.value)}
                          placeholder="0-100"
                          className="small-input"
                        />
                        <button
                          type="button"
                          className="action-btn"
                          disabled={
                            volumeValue.trim() === "" ||
                            Number.isNaN(Number(volumeValue)) ||
                            Number(volumeValue) < 0 ||
                            Number(volumeValue) > 100
                          }
                          onClick={() => {
                            const volume = Number(volumeValue);
                            if (!Number.isNaN(volume) && volume >= 0 && volume <= 100) {
                              handleSendDeviceAction(selectedDevice.id, "setVolume", { volume });
                            }
                          }}
                        >
                          🎚️ Postavi volumen
                        </button>
                      </div>
                      <div className="launch-app-row">
                        <TextField
                          size="small"
                          variant="outlined"
                          value={launchTarget}
                          onChange={(e) => setLaunchTarget(e.target.value)}
                          placeholder="App ID ili URL"
                          className="small-input"
                        />
                        <button
                          type="button"
                          className="action-btn"
                          disabled={!launchTarget.trim()}
                          onClick={() => {
                            if (launchTarget.trim()) {
                              handleSendDeviceAction(selectedDevice.id, "launchApp", { target: launchTarget.trim() });
                            }
                          }}
                        >
                          🚀 Otvori aplikaciju
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <div className="detail-tabs">
                  <button
                    type="button"
                    className={detailTab === "info" ? "tab-btn active" : "tab-btn"}
                    onClick={() => setDetailTab("info")}
                  >
                    Informacije
                  </button>
                  <button
                    type="button"
                    className={detailTab === "schedule" ? "tab-btn active" : "tab-btn"}
                    onClick={() => setDetailTab("schedule")}
                  >
                    Raspored
                  </button>
                </div>
                {detailTab === "info" ? (
                  <div className="history-section">
                    <h3>Posljednji zapisi</h3>
                    <ul>
                      {selectedDeviceHistory.length === 0 ? (
                        <li>Nema zapisa za ovaj uređaj.</li>
                      ) : (
                        selectedDeviceHistory.map((entry, index) => (
                          <li key={`${selectedDevice.id}-${index}`}>
                            <strong>{entry.timestamp}</strong> - {entry.status} - {entry.note}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                ) : (
                  <div className="schedule-panel">
                    <h3>Raspored za {selectedDevice.name}</h3>
                    <p className="form-description">
                      Dodaj cron stil rasporede za uključivanje, gašenje, otvaranje aplikacije ili mutiranje zvuka.
                    </p>
                    <div className="schedule-list">
                      {getDeviceSchedules(selectedDevice.id).length === 0 ? (
                        <div className="empty-log">Nema spremljenih rasporeda.</div>
                      ) : (
                        <div className="schedule-table">
                          {getDeviceSchedules(selectedDevice.id).map((schedule) => (
                            <div key={schedule.id} className="schedule-row">
                              <div>
                                <strong>{schedule.cron}</strong>
                                <div>{getActionLabel(schedule.action)}</div>
                                {schedule.description && <div className="schedule-note">{schedule.description}</div>}
                              </div>
                              <div className="schedule-row-actions">
                                <button
                                  type="button"
                                  className={schedule.enabled ? "action-btn poweron-btn" : "action-btn"}
                                  onClick={() => handleToggleSchedule(schedule)}
                                >
                                  {schedule.enabled ? "On" : "Off"}
                                </button>
                                <button
                                  type="button"
                                  className="action-btn"
                                  onClick={() => fetchScheduleLogs(schedule)}
                                >
                                  Logovi
                                </button>
                                <button
                                  type="button"
                                  className="action-btn"
                                  onClick={() => handleTriggerSchedule(schedule)}
                                >
                                  Pokreni
                                </button>
                                <button
                                  type="button"
                                  className="action-btn settings-btn"
                                  onClick={() => handleEditSchedule(schedule)}
                                >
                                  Uredi
                                </button>
                                <button
                                  type="button"
                                  className="action-btn delete-selected-btn"
                                  onClick={() => handleDeleteSchedule(schedule.id)}
                                >
                                  Obriši
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="schedule-form">
                      <h3>{editingScheduleId ? "Uredi raspored" : "Dodaj novi raspored"}</h3>
                      <button 
                        type="button" 
                        className="action-btn"
                        style={{marginBottom: 16}}
                        onClick={() => setShowScheduleBuilder(true)}
                      >
                        📅 Koristi vizualni raspored
                      </button>
                      <label>Cron izraz</label>
                        <TextField
                          size="small"
                          variant="outlined"
                          value={scheduleCron}
                          onChange={(e) => setScheduleCron(e.target.value)}
                          placeholder="npr. 0 7 * * * ili 07:00"
                          fullWidth
                          className="small-input"
                          margin="dense"
                        />
                        <div style={{display: 'flex', gap: 10, alignItems: 'center', marginTop: 8}}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                size="small"
                                checked={scheduleUseTime}
                                onChange={(e) => setScheduleUseTime(e.target.checked)}
                              />
                            }
                            label="Koristi vrijeme (HH:MM)"
                          />
                          {scheduleUseTime && (
                            <TextField
                              type="time"
                              size="small"
                              variant="outlined"
                              value={scheduleTime}
                              onChange={(e) => setScheduleTime(e.target.value)}
                              className="small-input"
                              sx={{ minWidth: 150 }}
                            />
                          )}
                        </div>
                        {scheduleUseTime && (
                          <div className="form-description">Vrijeme će biti automatski pretvoreno u cron stil (svakodnevno).</div>
                        )}
                      <div className="schedule-help">
                        Unesi cron izraz s 5 polja ili jednostavno vrijeme u formatu <strong>HH:MM</strong> za svakodnevni raspored. Možeš također odabrati "Koristi vrijeme (HH:MM)" kako bi unos bio prijateljskiji — to će se automatski pretvoriti u cron.
                      </div>
                      {!cronValid && (
                        <div className="cron-error">Cron izraz nije valjan. Očekuje se 5 polja ili vrijeme HH:MM poput 07:00.</div>
                      )}
                      <label>Akcija</label>
                      <FormControl size="small" className="small-select" sx={{ minWidth: 220 }}>
                        <Select
                          value={scheduleAction}
                          onChange={(e) => setScheduleAction(e.target.value)}
                          inputProps={{
                            name: 'scheduleAction',
                            id: 'schedule-action-select',
                          }}
                        >
                          {getAvailableActions(selectedDevice).map((action) => (
                            <MenuItem key={action.value} value={action.value}>
                              {action.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {selectedDevice && (
                        <div className="form-description">
                          Automatski otkrivene podržane akcije za {selectedDevice.brand}:
                          {getAvailableActions(selectedDevice)
                            .map((action) => action.label)
                            .join(", ")}
                        </div>
                      )}
                      {(scheduleAction === "launchApp" || scheduleAction === "setVolume") && (
                        <TextField
                          size="small"
                          variant="outlined"
                          value={scheduleTarget}
                          onChange={(e) => setScheduleTarget(e.target.value)}
                          placeholder={
                            scheduleAction === "launchApp"
                              ? "App ID ili URL za otvaranje"
                              : "Volumen 0-100"
                          }
                          className="small-input"
                          fullWidth
                        />
                      )}

                      <div className="sequence-editor">
                        <h4>Sekvenca akcija (opcionalno)</h4>
                        <div className="sequence-add-row">
                          <FormControl size="small" sx={{ minWidth: 180 }}>
                            <Select
                              value={currentStepAction}
                              onChange={(e) => setCurrentStepAction(e.target.value)}
                              inputProps={{
                                name: 'currentStepAction',
                                id: 'current-step-action-select',
                              }}
                            >
                              {getAvailableActions(selectedDevice).map((action) => (
                                <MenuItem key={action.value} value={action.value}>
                                  {action.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          {(currentStepAction === "launchApp" || currentStepAction === "setVolume") && (
                            <TextField
                              size="small"
                              variant="outlined"
                              value={currentStepParam}
                              onChange={(e) => setCurrentStepParam(e.target.value)}
                              placeholder={currentStepAction === "launchApp" ? "App ID ili URL" : "Volumen 0-100"}
                              className="small-input"
                            />
                          )}
                          <TextField
                            size="small"
                            variant="outlined"
                            value={currentStepDelay}
                            onChange={(e) => setCurrentStepDelay(e.target.value)}
                            placeholder="delay ms (npr. 5000)"
                            className="small-input"
                          />
                          {currentStepAction === "poweron" && (
                            <>
                              <TextField
                                size="small"
                                variant="outlined"
                                value={currentStepWaitForReady}
                                onChange={(e) => setCurrentStepWaitForReady(e.target.value)}
                                placeholder="waitForReadyMs (ms, default 30000)"
                                className="small-input"
                              />
                              <TextField
                                size="small"
                                variant="outlined"
                                value={currentStepSettle}
                                onChange={(e) => setCurrentStepSettle(e.target.value)}
                                placeholder="settleMs (ms, npr. 2000)"
                                className="small-input"
                              />
                            </>
                          )}
                          <button type="button" className="action-btn" onClick={addStepToSequence}>Dodaj u sekvencu</button>
                        </div>

                        {scheduleSequence.length > 0 && (
                          <div className="sequence-list">
                            {scheduleSequence.map((step, idx) => (
                              <div
                                key={idx}
                                className={`sequence-step ${dragIndex === idx ? 'dragging' : ''}`}
                                draggable
                                onDragStart={(e) => onDragStart(e, idx)}
                                onDragOver={(e) => onDragOver(e)}
                                onDrop={(e) => onDrop(e, idx)}
                              >
                                <div>
                                  <strong>{getActionLabel(step.action)}</strong>
                                  {step.params?.target && <div className="muted">{step.params.target}</div>}
                                  {typeof step.params?.volume === 'number' && <div className="muted">Volumen: {step.params.volume}</div>}
                                  {step.delayMs && <div className="muted">Delay: {step.delayMs} ms</div>}
                                  {step.waitForReadyMs && <div className="muted">WaitReady: {step.waitForReadyMs} ms</div>}
                                  {step.settleMs && <div className="muted">Settle: {step.settleMs} ms</div>}
                                </div>
                                <div className="sequence-step-actions">
                                  <button type="button" onClick={() => removeStep(idx)}>✕</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <label>Opis</label>
                      <TextField
                        size="small"
                        variant="outlined"
                        value={scheduleDescription}
                        onChange={(e) => setScheduleDescription(e.target.value)}
                        placeholder="Opis rasporeda"
                        className="small-input"
                        fullWidth
                      />
                      <div className="schedule-form-row">
                        <FormControlLabel
                          className="schedule-enable-label"
                          control={
                            <Checkbox
                              size="small"
                              checked={scheduleEnabled}
                              onChange={(e) => setScheduleEnabled(e.target.checked)}
                            />
                          }
                          label="Omogući raspored"
                        />
                        <div className="schedule-buttons">
                          <button
                            type="button"
                            className="save-btn"
                            onClick={handleSaveSchedule}
                            disabled={
                              !cronValid ||
                              (scheduleAction === "launchApp" && !scheduleTarget.trim()) ||
                              (scheduleAction === "setVolume" &&
                                (scheduleTarget.trim() === "" || Number.isNaN(Number(scheduleTarget)) || Number(scheduleTarget) < 0 || Number(scheduleTarget) > 100))
                            }
                          >
                            Spremi
                          </button>
                          <button type="button" className="action-btn" onClick={clearScheduleForm}>
                            Očisti
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {showViewModal && viewModalDeviceInfo && (
              <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeViewModal(); }}>
                <div className="modal">
                  <div className="modal-header">
                    <div>
                      <h2>Detalji: {viewModalDeviceInfo.name}</h2>
                      <p className="form-description">Brzi pregled uređaja i njegovi rasporedi.</p>
                    </div>
                    <button type="button" className="close-btn" onClick={closeViewModal}>✕</button>
                  </div>

                  <div className="device-meta">
                    <div className="detail-row">
                      <span>IP adresa:</span>
                      <strong>{viewModalDeviceInfo.ip}</strong>
                    </div>
                    <div className="detail-row">
                      <span>MAC adresa:</span>
                      <strong>{viewModalDeviceInfo.mac}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Marka:</span>
                      <strong>{viewModalDeviceInfo.brand || "generic"}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Status:</span>
                      <strong>{formatStatusText(viewModalDeviceInfo.status)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Napajanje:</span>
                      <strong>{formatPowerText(viewModalDeviceInfo.powerState)}</strong>
                    </div>
                    <div className="detail-row">
                      <span>Grupa:</span>
                      <strong>{viewModalDeviceInfo.groupName || "Bez grupe"}</strong>
                    </div>
                  </div>

                  <div className="detail-actions">
                    <button type="button" className="action-btn poweron-btn" onClick={() => handlePowerOnDevice(viewModalDeviceInfo.id)}>
                      ✅ Uključi
                    </button>
                    <button type="button" className="action-btn poweroff-btn" onClick={() => handlePowerOffDevice(viewModalDeviceInfo.id)}>
                      ⏻ Isključi
                    </button>
                    <button type="button" className="action-btn restart-btn" onClick={() => handleRestartDevice(viewModalDeviceInfo.id)}>
                      🔄 Restart
                    </button>
                    {(["webos", "samsung"].includes(viewModalDeviceInfo.brand?.toLowerCase() || "")) && (
                      <>
                        <button type="button" className="action-btn" onClick={() => { handleSendDeviceAction(viewModalDeviceInfo.id, "mute"); }}>
                          🔇 Mute
                        </button>
                        <button type="button" className="action-btn" onClick={() => { handleSendDeviceAction(viewModalDeviceInfo.id, "unmute"); }}>
                          🔊 Unmute
                        </button>
                        <button type="button" className="action-btn" onClick={() => { handleSendDeviceAction(viewModalDeviceInfo.id, "volumeUp"); }}>
                          🔼 Vol+
                        </button>
                        <button type="button" className="action-btn" onClick={() => { handleSendDeviceAction(viewModalDeviceInfo.id, "volumeDown"); }}>
                          🔽 Vol-
                        </button>
                        <div className="volume-set-row">
                          <TextField
                            type="number"
                            size="small"
                            variant="outlined"
                            value={volumeValue}
                            onChange={(e) => setVolumeValue(e.target.value)}
                            placeholder="0-100"
                            className="small-input"
                          />
                          <button
                            type="button"
                            className="action-btn"
                            disabled={
                              volumeValue.trim() === "" ||
                              Number.isNaN(Number(volumeValue)) ||
                              Number(volumeValue) < 0 ||
                              Number(volumeValue) > 100
                            }
                            onClick={() => {
                              const volume = Number(volumeValue);
                              if (!Number.isNaN(volume) && volume >= 0 && volume <= 100) {
                                handleSendDeviceAction(viewModalDeviceInfo.id, "setVolume", { volume });
                              }
                            }}
                          >
                            🎚️ Postavi volumen
                          </button>
                        </div>
                        <div className="launch-app-row">
                          <TextField
                            size="small"
                            variant="outlined"
                            value={launchTarget}
                            onChange={(e) => setLaunchTarget(e.target.value)}
                            placeholder="App ID ili URL"
                            className="small-input"
                          />
                          <button
                            type="button"
                            className="action-btn"
                            disabled={!launchTarget.trim()}
                            onClick={() => {
                              if (launchTarget.trim()) {
                                handleSendDeviceAction(viewModalDeviceInfo.id, "launchApp", { target: launchTarget.trim() });
                              }
                            }}
                          >
                            🚀 Otvori aplikaciju
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="detail-tabs">
                    <button
                      type="button"
                      className={detailTab === "info" ? "tab-btn active" : "tab-btn"}
                      onClick={() => setDetailTab("info")}
                    >
                      📋 Informacije
                    </button>
                    <button
                      type="button"
                      className={detailTab === "schedule" ? "tab-btn active" : "tab-btn"}
                      onClick={() => setDetailTab("schedule")}
                    >
                      📅 Rasporedi
                    </button>
                  </div>

                  {detailTab === "info" ? (
                    <div className="history-section">
                      <h3>Posljednji zapisi</h3>
                      <ul>
                        {selectedDeviceHistory.length === 0 ? (
                          <li>Nema zapisa za ovaj uređaj.</li>
                        ) : (
                          selectedDeviceHistory.map((entry, index) => (
                            <li key={`${viewModalDeviceInfo.id}-${index}`}>
                              <strong>{entry.timestamp}</strong> - {entry.status} - {entry.note}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  ) : (
                    <div className="schedule-panel">
                      <h3>Rasporedi za {viewModalDeviceInfo.name}</h3>
                      <p className="form-description">
                        Pregledaj i upravljaj spremljenim rasporedima, uključujući akcije poput power, mute i otvaranje aplikacija.
                      </p>
                      <div className="schedule-list">
                        {getDeviceSchedules(viewModalDeviceInfo.id).length === 0 ? (
                          <div className="empty-log">Nema spremljenih rasporeda.</div>
                        ) : (
                          <div className="schedule-table">
                            {getDeviceSchedules(viewModalDeviceInfo.id).map((schedule) => (
                              <div key={schedule.id} className="schedule-row">
                                <div>
                                  <strong>{schedule.cron}</strong>
                                  <div>{getActionLabel(schedule.action)}</div>
                                  {schedule.description && <div className="schedule-note">{schedule.description}</div>}
                                </div>
                                <div className="schedule-row-actions">
                                  <button
                                    type="button"
                                    className={schedule.enabled ? "action-btn poweron-btn" : "action-btn"}
                                    onClick={() => handleToggleSchedule(schedule)}
                                  >
                                    {schedule.enabled ? "✅ On" : "⭕ Off"}
                                  </button>
                                  <button type="button" className="action-btn" onClick={() => fetchScheduleLogs(schedule)}>
                                    📄 Logovi
                                  </button>
                                  <button type="button" className="action-btn" onClick={() => handleTriggerSchedule(schedule)}>
                                    ▶️ Pokreni
                                  </button>
                                  <button type="button" className="action-btn settings-btn" onClick={() => handleEditSchedule(schedule)}>
                                    ✏️ Uredi
                                  </button>
                                  <button type="button" className="action-btn delete-selected-btn" onClick={() => handleDeleteSchedule(schedule.id)}>
                                    🗑️ Obriši
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="schedule-form">
                        <h3>{editingScheduleId ? "Uredi raspored" : "Dodaj novi raspored"}</h3>
                        <button 
                          type="button" 
                          className="action-btn"
                          style={{marginBottom: 16}}
                          onClick={() => setShowScheduleBuilder(true)}
                        >
                          📅 Koristi vizualni raspored
                        </button>
                        <label>Cron izraz</label>
                        <TextField
                          size="small"
                          variant="outlined"
                          value={scheduleCron}
                          onChange={(e) => setScheduleCron(e.target.value)}
                          placeholder="npr. 0 7 * * * ili 07:00"
                          fullWidth
                          className="small-input"
                        />
                        <div className="schedule-help">
                          Unesi cron izraz s 5 polja ili vrijeme <strong>HH:MM</strong>.
                        </div>
                        {!cronValid && (
                          <div className="cron-error">Cron izraz nije valjan. Očekuje se 5 polja ili vrijeme HH:MM poput 07:00.</div>
                        )}
                        <label>Akcija</label>
                        <FormControl size="small" className="small-select" sx={{ minWidth: 220 }}>
                          <Select
                            value={scheduleAction}
                            onChange={(e) => setScheduleAction(e.target.value)}
                            inputProps={{
                              name: 'viewScheduleAction',
                              id: 'view-schedule-action-select',
                            }}
                          >
                            {getAvailableActions(viewModalDeviceInfo).map((action) => (
                              <MenuItem key={action.value} value={action.value}>
                                {action.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        {viewModalDeviceInfo && (
                          <div className="form-description">
                            Podržane akcije: {getAvailableActions(viewModalDeviceInfo).map((action) => action.label).join(", ")}
                          </div>
                        )}
                        {(scheduleAction === "launchApp" || scheduleAction === "setVolume") && (
                          <TextField
                            size="small"
                            variant="outlined"
                            value={scheduleTarget}
                            onChange={(e) => setScheduleTarget(e.target.value)}
                            placeholder={
                              scheduleAction === "launchApp"
                                ? "App ID ili URL"
                                : "Volumen 0-100"
                            }
                            className="small-input"
                            fullWidth
                          />
                        )}
                        <div className="schedule-form-row">
                          <FormControlLabel
                            className="schedule-enable-label"
                            control={
                              <Checkbox
                                size="small"
                                checked={scheduleEnabled}
                                onChange={(e) => setScheduleEnabled(e.target.checked)}
                              />
                            }
                            label="Omogući raspored"
                          />
                          <div className="schedule-buttons">
                            <button
                              type="button"
                              className="save-btn"
                              onClick={handleSaveSchedule}
                              disabled={
                                !cronValid ||
                                (scheduleAction === "launchApp" && !scheduleTarget.trim()) ||
                                (scheduleAction === "setVolume" &&
                                  (scheduleTarget.trim() === "" || Number.isNaN(Number(scheduleTarget)) || Number(scheduleTarget) < 0 || Number(scheduleTarget) > 100))
                              }
                            >
                              Spremi
                            </button>
                            <button type="button" className="action-btn" onClick={clearScheduleForm}>
                              Očisti
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

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

      {loading && <div className="loading-overlay">Osvježavanje...</div>}
      {statusMessage && <div className="status-message">{statusMessage}</div>}
      
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
    </div>
    </>
  );
}

export default App;