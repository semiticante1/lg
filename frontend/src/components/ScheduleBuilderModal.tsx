import React, { useState, useEffect } from "react";
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

  const handleDayToggle = (dayNum: number) => {
    setSelectedDays((prev) => {
      const newDays = prev.includes(dayNum)
        ? prev.filter((d) => d !== dayNum)
        : [...prev, dayNum];
      onCronChange(generateCron(hour, minute, newDays));
      return newDays;
    });
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

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close if clicking directly on the overlay, not on the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="schedule-builder-overlay" onClick={handleOverlayClick}>
      <div className="schedule-builder-modal">
        <div className="schedule-builder-header">
          <h2>Postavi raspored</h2>
          <p className="schedule-builder-subtitle">{deviceName} - {action}</p>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="schedule-builder-content">
          {/* Time Section */}
          <div className="schedule-section">
            <h3>Vrijeme</h3>
            
            {/* Hour Picker */}
            <div className="time-picker-section">
              <div className="time-input-group">
                <label>Sat</label>
                <div className="hour-picker">
                  <button
                    className="hour-btn"
                    onClick={() => handleHourChange((hour - 1 + 24) % 24)}
                  >
                    ◀
                  </button>
                  <div className="hour-display">
                    {String(hour).padStart(2, "0")}
                  </div>
                  <button
                    className="hour-btn"
                    onClick={() => handleHourChange((hour + 1) % 24)}
                  >
                    ▶
                  </button>
                </div>
              </div>

              <div className="time-separator">:</div>

              <div className="time-input-group">
                <label>Minuta</label>
                <div className="minute-picker">
                  <button
                    className="minute-btn"
                    onClick={() => handleMinuteChange((minute - 5 + 60) % 60)}
                  >
                    ◀
                  </button>
                  <div className="minute-display">
                    {String(minute).padStart(2, "0")}
                  </div>
                  <button
                    className="minute-btn"
                    onClick={() => handleMinuteChange((minute + 5) % 60)}
                  >
                    ▶
                  </button>
                </div>
              </div>
            </div>

            <div className="time-display-large">
              {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
            </div>

            {/* Preset Times */}
            <div className="preset-buttons">
              {presetSchedules.map((preset) => (
                <button
                  key={preset.label}
                  className="preset-btn"
                  onClick={() => {
                    handleHourChange(preset.hour);
                    handleMinuteChange(preset.minute);
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Days Section */}
          <div className="schedule-section">
            <h3>Dani</h3>
            
            <div className="day-picker">
              {dayLabelsShort.map((label, dayNum) => (
                <button
                  key={dayNum}
                  className={`day-btn ${selectedDays.includes(dayNum) ? "active" : ""}`}
                  onClick={() => handleDayToggle(dayNum)}
                  title={dayNames[dayNum]}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Preset Days */}
            <div className="preset-buttons">
              {presetDays.map((preset) => (
                <button
                  key={preset.label}
                  className="preset-btn"
                  onClick={() => {
                    setSelectedDays(preset.days);
                    onCronChange(generateCron(hour, minute, preset.days));
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {selectedDays.length > 0 && (
              <div className="selected-days-info">
                <strong>Odabrani dani:</strong> {selectedDays.map((d) => dayNames[d]).join(", ")}
              </div>
            )}
          </div>

          {/* Summary */}
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
        </div>

        <div className="schedule-builder-footer">
          <button className="cancel-btn" onClick={onClose} disabled={loading}>
            Otkaži
          </button>
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={loading || selectedDays.length === 0}
          >
            {loading ? "Sprema..." : "Spremi raspored"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleBuilderModal;
