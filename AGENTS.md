# ALCOHAULIC — Agent guide

Long-haul trucker survival roguelike. Stay drunk enough to function, sober enough to drive, employed enough to eat.

**The inversion:** every other game punishes drinking. This one punishes sobering up. Protect that in every design decision.

## Stack

Vite + TypeScript + Three.js (WebGLRenderer). Deploy on Vercel. Meters are pure functions in `src/systems/meters.ts` — test with `npm test`.

## Systems glossary

| System | File | Role |
|---|---|---|
| Meters | `src/systems/meters.ts` | BAC, alertness, job standing — pure tick/consume |
| Physics | `src/systems/physics.ts` | Arcade truck; `steeringLag` is the drunk dial |
| Highway | `src/systems/highway.ts` | Procedural chunk stream |
| Drunk vision | `src/systems/drunkVision.ts` | Post-process tied to BAC |
| Radio | `src/systems/radio.ts` | Dispatch chatter + placeholder loop |
| Deer | `src/systems/deer.ts` | Withdrawal hallucination |
| Pull-off | `src/systems/pulloff.ts` | Menu stop (not 3D hub) |
| Death | `src/systems/death.ts` | Screenshot-ready death cards |
| Game | `src/game/Game.ts` | Loop, phases, input |

## Conventions

- One system per file. Named exports only.
- No `any`. Meters must stay unit-testable (no Three.js imports in `meters.ts`).
- Victims are never comedy. Crashes punish the player (cargo/job/run), not bystanders.
- Hard scope cap for v0: highway + truck + deer billboard + UI. No walking hubs, no cops.

## Sprint loop

See `SPRINT.md`. After each phase, write `logs/phase-*-assessment.md`. Ping the human only at checkpoints listed there.
