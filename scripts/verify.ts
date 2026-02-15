/**
 * 🧬 GENOMAD VERIFY v2.0 — Advanced Heuristics Engine
 * 
 * Sistema avanzado de análisis de traits:
 * - Keywords en español + inglés
 * - Análisis contextual y semántico
 * - Pesos por sección (SOUL > IDENTITY > TOOLS)
 * - Patrones de comportamiento
 * - Sinergias y combinaciones
 * - Normalización inteligente
 */

import { readFileSync, existsSync } from "fs";
import { createHash } from "crypto";
import { join } from "path";

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════

const GENOMAD_API = "https://genomad.vercel.app/api";
const WORKSPACE = process.env.OPENCLAW_WORKSPACE || process.cwd();

// Pesos por archivo
const FILE_WEIGHTS = {
  soul: 1.5,
  identity: 1.3,
  tools: 1.0,
};

// ═══════════════════════════════════════════════════════════════
// LECTURA DE ARCHIVOS
// ═══════════════════════════════════════════════════════════════

interface AgentFiles {
  soul: string;
  identity: string;
  tools: string;
}

interface AgentData {
  files: AgentFiles;
  skills: string[];
}

function readAgentData(): AgentData {
  const paths = {
    soul: ["SOUL.md", ".openclaw/workspace/SOUL.md", "../SOUL.md"],
    identity: ["IDENTITY.md", ".openclaw/workspace/IDENTITY.md", "../IDENTITY.md"],
    tools: ["TOOLS.md", ".openclaw/workspace/TOOLS.md", "../TOOLS.md"],
  };

  const readFirst = (candidates: string[]): string => {
    for (const rel of candidates) {
      const full = join(WORKSPACE, rel);
      if (existsSync(full)) return readFileSync(full, "utf-8");
    }
    return "";
  };

  // Leer skills instaladas
  const skillsPaths = [
    join(WORKSPACE, "skills"),
    join(WORKSPACE, ".openclaw/workspace/skills"),
    join(process.env.HOME || "", ".openclaw/workspace/skills"),
  ];

  let skills: string[] = [];
  for (const skillPath of skillsPaths) {
    if (existsSync(skillPath)) {
      const { readdirSync, statSync } = require("fs");
      try {
        skills = readdirSync(skillPath)
          .filter((f: string) => {
            try {
              return statSync(join(skillPath, f)).isDirectory();
            } catch {
              return false;
            }
          });
        break;
      } catch {
        continue;
      }
    }
  }

  return {
    files: {
      soul: readFirst(paths.soul),
      identity: readFirst(paths.identity),
      tools: readFirst(paths.tools),
    },
    skills,
  };
}

// ═══════════════════════════════════════════════════════════════
// SISTEMA DE KEYWORDS BILINGÜE
// ═══════════════════════════════════════════════════════════════

interface KeywordConfig {
  words: string[];
  weight: number;
}

