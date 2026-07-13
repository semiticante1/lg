import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
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
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      aria-labelledby="discovery-dialog-title"
      slotProps={{ paper: { className: 'modal' } }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle id="discovery-dialog-title">🔍 Skeniraj mrežu za TV uređaje</DialogTitle>
      <DialogContent dividers>
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
            <List dense>
              {discoveredDevices.map((device) => (
                <ListItem key={device.ip} className="discovery-device" disablePadding>
                  <ListItemText
                    primary={
                      <span>
                        <strong>{device.name}</strong>
                        {device.already_added && <span className="badge-added"> ✓ Već dodan</span>}
                      </span>
                    }
                    secondary={device.ip}
                  />
                  <ListItemSecondaryAction>
                    <Checkbox
                      size="small"
                      edge="end"
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
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </div>
        )}
      </DialogContent>
      <DialogActions className="modal-buttons">
        <Button onClick={onClose}>Otkaži</Button>
        <Button onClick={onRetryDiscovery} disabled={discoveryLoading} className="discover-btn">
          {discoveryLoading ? "Skeniram..." : "🔄 Skeniraj ponovo"}
        </Button>
        <Button
          onClick={onAddSelected}
          disabled={selectedDiscoveredDevices.size === 0 || discoveryLoading}
          variant="contained"
          color="primary"
        >
          ✅ Dodaj ({selectedDiscoveredDevices.size})
        </Button>
      </DialogActions>
    </Dialog>
  );
}
