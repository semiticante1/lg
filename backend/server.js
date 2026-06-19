const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const ping = require("ping");
const wol = require("wake_on_lan");
const WebSocket = require("ws");
const cron = require("node-cron");
const { powerOnAll } = require("./power-on-all");
const {
  powerOnDevice,
  sendWebosRestart,
  powerOffDevice,
  queryDevicePowerState,
  wakeDevice,
  launchWebosApp,
  setWebosMute,
  adjustWebosVolume,
  setWebosVolume,
  setSamsungMute,
  adjustSamsungVolume,
  setSamsungVolume,
} = require("./tv-adapter");
const { discoverLGTVs } = require("./device-discovery");

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, "data.db");
const JSON_FILE = path.join(__dirname, "devices.json");

const getNormalizedBrand = (device) => (device?.brand || "").trim().toLowerCase();

const db = new sqlite3.Database(DB_FILE);

const runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });

const allAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });

const getAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });

const safeJsonParse = (value, fallback = {}) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// WebSocket server will be initialized after HTTP server starts
let wss = null;

const broadcastDeviceState = async (deviceId) => {
  try {
    if (!wss) return;
    const device = await getAsync(`SELECT * FROM devices WHERE id = ?`, [deviceId]);
    if (!device) return;
    const payload = JSON.stringify({ type: 'device:update', device });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try { client.send(payload); } catch (e) {}
      }
    });
  } catch (e) {
    console.error('broadcastDeviceState error:', e);
  }
};

async function initDatabase() {
  await runAsync("PRAGMA foreign_keys = ON");

  await runAsync(
    `CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )`
  );

  await runAsync(
    `CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      ip TEXT NOT NULL,
      mac TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT 'generic',
      status TEXT NOT NULL DEFAULT 'Offline',
      power_state TEXT NOT NULL DEFAULT 'Off',
      group_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_active_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE SET NULL
    )`
  );

  await runAsync(
    `CREATE TABLE IF NOT EXISTS device_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      cron TEXT NOT NULL,
      action TEXT NOT NULL,
      action_params TEXT,
      description TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(device_id) REFERENCES devices(id) ON DELETE CASCADE
    )`
  );

  await runAsync(
    `CREATE TABLE IF NOT EXISTS schedule_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(schedule_id) REFERENCES device_schedules(id) ON DELETE CASCADE
    )`
  );

  await runAsync(
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT,
      entity_id INTEGER,
      device_id INTEGER,
      group_id INTEGER,
      schedule_id INTEGER,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      source TEXT,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await runAsync(
    `CREATE TABLE IF NOT EXISTS scenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      target_type TEXT NOT NULL DEFAULT 'group',
      target_id INTEGER,
      steps_json TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  );

  const existingColumns = await allAsync(`PRAGMA table_info(devices)`);
  if (!existingColumns.some((column) => column.name === "brand")) {
    await runAsync(`ALTER TABLE devices ADD COLUMN brand TEXT NOT NULL DEFAULT 'generic'`);
  }
  if (!existingColumns.some((column) => column.name === "power_state")) {
    await runAsync(`ALTER TABLE devices ADD COLUMN power_state TEXT NOT NULL DEFAULT 'Off'`);
  }
  if (!existingColumns.some((column) => column.name === "last_active_at")) {
    // SQLite may reject ALTER TABLE ADD COLUMN with non-constant default (CURRENT_TIMESTAMP)
    // Add the column without default, then populate existing rows.
    await runAsync(`ALTER TABLE devices ADD COLUMN last_active_at TEXT`);
    try {
      await runAsync(`UPDATE devices SET last_active_at = CURRENT_TIMESTAMP WHERE last_active_at IS NULL`);
    } catch (e) {
      // ignore if update fails
    }
  }

  const row = await getAsync("SELECT COUNT(*) AS count FROM devices");

  try {
    const data = JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));

    for (const device of data) {
      await runAsync(
        `INSERT OR IGNORE INTO devices (id, name, ip, mac, brand, status, power_state) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          device.id,
          device.name,
          device.ip,
          device.mac,
          device.brand || "generic",
          device.status || "Offline",
          device.powerState || device.power_state || "Off",
        ]
      );
    }

    console.log("Imported or verified devices from devices.json into SQLite.");
  } catch (error) {
    console.log("No JSON import performed:", error.message);
  }
}

const POWER_QUERY_TIMEOUT_MS = 4000;

const pingDevice = async (ip) => {
  try {
    const result = await ping.promise.probe(ip, {
      timeout: 2,
    });
    return result.alive;
  } catch {
    return false;
  }
};

const mapWebosPowerState = (payload) => {
  if (!payload || typeof payload.state !== "string") {
    return null;
  }

  const state = payload.state.toLowerCase();
  if (state.includes("active") || state.includes("on")) {
    return "On";
  }
  if (state.includes("inactive") || state.includes("off")) {
    return "Off";
  }

  return null;
};

const queryWebosPowerState = async (ip) => {
  if (!ip) {
    return null;
  }

  return new Promise((resolve) => {
    let resolved = false;
    const ws = new WebSocket(`ws://${ip}:3000`, {
      handshakeTimeout: 3000,
    });

    const finish = (value) => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearTimeout(timeout);
      try {
        ws.terminate();
      } catch {
        // ignore
      }
      resolve(value);
    };

    const timeout = setTimeout(() => finish(null), POWER_QUERY_TIMEOUT_MS);

    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          type: "request",
          uri: "ssap://com.webos.service.power/getPowerState",
          id: "powerState",
        })
      );
    });

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.id === "powerState") {
          const mapped = mapWebosPowerState(data.payload || data);
          if (mapped) {
            finish(mapped);
          }
        }
      } catch {
        // ignore invalid websocket messages
      }
    });

    ws.on("error", () => finish(null));
    ws.on("close", () => finish(null));
  });
};

