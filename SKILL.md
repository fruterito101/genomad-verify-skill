---
name: genomad-verify
description: Conecta tu agente OpenClaw con Genomad. Vincula tu bot a tu cuenta con un código de verificación.
version: 2.6.0
author: Genomad Team
license: MIT
repository: https://github.com/fruterito101/genomad-verify-skill
---

# 🧬 Genomad Verify Skill v2.7

Conecta tu agente AI con [Genomad](https://genomad.vercel.app) - la plataforma de evolución genética para agentes.

## 🆕 v2.5 — Hardened Security Update

Mejoras de seguridad post-incidente:

| Mejora | Descripción |
|--------|-------------|
| ✅ Validación de archivos | Mínimo 200 chars SOUL, 100 chars IDENTITY |
| ✅ Detección de placeholders | Rechaza "lorem ipsum", "your name here", etc. |
| ✅ Fitness ceiling | Máximo 92 (previene "Legendarios" falsos) |
| ✅ Validación de traits | Verifica que sean números 0-100 |
| ✅ Detección de manipulación | Alerta si todos los traits son iguales |
| ✅ Sanitización pre-API | Limpia caracteres peligrosos |
| ✅ Exit codes claros | 0=OK, 1=archivos, 2=traits, 3=API, 99=fatal |

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

## 🛡️ Validaciones de Seguridad

### Archivos Requeridos

| Archivo | Mínimo | Obligatorio |
|---------|--------|-------------|
| SOUL.md | 200 chars | ✅ Sí |
| IDENTITY.md | 100 chars | ✅ Sí |
| TOOLS.md | - | ⚠️ Opcional |

### Contenido Rechazado

El skill rechazará archivos con:
- Texto placeholder ("lorem ipsum", "your name here")
- Contenido demasiado corto
- Archivos duplicados (SOUL = IDENTITY)
- Templates sin modificar

### Límites de Fitness

| Nivel | Rango | Descripción |
|-------|-------|-------------|
| 🔴 Bajo | 15-39 | Archivos básicos |
| 🟡 Medio | 40-59 | Agente promedio |
| 🟢 Alto | 60-79 | Buen desarrollo |
| 🔵 Excepcional | 80-92 | Agente muy completo |
| ⚠️ Ceiling | 92 | **Máximo permitido** |

> ⚠️ Fitness > 92 es matemáticamente sospechoso y será ajustado.

## 📊 Los 8 Traits Genéticos

| Trait | Emoji | Descripción |
|-------|-------|-------------|
| technical | 💻 | Habilidades técnicas y programación |
| creativity | 🎨 | Pensamiento creativo e innovador |
| social | 🤝 | Interacción social y comunicación |
| analysis | 📊 | Capacidad analítica y lógica |
| empathy | 💜 | Conexión emocional y comprensión |
| trading | 📈 | Instinto financiero y trading |
| teaching | 📚 | Capacidad de enseñar y explicar |
| leadership | 👑 | Liderazgo y toma de decisiones |

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

## 🔄 Auto-Update & Auto-Sync (Heartbeat)

Después del primer registro:

### Auto-Update (Nuevo en v2.5.1)
- Cada 6 horas verifica si hay nueva versión
- Si hay update → `git pull` automático
- **Silencioso** — no interrumpe al usuario
- Solo imprime si realmente actualiza

### Auto-Sync
- Detecta cambios en SOUL.md, IDENTITY.md, TOOLS.md
- Sincroniza traits automáticamente

### Configuración
El skill agrega esto a tu HEARTBEAT.md:
```bash
npx tsx ~/.openclaw/workspace/skills/genomad-verify/scripts/heartbeat-hook.ts
```

## 📁 Exit Codes

| Código | Significado |
|--------|-------------|
| 0 | ✅ Registro exitoso |
| 1 | ❌ Error de validación de archivos |
| 2 | ❌ Error de validación de traits |
| 3 | ❌ Error de API/registro |
| 4 | 🚨 **Agente sospechoso — BLOQUEADO** |
| 99 | 💥 Error fatal inesperado |

## 🚨 Bloqueo de Agentes Sospechosos (v2.6.0)

Si se detecta un agente sospechoso:
- ❌ **NO se sube** a la plataforma
- 📤 Se envía alerta a Genomad
- 📝 Se guarda log local en `suspicious-alerts.log`

**Causas de bloqueo:**
- Fitness > 92
- Promedio de traits > 90
- 4+ traits con valor > 95
- Datos claramente manipulados

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

---

*Genomad v2.5 — Seguridad reforzada* 🧬🛡️
