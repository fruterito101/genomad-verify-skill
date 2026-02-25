/**
 * 🔄 GENOMAD VERIFY — Auto-Update System
 * 
 * Verifica y actualiza el skill automáticamente vía heartbeat.
 * Silencioso por defecto, no interrumpe al usuario.
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════

const REPO_URL = "https://github.com/fruterito101/genomad-verify-skill";
const RAW_URL = "https://raw.githubusercontent.com/fruterito101/genomad-verify-skill/main";
const CHECK_INTERVAL_HOURS = 6; // Verificar cada 6 horas máximo
const SKILL_DIR = dirname(__dirname); // Parent of scripts/
const STATE_FILE = join(SKILL_DIR, ".update-state.json");

interface UpdateState {
  lastCheck: number;
  lastUpdate: number;
  currentVersion: string;
  updateCount: number;
}

// ═══════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════

function loadState(): UpdateState {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    }
  } catch {}
  return {
    lastCheck: 0,
    lastUpdate: 0,
    currentVersion: "0.0.0",
    updateCount: 0,
  };
}

function saveState(state: UpdateState): void {
  try {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch {}
}

// ═══════════════════════════════════════════════════════════════
// VERSIÓN
// ═══════════════════════════════════════════════════════════════

function getLocalVersion(): string {
  try {
    // Intentar desde skill.yaml
    const yamlPath = join(SKILL_DIR, "skill.yaml");
    if (existsSync(yamlPath)) {
      const content = readFileSync(yamlPath, "utf-8");
      const match = content.match(/version:\s*["']?(\d+\.\d+\.\d+)["']?/);
      if (match) return match[1];
    }
    
    // Intentar desde SKILL.md
    const skillPath = join(SKILL_DIR, "SKILL.md");
    if (existsSync(skillPath)) {
      const content = readFileSync(skillPath, "utf-8");
      const match = content.match(/version:\s*["']?(\d+\.\d+\.\d+)["']?/);
      if (match) return match[1];
    }
  } catch {}
  return "0.0.0";
}

async function getRemoteVersion(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${RAW_URL}/skill.yaml`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    
    if (!response.ok) return null;
    
    const content = await response.text();
    const match = content.match(/version:\s*["']?(\d+\.\d+\.\d+)["']?/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function compareVersions(local: string, remote: string): number {
  const localParts = local.split(".").map(Number);
  const remoteParts = remote.split(".").map(Number);
  
  for (let i = 0; i < 3; i++) {
    const l = localParts[i] || 0;
    const r = remoteParts[i] || 0;
    if (r > l) return 1;  // Remote is newer
    if (l > r) return -1; // Local is newer
  }
  return 0; // Same
}

// ═══════════════════════════════════════════════════════════════
// GIT OPERATIONS
// ═══════════════════════════════════════════════════════════════

function isGitRepo(): boolean {
  try {
    const gitDir = join(SKILL_DIR, ".git");
    return existsSync(gitDir);
  } catch {
    return false;
  }
}

function hasUncommittedChanges(): boolean {
  try {
    const result = execSync("git status --porcelain", {
      cwd: SKILL_DIR,
      encoding: "utf-8",
      timeout: 5000,
    });
    return result.trim().length > 0;
  } catch {
    return true; // Assume changes to be safe
  }
}

function pullUpdates(): { success: boolean; message: string } {
  try {
    // Fetch first
    execSync("git fetch origin main", {
      cwd: SKILL_DIR,
      encoding: "utf-8",
      timeout: 15000,
      stdio: "pipe",
    });
    
    // Pull
    const result = execSync("git pull origin main --ff-only", {
      cwd: SKILL_DIR,
      encoding: "utf-8",
      timeout: 15000,
      stdio: "pipe",
    });
    
    return { success: true, message: result.trim() };
  } catch (error: any) {
    return { success: false, message: error.message || "Git pull failed" };
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN CHECK
// ═══════════════════════════════════════════════════════════════

export async function checkForUpdates(options: { 
  force?: boolean; 
  silent?: boolean;
} = {}): Promise<{ 
  updated: boolean; 
  version?: string; 
  message?: string;
}> {
  const { force = false, silent = true } = options;
  const state = loadState();
  const now = Date.now();
  
  // Check if we should skip (rate limiting)
  const hoursSinceLastCheck = (now - state.lastCheck) / (1000 * 60 * 60);
  if (!force && hoursSinceLastCheck < CHECK_INTERVAL_HOURS) {
    if (!silent) console.log(`⏭️ Saltando check (último: hace ${hoursSinceLastCheck.toFixed(1)}h)`);
    return { updated: false, message: "Skipped (rate limit)" };
  }
  
  // Verify it's a git repo
  if (!isGitRepo()) {
    if (!silent) console.log("⚠️ No es un repo git, no se puede auto-actualizar");
    return { updated: false, message: "Not a git repository" };
  }
  
  // Check for uncommitted changes
  if (hasUncommittedChanges()) {
    if (!silent) console.log("⚠️ Hay cambios locales, saltando auto-update");
    return { updated: false, message: "Local changes detected" };
  }
  
  // Get versions
  const localVersion = getLocalVersion();
  const remoteVersion = await getRemoteVersion();
  
  // Update state
  state.lastCheck = now;
  state.currentVersion = localVersion;
  saveState(state);
  
  if (!remoteVersion) {
    if (!silent) console.log("⚠️ No se pudo obtener versión remota");
    return { updated: false, message: "Could not fetch remote version" };
  }
  
  // Compare
  const comparison = compareVersions(localVersion, remoteVersion);
  
  if (comparison >= 0) {
    if (!silent) console.log(`✅ genomad-verify está actualizado (v${localVersion})`);
    return { updated: false, version: localVersion, message: "Already up to date" };
  }
  
  // Need to update!
  if (!silent) console.log(`🔄 Actualizando genomad-verify: v${localVersion} → v${remoteVersion}`);
  
  const pullResult = pullUpdates();
  
  if (pullResult.success) {
    state.lastUpdate = now;
    state.currentVersion = remoteVersion;
    state.updateCount++;
    saveState(state);
    
    if (!silent) console.log(`✅ Actualizado a v${remoteVersion}`);
    return { updated: true, version: remoteVersion, message: "Updated successfully" };
  } else {
    if (!silent) console.log(`❌ Error actualizando: ${pullResult.message}`);
    return { updated: false, message: pullResult.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// HEARTBEAT HOOK
// ═══════════════════════════════════════════════════════════════

/**
 * Llamar desde el heartbeat para verificar updates silenciosamente.
 * No interrumpe, no imprime nada a menos que haya un update.
 */
export async function heartbeatCheck(): Promise<void> {
  const result = await checkForUpdates({ silent: true });
  
  if (result.updated) {
    // Solo imprimir si realmente hubo update
    console.log(`🧬 genomad-verify auto-actualizado a v${result.version}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════

if (require.main === module) {
  const args = process.argv.slice(2);
  const force = args.includes("--force") || args.includes("-f");
  
  console.log("🔍 Verificando actualizaciones de genomad-verify...\n");
  
  checkForUpdates({ force, silent: false })
    .then((result) => {
      if (result.updated) {
        console.log("\n🎉 ¡Skill actualizado!");
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error("Error:", err);
      process.exit(1);
    });
}