async function refreshStatus(device) {
  const alive = await pingDevice(device.ip);
  const status = alive ? "Online" : "Offline";
  let powerState = device.power_state || device.powerState || "Off";

  if (alive) {
    const queriedState = await queryDevicePowerState(device);
    if (queriedState) {
      powerState = queriedState;
    }
  } else {
    powerState = "Off";
  }

  if (status !== device.status || powerState !== device.power_state) {
    await runAsync(
      "UPDATE devices SET status = ?, power_state = ?, last_active_at = ? WHERE id = ?",
      [
        status,
        powerState,
        alive ? new Date().toISOString() : device.last_active_at || new Date().toISOString(),
        device.id,
      ]
    );
  } else if (alive && !device.last_active_at) {
    await runAsync(
      "UPDATE devices SET last_active_at = ? WHERE id = ?",
      [new Date().toISOString(), device.id]
    );
  }

  return { ...device, status, power_state: powerState, powerState };
}

const scheduledTasks = new Map();

const registerScheduleTask = (schedule) => {
  if (!cron.validate(schedule.cron)) {
    console.warn(`Invalid cron expression for schedule ${schedule.id}: ${schedule.cron}`);
    return;
  }

  const existingTask = scheduledTasks.get(schedule.id);
  if (existingTask) {
    existingTask.stop();
  }

  const task = cron.schedule(schedule.cron, async () => {
    console.log(`🔔 Running schedule ${schedule.id} for device ${schedule.device_id}: ${schedule.action}`);
    try {
      await executeScheduleAction(schedule.id);
    } catch (error) {
      console.error(`Schedule ${schedule.id} failed:`, error);
    }
  });

  scheduledTasks.set(schedule.id, task);
};

const removeScheduleTask = (scheduleId) => {
  const task = scheduledTasks.get(scheduleId);
  if (task) {
    task.stop();
    scheduledTasks.delete(scheduleId);
  }
};

const reloadScheduleTask = async (scheduleId) => {
  try {
    const schedule = await getAsync(
      `SELECT * FROM device_schedules WHERE id = ? AND enabled = 1`,
      [scheduleId]
    );

    removeScheduleTask(scheduleId);

    if (schedule) {
      registerScheduleTask(schedule);
    }
  } catch (error) {
    console.error(`Failed to reload schedule ${scheduleId}:`, error);
  }
};

const loadScheduleTasks = async () => {
  const schedules = await allAsync(`SELECT * FROM device_schedules WHERE enabled = 1`);
  schedules.forEach(registerScheduleTask);
};

