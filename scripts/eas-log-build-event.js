// EAS `eas-build-on-success` hook: after a successful EAS build, log a BUILD
// event to AdminPlatform for each URID referenced in the build's commit, so
// the founder Trace timeline records the build automatically.
//
// Setup (once): store the agent token as an EAS secret so it's available here:
//   eas secret:create --scope project --name ADMINPLATFORM_AGENT_TOKEN --value <token>
//
// Non-blocking: any problem just logs and exits 0 (never fails the build).

const { execSync } = require("child_process");

const API = process.env.ADMINPLATFORM_API || "https://adminplatform-production-4306.up.railway.app";
const TOKEN = process.env.ADMINPLATFORM_AGENT_TOKEN;

function sh(cmd) {
  try { return execSync(cmd, { encoding: "utf8" }).trim(); } catch { return ""; }
}

(async () => {
  if (!TOKEN) {
    console.log("[urid] ADMINPLATFORM_AGENT_TOKEN not set — skipping BUILD event.");
    return;
  }
  if (typeof fetch !== "function") {
    console.log("[urid] global fetch unavailable (old Node) — skipping BUILD event.");
    return;
  }

  const sha = process.env.EAS_BUILD_GIT_COMMIT_HASH || sh("git rev-parse HEAD");
  const msg = sh("git log -1 --pretty=%B") || "";
  const platform = process.env.EAS_BUILD_PLATFORM || "";
  const profile = process.env.EAS_BUILD_PROFILE || "";

  const urids = [...new Set(msg.match(/URID_[A-Z]{2,6}_[0-9]{4}_[0-9]{4}(\.[0-9]+)?/g) || [])];
  if (urids.length === 0) {
    console.log("[urid] No URID references in build commit — skipping.");
    return;
  }

  for (const u of urids) {
    const body = JSON.stringify({
      event_type: "BUILD",
      description: `EAS build succeeded (${platform}/${profile})`.trim(),
      metadata: { sha, platform, profile, source: "eas" },
    });
    try {
      const res = await fetch(`${API}/api/v1/urids/${u}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
        body,
      });
      console.log(`[urid] BUILD ${u} -> HTTP ${res.status}`);
    } catch (e) {
      console.log(`[urid] BUILD ${u} failed (non-blocking): ${e.message}`);
    }
  }
})();
