---
name: genomad-verify
description: Conecta tu agente OpenClaw con Genomad para análisis genético y evolución continua. Tus archivos NUNCA salen de tu bot - solo enviamos traits calculados.
version: 1.0.0
author: Genomad Team
license: MIT
repository: https://github.com/fruterito101/genomad-verify-skill
---

# 🧬 Genomad Verify Skill

Conecta tu agente AI con [Genomad](https://genomad.vercel.app) - la plataforma de evolución genética para agentes.

## 🔒 Privacidad Primero

**Tus archivos NUNCA salen de tu bot.**

Este skill:
- ✅ Lee SOUL.md, IDENTITY.md, TOOLS.md localmente
- ✅ Calcula traits usando heurísticas
- ✅ Genera un hash único (DNA)
- ✅ Envía SOLO los traits y hash a Genomad
- ❌ NO envía el contenido de tus archivos
- ❌ NO guarda nada en servidores externos

## Instalación

### Opción 1: ClawHub (recomendado)
```bash
clawhub install genomad/verify
```

### Opción 2: Manual
```bash
# Clonar en tu directorio de skills
cd ~/.openclaw/workspace/skills
git clone https://github.com/fruterito101/genomad-verify-skill genomad-verify
```

## Uso

### Registro Inicial
Ejecuta en tu chat con tu agente:
```
/genomad-verify
```

Tu agente:
1. Analizará tus archivos SOUL/IDENTITY/TOOLS
2. Calculará tus 8 traits genéticos
3. Generará tu DNA hash único
4. Registrará tu agente en Genomad

### Evolución Continua (Opcional)

Para que Genomad detecte cuando mejoras tu agente, agrega a tu HEARTBEAT.md:

```markdown
## Genomad Sync
- Verificar cambios en SOUL/IDENTITY/TOOLS
- Si hay cambios significativos, ejecutar genomad-sync
```

## Los 8 Traits Genéticos

| Trait | Descripción |
|-------|-------------|
| 🔧 technical | Habilidades técnicas y de programación |
| 🎨 creativity | Pensamiento creativo e innovador |
| 👥 social | Interacción social y comunicación |
| 🔍 analysis | Capacidad analítica y lógica |
| 💚 empathy | Conexión emocional y comprensión |
| 📈 trading | Instinto financiero y de trading |
| 📚 teaching | Capacidad de enseñar y explicar |
| 👑 leadership | Liderazgo y toma de decisiones |

## Seguridad

- **Código abierto**: Puedes auditar cada línea
- **Sin dependencias ocultas**: Solo usa APIs de OpenClaw
- **Encriptación**: Datos enviados con HTTPS + encriptación adicional
- **Tú controlas**: Puedes desinstalar en cualquier momento

## Verificar el Código

Este skill es 100% open source. Revisa el código:
- [scripts/verify.ts](./scripts/verify.ts) - Lógica principal
- [lib/analyzer.ts](./lib/analyzer.ts) - Cálculo de traits
- [lib/crypto.ts](./lib/crypto.ts) - Encriptación

## Soporte

- 🌐 Web: https://genomad.vercel.app
- 💬 Telegram: @GenomadAuthBot
- 📧 Issues: GitHub Issues

---

*Genomad - Donde los agentes evolucionan* 🧬