const writeAuditLog = async ({
  entityType = null,
  entityId = null,
  deviceId = null,
  groupId = null,
  scheduleId = null,
  action,
  status,
  source = null,
  details = null,
}) => {
  try {
    await runAsync(
      `INSERT INTO audit_logs (entity_type, entity_id, device_id, group_id, schedule_id, action, status, source, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entityType,
        entityId,
        deviceId,
        groupId,
        scheduleId,
        action,
        status,
        source,
        details ? JSON.stringify(details) : null,
      ]
    );
  } catch (error) {
    console.warn("Failed to write audit log:", error.message);
  }
};

const resolveRollbackStep = (action, params = {}) => {
  switch (action) {
    case "poweron":
      return { action: "poweroff", action_params: {} };
    case "poweroff":
      return { action: "poweron", action_params: {} };
    case "mute":
      return { action: "unmute", action_params: {} };
    case "unmute":
      return { action: "mute", action_params: {} };
    case "volumeUp":
      return { action: "volumeDown", action_params: {} };
    case "volumeDown":
      return { action: "volumeUp", action_params: {} };
    case "setVolume":
      if (typeof params.rollbackVolume === "number") {
        return { action: "setVolume", action_params: { volume: params.rollbackVolume } };
      }
      return null;
    default:
      return null;
  }
};

const executeDeviceAction = async (device, action, params = {}) => {
  const brand = getNormalizedBrand(device);

  switch (action) {
    case "poweron": {
      const ok = await powerOnDevice(device);
      if (!ok) {
        throw new Error("Power on did not confirm");
      }
      await runAsync(`UPDATE devices SET power_state = 'On' WHERE id = ?`, [device.id]);
      try { await broadcastDeviceState(device.id); } catch (e) {}
      return { success: true };
    }
    case "poweroff": {
      const result = await powerOffDevice(device);
      if (!result.success) {
        throw new Error(result.reason || "Power off failed");
      }
      await runAsync(`UPDATE devices SET power_state = 'Off' WHERE id = ?`, [device.id]);
      try { await broadcastDeviceState(device.id); } catch (e) {}
      return { success: true, method: result.method };
    }
    case "restart": {
      const ok = await wakeDevice(device.mac);
      if (!ok) {
        throw new Error("Restart wake signal failed");
      }
      await runAsync(`UPDATE devices SET status = 'Online', power_state = 'On' WHERE id = ?`, [device.id]);
      try { await broadcastDeviceState(device.id); } catch (e) {}
      return { success: true };
    }
    case "launchApp": {
      const target = params.target || params.appId || params.uri;
      if (!target) {
        throw new Error("launchApp requires target");
      }
      const ok = await launchWebosApp(device.ip, target);
      if (!ok) {
        throw new Error("launchApp failed");
      }
      return { success: true };
    }
    case "mute": {
      const ok = brand === "samsung" ? await setSamsungMute(device.ip, true) : await setWebosMute(device.ip, true);
      if (!ok) {
        throw new Error("Mute failed");
      }
      return { success: true };
    }
    case "unmute": {
      const ok = brand === "samsung" ? await setSamsungMute(device.ip, false) : await setWebosMute(device.ip, false);
      if (!ok) {
        throw new Error("Unmute failed");
      }
      return { success: true };
    }
    case "volumeUp": {
      const ok = brand === "samsung" ? await adjustSamsungVolume(device.ip, "Up") : await adjustWebosVolume(device.ip, "Up");
      if (!ok) {
        throw new Error("Volume up failed");
      }
      return { success: true };
    }
    case "volumeDown": {
      const ok = brand === "samsung" ? await adjustSamsungVolume(device.ip, "Down") : await adjustWebosVolume(device.ip, "Down");
      if (!ok) {
        throw new Error("Volume down failed");
      }
      return { success: true };
    }
    case "setVolume": {
      if (brand === "samsung") {
        throw new Error("Samsung uređaji trenutno ne podržavaju precizno setVolume.");
      }
      if (typeof params.volume !== "number") {
        throw new Error("setVolume requires numeric volume");
      }
      const ok = await setWebosVolume(device.ip, params.volume);
      if (!ok) {
        throw new Error("setVolume failed");
      }
      return { success: true };
    }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
};

const executeWithRetryAndRollback = async ({
  device,
  action,
  params = {},
  retryCount = 1,
  retryDelayMs = 1000,
  rollbackOnFail = false,
  source = "api",
  scheduleId = null,
  groupId = null,
  entityType = "device",
  entityId = null,
}) => {
  const attempts = Math.max(1, Number(retryCount || 0) + 1);
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await executeDeviceAction(device, action, params);
      await writeAuditLog({
        entityType,
        entityId: entityId ?? device.id,
        deviceId: device.id,
        groupId,
        scheduleId,
        action,
        status: "success",
        source,
        details: { attempt, attempts, params },
      });
      return { success: true, attempts: attempt };
    } catch (error) {
      lastError = error;
      await writeAuditLog({
        entityType,
        entityId: entityId ?? device.id,
        deviceId: device.id,
        groupId,
        scheduleId,
        action,
        status: "failed-attempt",
        source,
        details: { attempt, attempts, error: error.message, params },
      });
      if (attempt < attempts) {
        await sleep(Number(retryDelayMs) || 1000);
      }
    }
  }

  if (rollbackOnFail) {
    const rollbackStep = resolveRollbackStep(action, params);
    if (rollbackStep) {
      try {
        await executeDeviceAction(device, rollbackStep.action, rollbackStep.action_params || {});
        await writeAuditLog({
          entityType,
          entityId: entityId ?? device.id,
          deviceId: device.id,
          groupId,
          scheduleId,
          action: `${action}:rollback`,
          status: "success",
          source,
          details: { rollbackAction: rollbackStep.action },
        });
      } catch (rollbackError) {
        await writeAuditLog({
          entityType,
          entityId: entityId ?? device.id,
          deviceId: device.id,
          groupId,
          scheduleId,
          action: `${action}:rollback`,
          status: "failed",
          source,
          details: { rollbackAction: rollbackStep.action, error: rollbackError.message },
        });
      }
    }
  }

  throw lastError || new Error(`Action failed after ${attempts} attempts.`);
};

const executeScheduleAction = async (scheduleId) => {
  const schedule = await getAsync(
    `SELECT * FROM device_schedules WHERE id = ?`,
    [scheduleId]
  );

  if (!schedule || schedule.enabled !== 1) {
    return;
  }

  const device = await getAsync(`SELECT * FROM devices WHERE id = ?`, [schedule.device_id]);
  if (!device) {
    console.warn(`Schedule ${scheduleId} references missing device ${schedule.device_id}`);
    return;
  }

  const actionParams = safeJsonParse(schedule.action_params, {});
  // If the schedule contains a sequence of actions, run them in order
  // record run start
  let runRowId = null;
  try {
    const r = await runAsync(`INSERT INTO schedule_runs (schedule_id, status, details) VALUES (?, ?, ?)`, [scheduleId, 'running', null]);
    runRowId = r.lastID;
  } catch (e) {
    // ignore logging errors
  }

  const defaultRetryCount = Number(actionParams.retryCount ?? 1);
  const defaultRetryDelayMs = Number(actionParams.retryDelayMs ?? 1000);
  const defaultRollbackOnFail = Boolean(actionParams.rollbackOnFail);

  if (Array.isArray(actionParams.sequence) && actionParams.sequence.length > 0) {
    const stepResults = [];
    for (const step of actionParams.sequence) {
      const act = step.action;
      const params = step.params || {};
      try {
        const retryCount = Number(step.retryCount ?? defaultRetryCount);
        const retryDelayMs = Number(step.retryDelayMs ?? defaultRetryDelayMs);
        const rollbackOnFail = Boolean(step.rollbackOnFail ?? defaultRollbackOnFail);

        const result = await executeWithRetryAndRollback({
          device,
          action: act,
          params,
          retryCount,
          retryDelayMs,
          rollbackOnFail,
          source: "schedule",
          scheduleId,
          entityType: "schedule",
          entityId: scheduleId,
        });
        stepResults.push({ action: act, status: "success", attempts: result.attempts });

        // optional delay after this step (ms)
        if (step.delayMs && Number(step.delayMs) > 0) {
          await sleep(Number(step.delayMs));
        }
      } catch (err) {
        console.error(`Error executing step ${act} for schedule ${scheduleId}:`, err);
        stepResults.push({ action: act, status: "failed", error: String(err) });
        if (!step.continueOnError) {
          try {
            if (runRowId) {
              await runAsync(
                `UPDATE schedule_runs SET status = ?, details = ? WHERE id = ?`,
                ["failed", JSON.stringify({ failedStep: act, results: stepResults }), runRowId]
              );
            }
          } catch (e) {}
          return;
        }
      }
    }

    // all sequence steps finished
    try {
      if (runRowId) {
        await runAsync(
          `UPDATE schedule_runs SET status = ?, details = ? WHERE id = ?`,
          ["success", JSON.stringify({ sequence: actionParams.sequence, results: stepResults }), runRowId]
        );
      }
    } catch (e) {}
    return;
  }

  // Fallback: single-action schedules (backwards compatible)
  try {
    await executeWithRetryAndRollback({
      device,
      action: schedule.action,
      params: actionParams,
      retryCount: defaultRetryCount,
      retryDelayMs: defaultRetryDelayMs,
      rollbackOnFail: defaultRollbackOnFail,
      source: "schedule",
      scheduleId,
      entityType: "schedule",
      entityId: scheduleId,
    });
  } catch (error) {
    if (runRowId) {
      try {
        await runAsync(
          `UPDATE schedule_runs SET status = ?, details = ? WHERE id = ?`,
          ["failed", JSON.stringify({ action: schedule.action, error: error.message }), runRowId]
        );
      } catch (e) {}
    }
    throw error;
  }

  // update single-action run status
  try {
    if (runRowId) await runAsync(`UPDATE schedule_runs SET status = ?, details = ? WHERE id = ?`, ['success', JSON.stringify({ action: schedule.action, params: actionParams }), runRowId]);
  } catch (e) {}
};

app.use(cors());
app.use(express.json());

// Request logger for debugging
app.use((req, res, next) => {
  try {
    console.log(`REQ --> ${req.method} ${req.originalUrl}`);
  } catch (e) {}
  next();
});

// Debug route: list registered routes
app.get('/__routes', (req, res) => {
  try {
    const routes = [];
    app._router.stack.forEach((r) => {
      if (r.route && r.route.path) {
        const methods = Object.keys(r.route.methods).join(',').toUpperCase();
        routes.push({ path: r.route.path, methods });
      }
    });
    res.json(routes);
  } catch (e) {
    res.status(500).json({ error: 'failed to list routes' });
  }
});

app.get("/devices", async (req, res) => {
  try {
    const devices = await allAsync(
      `SELECT d.*, d.brand, d.power_state AS powerState, g.name AS groupName FROM devices d
       LEFT JOIN groups g ON d.group_id = g.id
       ORDER BY d.name COLLATE NOCASE`
    );

    const refreshed = await Promise.all(
      devices.map((device) => refreshStatus(device))
    );

    res.json(refreshed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Device discovery endpoint using SSDP
app.get("/devices/discover", async (req, res) => {
  const traceId = `disc-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const startedAt = Date.now();

  try {
    console.log(
      `[Server][${traceId}] Discovery request started. ip=${req.ip || "unknown"}, ua=${req.get("user-agent") || "unknown"}, clickId=${req.query.clickId || "n/a"}, clientAttempt=${req.query.clientAttempt || "n/a"}`
    );
    res.setHeader("Content-Type", "application/json");
    res.setHeader("X-Discovery-Trace-Id", traceId);

    // First SSDP call can occasionally fail on some networks, so retry once.
    let discoveredDevices = [];
    try {
      discoveredDevices = await discoverLGTVs(5000, { traceId: `${traceId}-run1` });
    } catch (firstDiscoveryError) {
      console.warn(
        `[Server][${traceId}] First discovery attempt failed, retrying once:`,
        firstDiscoveryError?.message || firstDiscoveryError
      );
      discoveredDevices = await discoverLGTVs(5000, { traceId: `${traceId}-run2` });
    }

    // Get list of already added devices to mark duplicates
    const existingIPs = new Set();
    const existingDevices = await allAsync(`SELECT ip FROM devices`);
    existingDevices.forEach((d) => {
      existingIPs.add(d.ip);
    });

    // Mark which devices are already added
    const devicesWithStatus = discoveredDevices.map((device) => ({
      ...device,
      already_added: existingIPs.has(device.ip),
    }));

    const elapsedMs = Date.now() - startedAt;
    console.log(
      `[Server][${traceId}] Discovery complete in ${elapsedMs}ms. Found ${discoveredDevices.length} TV devices`
    );

    res.json({
      success: true,
      traceId,
      count: devicesWithStatus.length,
      devices: devicesWithStatus,
    });
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    console.error(`[Server][${traceId}] Discovery error after ${elapsedMs}ms:`, error);
    res.status(500).json({
      success: false,
      traceId,
      error: error.message,
      devices: [],
    });
  }
});

app.post("/devices", async (req, res) => {
  try {
    const { name, ip, mac, brand, groupId } = req.body;

    if (!name || !ip || !mac) {
      return res.status(400).json({ error: "Missing device fields." });
    }

    const result = await runAsync(
      `INSERT INTO devices (name, ip, mac, brand, status, power_state, group_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, ip, mac, brand || "generic", "Offline", "Off", groupId || null]
    );

    const device = await getAsync(
      `SELECT d.*, d.power_state AS powerState, g.name AS groupName FROM devices d
       LEFT JOIN groups g ON d.group_id = g.id WHERE d.id = ?`,
      [result.lastID]
    );

    res.json(device);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/devices/:id", async (req, res) => {
  try {
    const { name, ip, mac, brand, groupId } = req.body;

    await runAsync(
      `UPDATE devices SET name = ?, ip = ?, mac = ?, brand = ?, group_id = ? WHERE id = ?`,
      [name, ip, mac, brand || "generic", groupId || null, req.params.id]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/devices/:id", async (req, res) => {
  try {
    await runAsync(`DELETE FROM devices WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/devices/:id/ping", async (req, res) => {
  try {
    const device = await getAsync(`SELECT * FROM devices WHERE id = ?`, [
      req.params.id,
    ]);

    if (!device) {
      return res.status(404).json({ error: "Device not found." });
    }

    const alive = await pingDevice(device.ip);
    const status = alive ? "Online" : "Offline";
    let powerState = device.power_state || device.powerState || "Off";

    if (alive) {
      const queriedState = await queryDevicePowerState(device);
      if (queriedState) {
        powerState = queriedState;
      }
    } else {
      powerState = "Off";
    }

    await runAsync(`UPDATE devices SET status = ?, power_state = ? WHERE id = ?`, [
      status,
      powerState,
      device.id,
    ]);

    res.json({ id: device.id, status, powerState });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.post("/devices/:id/poweroff", async (req, res) => {
  try {
    const device = await getAsync(
      "SELECT * FROM devices WHERE id = ?",
      [req.params.id]
    );

    if (!device) {
      return res.status(404).json({
        error: "Device not found",
      });
    }

    const result = await powerOffDevice(device);
    const newState = result.success ? "Off" : (device.power_state || device.powerState || "Unknown");

    await runAsync(`UPDATE devices SET power_state = ? WHERE id = ?`, [newState, device.id]);
    try { await broadcastDeviceState(device.id); } catch (e) {}

    console.log(`Power off requested for ${device.name} (${device.ip}) brand=${device.brand} result=${JSON.stringify(result)}`);

    await writeAuditLog({
      entityType: "device",
      entityId: device.id,
      deviceId: device.id,
      action: "poweroff",
      status: result.success ? "success" : "failed",
      source: "manual-poweroff",
      details: { reason: result.reason, method: result.method },
    });

    res.json({
      success: result.success,
      message: result.success ? "Power off completed" : `Power off failed: ${result.reason}`,
      reason: result.reason,
      method: result.method,
      device: device.name,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      reason: "Server error during power off"
    });
  }
});

app.get("/devices/:id/schedules", async (req, res) => {
  console.log(`[SCHEDULE GET] Device ID: ${req.params.id}`);
  try {
    const schedules = await allAsync(
      `SELECT * FROM device_schedules WHERE device_id = ? ORDER BY enabled DESC, id DESC`,
      [req.params.id]
    );

    res.json(
      schedules.map((schedule) => ({
        ...schedule,
        enabled: schedule.enabled === 1,
        action_params: schedule.action_params ? JSON.parse(schedule.action_params) : {},
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/devices/:id/schedules", async (req, res) => {
  console.log(`[SCHEDULE POST] Device ID: ${req.params.id}, Body:`, req.body);
  try {
    const { cron: cronExpression, action, action_params, actions, description, enabled } = req.body;

    if (!cron.validate(cronExpression)) {
      return res.status(400).json({ error: "Invalid cron expression." });
    }

    // allow either single `action` or an `actions` array for sequences
    let dbAction = action || null;
    let dbActionParams = action_params || null;

    if (Array.isArray(actions) && actions.length > 0) {
      dbAction = "sequence";
      dbActionParams = { sequence: actions };
    }

    if (!dbAction) {
      return res.status(400).json({ error: "Action or actions sequence is required." });
    }

    const result = await runAsync(
      `INSERT INTO device_schedules (device_id, cron, action, action_params, description, enabled) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.params.id,
        cronExpression,
        dbAction,
        dbActionParams ? JSON.stringify(dbActionParams) : null,
        description || null,
        enabled ? 1 : 0,
      ]
    );

    const schedule = await getAsync(`SELECT * FROM device_schedules WHERE id = ?`, [result.lastID]);
    if (schedule && schedule.enabled === 1) {
      registerScheduleTask(schedule);
    }

    res.json({
      ...schedule,
      enabled: schedule.enabled === 1,
      action_params: schedule.action_params ? JSON.parse(schedule.action_params) : {},
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/devices/:id/schedules/:scheduleId", async (req, res) => {
  try {
    const { cron: cronExpression, action, action_params, actions, description, enabled } = req.body;

    if (!cron.validate(cronExpression)) {
      return res.status(400).json({ error: "Invalid cron expression." });
    }

    let dbAction = action || null;
    let dbActionParams = action_params || null;
    if (Array.isArray(actions) && actions.length > 0) {
      dbAction = "sequence";
      dbActionParams = { sequence: actions };
    }

    if (!dbAction) {
      return res.status(400).json({ error: "Action or actions sequence is required." });
    }

    await runAsync(
      `UPDATE device_schedules SET cron = ?, action = ?, action_params = ?, description = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND device_id = ?`,
      [
        cronExpression,
        dbAction,
        dbActionParams ? JSON.stringify(dbActionParams) : null,
        description || null,
        enabled ? 1 : 0,
        req.params.scheduleId,
        req.params.id,
      ]
    );

    const schedule = await getAsync(
      `SELECT * FROM device_schedules WHERE id = ?`,
      [req.params.scheduleId]
    );

    if (schedule) {
      removeScheduleTask(schedule.id);
      if (schedule.enabled === 1) {
        registerScheduleTask(schedule);
      }
    }

    res.json({
      ...schedule,
      enabled: schedule.enabled === 1,
      action_params: schedule.action_params ? JSON.parse(schedule.action_params) : {},
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/devices/:id/schedules/:scheduleId", async (req, res) => {
  try {
    await runAsync(`DELETE FROM device_schedules WHERE id = ? AND device_id = ?`, [
      req.params.scheduleId,
      req.params.id,
    ]);

    removeScheduleTask(Number(req.params.scheduleId));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual trigger for a schedule (useful for testing)
app.post('/devices/:id/schedules/:scheduleId/trigger', async (req, res) => {
  try {
    const schedule = await getAsync(`SELECT * FROM device_schedules WHERE id = ? AND device_id = ?`, [req.params.scheduleId, req.params.id]);
    if (!schedule) return res.status(404).json({ error: 'Schedule not found for device' });

    console.log(`Manual trigger requested for schedule ${req.params.scheduleId} on device ${req.params.id}`);
    // run asynchronously but respond immediately
    executeScheduleAction(Number(req.params.scheduleId)).catch((e) => console.error('Error executing manual trigger:', e));

    res.json({ triggered: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/devices/:id/schedules/:scheduleId/logs', async (req, res) => {
  try {
    const rows = await allAsync(`SELECT * FROM schedule_runs WHERE schedule_id = ? ORDER BY id DESC LIMIT 50`, [req.params.scheduleId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/devices/:id/poweron", async (req, res) => {
  try {
    const device = await getAsync(
      "SELECT * FROM devices WHERE id = ?",
      [req.params.id]
    );

    if (!device) {
      return res.status(404).json({
        error: "Device not found",
      });
    }

    const success = await powerOnDevice(device);
    const newState = success ? "On" : device.power_state || device.powerState || "Off";

    if (success) {
      await runAsync(`UPDATE devices SET power_state = 'On' WHERE id = ?`, [device.id]);
      try { await broadcastDeviceState(device.id); } catch (e) {}
    }

    console.log(`Power on requested for ${device.name} (${device.ip}) brand=${device.brand}`);

    await writeAuditLog({
      entityType: "device",
      entityId: device.id,
      deviceId: device.id,
      action: "poweron",
      status: success ? "success" : "failed",
      source: "manual-poweron",
      details: { confirmed: success },
    });

    res.json({
      success,
      message: success ? "Power on completed" : "Power on request sent but did not confirm.",
      device: device.name,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

app.post("/devices/:id/action", async (req, res) => {
  try {
    const { action, action_params, retryCount, retryDelayMs, rollbackOnFail } = req.body;
    const device = await getAsync("SELECT * FROM devices WHERE id = ?", [req.params.id]);
    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }
    if (!action || typeof action !== "string") {
      return res.status(400).json({ error: "Action is required." });
    }

    const params = action_params || {};
    const result = await executeWithRetryAndRollback({
      device,
      action,
      params,
      retryCount: Number(retryCount ?? 1),
      retryDelayMs: Number(retryDelayMs ?? 1000),
      rollbackOnFail: Boolean(rollbackOnFail),
      source: "manual-action",
      entityType: "device",
      entityId: device.id,
    });

    res.json({ success: true, action, device: device.name, attempts: result.attempts });
  } catch (error) {
    console.error("Device action failed:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/devices/:id/restart", async (req, res) => {
  try {
    const device = await getAsync(
      "SELECT * FROM devices WHERE id = ?",
      [req.params.id]
    );

    if (!device) {
      return res.status(404).json({
        error: "Device not found",
      });
    }

    const brand = (device.brand || "").trim().toLowerCase();
    console.log(`Restart requested for ${device.name} (${device.ip}) brand=${brand}`);

    await writeAuditLog({
      entityType: "device",
      entityId: device.id,
      deviceId: device.id,
      action: "restart",
      status: "running",
      source: "manual-restart",
      details: { brand },
    });

    if (brand === "webos" || brand === "lg") {
      // For webOS: power off via webOS, then WoL after 8s (non-blocking)
      res.json({ id: device.id, name: device.name, restarted: true, method: "webos" });
      sendWebosRestart(device.ip, device.mac).then(async () => {
        await runAsync(`UPDATE devices SET power_state = 'On' WHERE id = ?`, [device.id]);
        try { await broadcastDeviceState(device.id); } catch (e) {}
        await writeAuditLog({
          entityType: "device",
          entityId: device.id,
          deviceId: device.id,
          action: "restart",
          status: "success",
          source: "manual-restart",
          details: { method: "webos" },
        });
      }).catch(async (e) => {
        await writeAuditLog({
          entityType: "device",
          entityId: device.id,
          deviceId: device.id,
          action: "restart",
          status: "failed",
          source: "manual-restart",
          details: { method: "webos", error: String(e) },
        });
        console.error("Restart error:", e);
      });
    } else {
      const restarted = await wakeDevice(device.mac);
      if (restarted) {
        await runAsync(`UPDATE devices SET status = 'Online', power_state = 'On' WHERE id = ?`, [device.id]);
        try { await broadcastDeviceState(device.id); } catch (e) {}
      }
      await writeAuditLog({
        entityType: "device",
        entityId: device.id,
        deviceId: device.id,
        action: "restart",
        status: restarted ? "success" : "failed",
        source: "manual-restart",
        details: { method: "wol" },
      });
      res.json({ id: device.id, name: device.name, restarted });
    }
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

app.post("/devices/restart", async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No device IDs provided." });
    }

    const placeholders = ids.map(() => "?").join(",");
    const devices = await allAsync(
      `SELECT * FROM devices WHERE id IN (${placeholders})`,
      ids
    );

    // Respond immediately, restart runs in background
    res.json({ results: devices.map((d) => ({ id: d.id, name: d.name, restarted: true })) });

    // Run restarts in background
    for (const device of devices) {
      const brand = (device.brand || "").trim().toLowerCase();
      if (brand === "webos" || brand === "lg") {
        sendWebosRestart(device.ip, device.mac).then(async () => {
          await runAsync(`UPDATE devices SET power_state = 'On' WHERE id = ?`, [device.id]);
          try { await broadcastDeviceState(device.id); } catch (e) {}
        }).catch((e) => console.error(`Restart error for ${device.name}:`, e));
      } else {
        wakeDevice(device.mac).then(async (ok) => {
          if (ok) await runAsync(`UPDATE devices SET power_state = 'On' WHERE id = ?`, [device.id]);
        });
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/devices/settings", async (req, res) => {
  try {
    const { ids, settings } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No device IDs provided." });
    }

    res.json({ success: true, updated: ids.length, settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/devices/poweron-all", async (req, res) => {
  try {
    const results = await powerOnAll();
    await Promise.all(
      results
        .filter((item) => item.poweredOn)
        .map((item) =>
          runAsync(`UPDATE devices SET power_state = 'On' WHERE id = ?`, [item.id])
        )
    );
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/devices/poweroff-all", async (req, res) => {
  try {
    const devices = await allAsync(`SELECT * FROM devices`);

    const results = await Promise.all(
      devices.map(async (device) => {
        const result = await powerOffDevice(device);
        const newState = result.success ? "Off" : device.power_state || device.powerState || "Off";

        await runAsync(`UPDATE devices SET power_state = ? WHERE id = ?`, [newState, device.id]);

        return {
          id: device.id,
          name: device.name,
          brand: device.brand || "generic",
          success: result.success,
          reason: result.reason,
          method: result.method,
        };
      })
    );

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/groups", async (req, res) => {
  try {
    const groups = await allAsync(
      `SELECT g.id, g.name, COUNT(d.id) AS deviceCount
       FROM groups g
       LEFT JOIN devices d ON d.group_id = g.id
       GROUP BY g.id
       ORDER BY g.name COLLATE NOCASE`
    );

    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/groups", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Group name is required." });
    }

    const result = await runAsync(`INSERT INTO groups (name) VALUES (?)`, [name]);
    const group = await getAsync(
      `SELECT id, name, 0 AS deviceCount FROM groups WHERE id = ?`,
      [result.lastID]
    );

    res.json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/groups/:id", async (req, res) => {
  try {
    const { name } = req.body;

    await runAsync(`UPDATE groups SET name = ? WHERE id = ?`, [
      name,
      req.params.id,
    ]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/groups/:id/devices", async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const { deviceIds } = req.body;

    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json({ error: "No device IDs provided." });
    }

    const placeholders = deviceIds.map(() => "?").join(",");
    await runAsync(
      `UPDATE devices SET group_id = ? WHERE id IN (${placeholders})`,
      [groupId, ...deviceIds]
    );

    res.json({ success: true, assigned: deviceIds.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/groups/:id/restart", async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const devices = await allAsync(`SELECT * FROM devices WHERE group_id = ?`, [
      groupId,
    ]);

    await writeAuditLog({
      entityType: "group",
      entityId: groupId,
      groupId,
      action: "group:restart",
      status: "running",
      source: "manual-group-restart",
      details: { deviceCount: devices.length },
    });

    // Respond immediately
    res.json({ results: devices.map((d) => ({ id: d.id, name: d.name, restarted: true })) });

    // Run restarts in background
    for (const device of devices) {
      const brand = (device.brand || "").trim().toLowerCase();
      if (brand === "webos" || brand === "lg") {
        sendWebosRestart(device.ip, device.mac).then(async () => {
          await runAsync(`UPDATE devices SET power_state = 'On' WHERE id = ?`, [device.id]);
          try { await broadcastDeviceState(device.id); } catch (e) {}
        }).catch((e) => console.error(`Group restart error for ${device.name}:`, e));
      } else {
        wakeDevice(device.mac).then(async (ok) => {
          if (ok) await runAsync(`UPDATE devices SET power_state = 'On' WHERE id = ?`, [device.id]);
        });
      }
    }

    await writeAuditLog({
      entityType: "group",
      entityId: groupId,
      groupId,
      action: "group:restart",
      status: "success",
      source: "manual-group-restart",
      details: { deviceCount: devices.length },
    });
  } catch (error) {
    const groupId = Number(req.params.id);
    await writeAuditLog({
      entityType: "group",
      entityId: groupId,
      groupId,
      action: "group:restart",
      status: "failed",
      source: "manual-group-restart",
      details: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

app.post("/groups/:id/poweroff", async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const devices = await allAsync(`SELECT * FROM devices WHERE group_id = ?`, [
      groupId,
    ]);

    const results = await Promise.all(
      devices.map(async (device) => {
        const result = await powerOffDevice(device);
        const newState = result.success ? "Off" : device.power_state || device.powerState || "Off";
        await runAsync(
          `UPDATE devices SET power_state = ?, status = 'Offline' WHERE id = ?`,
          [newState, device.id]
        );
        return {
          id: device.id,
          name: device.name,
          success: result.success,
          reason: result.reason,
          method: result.method,
        };
      })
    );

    await writeAuditLog({
      entityType: "group",
      entityId: groupId,
      groupId,
      action: "group:poweroff",
      status: results.every((r) => r.success) ? "success" : "partial",
      source: "manual-group-poweroff",
      details: {
        deviceCount: devices.length,
        successCount: results.filter((r) => r.success).length,
      },
    });

    res.json({ results });
  } catch (error) {
    const groupId = Number(req.params.id);
    await writeAuditLog({
      entityType: "group",
      entityId: groupId,
      groupId,
      action: "group:poweroff",
      status: "failed",
      source: "manual-group-poweroff",
      details: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

app.post("/groups/:id/poweron", async (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const devices = await allAsync(`SELECT * FROM devices WHERE group_id = ?`, [
      groupId,
    ]);

    const results = await Promise.all(
      devices.map(async (device) => {
        const poweredOn = await wakeDevice(device.mac);
        if (poweredOn) {
          await runAsync(`UPDATE devices SET power_state = 'On' WHERE id = ?`, [device.id]);
        }
        return {
          id: device.id,
          name: device.name,
          poweredOn,
        };
      })
    );

    await writeAuditLog({
      entityType: "group",
      entityId: groupId,
      groupId,
      action: "group:poweron",
      status: results.every((r) => r.poweredOn) ? "success" : "partial",
      source: "manual-group-poweron",
      details: {
        deviceCount: devices.length,
        successCount: results.filter((r) => r.poweredOn).length,
      },
    });

    res.json({ results });
  } catch (error) {
    const groupId = Number(req.params.id);
    await writeAuditLog({
      entityType: "group",
      entityId: groupId,
      groupId,
      action: "group:poweron",
      status: "failed",
      source: "manual-group-poweron",
      details: { error: error.message },
    });
    res.status(500).json({ error: error.message });
  }
});

app.get("/audit-logs", async (req, res) => {
  try {
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 100)));
    const params = [];
    const filters = [];

    if (req.query.entityType) {
      filters.push("entity_type = ?");
      params.push(String(req.query.entityType));
    }
    if (req.query.entityId) {
      filters.push("entity_id = ?");
      params.push(Number(req.query.entityId));
    }
    if (req.query.deviceId) {
      filters.push("device_id = ?");
      params.push(Number(req.query.deviceId));
    }
    if (req.query.groupId) {
      filters.push("group_id = ?");
      params.push(Number(req.query.groupId));
    }
    if (req.query.scheduleId) {
      filters.push("schedule_id = ?");
      params.push(Number(req.query.scheduleId));
    }
    if (req.query.status) {
      filters.push("status = ?");
      params.push(String(req.query.status));
    }

    const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const rows = await allAsync(
      `SELECT * FROM audit_logs ${whereSql} ORDER BY id DESC LIMIT ?`,
      [...params, limit]
    );

    res.json(rows.map((row) => ({ ...row, details: safeJsonParse(row.details, null) })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/health/summary", async (req, res) => {
  try {
    const totals = await getAsync(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'Online' THEN 1 ELSE 0 END) AS online,
        SUM(CASE WHEN status = 'Offline' THEN 1 ELSE 0 END) AS offline,
        SUM(CASE WHEN power_state = 'On' THEN 1 ELSE 0 END) AS powerOn,
        SUM(CASE WHEN power_state = 'Off' THEN 1 ELSE 0 END) AS powerOff
      FROM devices`
    );

    const scheduleStats24h = await getAsync(
      `SELECT
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success,
        SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) AS failed,
        COUNT(*) AS total
      FROM schedule_runs
      WHERE datetime(created_at) >= datetime('now', '-1 day')`
    );

    const recentFailures = await allAsync(
      `SELECT * FROM audit_logs
       WHERE status LIKE 'failed%'
       ORDER BY id DESC
       LIMIT 20`
    );

    const lastActions = await allAsync(
      `SELECT d.id AS deviceId, d.name AS deviceName, a.action, a.status, a.created_at
       FROM devices d
       LEFT JOIN audit_logs a ON a.id = (
         SELECT id FROM audit_logs x
         WHERE x.device_id = d.id
         ORDER BY x.id DESC LIMIT 1
       )
       ORDER BY d.name COLLATE NOCASE`
    );

    const success = Number(scheduleStats24h?.success || 0);
    const total = Number(scheduleStats24h?.total || 0);
    const successRate = total > 0 ? Number(((success / total) * 100).toFixed(2)) : null;

    res.json({
      timestamp: new Date().toISOString(),
      devices: {
        total: Number(totals?.total || 0),
        online: Number(totals?.online || 0),
        offline: Number(totals?.offline || 0),
        powerOn: Number(totals?.powerOn || 0),
        powerOff: Number(totals?.powerOff || 0),
      },
      schedules24h: {
        total,
        success,
        failed: Number(scheduleStats24h?.failed || 0),
        successRate,
      },
      lastActions,
      recentFailures: recentFailures.map((row) => ({ ...row, details: safeJsonParse(row.details, null) })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/scenes", async (req, res) => {
  try {
    const scenes = await allAsync(`SELECT * FROM scenes ORDER BY name COLLATE NOCASE`);
    res.json(
      scenes.map((scene) => ({
        ...scene,
        enabled: scene.enabled === 1,
        steps: safeJsonParse(scene.steps_json, []),
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/scenes", async (req, res) => {
  try {
    const { name, description, targetType, targetId, steps, enabled } = req.body;
    if (!name || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: "Scene requires name and non-empty steps array." });
    }

    const result = await runAsync(
      `INSERT INTO scenes (name, description, target_type, target_id, steps_json, enabled)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || null,
        targetType || "group",
        targetId ?? null,
        JSON.stringify(steps),
        enabled === false ? 0 : 1,
      ]
    );

    const scene = await getAsync(`SELECT * FROM scenes WHERE id = ?`, [result.lastID]);
    res.json({ ...scene, enabled: scene.enabled === 1, steps: safeJsonParse(scene.steps_json, []) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/scenes/:id", async (req, res) => {
  try {
    const { name, description, targetType, targetId, steps, enabled } = req.body;
    if (!name || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: "Scene requires name and non-empty steps array." });
    }

    await runAsync(
      `UPDATE scenes SET name = ?, description = ?, target_type = ?, target_id = ?, steps_json = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name,
        description || null,
        targetType || "group",
        targetId ?? null,
        JSON.stringify(steps),
        enabled === false ? 0 : 1,
        req.params.id,
      ]
    );

    const scene = await getAsync(`SELECT * FROM scenes WHERE id = ?`, [req.params.id]);
    if (!scene) {
      return res.status(404).json({ error: "Scene not found." });
    }
    res.json({ ...scene, enabled: scene.enabled === 1, steps: safeJsonParse(scene.steps_json, []) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/scenes/:id", async (req, res) => {
  try {
    await runAsync(`DELETE FROM scenes WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/scenes/:id/execute", async (req, res) => {
  try {
    const scene = await getAsync(`SELECT * FROM scenes WHERE id = ?`, [req.params.id]);
    if (!scene) {
      return res.status(404).json({ error: "Scene not found." });
    }
    if (scene.enabled !== 1) {
      return res.status(400).json({ error: "Scene is disabled." });
    }

    const steps = safeJsonParse(scene.steps_json, []);
    if (!Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({ error: "Scene has no steps." });
    }

    let devices = [];
    if (scene.target_type === "device") {
      const one = await getAsync(`SELECT * FROM devices WHERE id = ?`, [scene.target_id]);
      devices = one ? [one] : [];
    } else if (scene.target_type === "group") {
      devices = await allAsync(`SELECT * FROM devices WHERE group_id = ? ORDER BY name COLLATE NOCASE`, [scene.target_id]);
    } else {
      devices = await allAsync(`SELECT * FROM devices ORDER BY name COLLATE NOCASE`);
    }

    if (!devices.length) {
      return res.status(400).json({ error: "No devices resolved for scene target." });
    }

    const results = [];
    for (const device of devices) {
      const deviceSteps = [];
      let ok = true;
      for (const step of steps) {
        try {
          const action = step.action;
          const params = step.params || {};
          const result = await executeWithRetryAndRollback({
            device,
            action,
            params,
            retryCount: Number(step.retryCount ?? 1),
            retryDelayMs: Number(step.retryDelayMs ?? 1000),
            rollbackOnFail: Boolean(step.rollbackOnFail ?? false),
            source: "scene",
            groupId: scene.target_type === "group" ? scene.target_id : null,
            entityType: "scene",
            entityId: scene.id,
          });
          deviceSteps.push({ action, status: "success", attempts: result.attempts });
          if (step.delayMs && Number(step.delayMs) > 0) {
            await sleep(Number(step.delayMs));
          }
        } catch (stepError) {
          ok = false;
          deviceSteps.push({ action: step.action, status: "failed", error: stepError.message });
          if (!step.continueOnError) {
            break;
          }
        }
      }

      results.push({
        deviceId: device.id,
        deviceName: device.name,
        success: ok,
        steps: deviceSteps,
      });
    }

    await writeAuditLog({
      entityType: "scene",
      entityId: scene.id,
      action: "scene:execute",
      status: results.every((r) => r.success) ? "success" : "partial",
      source: "scene",
      groupId: scene.target_type === "group" ? scene.target_id : null,
      details: { devices: results.length },
    });

    res.json({
      sceneId: scene.id,
      name: scene.name,
      targetType: scene.target_type,
      targetId: scene.target_id,
      results,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

initDatabase()
  .then(async () => {
    await loadScheduleTasks();
    // debug: list registered routes
    try {
      const routes = [];
      app._router.stack.forEach((r) => {
        if (r.route && r.route.path) {
          const methods = Object.keys(r.route.methods).join(',').toUpperCase();
          routes.push(`${methods} ${r.route.path}`);
        }
      });
      console.log('Registered routes:\n' + routes.join('\n'));
    } catch (e) {
      // ignore
    }
    const server = app.listen(PORT, () => {
      console.log(`🚀 Backend radi na http://localhost:${PORT}`);
    });

    // Initialize WebSocket server for pushing device updates to clients
    wss = new WebSocket.Server({ server });
    wss.on('connection', async (socket) => {
      try {
        console.log('WebSocket client connected');
        const devices = await allAsync(`SELECT * FROM devices`);
        socket.send(JSON.stringify({ type: 'devices:init', devices }));
      } catch (e) {
        // ignore send errors
      }
    });
  })
  .catch((error) => {
    console.error("Database initialization failed:", error);
    process.exit(1);
  });