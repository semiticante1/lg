import { useDevicePowerActions } from "./useDevicePowerActions";
import { useDeviceDiscoveryActions } from "./useDeviceDiscoveryActions";
import { useDeviceGroupActions } from "./useDeviceGroupActions";
import { useDeviceSelectionActions } from "./useDeviceSelectionActions";
import { useDeviceEditorActions } from "./useDeviceEditorActions";
import { useScheduleActions } from "./useScheduleActions";
import { useDevicesPage } from "./useDevicesPage";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { UseDeviceActionsOptions } from "./useDeviceActions";
import type {
  Device,
  DeviceHistoryEntry,
  DiscoveredDevice,
  Group,
  MessageModalState,
} from "../types/app";
import type { NavigateFunction } from "react-router-dom";

interface UseAppContainerDeviceHooksOptions {
  baseUrl: string;
  devices: Device[];
  groups: Group[];
  discoveredDevices: DiscoveredDevice[];
  selectedDiscoveredDevices: Set<string>;
  refreshAll: () => Promise<void>;
  loadGroups: () => Promise<void>;
  recordDeviceEvent: (device: Device, note: string) => void;
  showToast: (type: "info" | "success" | "error", title: string, message: string) => void;
  showMessage: (title: string, message: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => Promise<void> | void, confirmText?: string, cancelText?: string) => void;
  setStatusMessage: Dispatch<SetStateAction<string>>;
  setDevices: Dispatch<SetStateAction<Device[]>>;
  setDiscoveryLoading: Dispatch<SetStateAction<boolean>>;
  setDiscoveredDevices: Dispatch<SetStateAction<DiscoveredDevice[]>>;
  setSelectedDiscoveredDevices: Dispatch<SetStateAction<Set<string>>>;
  setDiscoveryModalOpen: (open: boolean) => void;
  setShowDiscoveryModal: Dispatch<SetStateAction<boolean>>;
  groupName: string;
  setGroupName: Dispatch<SetStateAction<string>>;
  selectedAssignGroupId: number | null;
  setSelectedAssignGroupId: Dispatch<SetStateAction<number | null>>;
  setShowAssignGroupModal: Dispatch<SetStateAction<boolean>>;
  forcedOffIdsRef: RefObject<Set<number>>;
  editingId: number | null;
  deviceName: string;
  deviceIp: string;
  deviceMac: string;
  deviceBrand: string;
  modalGroupId: number | null;
  selectedDeviceId: number | null;
  pendingDelete: number | null;
  showModal: boolean;
  showDiscoveryModal: boolean;
  messageModal: MessageModalState | null;
  setEditingId: Dispatch<SetStateAction<number | null>>;
  setDeviceName: Dispatch<SetStateAction<string>>;
  setDeviceIp: Dispatch<SetStateAction<string>>;
  setDeviceMac: Dispatch<SetStateAction<string>>;
  setDeviceBrand: Dispatch<SetStateAction<string>>;
  setModalGroupId: Dispatch<SetStateAction<number | null>>;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  setSelectedDeviceId: Dispatch<SetStateAction<number | null>>;
  setPendingDelete: Dispatch<SetStateAction<number | null>>;
  setShowDeleteConfirm: Dispatch<SetStateAction<boolean>>;
  setMessageModal: Dispatch<SetStateAction<MessageModalState | null>>;
  setDetailTab: Dispatch<SetStateAction<"info" | "schedule">>;
  scheduleAction: string;
  scheduleSequence: Array<{ action: string; params?: Record<string, unknown>; delayMs?: number; waitForReadyMs?: number; settleMs?: number }>;
  scheduleDescription: string;
  scheduleEnabled: boolean;
  scheduleTarget: string;
  setDeviceSchedules: Dispatch<SetStateAction<Record<number, import("../types/app").DeviceSchedule[]>>>;
  setScheduleCron: Dispatch<SetStateAction<string>>;
  setScheduleAction: Dispatch<SetStateAction<string>>;
  setScheduleTarget: Dispatch<SetStateAction<string>>;
  setScheduleDescription: Dispatch<SetStateAction<string>>;
  setScheduleEnabled: Dispatch<SetStateAction<boolean>>;
  setScheduleSequence: Dispatch<SetStateAction<Array<{ action: string; params?: Record<string, unknown>; delayMs?: number; waitForReadyMs?: number; settleMs?: number }>>>;
  setScheduleUseTime: Dispatch<SetStateAction<boolean>>;
  setScheduleTime: Dispatch<SetStateAction<string>>;
  setEditingScheduleId: Dispatch<SetStateAction<number | null>>;
  navigate: NavigateFunction;
  loadAuditLogs: (deviceId?: string, groupId?: string, page?: number, pageSize?: number) => Promise<void>;
  auditPageSize: number;
  deviceHistory: Record<number, DeviceHistoryEntry[]>;
  search: string;
  groupFilter: number | null;
  statusFilter: string;
  powerFilter: string;
  activityFilter: string;
  registrationFrom: string;
  registrationTo: string;
  discoveryLoading: boolean;
  setAuditDeviceFilter: Dispatch<SetStateAction<string>>;
  setAuditGroupFilter: Dispatch<SetStateAction<string>>;
  setAuditPage: Dispatch<SetStateAction<number>>;
  closeMessageModal: () => void;
}

