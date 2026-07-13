import React, { useState, useEffect } from "react";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Box from '@mui/material/Box';
import "./ScheduleBuilderModal.css";

interface ScheduleBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: ScheduleData) => Promise<void>;
  onCronChange: (cron: string) => void;
  currentCron: string;
  action: string;
  deviceName: string;
}

interface ScheduleData {
  hour: number;
  minute: number;
  days: number[];
  cron: string;
}

const ScheduleBuilderModal: React.FC<ScheduleBuilderProps> = ({
  isOpen,
  onClose,
  onSave,
  onCronChange,
  currentCron,
  action,
  deviceName,
}) => {
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Monday to Friday
  const [loading, setLoading] = useState(false);

  const dayNames = ["Nedjelja", "Ponedjeljak", "Utorak", "Srijeda", "Četvrtak", "Petak", "Subota"];
  const dayLabelsShort = ["Ne", "Po", "Ut", "Sr", "Če", "Pe", "Su"];

  useEffect(() => {
    // Parse current cron to populate fields
    if (currentCron) {
      const parts = currentCron.trim().split(/\s+/);
      if (parts.length >= 5) {
        const [min, hrs] = parts;
        // Simple parsing for HH:MM format
        if (!/\*/.test(hrs) && !/\*/.test(min)) {
          const h = parseInt(hrs, 10);
          const m = parseInt(min, 10);
          if (!isNaN(h) && !isNaN(m)) {
            setHour(h);
            setMinute(m);
          }
        }
        // Parse day of week (5th field)
        if (parts[4] && parts[4] !== "*") {
          const days = parts[4].split(",").map((d) => parseInt(d, 10));
          setSelectedDays(days.filter((d) => !isNaN(d)));
        }
      }
    }
  }, [currentCron]);

  const generateCron = (h: number, m: number, days: number[]): string => {
    if (days.length === 0) {
      return "0 0 * * *"; // Invalid, fallback
    }
    const dayString = days.sort((a, b) => a - b).join(",");
    return `${m} ${h} * * ${dayString}`;
  };

  const handleHourChange = (newHour: number) => {
    setHour(newHour);
    onCronChange(generateCron(newHour, minute, selectedDays));
  };

  const handleMinuteChange = (newMinute: number) => {
    setMinute(newMinute);
    onCronChange(generateCron(hour, newMinute, selectedDays));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const cron = generateCron(hour, minute, selectedDays);
      await onSave({ hour, minute, days: selectedDays, cron });
      onClose();
    } catch (error) {
      console.error("Error saving schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  const presetSchedules = [
    { label: "Ujutro (7:00)", hour: 7, minute: 0 },
    { label: "Popodne (14:00)", hour: 14, minute: 0 },
    { label: "Večer (21:00)", hour: 21, minute: 0 },
    { label: "Noć (23:00)", hour: 23, minute: 0 },
  ];

  const presetDays = [
    { label: "Samo radni dani (Po-Pe)", days: [1, 2, 3, 4, 5] },
    { label: "Svakodnevno", days: [0, 1, 2, 3, 4, 5, 6] },
    { label: "Samo vikend", days: [0, 6] },
    { label: "Samo ponedjeljak", days: [1] },
  ];

  if (!isOpen) return null;

  const handleDayGroupChange = (
    _event: React.MouseEvent<HTMLElement>,
    newSelectedDays: number[],
  ) => {
    const days = Array.isArray(newSelectedDays) ? newSelectedDays : [];
    setSelectedDays(days);
    onCronChange(generateCron(hour, minute, days));
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      aria-labelledby="schedule-builder-dialog-title"
      slotProps={{ paper: { className: 'schedule-builder-modal' } }}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle id="schedule-builder-dialog-title">Postavi raspored</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <div className="schedule-builder-header">
            <p className="schedule-builder-subtitle">{deviceName} - {action}</p>
          </div>

          <div className="schedule-section">
            <h3>Vrijeme</h3>
            <div className="time-picker-section">
              <div className="time-input-group">
                <label>Sat</label>
                <div className="hour-picker">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleHourChange((hour - 1 + 24) % 24)}
                  >
                    ◀
                  </Button>
                  <div className="hour-display">
                    {String(hour).padStart(2, "0")}
                  </div>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleHourChange((hour + 1) % 24)}
                  >
                    ▶
                  </Button>
                </div>
              </div>

              <div className="time-separator">:</div>

              <div className="time-input-group">
                <label>Minuta</label>
                <div className="minute-picker">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleMinuteChange((minute - 5 + 60) % 60)}
                  >
                    ◀
                  </Button>
                  <div className="minute-display">
                    {String(minute).padStart(2, "0")}
                  </div>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleMinuteChange((minute + 5) % 60)}
                  >
                    ▶
                  </Button>
                </div>
              </div>
            </div>

            <div className="time-display-large">
              {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
            </div>

            <div className="preset-buttons">
              {presetSchedules.map((preset) => (
                <Button
                  key={preset.label}
                  className="preset-btn"
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    handleHourChange(preset.hour);
                    handleMinuteChange(preset.minute);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="schedule-section">
            <h3>Dani</h3>
            <ToggleButtonGroup
              value={selectedDays}
              onChange={handleDayGroupChange}
              aria-label="Odaberi dane"
              size="small"
            >
              {dayLabelsShort.map((label, dayNum) => (
                <ToggleButton key={dayNum} value={dayNum} aria-label={dayNames[dayNum]}>
                  {label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            <div className="preset-buttons">
              {presetDays.map((preset) => (
                <Button
                  key={preset.label}
                  className="preset-btn"
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setSelectedDays(preset.days);
                    onCronChange(generateCron(hour, minute, preset.days));
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {selectedDays.length > 0 && (
              <div className="selected-days-info">
                <strong>Odabrani dani:</strong> {selectedDays.map((d) => dayNames[d]).join(", ")}
              </div>
            )}
          </div>

          <div className="schedule-summary">
            <div className="summary-item">
              <span className="summary-label">Vrijeme:</span>
              <span className="summary-value">{String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Dani:</span>
              <span className="summary-value">
                {selectedDays.length === 7
                  ? "Svakodnevno"
                  : selectedDays.length === 5 && selectedDays.join(",") === "1,2,3,4,5"
                  ? "Radni dani (Po-Pe)"
                  : `${selectedDays.length} dan(a)`}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Cron:</span>
              <span className="summary-cron">{generateCron(hour, minute, selectedDays)}</span>
            </div>
          </div>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Otkaži</Button>
        <Button
          onClick={handleSave}
          disabled={loading || selectedDays.length === 0}
          variant="contained"
          color="primary"
        >
          {loading ? "Sprema..." : "Spremi raspored"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduleBuilderModal;