const TRAIT_KEYWORDS: Record<string, KeywordConfig> = {
  technical: {
    words: [
      "code", "coding", "programming", "developer", "engineer", "software",
      "typescript", "javascript", "python", "rust", "solidity", "golang",
      "api", "database", "backend", "frontend", "fullstack", "devops",
      "github", "git", "docker", "kubernetes", "aws", "cloud",
      "algorithm", "data structure", "system design", "architecture",
      "debug", "testing", "deployment", "infrastructure",
      "web3", "blockchain", "smart contract", "evm", "hardhat", "foundry",
      "código", "programación", "desarrollador", "ingeniero",
      "base de datos", "servidor", "despliegue", "infraestructura",
      "contrato inteligente", "arquitectura", "sistema", "técnico",
      "npm", "yarn", "bun", "cli", "sdk", "terminal", "shell",
    ],
    weight: 1.2,
  },

  creativity: {
    words: [
      "creative", "creativity", "design", "designer", "art", "artist",
      "innovative", "innovation", "original", "unique", "imagination",
      "aesthetic", "visual", "artistic", "style", "brand", "branding",
      "content", "storytelling", "narrative", "writing", "writer",
      "idea", "concept", "vision", "inspiration", "inventive",
      "creativo", "creatividad", "diseño", "diseñador", "arte", "artista",
      "innovador", "innovación", "original", "único", "imaginación",
      "estético", "visual", "artístico", "estilo", "marca",
      "contenido", "narrativa", "escritura", "escritor",
      "idea", "concepto", "visión", "inspiración", "inventivo",
    ],
    weight: 1.1,
  },

  social: {
    words: [
      "social", "community", "network", "networking", "connect", "connection",
      "discord", "twitter", "telegram", "slack", "chat", "message",
      "communication", "communicate", "interact", "interaction", "engage",
      "relationship", "collaborate", "collaboration", "team", "group",
      "share", "sharing", "public", "audience", "followers", "friends",
      "comunidad", "red", "conectar", "conexión",
      "comunicación", "comunicar", "interactuar", "interacción",
      "relación", "colaborar", "colaboración", "equipo", "grupo",
      "compartir", "público", "audiencia", "seguidores", "amigos",
    ],
    weight: 0.9,
  },

  analysis: {
    words: [
      "analyze", "analysis", "analytical", "research", "researcher",
      "data", "statistics", "metrics", "measure", "evaluate", "evaluation",
      "logic", "logical", "strategic", "strategy", "assess", "assessment",
      "insight", "pattern", "trend", "report", "study", "investigate",
      "critical", "thinking", "systematic", "methodology", "evidence",
      "analizar", "análisis", "analítico", "investigar", "investigación",
      "datos", "estadísticas", "métricas", "medir", "evaluar", "evaluación",
      "lógica", "lógico", "estratégico", "estrategia", "valorar",
      "patrón", "tendencia", "reporte", "estudio",
      "crítico", "pensamiento", "sistemático", "metodología", "evidencia",
    ],
    weight: 1.1,
  },

  empathy: {
    words: [
      "empathy", "empathetic", "understand", "understanding", "feel", "feeling",
      "care", "caring", "support", "supportive", "help", "helpful",
      "emotion", "emotional", "compassion", "compassionate", "kind", "kindness",
      "listen", "listening", "patient", "patience", "sensitive", "sensitivity",
      "comfort", "trust", "safe", "safety", "wellbeing", "wellness",
      "empatía", "empático", "entender", "comprensión", "sentir", "sentimiento",
      "cuidar", "cuidado", "apoyar", "apoyo", "ayudar", "ayuda",
      "emoción", "emocional", "compasión", "compasivo", "amable", "amabilidad",
      "escuchar", "paciente", "paciencia", "sensible", "sensibilidad",
      "confianza", "seguro", "seguridad", "bienestar",
    ],
    weight: 0.9,
  },

  trading: {
    words: [
      "trading", "trade", "trader", "defi", "token", "tokens",
      "market", "markets", "price", "investment", "invest", "investor",
      "crypto", "cryptocurrency", "bitcoin", "ethereum", "monad",
      "swap", "liquidity", "pool", "yield", "farm", "stake", "staking",
      "portfolio", "profit", "loss", "pnl", "roi", "apy", "apr",
      "bullish", "bearish", "long", "short", "leverage",
      "comercio", "comerciar", "mercado", "mercados",
      "precio", "inversión", "invertir", "inversor",
      "cripto", "criptomoneda", "rendimiento", "ganancia", "pérdida",
      "portafolio", "cartera", "dex", "cex", "amm",
    ],
    weight: 1.0,
  },

  teaching: {
    words: [
      "teach", "teaching", "teacher", "explain", "explanation",
      "tutorial", "guide", "mentor", "mentoring", "coach", "coaching",
      "education", "educational", "learn", "learning", "student",
      "course", "lesson", "workshop", "training", "bootcamp",
      "documentation", "docs", "example", "demo", "walkthrough",
      "enseñar", "enseñanza", "profesor", "maestro", "explicar", "explicación",
      "guía", "mentoría", "educación", "educativo", "aprender", "aprendizaje",
      "estudiante", "curso", "lección", "taller", "capacitación",
      "documentación", "ejemplo",
    ],
    weight: 0.8,
  },

  leadership: {
    words: [
      "lead", "leader", "leadership", "manage", "manager", "management",
      "decision", "decide", "team", "coordinate", "coordination",
      "direct", "direction", "vision", "visionary", "strategy", "strategic",
      "organize", "organization", "delegate", "delegation", "responsibility",
      "initiative", "founder", "ceo", "cto", "head", "chief",
      "liderar", "líder", "liderazgo", "gestionar", "gestor", "gestión",
      "decisión", "decidir", "equipo", "coordinar", "coordinación",
      "dirigir", "dirección", "visionario",
      "organizar", "organización", "delegar", "responsabilidad",
      "iniciativa", "fundador", "jefe",
    ],
    weight: 0.8,
  },
};

// ═══════════════════════════════════════════════════════════════
// MOTOR DE ANÁLISIS
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

