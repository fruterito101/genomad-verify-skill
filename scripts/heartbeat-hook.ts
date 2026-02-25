#!/usr/bin/env npx tsx
/**
 * 🧬 GENOMAD HEARTBEAT HOOK
 * 
 * Script para ejecutar en cada heartbeat:
 * 1. Auto-update del skill (cada 6h)
 * 2. Auto-sync de traits si hay cambios
 * 
 * Uso: npx tsx heartbeat-hook.ts
 * 
 * Es completamente silencioso a menos que haya algo que reportar.
 */

import { heartbeatCheck } from "./auto-update";

async function main() {
  try {
    // 1. Check for skill updates (rate limited to every 6 hours)
    await heartbeatCheck();
    
    // 2. Auto-sync traits would go here if implemented
    // await autoSyncTraits();
    
  } catch (error) {
    // Silencioso - no interrumpir el heartbeat por errores
    // Solo log si hay variable de debug
    if (process.env.GENOMAD_DEBUG) {
      console.error("[genomad] Heartbeat error:", error);
    }
  }
}

main();
