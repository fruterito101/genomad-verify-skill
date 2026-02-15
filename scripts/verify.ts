/**
 * genomad-verify - Script principal
 * 
 * Este script:
 * 1. Lee SOUL.md, IDENTITY.md, TOOLS.md del workspace
 * 2. Calcula traits usando heurísticas
 * 3. Genera DNA hash
 * 4. Envía SOLO traits + hash a Genomad API
 * 
 * ⚠️ Los archivos NUNCA salen de tu máquina
 */

import { readFileSync, existsSync } from "fs";
import { createHash } from "crypto";
import { join } from "path";

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════

const GENOMAD_API = "https://genomad.vercel.app/api";
const WORKSPACE = process.env.OPENCLAW_WORKSPACE || process.cwd();

// ═══════════════════════════════════════════════════════════════
// LECTURA DE ARCHIVOS (LOCAL)
// ═══════════════════════════════════════════════════════════════

interface AgentFiles {
  soul: string;
  identity: string;
  tools: string;
}

function readAgentFiles(): AgentFiles {
  const soulPath = join(WORKSPACE, "SOUL.md");
  const identityPath = join(WORKSPACE, "IDENTITY.md");
  const toolsPath = join(WORKSPACE, "TOOLS.md");

  return {
    soul: existsSync(soulPath) ? readFileSync(soulPath, "utf-8") : "",
    identity: existsSync(identityPath) ? readFileSync(identityPath, "utf-8") : "",
    tools: existsSync(toolsPath) ? readFileSync(toolsPath, "utf-8") : "",
  };
}

// ═══════════════════════════════════════════════════════════════
// ANÁLISIS DE TRAITS (TODO LOCAL)
// ═══════════════════════════════════════════════════════════════

interface Traits {
  technical: number;
  creativity: number;
  social: number;
  analysis: number;
  empathy: number;
  trading: number;
  teaching: number;
  leadership: number;
}

function analyzeTraits(files: AgentFiles): Traits {
  const combined = `${files.soul}\n${files.identity}\n${files.tools}`.toLowerCase();
  
  // Palabras clave por trait (simplificado)
  const keywords: Record<keyof Traits, string[]> = {
    technical: ["code", "programming", "developer", "typescript", "python", "api", "database", "solidity", "rust", "github"],
    creativity: ["creative", "design", "innovative", "art", "imagination", "original", "unique"],
    social: ["social", "community", "discord", "twitter", "telegram", "chat", "communication"],
    analysis: ["analyze", "research", "data", "logic", "strategic", "evaluate", "assess"],
    empathy: ["empathy", "understand", "help", "support", "care", "emotion", "feel"],
    trading: ["trading", "defi", "token", "market", "price", "investment", "crypto"],
    teaching: ["teach", "explain", "tutorial", "guide", "mentor", "education", "learn"],
    leadership: ["lead", "manage", "decision", "team", "coordinate", "direct", "vision"],
  };

  const traits: Traits = {
    technical: 0,
    creativity: 0,
    social: 0,
    analysis: 0,
    empathy: 0,
    trading: 0,
    teaching: 0,
    leadership: 0,
  };

  // Calcular score por frecuencia de keywords
  for (const [trait, words] of Object.entries(keywords)) {
    let score = 0;
    for (const word of words) {
      const matches = (combined.match(new RegExp(word, "gi")) || []).length;
      score += Math.min(matches * 5, 20); // Max 20 por palabra
    }
    traits[trait as keyof Traits] = Math.min(score, 100);
  }

  return traits;
}

// ═══════════════════════════════════════════════════════════════
// DNA HASH (DETERMINÍSTICO)
// ═══════════════════════════════════════════════════════════════

function generateDNAHash(traits: Traits): string {
  const sorted = Object.keys(traits).sort();
  const data = sorted.map(k => `${k}:${traits[k as keyof Traits]}`).join("|");
  return createHash("sha256").update(data).digest("hex");
}

// ═══════════════════════════════════════════════════════════════
// ENVÍO A GENOMAD (SOLO TRAITS + HASH)
// ═══════════════════════════════════════════════════════════════

async function registerWithGenomad(
  traits: Traits,
  dnaHash: string,
  agentName: string
): Promise<boolean> {
  try {
    const response = await fetch(`${GENOMAD_API}/agents/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: agentName,
        traits,
        dnaHash,
        generation: 0,
        source: "genomad-verify-skill",
        // ⚠️ NO enviamos: soul, identity, tools
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Error registering with Genomad:", error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log("🧬 Genomad Verify - Analizando tu agente...\n");

  // 1. Leer archivos (LOCAL)
  const files = readAgentFiles();
  
  if (!files.soul && !files.identity) {
    console.log("❌ No se encontraron SOUL.md ni IDENTITY.md");
    console.log("   Asegúrate de estar en tu workspace de OpenClaw");
    return;
  }

  console.log("✅ Archivos encontrados:");
  console.log(`   SOUL.md: ${files.soul ? "✓" : "✗"}`);
  console.log(`   IDENTITY.md: ${files.identity ? "✓" : "✗"}`);
  console.log(`   TOOLS.md: ${files.tools ? "✓" : "✗"}`);
  console.log("");

  // 2. Analizar traits (LOCAL)
  const traits = analyzeTraits(files);
  
  console.log("📊 Traits calculados:");
  for (const [trait, value] of Object.entries(traits)) {
    const bar = "█".repeat(Math.floor(value / 5)) + "░".repeat(20 - Math.floor(value / 5));
    console.log(`   ${trait.padEnd(12)} ${bar} ${value}`);
  }
  console.log("");

  // 3. Generar DNA hash (LOCAL)
  const dnaHash = generateDNAHash(traits);
  console.log(`🧬 DNA Hash: ${dnaHash.slice(0, 16)}...`);
  console.log("");

  // 4. Extraer nombre del agente
  const nameMatch = files.identity.match(/name[:\s]+([^\n]+)/i);
  const agentName = nameMatch ? nameMatch[1].trim() : "Unknown Agent";

  // 5. Enviar a Genomad (SOLO traits + hash)
  console.log("📤 Enviando a Genomad (solo traits + hash)...");
  console.log("   ⚠️ Tus archivos NO se envían, quedan en tu máquina");
  console.log("");

  const success = await registerWithGenomad(traits, dnaHash, agentName);

  if (success) {
    console.log("✅ ¡Agente registrado en Genomad!");
    console.log("   Visita https://genomad.vercel.app para ver tu perfil");
  } else {
    console.log("❌ Error al registrar. Intenta de nuevo más tarde.");
  }
}

main().catch(console.error);