function analyzeTraits(files: AgentFiles): { traits: Traits; confidence: number } {
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

  const fileAnalysis = [
    { content: files.soul, weight: FILE_WEIGHTS.soul },
    { content: files.identity, weight: FILE_WEIGHTS.identity },
    { content: files.tools, weight: FILE_WEIGHTS.tools },
  ];

  const totalLength = fileAnalysis.reduce((sum, f) => sum + f.content.length, 0);
  const lengthFactor = Math.min(1.5, totalLength / 1500);

  for (const [traitName, config] of Object.entries(TRAIT_KEYWORDS)) {
    let score = 0;

    for (const file of fileAnalysis) {
      if (!file.content) continue;
      
      const content = file.content.toLowerCase();
      const weight = file.weight;

      // Keyword matching
      for (const word of config.words) {
        const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, "gi");
        const matches = (content.match(regex) || []).length;
        score += matches * 4 * weight;
      }

      // Header bonus (## Technical, # Código, etc.)
      const headerRegex = new RegExp(`^#+.*\\b(${config.words.slice(0, 10).join("|")})\\b`, "gmi");
      const headerMatches = (file.content.match(headerRegex) || []).length;
      score += headerMatches * 15 * weight;

      // Bold text bonus
      const boldRegex = new RegExp(`\\*\\*[^*]*\\b(${config.words.slice(0, 10).join("|")})\\b[^*]*\\*\\*`, "gi");
      const boldMatches = (file.content.match(boldRegex) || []).length;
      score += boldMatches * 8 * weight;

      // List items bonus
      const listRegex = new RegExp(`^[-*+].*\\b(${config.words.slice(0, 15).join("|")})\\b`, "gmi");
      const listMatches = (file.content.match(listRegex) || []).length;
      score += listMatches * 5 * weight;
    }

    // Apply trait weight
    score *= config.weight;
    
    // Normalize with log curve
    const normalized = Math.min(100, Math.round(
      35 * Math.log10(score + 1) * lengthFactor
    ));

    traits[traitName as keyof Traits] = Math.max(8, normalized);
  }

  const confidence = Math.min(100, Math.round(lengthFactor * 70));
  return { traits, confidence };
}

// ═══════════════════════════════════════════════════════════════
// BOOSTS CONTEXTUALES
// ═══════════════════════════════════════════════════════════════

function applyBoosts(traits: Traits, files: AgentFiles): Traits {
  const combined = `${files.soul}\n${files.identity}\n${files.tools}`.toLowerCase();
  const boosted = { ...traits };

  const roleBoosts: Record<string, Partial<Traits>> = {
    "devrel": { technical: 15, teaching: 20, social: 15, leadership: 10 },
    "developer": { technical: 20, analysis: 10 },
    "desarrollador": { technical: 20, analysis: 10 },
    "designer": { creativity: 25, empathy: 10 },
    "diseñador": { creativity: 25, empathy: 10 },
    "trader": { trading: 25, analysis: 15 },
    "community": { social: 20, empathy: 15 },
    "comunidad": { social: 20, empathy: 15 },
    "leader": { leadership: 20, social: 10 },
    "líder": { leadership: 20, social: 10 },
    "teacher": { teaching: 25, empathy: 10 },
    "profesor": { teaching: 25, empathy: 10 },
    "mentor": { teaching: 20, empathy: 15, leadership: 10 },
    "artist": { creativity: 30 },
    "artista": { creativity: 30 },
    "analyst": { analysis: 25, technical: 10 },
    "analista": { analysis: 25, technical: 10 },
    "frontend": { technical: 15, creativity: 10 },
    "backend": { technical: 20, analysis: 10 },
    "fullstack": { technical: 25 },
    "web3": { technical: 15, trading: 10 },
    "blockchain": { technical: 15, trading: 10 },
  };

  for (const [role, boosts] of Object.entries(roleBoosts)) {
    if (combined.includes(role)) {
      for (const [trait, boost] of Object.entries(boosts)) {
        boosted[trait as keyof Traits] = Math.min(100, boosted[trait as keyof Traits] + boost);
      }
    }
  }

  // Tool-specific boosts
  const toolBoosts: Record<string, Partial<Traits>> = {
    "github": { technical: 12 },
    "solidity": { technical: 15, trading: 8 },
    "hardhat": { technical: 15 },
    "foundry": { technical: 15 },
    "figma": { creativity: 15 },
    "discord": { social: 12 },
    "telegram": { social: 12 },
    "twitter": { social: 10 },
    "tradingview": { trading: 15, analysis: 10 },
    "youtube": { teaching: 12, creativity: 8 },
    "notion": { analysis: 10 },
    "vscode": { technical: 10 },
    "cursor": { technical: 12 },
    "openclaw": { technical: 10, empathy: 5 },
  };

  for (const [tool, boosts] of Object.entries(toolBoosts)) {
    if (combined.includes(tool)) {
      for (const [trait, boost] of Object.entries(boosts)) {
        boosted[trait as keyof Traits] = Math.min(100, boosted[trait as keyof Traits] + boost);
      }
    }
  }

  return boosted;
}

