const { Client } = require("node-ssdp");
const { URL } = require("url");

/**
 * Discover LG WebOS TVs on the network using SSDP
 * Returns array of discovered devices with IP, MAC (if available), and UPnP info
 */
const discoverLGTVs = async (timeoutMs = 5000) => {
  return new Promise((resolve, reject) => {
    try {
      const discovered = new Map(); // Use Map to avoid duplicates by IP
      const client = new Client();
      let resolved = false;

      // Set a timeout to stop searching and return results
      const timer = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        try {
          client.stop();
        } catch (e) {
          console.log("[Discovery] Error stopping client:", e.message);
        }
        console.log(`[Discovery] Timeout reached. Found ${discovered.size} devices`);
        resolve(Array.from(discovered.values()));
      }, timeoutMs);

      client.on("response", (headers, statusCode, rinfo) => {
        try {
          // Check if this is a relevant device (webOS TV or similar)
          const location = headers.LOCATION;
          const serverHeader = headers.SERVER || "";
          const usn = headers.USN || "";

          // Filter for LG/webOS devices
          const isLG =
            (location && location.includes("lge")) ||
            (serverHeader && serverHeader.toLowerCase().includes("lg")) ||
            (usn && usn.includes("lge"));

          if (!location || !isLG) {
            return;
          }

          // Extract IP from LOCATION URL (e.g., http://192.168.1.100:1234/...)
          let ip = null;
          try {
            const url = new URL(location);
            ip = url.hostname;
          } catch {
            return;
          }

          // Avoid duplicates
          if (discovered.has(ip)) {
            return;
          }

          // Extract friendly name if available
          const deviceType = headers["DEVICE-TYPE"] || "Unknown TV";
          const st = headers.ST || "";

          console.log(`[Discovery] Found LG device at ${ip}: ${st}`);

          discovered.set(ip, {
            ip,
            name: `LG TV (${ip})`,
            brand: "lg",
            location,
            serverHeader,
            usn,
            deviceType,
            discovered_at: new Date().toISOString(),
            mac: null, // MAC can be attempted to be retrieved via ARP, but often not available in SSDP
          });
        } catch (error) {
          console.error("[Discovery] Error processing response:", error.message);
        }
      });

      client.on("error", (error) => {
        console.error("[Discovery] SSDP Client error:", error.message);
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        try {
          client.stop();
        } catch (e) {}
        resolve(Array.from(discovered.values()));
      });

      // Start searching for all devices
      try {
        console.log("[Discovery] Starting SSDP search for all devices...");
        client.search("ssdp:all");
      } catch (error) {
        console.error("[Discovery] Error starting SSDP search:", error.message);
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          reject(error);
        }
      }
    } catch (error) {
      console.error("[Discovery] Unexpected error:", error.message);
      reject(error);
    }
  });
};

module.exports = {
  discoverLGTVs,
};
