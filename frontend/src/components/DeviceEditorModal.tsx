import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
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

        <TextField
          id="device-name"
          name="deviceName"
          value={deviceName}
          onChange={(e) => onDeviceNameChange(e.target.value)}
          placeholder="Naziv uređaja"
          size="small"
          variant="outlined"
          fullWidth
          className="small-input"
          margin="dense"
        />
        <TextField
          id="device-ip"
          name="deviceIp"
          value={deviceIp}
          onChange={(e) => onDeviceIpChange(e.target.value)}
          placeholder="IP adresa"
          size="small"
          variant="outlined"
          fullWidth
          className="small-input"
          margin="dense"
        />
        <TextField
          id="device-mac"
          name="deviceMac"
          value={deviceMac}
          onChange={(e) => onDeviceMacChange(e.target.value)}
          placeholder="MAC adresa"
          size="small"
          variant="outlined"
          fullWidth
          className="small-input"
          margin="dense"
        />
        <FormControl size="small" fullWidth margin="dense" className="small-select">
          <InputLabel id="device-brand-label">Marka</InputLabel>
          <Select
            labelId="device-brand-label"
            id="device-brand"
            name="deviceBrand"
            value={deviceBrand}
            label="Marka"
            onChange={(e) => onDeviceBrandChange(e.target.value)}
          >
            <MenuItem value="generic">Generic</MenuItem>
            <MenuItem value="webos">LG webOS</MenuItem>
            <MenuItem value="samsung">Samsung</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth margin="dense" className="small-select">
          <InputLabel id="device-group-label">Grupa</InputLabel>
          <Select
            labelId="device-group-label"
            id="device-group"
            name="modalGroupId"
            value={modalGroupId ?? ""}
            label="Grupa"
            onChange={(e) =>
              onModalGroupIdChange(
                e.target.value ? Number(e.target.value) : null
              )
            }
          >
            <MenuItem value="">Bez grupe</MenuItem>
            {groups.map((group) => (
              <MenuItem key={group.id} value={group.id}>
                {group.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

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