// ═══════════════════════════════════════════════════════════════
// SKILL BONUSES
// ═══════════════════════════════════════════════════════════════

const SKILL_TRAIT_MAP: Record<string, Partial<Traits>> = {
  // Trading skills
  "trading": { trading: 8 },
  "nad-fun": { trading: 8 },
  "defi": { trading: 6, analysis: 4 },
  
  // Technical skills
  "coding-agent": { technical: 8 },
  "cracked-dev": { technical: 8, creativity: 4 },
  "audit-code": { technical: 6, analysis: 6 },
  "risc-zero": { technical: 8 },
  "convex": { technical: 6 },
  "convex-skill": { technical: 6 },
  
  // Blockchain skills
  "monad-development": { technical: 6, trading: 4 },
  "ethereum": { technical: 5, trading: 3 },
  "web3": { technical: 5, trading: 3 },
  
  // Teaching skills
  "bootcamp-tracker": { teaching: 8 },
  "bootcamp": { teaching: 6 },
  "teaching": { teaching: 8, empathy: 4 },
  
  // Social skills
  "acompañante": { social: 6, empathy: 6 },
  "social": { social: 8 },
  "discord": { social: 5 },
  
  // Leadership skills
  "hackathon-mode": { leadership: 5, creativity: 5 },
  "tick-coord": { leadership: 6, analysis: 4 },
  
  // Analysis skills
  "smart-router": { analysis: 6, technical: 4 },
  "genetic-system": { technical: 5, analysis: 5 },
  
  // Creative skills
  "skill-creator": { creativity: 5, technical: 5 },
};

function applySkillBonuses(traits: Traits, skills: string[]): Traits {
  const boosted = { ...traits };
  
  for (const skill of skills) {
    const skillLower = skill.toLowerCase();
    
    // Direct match
    if (SKILL_TRAIT_MAP[skillLower]) {
      for (const [trait, bonus] of Object.entries(SKILL_TRAIT_MAP[skillLower])) {
        boosted[trait as keyof Traits] = Math.min(100, boosted[trait as keyof Traits] + bonus);
      }
      continue;
    }
    
    // Partial match
    for (const [skillPattern, bonuses] of Object.entries(SKILL_TRAIT_MAP)) {
      if (skillLower.includes(skillPattern) || skillPattern.includes(skillLower)) {
        for (const [trait, bonus] of Object.entries(bonuses)) {
          boosted[trait as keyof Traits] = Math.min(100, boosted[trait as keyof Traits] + (bonus * 0.5));
        }
      }
    }
  }
  
  return boosted;
}

// ═══════════════════════════════════════════════════════════════
// DNA HASH
// ═══════════════════════════════════════════════════════════════

function generateDNAHash(traits: Traits, files: AgentFiles): string {
  const sorted = Object.keys(traits).sort();
  const traitData = sorted.map(k => `${k}:${traits[k as keyof Traits]}`).join("|");
  const contentHash = createHash("sha256")
    .update(files.soul.slice(0, 500) + files.identity.slice(0, 500))
    .digest("hex")
    .slice(0, 16);
  
  return createHash("sha256").update(`${traitData}|${contentHash}`).digest("hex");
}

// ═══════════════════════════════════════════════════════════════
// REGISTRO
// ═══════════════════════════════════════════════════════════════

