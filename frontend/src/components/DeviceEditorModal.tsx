import type { Group } from "../types/app";

interface DeviceEditorModalProps {
  isOpen: boolean;
  editingId: number | null;
  deviceName: string;
  deviceIp: string;
  deviceMac: string;
  deviceBrand: string;
  modalGroupId: number | null;
  groups: Group[];
  onDeviceNameChange: (value: string) => void;
  onDeviceIpChange: (value: string) => void;
  onDeviceMacChange: (value: string) => void;
  onDeviceBrandChange: (value: string) => void;
  onModalGroupIdChange: (value: number | null) => void;
  onClose: () => void;
  onOpenDiscovery: () => void;
  onSave: () => void;
}

export default function DeviceEditorModal({
  isOpen,
  editingId,
  deviceName,
  deviceIp,
  deviceMac,
  deviceBrand,
  modalGroupId,
  groups,
  onDeviceNameChange,
  onDeviceIpChange,
  onDeviceMacChange,
  onDeviceBrandChange,
  onModalGroupIdChange,
  onClose,
  onOpenDiscovery,
  onSave,
}: DeviceEditorModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h2>{editingId !== null ? "Uredi uredaj" : "Dodaj uredaj"}</h2>

        <input
          id="device-name"
          name="deviceName"
          value={deviceName}
          onChange={(e) => onDeviceNameChange(e.target.value)}
          placeholder="Naziv uređaja"
        />
        <input
          id="device-ip"
          name="deviceIp"
          value={deviceIp}
          onChange={(e) => onDeviceIpChange(e.target.value)}
          placeholder="IP adresa"
        />
        <input
          id="device-mac"
          name="deviceMac"
          value={deviceMac}
          onChange={(e) => onDeviceMacChange(e.target.value)}
          placeholder="MAC adresa"
        />
        <select
          id="device-brand"
          name="deviceBrand"
          value={deviceBrand}
          onChange={(e) => onDeviceBrandChange(e.target.value)}
        >
          <option value="generic">Generic</option>
          <option value="webos">LG webOS</option>
          <option value="samsung">Samsung</option>
        </select>
        <select
          id="device-group"
          name="modalGroupId"
          value={modalGroupId ?? ""}
          onChange={(e) =>
            onModalGroupIdChange(
              e.target.value ? Number(e.target.value) : null
            )
          }
        >
          <option value="">Bez grupe</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>

        <div className="modal-buttons">
          <button type="button" onClick={onClose}>Otkaži</button>
          <button type="button" className="discover-btn" onClick={onOpenDiscovery}>
            🔍 Skeniraj TVe
          </button>
          <button type="button" className="save-btn" onClick={onSave}>
            Spremi
          </button>
        </div>
      </div>
    </div>
  );
}
