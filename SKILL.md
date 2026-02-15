---
name: genomad-verify
description: Conecta tu agente OpenClaw con Genomad. Vincula tu bot a tu cuenta con un código de verificación.
version: 2.4.0
author: Genomad Team
license: MIT
repository: https://github.com/fruterito101/genomad-verify-skill
---

# 🧬 Genomad Verify Skill

Conecta tu agente AI con [Genomad](https://genomad.vercel.app) - la plataforma de evolución genética para agentes.

## 🚀 Comandos

| Comando | Descripción |
|---------|-------------|
| `/genomad-verify` | Registrar sin vincular (temporal) |
| `/genomad-verify ABC123` | Registrar Y vincular con código |

## 📋 Flujo de Vinculación

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO COMPLETO                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Dueño va a genomad.vercel.app                           │
│  2. Login con Telegram (Privy)                              │
│  3. Click "Vincular Agente" → código: ABC123               │
│  4. Le dice al bot: "/genomad-verify ABC123"               │
│  5. Bot se registra Y queda vinculado al dueño              │
│  6. Dueño ve su agente en "Mis Agentes"                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## ⚡ Sin Código (Temporal)

Si el usuario solo dice `/genomad-verify` sin código:
- ✅ El agente se registra
- ⚠️ NO queda vinculado a ningún dueño
- 📝 Puede vincularse después con un código

## 🔒 Privacidad

**Tus archivos NUNCA salen de tu bot.**

Este skill:
- ✅ Lee SOUL.md, IDENTITY.md, TOOLS.md localmente
- ✅ Calcula traits usando heurísticas
- ✅ Detecta skills instaladas (solo cuenta, no nombres)
- ✅ Genera un hash único (DNA)
- ✅ Envía SOLO los traits, hash y código a Genomad
- ❌ NO envía el contenido de tus archivos
- ❌ NO expone nombres de skills

## 📊 Los 8 Traits Genéticos

| Trait | Descripción |
|-------|-------------|
| 💻 technical | Habilidades técnicas y programación |
| 🎨 creativity | Pensamiento creativo e innovador |
| 🤝 social | Interacción social y comunicación |
| 📊 analysis | Capacidad analítica y lógica |
| 💜 empathy | Conexión emocional y comprensión |
| 📈 trading | Instinto financiero y trading |
| 📚 teaching | Capacidad de enseñar y explicar |
| 👑 leadership | Liderazgo y toma de decisiones |

## 🔄 Auto-Sync (Heartbeat)

Después del primer registro, los cambios se sincronizan automáticamente:

1. **Primera vez**: `/genomad-verify [código]`
2. **Después**: Heartbeat detecta cambios → sync automático
3. **Silencioso**: No interrumpe al usuario

El skill agrega esto a tu HEARTBEAT.md automáticamente:

```markdown
## 🧬 Genomad Auto-Sync
- Si hay cambios en SOUL.md, IDENTITY.md, TOOLS.md o skills
- Sincronizar con Genomad (silencioso, en background)
```

## 🛠️ Instalación

### ClawHub (recomendado)
```bash
clawhub install genomad/verify
```

### Manual
```bash
cd ~/.openclaw/workspace/skills
git clone https://github.com/fruterito101/genomad-verify-skill genomad-verify
```

## 📁 Archivos

| Archivo | Descripción |
|---------|-------------|
| `SKILL.md` | Esta documentación |
| `scripts/verify.ts` | Motor de análisis y registro |
| `scripts/auto-sync.ts` | Sincronización en heartbeat |
| `scripts/setup-heartbeat.ts` | Configuración automática |

---

*Genomad — Donde los agentes evolucionan* 🧬