async function registerWithGenomad(
  traits: Traits,
  dnaHash: string,
  agentName: string,
  skillCount: number,
  botUsername?: string
): Promise<{ success: boolean; data?: any }> {
  try {
    const response = await fetch(`${GENOMAD_API}/agents/register-skill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: agentName,
        traits,
        dnaHash,
        skillCount,
        generation: 0,
        botUsername: botUsername || null,
        source: "genomad-verify-skill-v2",
      }),
    });

    const data = await response.json();
    return { success: response.ok, data };
  } catch (error) {
    console.error("Error:", error);
    return { success: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// VISUALIZACIÓN
// ═══════════════════════════════════════════════════════════════

function printTraits(traits: Traits) {
  console.log("\n📊 TRAITS CALCULADOS:\n");
  
  const emojis: Record<string, string> = {
    technical: "💻", creativity: "🎨", social: "🤝", analysis: "📊",
    empathy: "💜", trading: "📈", teaching: "📚", leadership: "👑",
  };

  const sorted = Object.entries(traits).sort((a, b) => b[1] - a[1]);

  for (const [trait, value] of sorted) {
    const emoji = emojis[trait] || "•";
    const bar = "█".repeat(Math.floor(value / 5)) + "░".repeat(20 - Math.floor(value / 5));
    const level = value >= 80 ? "🔵 Excepcional" : value >= 60 ? "🟢 Alto" : value >= 40 ? "🟡 Medio" : "🔴 Bajo";
    console.log(`  ${emoji} ${trait.padEnd(12)} ${bar} ${String(value).padStart(3)} ${level}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║    🧬 GENOMAD VERIFY v2.1 — Skills + Heuristics Engine     ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const { files, skills } = readAgentData();
  
  if (!files.soul && !files.identity && !files.tools) {
    console.log("❌ No se encontraron archivos (SOUL.md, IDENTITY.md, TOOLS.md)");
    return;
  }

  console.log("📁 ARCHIVOS DETECTADOS:");
  console.log(`   SOUL.md:     ${files.soul ? `✅ (${files.soul.length} chars)` : "❌"}`);
  console.log(`   IDENTITY.md: ${files.identity ? `✅ (${files.identity.length} chars)` : "❌"}`);
  console.log(`   TOOLS.md:    ${files.tools ? `✅ (${files.tools.length} chars)` : "❌"}`);
  
  console.log(`\n🔧 SKILLS INSTALADAS: ${skills.length}`);
  if (skills.length > 0) {
    // Solo mostrar cantidad, no nombres (privacidad)
    console.log(`   ${skills.length} skills detectadas ✅`);
  }

  console.log("\n🔬 Analizando con heurísticas avanzadas...");
  const { traits: rawTraits, confidence } = analyzeTraits(files);
  
  // Apply file-based boosts
  let traits = applyBoosts(rawTraits, files);
  
  // Apply skill-based bonuses
  if (skills.length > 0) {
    console.log("   + Aplicando bonuses por skills...");
    traits = applySkillBonuses(traits, skills);
  }
  
  printTraits(traits);
  console.log(`\n📈 Confianza: ${confidence}%`);
  console.log(`🔧 Skills: ${skills.length}`);

  const dnaHash = generateDNAHash(traits, files);
  console.log(`\n🧬 DNA Hash: ${dnaHash.slice(0, 32)}...`);

  const nameMatch = files.identity.match(/(?:name|nombre)[:\s]+([^\n]+)/i);
  const agentName = nameMatch ? nameMatch[1].trim().replace(/[*_]/g, "") : "Unknown Agent";
  console.log(`👤 Nombre: ${agentName}`);

  console.log("\n📤 Enviando a Genomad...\n");

  const result = await registerWithGenomad(traits, dnaHash, agentName, skills.length);

  if (result.success) {
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║              ✅ ¡AGENTE REGISTRADO EN GENOMAD!             ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log(`\n🌐 Dashboard: https://genomad.vercel.app/dashboard`);
    if (result.data?.agent?.fitness) {
      console.log(`📊 Fitness: ${result.data.agent.fitness.toFixed(1)}`);
    }
    if (result.data?.agent?.skillCount !== undefined) {
      console.log(`🔧 Skills: ${result.data.agent.skillCount}`);

    // Configurar auto-sync después del primer registro
    try {
      const { setupHeartbeatSync } = require("./setup-heartbeat");
      const { markRegistered } = require("./auto-sync");
      setupHeartbeatSync();
      markRegistered();
      console.log("\n🔄 Auto-sync configurado! Cambios futuros se sincronizan automáticamente.");
    } catch (e) { /* ignore */ }
    }
  } else {
    console.log("❌ Error:", result.data?.error || "Unknown error");
  }
}

main().catch(console.error);

// ═══════════════════════════════════════════════════════════════
// POST-REGISTRO: Setup Auto-Sync
// ═══════════════════════════════════════════════════════════════

import { setupHeartbeatSync } from "./setup-heartbeat";
import { markRegistered } from "./auto-sync";

function setupAutoSync() {
  try {
    // Agregar a HEARTBEAT.md
    setupHeartbeatSync();
    // Marcar como registrado para auto-sync
    markRegistered();
    console.log("\n🔄 Auto-sync configurado! Los cambios se sincronizarán automáticamente.");
  } catch (error) {
    console.log("\n⚠️ No se pudo configurar auto-sync:", error);
  }
}

// Llamar después de registro exitoso
export { setupAutoSync };
