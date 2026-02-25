/**
 * 🧬 GENOMAD HEARTBEAT SETUP
 * 
 * Configura el HEARTBEAT.md para:
 * 1. Auto-sync de traits cuando hay cambios
 * 2. Auto-update del skill cuando hay nueva versión
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || process.cwd();

const HEARTBEAT_SECTION = `
## 🧬 Genomad Auto-Sync & Update

### Auto-Sync (cada heartbeat si hay cambios)
- Detectar cambios en SOUL.md, IDENTITY.md, TOOLS.md
- Sincronizar traits con Genomad (silencioso)

### Auto-Update (cada 6 horas)
- Verificar nueva versión de genomad-verify
- Actualizar automáticamente vía git pull
- No interrumpe al usuario

**Ejecutar en heartbeat:**
\`\`\`bash
npx tsx ~/.openclaw/workspace/skills/genomad-verify/scripts/heartbeat-hook.ts
\`\`\`
`;

export function setupHeartbeatSync(): boolean {
  const heartbeatPaths = [
    join(WORKSPACE, "HEARTBEAT.md"),
    join(WORKSPACE, ".openclaw/workspace/HEARTBEAT.md"),
  ];

  for (const hbPath of heartbeatPaths) {
    if (existsSync(hbPath)) {
      let content = readFileSync(hbPath, "utf-8");
      
      // Verificar si ya tiene la sección (cualquier versión)
      if (content.includes("Genomad Auto-Sync") || content.includes("Genomad Auto-Update")) {
        // Actualizar la sección existente
        content = content.replace(
          /## 🧬 Genomad Auto-Sync[\s\S]*?(?=\n## |\n# |$)/,
          HEARTBEAT_SECTION.trim()
        );
        writeFileSync(hbPath, content);
        console.log("✅ Genomad Heartbeat actualizado en HEARTBEAT.md");
        return true;
      }
      
      // Agregar la sección
      content += "\n" + HEARTBEAT_SECTION;
      writeFileSync(hbPath, content);
      console.log("✅ Genomad Auto-Sync & Update agregado a HEARTBEAT.md");
      return true;
    }
  }

  // Si no existe HEARTBEAT.md, crearlo
  const newPath = join(WORKSPACE, "HEARTBEAT.md");
  writeFileSync(newPath, "# HEARTBEAT.md\n" + HEARTBEAT_SECTION);
  console.log("✅ Creado HEARTBEAT.md con Genomad Auto-Sync & Update");
  return true;
}

if (require.main === module) {
  setupHeartbeatSync();
}
