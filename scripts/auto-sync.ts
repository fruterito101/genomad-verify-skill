/**
 * 🧬 GENOMAD AUTO-SYNC
 * 
 * Verifica cambios en archivos y actualiza Genomad automáticamente.
 * Diseñado para correr en heartbeats sin interferir con el usuario.
 */

import { readFileSync, existsSync, writeFileSync } from "fs";
import { createHash } from "crypto";
import { join } from "path";

const GENOMAD_API = "https://genomad.vercel.app/api";
const WORKSPACE = process.env.OPENCLAW_WORKSPACE || process.cwd();
const STATE_FILE = join(WORKSPACE, ".genomad-state.json");

interface SyncState {
  lastHash: string;
  lastSync: string;
  registered: boolean;
}

function getFilesHash(): string {
  const files = ["SOUL.md", "IDENTITY.md", "TOOLS.md"];
  let combined = "";
  
  for (const file of files) {
    const paths = [
      join(WORKSPACE, file),
      join(WORKSPACE, ".openclaw/workspace", file),
    ];
    for (const p of paths) {
      if (existsSync(p)) {
        combined += readFileSync(p, "utf-8");
        break;
      }
    }
  }
  
  // Agregar lista de skills
  const skillsPath = join(WORKSPACE, "skills");
  if (existsSync(skillsPath)) {
    const { readdirSync } = require("fs");
    combined += readdirSync(skillsPath).join(",");
  }
  
  return createHash("md5").update(combined).digest("hex");
}

function loadState(): SyncState {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  }
  return { lastHash: "", lastSync: "", registered: false };
}

function saveState(state: SyncState) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function syncIfChanged(): Promise<{ changed: boolean; synced: boolean }> {
  const state = loadState();
  const currentHash = getFilesHash();
  
  // Si no está registrado, no hacer nada (necesita /genomad-verify primero)
  if (!state.registered) {
    return { changed: false, synced: false };
  }
  
  // Si no hay cambios, no hacer nada
  if (currentHash === state.lastHash) {
    return { changed: false, synced: false };
  }
  
  // Hay cambios - importar y ejecutar verify
  console.log("🔄 Genomad: Detectados cambios, sincronizando...");
  
  try {
    // Importar el motor de verify
    const { analyzeAndRegister } = await import("./verify");
    await analyzeAndRegister({ silent: true });
    
    // Actualizar estado
    state.lastHash = currentHash;
    state.lastSync = new Date().toISOString();
    saveState(state);
    
    console.log("✅ Genomad: Sync completado");
    return { changed: true, synced: true };
  } catch (error) {
    console.error("❌ Genomad sync error:", error);
    return { changed: true, synced: false };
  }
}

// Marcar como registrado (llamar después del primer /genomad-verify)
function markRegistered() {
  const state = loadState();
  state.registered = true;
  state.lastHash = getFilesHash();
  state.lastSync = new Date().toISOString();
  saveState(state);
}

export { syncIfChanged, markRegistered, getFilesHash };

// CLI
if (require.main === module) {
  syncIfChanged().then(result => {
    if (result.changed) {
      console.log(result.synced ? "Synced!" : "Sync failed");
    } else {
      console.log("No changes detected");
    }
  });
}