export function useAppContainerDeviceHooks(options: UseAppContainerDeviceHooksOptions) {
  const {
    baseUrl,
    devices,
    groups,
    discoveredDevices,
    selectedDiscoveredDevices,
    refreshAll,
    loadGroups,
    recordDeviceEvent,
    showToast,
    showMessage,
    showConfirm,
    setStatusMessage,
    setDevices,
    setDiscoveryLoading,
    setDiscoveredDevices,
    setSelectedDiscoveredDevices,
    setDiscoveryModalOpen,
    setShowDiscoveryModal,
    groupName,
    setGroupName,
    selectedAssignGroupId,
    setSelectedAssignGroupId,
    setShowAssignGroupModal,
    forcedOffIdsRef,
    editingId,
    deviceName,
    deviceIp,
    deviceMac,
    deviceBrand,
    modalGroupId,
    selectedDeviceId,
    pendingDelete,
    showModal,
    showDiscoveryModal,
    messageModal,
    setEditingId,
    setDeviceName,
    setDeviceIp,
    setDeviceMac,
    setDeviceBrand,
    setModalGroupId,
    setShowModal,
    setSelectedDeviceId,
    setPendingDelete,
    setShowDeleteConfirm,
    setMessageModal,
    setDetailTab,
    scheduleAction,
    scheduleSequence,
    scheduleDescription,
    scheduleEnabled,
    scheduleTarget,
    setDeviceSchedules,
    setScheduleCron,
    setScheduleAction,
    setScheduleTarget,
    setScheduleDescription,
    setScheduleEnabled,
    setScheduleSequence,
    setScheduleUseTime,
    setScheduleTime,
    setEditingScheduleId,
    navigate,
    loadAuditLogs,
    auditPageSize,
    deviceHistory,
    search,
    groupFilter,
    statusFilter,
    powerFilter,
    activityFilter,
    registrationFrom,
    registrationTo,
    discoveryLoading,
    setAuditDeviceFilter,
    setAuditGroupFilter,
    setAuditPage,
    closeMessageModal,
  } = options;

  const deviceActionOptions = {
    baseUrl,
    devices,
    groups,
    discoveredDevices,
    selectedDiscoveredDevices,
    refreshAll,
    loadGroups,
    recordDeviceEvent,
    showToast,
    showMessage,
    showConfirm,
    setStatusMessage,
    setDevices,
    setDiscoveryLoading,
    setDiscoveredDevices,
    setSelectedDiscoveredDevices,
    setShowDiscoveryModal: setDiscoveryModalOpen,
    groupName,
    setGroupName,
    selectedAssignGroupId,
    setSelectedAssignGroupId,
    setShowAssignGroupModal,
    forcedOffIdsRef,
  } as UseDeviceActionsOptions;

  const {
    handlePowerOnAll,
    handlePowerOffAll,
    handlePowerOffDevice,
    handlePowerOnDevice,
    handleRestartDevice,
    handleSendDeviceAction,
  } = useDevicePowerActions(deviceActionOptions);

  const {
    handleStartDiscovery,
    handleAddDiscoveredDevices,
    closeDiscoveryModal,
  } = useDeviceDiscoveryActions(deviceActionOptions);

  const {
    handleCreateGroup,
    handleRestartGroup,
    handlePowerOnGroup,
    handlePowerOffGroup,
    openAssignGroupModal,
    assignGroupToSelected,
  } = useDeviceGroupActions(deviceActionOptions);

  const {
    handleDeleteSelected,
    handleRestartSelected,
    toggleDevice,
  } = useDeviceSelectionActions(deviceActionOptions);

  const {
    clearModalFields,
    handleOpenModal,
    handleSave,
    confirmDelete,
    cancelDelete,
    handleViewDevice,
  } = useDeviceEditorActions({
    baseUrl,
    devices,
    groups,
    editingId,
    deviceName,
    deviceIp,
    deviceMac,
    deviceBrand,
    modalGroupId,
    selectedDeviceId,
    pendingDelete,
    showModal,
    showDiscoveryModal,
    messageModal,
    setDevices,
    setEditingId,
    setDeviceName,
    setDeviceIp,
    setDeviceMac,
    setDeviceBrand,
    setModalGroupId,
    setShowModal,
    setSelectedDeviceId,
    setPendingDelete,
    setShowDeleteConfirm,
    setShowDiscoveryModal,
    setMessageModal,
    setStatusMessage,
    setDetailTab,
    showMessage,
  });

  const {
    loadDeviceSchedules,
    clearScheduleForm,
    handleEditSchedule,
    handleDeleteSchedule,
    handleToggleSchedule,
    fetchScheduleLogs,
    handleTriggerSchedule,
    handleSaveScheduleBuilder,
  } = useScheduleActions({
    baseUrl,
    selectedDevice: devices.find((device) => device.id === selectedDeviceId) || null,
    selectedDeviceId,
    scheduleAction,
    scheduleSequence,
    scheduleDescription,
    scheduleEnabled,
    scheduleTarget,
    setDeviceSchedules,
    setDetailTab,
    setScheduleCron,
    setScheduleAction,
    setScheduleTarget,
    setScheduleDescription,
    setScheduleEnabled,
    setScheduleSequence,
    setScheduleUseTime,
    setScheduleTime,
    setEditingScheduleId,
    showMessage,
  });

  const {
    selectedDevice,
    filteredDevices,
    selectedDeviceHistory,
    recentDeviceEvents,
    groupStatusSummary,
    handleOpenDiscovery,
    handleOpenAuditForDevice,
    handleOpenAuditForGroup,
    handleClearSelection,
    handleMessageConfirm,
  } = useDevicesPage({
    devices,
    deviceHistory,
    groups,
    selectedDeviceId,
    search,
    groupFilter,
    statusFilter,
    powerFilter,
    activityFilter,
    registrationFrom,
    registrationTo,
    showDiscoveryModal,
    discoveryLoading,
    discoveredDevices,
    messageModal,
    auditPageSize,
    navigate,
    loadAuditLogs,
    setAuditDeviceFilter,
    setAuditGroupFilter,
    setAuditPage,
    setShowModal,
    setShowDiscoveryModal,
    setSelectedDeviceId,
    closeMessageModal,
    handleStartDiscovery,
    showMessage,
  });

  return {
    handlePowerOnAll,
    handlePowerOffAll,
    handlePowerOffDevice,
    handlePowerOnDevice,
    handleRestartDevice,
    handleSendDeviceAction,
    handleStartDiscovery,
    handleAddDiscoveredDevices,
    closeDiscoveryModal,
    handleCreateGroup,
    handleRestartGroup,
    handlePowerOnGroup,
    handlePowerOffGroup,
    openAssignGroupModal,
    assignGroupToSelected,
    handleDeleteSelected,
    handleRestartSelected,
    toggleDevice,
    clearModalFields,
    handleOpenModal,
    handleSave,
    confirmDelete,
    cancelDelete,
    handleViewDevice,
    loadDeviceSchedules,
    clearScheduleForm,
    handleEditSchedule,
    handleDeleteSchedule,
    handleToggleSchedule,
    fetchScheduleLogs,
    handleTriggerSchedule,
    handleSaveScheduleBuilder,
    selectedDevice,
    filteredDevices,
    selectedDeviceHistory,
    recentDeviceEvents,
    groupStatusSummary,
    handleOpenDiscovery,
    handleOpenAuditForDevice,
    handleOpenAuditForGroup,
    handleClearSelection,
    handleMessageConfirm,
  };
}
