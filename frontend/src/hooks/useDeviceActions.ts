import type { Dispatch, RefObject, SetStateAction } from "react";
import type { Device, DiscoveredDevice, Group } from "../types/app";

type ToastType = "info" | "success" | "error";

type ShowToastFn = (type: ToastType, title: string, message: string) => void;

type ShowMessageFn = (title: string, message: string) => void;

type ShowConfirmFn = (
  title: string,
  message: string,
  onConfirm: () => Promise<void> | void,
  confirmText?: string,
  cancelText?: string
) => void;

type BulkPowerResult = {
  poweredOn?: boolean;
  poweredOff?: boolean;
};

export interface UseDeviceActionsOptions {
  baseUrl: string;
  devices: Device[];
  groups: Group[];
  discoveredDevices: DiscoveredDevice[];
  selectedDiscoveredDevices: Set<string>;
  refreshAll: () => Promise<void>;
  loadGroups: () => Promise<void>;
  recordDeviceEvent: (device: Device, note: string) => void;
  showToast: ShowToastFn;
  showMessage: ShowMessageFn;
  showConfirm: ShowConfirmFn;
  setStatusMessage: (message: string) => void;
  setDevices: Dispatch<SetStateAction<Device[]>>;
  setDiscoveryLoading: (loading: boolean) => void;
  setDiscoveredDevices: Dispatch<SetStateAction<DiscoveredDevice[]>>;
  setSelectedDiscoveredDevices: Dispatch<SetStateAction<Set<string>>>;
  setShowDiscoveryModal: (open: boolean) => void;
  groupName: string;
  setGroupName: Dispatch<SetStateAction<string>>;
  selectedAssignGroupId: number | null;
  setSelectedAssignGroupId: Dispatch<SetStateAction<number | null>>;
  setShowAssignGroupModal: (open: boolean) => void;
  forcedOffIdsRef: RefObject<Set<number>>;
}

export function useDeviceActions({
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
  setShowDiscoveryModal,
  groupName,
  setGroupName,
  selectedAssignGroupId,
  setSelectedAssignGroupId,
  setShowAssignGroupModal,
  forcedOffIdsRef,
}: UseDeviceActionsOptions) {
  const applyOptimisticPowerOffState = (ids: number[]) => {
    if (ids.length === 0) return;
    ids.forEach((id) => forcedOffIdsRef.current.add(id));
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
    const device = devices.find((d) => d.id === id);
    if (device) {
      forcedOffIdsRef.current.add(id);
      setDevices((prev) =>
        prev.map((d) => (d.id === id ? { ...d, powerState: "Off", power_state: "Off" } : d))
      );
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
        forcedOffIdsRef.current.delete(id);
        showMessage("Greška pri gašenju", errorMsg);
        await refreshAll();
        return;
      }

      const data = await response.json();
      if (!data.success) {
        forcedOffIdsRef.current.delete(id);
        showMessage("Gašenje nije uspjelo", data.reason || "Nepoznata greška");
        await refreshAll();
      }
    } catch (error) {
      forcedOffIdsRef.current.delete(id);
      console.error("Greska pri gašenju uređaja:", error);
      showMessage("Greška", "Greška pri gašenju uređaja.");
      await refreshAll();
    }
  };

  const handlePowerOnDevice = async (id: number) => {
    showToast("info", "Uključivanje", "Šaljem WoL paket za paljenje TV-a...");
    const device = devices.find((d) => d.id === id);
    if (device) {
      forcedOffIdsRef.current.delete(id);
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
        showToast(
          "error",
          "Nije uspjelo",
          `Paljenje nije potvrđeno: ${data.reason || "Provjeri je li 'Quick Start+' uključen u postavkama LG TV-a"}.`
        );
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

        try {
          const response = await fetch(`${baseUrl}/devices`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: device.name || `TV (${ip})`,
              ip: device.ip,
              mac: candidateMac || `02:${ip
                .split(".")
                .map((p) => parseInt(p).toString(16).padStart(2, "0"))
                .join(":")}`,
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
    const selectedIds = devices.filter((device) => device.selected).map((device) => device.id);

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
    await loadGroups();
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
        device.id === id ? { ...device, selected: !device.selected } : device
      )
    );
  };

  const closeDiscoveryModal = () => {
    setShowDiscoveryModal(false);
    setDiscoveredDevices([]);
    setSelectedDiscoveredDevices(new Set());
  };

  return {
    handlePowerOnAll,
    handlePowerOffDevice,
    handlePowerOnDevice,
    handleRestartDevice,
    handleStartDiscovery,
    handleAddDiscoveredDevices,
    handleSendDeviceAction,
    handlePowerOffAll,
    handleDeleteSelectedConfirmed,
    handleDeleteSelected,
    handleRestartSelected,
    handleCreateGroup,
    handleRestartGroup,
    handlePowerOnGroup,
    handlePowerOffGroup,
    openAssignGroupModal,
    assignGroupToSelected,
    toggleDevice,
    closeDiscoveryModal,
  };
}
