import type { DiscoveredDevice } from "../types/app";

interface DeviceDiscoveryModalProps {
  isOpen: boolean;
  discoveryLoading: boolean;
  discoveredDevices: DiscoveredDevice[];
  selectedDiscoveredDevices: Set<string>;
  onClose: () => void;
  onRetryDiscovery: () => void;
  onAddSelected: () => void;
  onSelectionChange: (nextSelection: Set<string>) => void;
}

export default function DeviceDiscoveryModal({
  isOpen,
  discoveryLoading,
  discoveredDevices,
  selectedDiscoveredDevices,
  onClose,
  onRetryDiscovery,
  onAddSelected,
  onSelectionChange,
}: DeviceDiscoveryModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <h2>🔍 Skeniraj mrežu za TV uređaje</h2>

        {discoveryLoading ? (
          <div className="discovery-loading">
            <p>Skeniram mrežu... Molim čekaj (~5 sekundi)...</p>
          </div>
        ) : discoveredDevices.length === 0 ? (
          <div className="discovery-empty">
            <p>Nisu pronađeni TV uređaji. Klikni "Skeniraj" da pokušaš ponovo.</p>
          </div>
        ) : (
          <div className="discovery-list">
            <p>Pronađeno {discoveredDevices.length} uređaja. Odaberi koje želiš dodati:</p>
            <div className="discovery-devices">
              {discoveredDevices.map((device) => (
                <div key={device.ip} className="discovery-device">
                  <input
                    type="checkbox"
                    id={`device-${device.ip}`}
                    checked={selectedDiscoveredDevices.has(device.ip)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedDiscoveredDevices);
                      if (e.target.checked) {
                        newSelected.add(device.ip);
                      } else {
                        newSelected.delete(device.ip);
                      }
                      onSelectionChange(newSelected);
                    }}
                  />
                  <label htmlFor={`device-${device.ip}`}>
                    <div>
                      <strong>{device.name}</strong>
                      {device.already_added && <span className="badge-added">✓ Već dodan</span>}
                    </div>
                    <small>{device.ip}</small>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-buttons">
          <button type="button" onClick={onClose}>Otkaži</button>
          <button
            type="button"
            className="discover-btn"
            onClick={onRetryDiscovery}
            disabled={discoveryLoading}
          >
            {discoveryLoading ? "Skeniram..." : "🔄 Skeniraj ponovo"}
          </button>
          <button
            type="button"
            className="save-btn"
            onClick={onAddSelected}
            disabled={selectedDiscoveredDevices.size === 0 || discoveryLoading}
          >
            ✅ Dodaj ({selectedDiscoveredDevices.size})
          </button>
        </div>
      </div>
    </div>
  );
}
