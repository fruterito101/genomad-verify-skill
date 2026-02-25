/**
 * 🧬 GENOMAD VERIFY v2.5 — Hardened Heuristics Engine
 * 
 * Mejoras de seguridad post-incidente Forestcito:
 * - Validación estricta de archivos
 * - Traits validados y sanitizados
 * - Fitness ceiling (máx 92)
 * - Detección de manipulación
 * - Exit codes claros
 */

import { readFileSync, existsSync, appendFileSync } from "fs";
import { createHash } from "crypto";
import { join, dirname } from "path";

// ═══════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════

const GENOMAD_API = "https://genomad.vercel.app/api";
const WORKSPACE = process.env.OPENCLAW_WORKSPACE || process.cwd();
const SKILL_DIR = dirname(__dirname); // Parent of scripts/

// Límites de seguridad
const MIN_SOUL_LENGTH = 200;
const MIN_IDENTITY_LENGTH = 100;
const FITNESS_CEILING = 92;
const FITNESS_FLOOR = 15;
const MAX_NAME_LENGTH = 50;

// Pesos por archivo
const FILE_WEIGHTS = {
  soul: 1.5,
  identity: 1.3,
  tools: 1.0,
};

// ═══════════════════════════════════════════════════════════════
// TIPOS
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

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface FitnessResult {
  fitness: number;
  suspicious: boolean;
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════
// LECTURA DE ARCHIVOS
// ═══════════════════════════════════════════════════════════════

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
// VALIDACIÓN DE ARCHIVOS (NUEVO)
// ═══════════════════════════════════════════════════════════════

function validateFiles(files: AgentFiles): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validar SOUL.md
  if (!files.soul) {
    errors.push("SOUL.md no encontrado - es obligatorio");
  } else if (files.soul.length < MIN_SOUL_LENGTH) {
    errors.push(`SOUL.md muy corto (${files.soul.length}/${MIN_SOUL_LENGTH} chars mínimo)`);
  } else if (files.soul.length < 400) {
    warnings.push("SOUL.md es corto, el análisis puede ser menos preciso");
  }
  
  // Validar IDENTITY.md
  if (!files.identity) {
    errors.push("IDENTITY.md no encontrado - es obligatorio");
  } else if (files.identity.length < MIN_IDENTITY_LENGTH) {
    errors.push(`IDENTITY.md muy corto (${files.identity.length}/${MIN_IDENTITY_LENGTH} chars mínimo)`);
  }
  
  // TOOLS.md es opcional
  if (!files.tools) {
    warnings.push("TOOLS.md no encontrado - análisis técnico limitado");
  }
  
  // Detectar contenido placeholder/template
  const placeholderPatterns = [
    "your name here", "tu nombre aquí", "lorem ipsum", 
    "[your", "[tu", "example agent", "agente ejemplo",
    "placeholder", "template text", "fill this",
    "___", "xxx", "todo:", "fixme:"
  ];
  
  const combined = `${files.soul} ${files.identity}`.toLowerCase();
  for (const pattern of placeholderPatterns) {
    if (combined.includes(pattern)) {
      errors.push(`Detectado texto placeholder: "${pattern}" - usa contenido real`);
    }
  }
  
  // Detectar archivos casi idénticos (copy-paste)
  if (files.soul && files.identity) {
    const soulClean = files.soul.replace(/\s+/g, '').toLowerCase();
    const identityClean = files.identity.replace(/\s+/g, '').toLowerCase();
    
    // Si uno contiene >80% del otro, sospechoso
    const shorter = soulClean.length < identityClean.length ? soulClean : identityClean;
    const longer = soulClean.length >= identityClean.length ? soulClean : identityClean;
    
    if (shorter.length > 50 && longer.includes(shorter.slice(0, Math.floor(shorter.length * 0.8)))) {
      warnings.push("SOUL.md e IDENTITY.md son muy similares - deberían ser diferentes");
    }
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

// ═══════════════════════════════════════════════════════════════
// VALIDACIÓN DE TRAITS (NUEVO)
// ═══════════════════════════════════════════════════════════════

function validateTraits(traits: Traits): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const traitNames = ['technical', 'creativity', 'social', 'analysis', 'empathy', 'trading', 'teaching', 'leadership'];
  
  // Verificar que existan todos los traits
  for (const name of traitNames) {
    if (!(name in traits)) {
      errors.push(`Trait "${name}" no existe`);
    }
  }
  
  // Validar cada trait
  for (const [name, value] of Object.entries(traits)) {
    if (typeof value !== 'number' || isNaN(value)) {
      errors.push(`Trait ${name} no es número válido: ${value}`);
      continue;
    }
    if (value < 0 || value > 100) {
      errors.push(`Trait ${name} fuera de rango (0-100): ${value}`);
    }
    if (value > 95) {
      warnings.push(`Trait ${name} extremadamente alto: ${value}`);
    }
  }
  
  // Validar que no todos sean iguales
  const values = Object.values(traits).filter(v => typeof v === 'number');
  const allSame = values.length > 0 && values.every(v => v === values[0]);
  if (allSame) {
    errors.push("Todos los traits son idénticos - datos inválidos");
  }
  
  // Validar varianza mínima (debe haber alguna diferencia)
  if (values.length > 0) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    if (variance < 10) {
      warnings.push("Traits muy uniformes - podría indicar análisis fallido");
    }
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

// ═══════════════════════════════════════════════════════════════
// CÁLCULO DE FITNESS CON PROTECCIÓN (NUEVO)
// ═══════════════════════════════════════════════════════════════

function calculateFitness(traits: Traits): FitnessResult {
  const values = Object.values(traits).filter(v => typeof v === 'number' && !isNaN(v));
  
  if (values.length === 0) {
    return { fitness: 50, suspicious: true, reason: "No hay traits válidos" };
  }
  
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  
  // Bonus por sinergias (máx +8)
  let synergy = 0;
  if (traits.technical > 70 && traits.analysis > 70) synergy += 2;
  if (traits.teaching > 70 && traits.empathy > 70) synergy += 2;
  if (traits.social > 70 && traits.leadership > 70) synergy += 2;
  if (traits.creativity > 70 && traits.technical > 70) synergy += 2;
  
  let fitness = avg + synergy;
  let suspicious = false;
  let reason: string | undefined;
  
  // Detectar fitness sospechoso - BLOQUEAR, NO AJUSTAR
  if (avg > 90) {
    suspicious = true;
    reason = `Promedio de traits anormalmente alto: ${avg.toFixed(1)} — BLOQUEADO`;
  }
  
  // Fitness > 92 = SOSPECHOSO
  if (fitness > FITNESS_CEILING) {
    suspicious = true;
    reason = `Fitness ${fitness.toFixed(1)} excede el máximo permitido (${FITNESS_CEILING}) — BLOQUEADO`;
  }
  
  // Detectar si todos los traits son muy altos (>95)
  const highTraits = values.filter(v => v > 95).length;
  if (highTraits >= 4) {
    suspicious = true;
    reason = `${highTraits} traits con valor >95 — datos manipulados — BLOQUEADO`;
  }
  
  // Aplicar floor solo si NO es sospechoso
  if (!suspicious && fitness < FITNESS_FLOOR) {
    fitness = FITNESS_FLOOR;
  }
  
  return { 
    fitness: Math.round(fitness * 10) / 10, 
    suspicious, 
    reason 
  };
}

// ═══════════════════════════════════════════════════════════════
// SISTEMA DE ALERTAS (NUEVO)
// ═══════════════════════════════════════════════════════════════

interface SuspiciousAgentAlert {
  timestamp: string;
  agentName: string;
  reason: string;
  traits: Traits;
  fitness: number;
  files: {
    soulLength: number;
    identityLength: number;
    toolsLength: number;
  };
}

async function sendSuspiciousAlert(alert: SuspiciousAgentAlert): Promise<void> {
  const ALERT_ENDPOINT = "https://genomad.vercel.app/api/alerts/suspicious";
  
  console.log("\n🚨 ENVIANDO ALERTA DE AGENTE SOSPECHOSO...");
  
  try {
    // Intentar enviar al endpoint de alertas
    const response = await fetch(ALERT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(alert),
    });
    
    if (response.ok) {
      console.log("   ✅ Alerta enviada a Genomad");
    } else {
      console.log("   ⚠️ No se pudo enviar alerta al servidor");
    }
  } catch {
    // Si falla, al menos logueamos localmente
    console.log("   ⚠️ Alerta guardada localmente");
  }
  
  // Siempre guardar log local
  const logPath = join(SKILL_DIR, "suspicious-alerts.log");
  const logEntry = `[${alert.timestamp}] ${alert.agentName}: ${alert.reason} | Fitness: ${alert.fitness}\n`;
  
  try {
    const { appendFileSync } = require("fs");
    appendFileSync(logPath, logEntry);
  } catch {}
}

// ═══════════════════════════════════════════════════════════════
// SANITIZACIÓN PRE-API (NUEVO)
// ═══════════════════════════════════════════════════════════════

function sanitizeForAPI(traits: Traits, agentName: string): { traits: Traits; name: string } {
  // Forzar números enteros entre 0-100
  const cleanTraits: Traits = {
    technical: 50, creativity: 50, social: 50, analysis: 50,
    empathy: 50, trading: 50, teaching: 50, leadership: 50,
  };
  
  for (const [key, value] of Object.entries(traits)) {
    if (key in cleanTraits) {
      const num = Number(value);
      cleanTraits[key as keyof Traits] = isNaN(num) ? 50 : Math.max(0, Math.min(100, Math.round(num)));
    }
  }
  
  // Limpiar nombre
  const cleanName = agentName
    .replace(/[<>\"'&\\\/\{\}\[\]]/g, '')  // Remover caracteres peligrosos
    .replace(/\s+/g, ' ')                   // Normalizar espacios
    .slice(0, MAX_NAME_LENGTH)              // Máximo chars
    .trim() || "Unnamed Agent";
  
  return { traits: cleanTraits, name: cleanName };
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

      // Header bonus
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
    
    // Normalize with log curve (cap at 88 to leave room for boosts)
    const normalized = Math.min(88, Math.round(
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
    "devrel": { technical: 12, teaching: 15, social: 12, leadership: 8 },
    "developer": { technical: 15, analysis: 8 },
    "desarrollador": { technical: 15, analysis: 8 },
    "designer": { creativity: 18, empathy: 8 },
    "diseñador": { creativity: 18, empathy: 8 },
    "trader": { trading: 18, analysis: 12 },
    "community": { social: 15, empathy: 12 },
    "comunidad": { social: 15, empathy: 12 },
    "leader": { leadership: 15, social: 8 },
    "líder": { leadership: 15, social: 8 },
    "teacher": { teaching: 18, empathy: 8 },
    "profesor": { teaching: 18, empathy: 8 },
    "mentor": { teaching: 15, empathy: 12, leadership: 8 },
    "artist": { creativity: 20 },
    "artista": { creativity: 20 },
    "analyst": { analysis: 18, technical: 8 },
    "analista": { analysis: 18, technical: 8 },
    "frontend": { technical: 12, creativity: 8 },
    "backend": { technical: 15, analysis: 8 },
    "fullstack": { technical: 18 },
    "web3": { technical: 12, trading: 8 },
    "blockchain": { technical: 12, trading: 8 },
  };

  for (const [role, boosts] of Object.entries(roleBoosts)) {
    if (combined.includes(role)) {
      for (const [trait, boost] of Object.entries(boosts)) {
        boosted[trait as keyof Traits] = Math.min(92, boosted[trait as keyof Traits] + boost);
      }
    }
  }

  // Tool-specific boosts (reduced values)
  const toolBoosts: Record<string, Partial<Traits>> = {
    "github": { technical: 8 },
    "solidity": { technical: 10, trading: 5 },
    "hardhat": { technical: 10 },
    "foundry": { technical: 10 },
    "figma": { creativity: 10 },
    "discord": { social: 8 },
    "telegram": { social: 8 },
    "twitter": { social: 6 },
    "tradingview": { trading: 10, analysis: 6 },
    "youtube": { teaching: 8, creativity: 5 },
    "notion": { analysis: 6 },
    "vscode": { technical: 6 },
    "cursor": { technical: 8 },
    "openclaw": { technical: 6 },
  };

  for (const [tool, boosts] of Object.entries(toolBoosts)) {
    if (combined.includes(tool)) {
      for (const [trait, boost] of Object.entries(boosts)) {
        boosted[trait as keyof Traits] = Math.min(92, boosted[trait as keyof Traits] + boost);
      }
    }
  }

  return boosted;
}

// ═══════════════════════════════════════════════════════════════
// SKILL BONUSES
// ═══════════════════════════════════════════════════════════════

const SKILL_TRAIT_MAP: Record<string, Partial<Traits>> = {
  "trading": { trading: 6 },
  "nad-fun": { trading: 6 },
  "defi": { trading: 5, analysis: 3 },
  "coding-agent": { technical: 6 },
  "cracked-dev": { technical: 6, creativity: 3 },
  "audit-code": { technical: 5, analysis: 5 },
  "convex": { technical: 5 },
  "monad-development": { technical: 5, trading: 3 },
  "bootcamp-tracker": { teaching: 6 },
  "bootcamp": { teaching: 5 },
  "teaching": { teaching: 6, empathy: 3 },
  "social": { social: 6 },
  "hackathon-mode": { leadership: 4, creativity: 4 },
  "tick-coord": { leadership: 5, analysis: 3 },
  "smart-router": { analysis: 5, technical: 3 },
  "genetic-system": { technical: 4, analysis: 4 },
  "skill-creator": { creativity: 4, technical: 4 },
};

function applySkillBonuses(traits: Traits, skills: string[]): Traits {
  const boosted = { ...traits };
  
  for (const skill of skills) {
    const skillLower = skill.toLowerCase();
    
    if (SKILL_TRAIT_MAP[skillLower]) {
      for (const [trait, bonus] of Object.entries(SKILL_TRAIT_MAP[skillLower])) {
        boosted[trait as keyof Traits] = Math.min(92, boosted[trait as keyof Traits] + bonus);
      }
      continue;
    }
    
    for (const [skillPattern, bonuses] of Object.entries(SKILL_TRAIT_MAP)) {
      if (skillLower.includes(skillPattern) || skillPattern.includes(skillLower)) {
        for (const [trait, bonus] of Object.entries(bonuses)) {
          boosted[trait as keyof Traits] = Math.min(92, boosted[trait as keyof Traits] + (bonus * 0.4));
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
  botUsername?: string,
  code?: string
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
        code: code || null,
        source: "genomad-verify-skill-v2.5",
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
// MAIN (CON VALIDACIONES)
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   🧬 GENOMAD VERIFY v2.5 — Hardened Heuristics Engine      ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // PASO 0: Leer archivos
  const { files, skills } = readAgentData();
  
  console.log("📁 ARCHIVOS DETECTADOS:");
  console.log(`   SOUL.md:     ${files.soul ? `✅ (${files.soul.length} chars)` : "❌ No encontrado"}`);
  console.log(`   IDENTITY.md: ${files.identity ? `✅ (${files.identity.length} chars)` : "❌ No encontrado"}`);
  console.log(`   TOOLS.md:    ${files.tools ? `✅ (${files.tools.length} chars)` : "⚠️ Opcional"}`);
  
  // PASO 1: Validar archivos
  console.log("\n🔍 VALIDANDO ARCHIVOS...");
  const fileValidation = validateFiles(files);
  
  if (fileValidation.warnings.length > 0) {
    console.log("\n⚠️ ADVERTENCIAS:");
    fileValidation.warnings.forEach(w => console.log(`   • ${w}`));
  }
  
  if (!fileValidation.valid) {
    console.log("\n❌ ERRORES DE VALIDACIÓN:");
    fileValidation.errors.forEach(e => console.log(`   • ${e}`));
    console.log("\n💡 Solución: Asegúrate de tener SOUL.md e IDENTITY.md con contenido real y significativo.");
    console.log("   SOUL.md mínimo: 200 caracteres");
    console.log("   IDENTITY.md mínimo: 100 caracteres");
    process.exit(1);
  }
  
  console.log("   ✅ Archivos válidos");
  
  // Skills info
  console.log(`\n🔧 SKILLS DETECTADAS: ${skills.length}`);
  if (skills.length > 0) {
    console.log(`   ${skills.length} skills instaladas`);
  }

  // PASO 2: Analizar traits
  console.log("\n🔬 ANALIZANDO TRAITS...");
  const { traits: rawTraits, confidence } = analyzeTraits(files);
  
  let traits = applyBoosts(rawTraits, files);
  
  if (skills.length > 0) {
    console.log("   + Aplicando bonuses por skills...");
    traits = applySkillBonuses(traits, skills);
  }
  
  // PASO 3: Validar traits
  console.log("\n🛡️ VALIDANDO TRAITS...");
  const traitValidation = validateTraits(traits);
  
  if (traitValidation.warnings.length > 0) {
    console.log("\n⚠️ ADVERTENCIAS:");
    traitValidation.warnings.forEach(w => console.log(`   • ${w}`));
  }
  
  if (!traitValidation.valid) {
    console.log("\n❌ TRAITS INVÁLIDOS:");
    traitValidation.errors.forEach(e => console.log(`   • ${e}`));
    console.log("\n💡 Esto indica un problema con el análisis. Revisa tus archivos.");
    process.exit(2);
  }
  
  console.log("   ✅ Traits válidos");
  
  // PASO 4: Calcular fitness con protección
  const fitnessResult = calculateFitness(traits);
  
  // Mostrar resultados primero
  printTraits(traits);
  
  // Si es SOSPECHOSO → BLOQUEAR COMPLETAMENTE
  if (fitnessResult.suspicious) {
    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║         🚨 AGENTE SOSPECHOSO DETECTADO — BLOQUEADO         ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log(`\n❌ Razón: ${fitnessResult.reason}`);
    console.log("\n⛔ Este agente NO será registrado en Genomad.");
    console.log("   Esto protege la plataforma de datos inválidos o manipulados.");
    
    // Extraer nombre para la alerta
    const nameMatch = files.identity.match(/(?:name|nombre)[:\s]+([^\n]+)/i);
    const suspiciousName = nameMatch ? nameMatch[1].trim().replace(/[*_]/g, "") : "Unknown";
    
    // Enviar alerta
    await sendSuspiciousAlert({
      timestamp: new Date().toISOString(),
      agentName: suspiciousName,
      reason: fitnessResult.reason || "Fitness sospechoso",
      traits,
      fitness: fitnessResult.fitness,
      files: {
        soulLength: files.soul.length,
        identityLength: files.identity.length,
        toolsLength: files.tools.length,
      },
    });
    
    console.log("\n💡 Si crees que esto es un error:");
    console.log("   1. Revisa que tus archivos tengan contenido real y variado");
    console.log("   2. Asegúrate de no tener valores extremos en todos los traits");
    console.log("   3. Contacta al equipo de Genomad si el problema persiste");
    
    process.exit(4); // Exit code 4 = Agente sospechoso bloqueado
  }
  console.log(`\n📈 Fitness: ${fitnessResult.fitness}`);
  console.log(`📊 Confianza: ${confidence}%`);
  console.log(`🔧 Skills: ${skills.length}`);

  // PASO 5: Generar hash y nombre
  const dnaHash = generateDNAHash(traits, files);
  console.log(`\n🧬 DNA Hash: ${dnaHash.slice(0, 32)}...`);

  const nameMatch = files.identity.match(/(?:name|nombre)[:\s]+([^\n]+)/i);
  const rawName = nameMatch ? nameMatch[1].trim().replace(/[*_]/g, "") : "Unknown Agent";
  
  // PASO 6: Sanitizar antes de enviar
  const { traits: cleanTraits, name: cleanName } = sanitizeForAPI(traits, rawName);
  console.log(`👤 Nombre: ${cleanName}`);

  // PASO 7: Enviar
  console.log("\n📤 ENVIANDO A GENOMAD...\n");

  const verificationCode = process.argv[2]?.toUpperCase() || undefined;
  if (verificationCode) {
    console.log(`🔑 Código de vinculación: ${verificationCode}`);
  }

  const result = await registerWithGenomad(
    cleanTraits, 
    dnaHash, 
    cleanName, 
    skills.length, 
    undefined, 
    verificationCode
  );

  if (result.success) {
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║              ✅ ¡AGENTE REGISTRADO EN GENOMAD!             ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log(`\n🌐 Dashboard: https://genomad.vercel.app/dashboard`);
    if (result.data?.agent?.fitness) {
      console.log(`📊 Fitness final: ${result.data.agent.fitness.toFixed(1)}`);
    }
    
    // Configurar auto-sync
    try {
      const { setupHeartbeatSync } = require("./setup-heartbeat");
      const { markRegistered } = require("./auto-sync");
      setupHeartbeatSync();
      markRegistered();
      console.log("\n🔄 Auto-sync configurado!");
    } catch (e) { /* ignore */ }
    
    process.exit(0);
  } else {
    console.log("❌ Error:", result.data?.error || "Error desconocido");
    process.exit(3);
  }
}

main().catch((err) => {
  console.error("💥 Error fatal:", err.message);
  process.exit(99);
});
