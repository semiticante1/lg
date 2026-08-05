import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppTheme } from "./useAppTheme";
import { getActivePage, normalizeBackendUrl } from "../utils/app";
import { useAppShellState } from "./useAppShellState";
import { useAppDialogs } from "./useAppDialogs";
import { useAuditData } from "./useAuditData";
import { useSystemData } from "./useSystemData";
import { useRealtimeDeviceSync } from "./useRealtimeDeviceSync";
import { useDeviceData } from "./useDeviceData";
import { useAppContainerDeviceHooks } from "./useAppContainerDeviceHooks";
import PageFallback from "../components/PageFallback";
import { createAppTheme } from "../theme";
import { formatPowerText, formatStatusText } from "../utils/device";
import { getActionLabel, getAvailableActionsForDevice, isCronValid } from "../utils/schedule";

export function useAppContainerState() {
  const navigate = useNavigate();
  const location = useLocation();
  const activePage = getActivePage(location.pathname);
  const { theme, toggleTheme } = useAppTheme("dark");
  const baseState = useAppShellState();

  const { removeToast, showToast, showMessage, showConfirm, closeMessageModal } = useAppDialogs({
    setToastMessages: baseState.setToastMessages,
    setMessageModal: baseState.setMessageModal,
    setStatusMessage: baseState.setStatusMessage,
  });

  const normalizedBaseUrl = normalizeBackendUrl(baseState.backendUrl);

  const { loadAuditLogs } = useAuditData({
    baseUrl: normalizedBaseUrl,
    auditPage: baseState.auditPage,
    auditPageSize: baseState.auditPageSize,
    setAuditLogs: baseState.setAuditLogs,
    setAuditTotalCount: baseState.setAuditTotalCount,
    setAuditLoading: baseState.setAuditLoading,
    setAuditPage: baseState.setAuditPage,
  });

  const {
    forcedOffIdsRef,
    devicesRef,
    refreshAll,
    loadDevices,
    loadGroups,
    recordDeviceEvent,
    resolvePowerStateWithForcedOff,
    setShowDiscoveryModal: setDiscoveryModalOpen,
    setDiscoveryLoading: setDiscoveryLoadingState,
    setSelectedDiscoveredDevices: setDiscoveredSelection,
    setDiscoveredDevices: setDiscoveredDevicesState,
    setStatusMessage: setCurrentStatusMessage,
  } = useDeviceData({
    baseUrl: normalizedBaseUrl,
    auditDeviceFilter: baseState.auditDeviceFilter,
    auditGroupFilter: baseState.auditGroupFilter,
    auditPage: baseState.auditPage,
    auditPageSize: baseState.auditPageSize,
    devices: baseState.devices,
    setDevices: baseState.setDevices,
    setGroups: baseState.setGroups,
    setDeviceHistory: baseState.setDeviceHistory,
    setLoading: baseState.setLoading,
    setLastRefresh: baseState.setLastRefresh,
    setStatusMessage: baseState.setStatusMessage,
    setDiscoveryLoading: baseState.setDiscoveryLoading,
    setDiscoveredDevices: baseState.setDiscoveredDevices,
    setSelectedDiscoveredDevices: baseState.setSelectedDiscoveredDevices,
    setShowDiscoveryModal: baseState.setShowDiscoveryModal,
    showToast,
    showMessage,
    loadAuditLogs,
  });

  const {
    loadHealthSummary,
    loadBackups,
    loadDiagnostics,
    handleRunMaintenanceNow,
    handleShowDiagnosticsSnapshot,
    handleDownloadDiagnosticsSnapshot,
    handleCreateBackup,
    handleRestoreBackup,
  } = useSystemData({
    baseUrl: normalizedBaseUrl,
    activePage,
    diagnostics: baseState.diagnostics,
    selectedBackup: baseState.selectedBackup,
    setHealthSummary: baseState.setHealthSummary,
    setHealthLoading: baseState.setHealthLoading,
    setBackupList: baseState.setBackupList,
    setBackupLoading: baseState.setBackupLoading,
    setSelectedBackup: baseState.setSelectedBackup,
    setDiagnostics: baseState.setDiagnostics,
    setDiagnosticsLoading: baseState.setDiagnosticsLoading,
    refreshAll,
    showToast,
    showMessage,
    showConfirm,
  });

  useRealtimeDeviceSync({
    baseUrl: normalizedBaseUrl,
    setDevices: baseState.setDevices,
    devicesRef,
    setLastRefresh: baseState.setLastRefresh,
    setStatusMessage: setCurrentStatusMessage,
    recordDeviceEvent,
    resolvePowerStateWithForcedOff,
  });

  const deviceHooks = useAppContainerDeviceHooks({
    baseUrl: normalizedBaseUrl,
    ...baseState,
    navigate,
    loadAuditLogs,
    showToast,
    showMessage,
    showConfirm,
    refreshAll,
    loadGroups,
    recordDeviceEvent,
    forcedOffIdsRef,
    setDiscoveryModalOpen,
    closeMessageModal,
  });

  useEffect(() => {
    if (activePage !== "settings") return;
    void loadHealthSummary();
    void loadBackups();
    void loadDiagnostics();
  }, [activePage, loadBackups, loadDiagnostics, loadHealthSummary]);

  const muiTheme = createAppTheme(theme);
  const pageFallback = <PageFallback />;

  return {
    activePage,
    theme,
    toggleTheme,
    muiTheme,
    pageFallback,
    appLayoutProps: {
      theme,
      toggleTheme,
      loading: baseState.loading,
      refreshAll,
      handlePowerOnAll: deviceHooks.handlePowerOnAll,
      handlePowerOffAll: deviceHooks.handlePowerOffAll,
      handleOpenModal: deviceHooks.handleOpenModal,
      lastRefresh: baseState.lastRefresh,
    },
    pageContentProps: {
      activePage,
      pageFallback,
      dashboardProps: {
        devices: baseState.devices,
        groupStatusSummary: deviceHooks.groupStatusSummary,
        recentDeviceEvents: deviceHooks.recentDeviceEvents,
      },
      groupsProps: {
        groupStatusSummary: deviceHooks.groupStatusSummary,
        groupName: baseState.groupName,
        setGroupName: baseState.setGroupName,
        handleCreateGroup: deviceHooks.handleCreateGroup,
        handleRestartGroup: deviceHooks.handleRestartGroup,
        handlePowerOnGroup: deviceHooks.handlePowerOnGroup,
        handlePowerOffGroup: deviceHooks.handlePowerOffGroup,
        handleOpenAuditForGroup: deviceHooks.handleOpenAuditForGroup,
      },
      auditProps: {
        auditDeviceFilter: baseState.auditDeviceFilter,
        setAuditDeviceFilter: baseState.setAuditDeviceFilter,
        auditGroupFilter: baseState.auditGroupFilter,
        setAuditGroupFilter: baseState.setAuditGroupFilter,
        loadAuditLogs,
        auditLoading: baseState.auditLoading,
        devices: baseState.devices,
        groups: baseState.groups,
        auditLogs: baseState.auditLogs,
        auditPage: baseState.auditPage,
        setAuditPage: baseState.setAuditPage,
        auditPageSize: baseState.auditPageSize,
        auditTotalCount: baseState.auditTotalCount,
      },
      settingsProps: {
        backendUrl: baseState.backendUrl,
        setBackendUrl: baseState.setBackendUrl,
        schedulerOn: baseState.schedulerOn,
        setSchedulerOn: baseState.setSchedulerOn,
        loadHealthSummary,
        healthLoading: baseState.healthLoading,
        healthSummary: baseState.healthSummary,
        handleCreateBackup,
        backupLoading: baseState.backupLoading,
        loadBackups,
        backupList: baseState.backupList,
        selectedBackup: baseState.selectedBackup,
        setSelectedBackup: baseState.setSelectedBackup,
        handleRestoreBackup,
        handleRunMaintenanceNow,
        diagnosticsLoading: baseState.diagnosticsLoading,
        loadDiagnostics,
        handleShowDiagnosticsSnapshot,
        handleDownloadDiagnosticsSnapshot,
        diagnostics: baseState.diagnostics,
        showMessage,
      },
      devicesProps: {
        devices: baseState.devices,
        groups: baseState.groups,
        search: baseState.search,
        setSearch: baseState.setSearch,
        groupFilter: baseState.groupFilter,
        setGroupFilter: baseState.setGroupFilter,
        statusFilter: baseState.statusFilter,
        setStatusFilter: baseState.setStatusFilter,
        powerFilter: baseState.powerFilter,
        setPowerFilter: baseState.setPowerFilter,
        activityFilter: baseState.activityFilter,
        setActivityFilter: baseState.setActivityFilter,
        registrationFrom: baseState.registrationFrom,
        setRegistrationFrom: baseState.setRegistrationFrom,
        registrationTo: baseState.registrationTo,
        setRegistrationTo: baseState.setRegistrationTo,
        selectedDevice: deviceHooks.selectedDevice,
        handleClearSelection: deviceHooks.handleClearSelection,
        handleRestartSelected: deviceHooks.handleRestartSelected,
        handleDeleteSelected: deviceHooks.handleDeleteSelected,
        openAssignGroupModal: deviceHooks.openAssignGroupModal,
        loading: baseState.loading,
        filteredDevices: deviceHooks.filteredDevices,
        toggleDevice: deviceHooks.toggleDevice,
        formatPowerText,
        formatStatusText,
        handleViewDevice: deviceHooks.handleViewDevice,
        setEditingId: baseState.setEditingId,
        setDeviceName: baseState.setDeviceName,
        setDeviceIp: baseState.setDeviceIp,
        setDeviceMac: baseState.setDeviceMac,
        setModalGroupId: baseState.setModalGroupId,
        setShowModal: baseState.setShowModal,
        handleOpenAuditForDevice: deviceHooks.handleOpenAuditForDevice,
        handleRestartDevice: deviceHooks.handleRestartDevice,
        setPendingDelete: baseState.setPendingDelete,
        setShowDeleteConfirm: baseState.setShowDeleteConfirm,
        showDeleteConfirm: baseState.showDeleteConfirm,
        cancelDelete: deviceHooks.cancelDelete,
        confirmDelete: deviceHooks.confirmDelete,
        showAssignGroupModal: baseState.showAssignGroupModal,
        setShowAssignGroupModal: baseState.setShowAssignGroupModal,
        selectedAssignGroupId: baseState.selectedAssignGroupId,
        setSelectedAssignGroupId: baseState.setSelectedAssignGroupId,
        assignGroupToSelected: deviceHooks.assignGroupToSelected,
        messageModal: baseState.messageModal,
        setMessageModal: baseState.setMessageModal,
        closeMessageModal,
        handleMessageConfirm: deviceHooks.handleMessageConfirm,
        selectedDeviceHistory: deviceHooks.selectedDeviceHistory,
        volumeValue: baseState.volumeValue,
        setVolumeValue: baseState.setVolumeValue,
        launchTarget: baseState.launchTarget,
        setLaunchTarget: baseState.setLaunchTarget,
        detailTab: baseState.detailTab,
        setDetailTab: baseState.setDetailTab,
        getDeviceSchedules: (deviceId: number) => baseState.deviceSchedules[deviceId] || [],
        getAvailableActions: getAvailableActionsForDevice,
        getActionLabel,
        handleToggleSchedule: deviceHooks.handleToggleSchedule,
        fetchScheduleLogs: deviceHooks.fetchScheduleLogs,
        handleTriggerSchedule: deviceHooks.handleTriggerSchedule,
        handleSaveScheduleBuilder: deviceHooks.handleSaveScheduleBuilder,
        handleEditSchedule: deviceHooks.handleEditSchedule,
        handleDeleteSchedule: deviceHooks.handleDeleteSchedule,
        setShowScheduleBuilder: baseState.setShowScheduleBuilder,
        handlePowerOnDevice: deviceHooks.handlePowerOnDevice,
        handlePowerOffDevice: deviceHooks.handlePowerOffDevice,
        handleSendDeviceAction: deviceHooks.handleSendDeviceAction,
        showMessage,
      },
    },
    globalUIProps: {
      loading: baseState.loading,
      statusMessage: baseState.statusMessage,
      showModal: baseState.showModal,
      editingId: baseState.editingId,
      deviceName: baseState.deviceName,
      deviceIp: baseState.deviceIp,
      deviceMac: baseState.deviceMac,
      deviceBrand: baseState.deviceBrand,
      modalGroupId: baseState.modalGroupId,
      groups: baseState.groups,
      onDeviceNameChange: baseState.setDeviceName,
      onDeviceIpChange: baseState.setDeviceIp,
      onDeviceMacChange: baseState.setDeviceMac,
      onDeviceBrandChange: baseState.setDeviceBrand,
      onModalGroupIdChange: baseState.setModalGroupId,
      onModalClose: () => baseState.setShowModal(false),
      onOpenDiscovery: deviceHooks.handleOpenDiscovery,
      onSave: deviceHooks.handleSave,
      showDiscoveryModal: baseState.showDiscoveryModal,
      discoveryLoading: baseState.discoveryLoading,
      discoveredDevices: baseState.discoveredDevices,
      selectedDiscoveredDevices: baseState.selectedDiscoveredDevices,
      onDiscoveryClose: deviceHooks.closeDiscoveryModal,
      onRetryDiscovery: deviceHooks.handleStartDiscovery,
      onAddDiscoveredDevices: deviceHooks.handleAddDiscoveredDevices,
      onSelectionChange: baseState.setSelectedDiscoveredDevices,
      showScheduleBuilder: baseState.showScheduleBuilder,
      onScheduleBuilderClose: () => baseState.setShowScheduleBuilder(false),
      onScheduleBuilderSave: deviceHooks.handleSaveScheduleBuilder,
      onScheduleCronChange: baseState.setScheduleCron,
      scheduleCron: baseState.scheduleCron,
      scheduleActionLabel: getActionLabel(baseState.scheduleAction),
      selectedDeviceName: deviceHooks.selectedDevice?.name || "Uredaj",
      toastMessages: baseState.toastMessages,
      onRemoveToast: removeToast,
    },
  };
}
