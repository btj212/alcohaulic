# Phase A assessment — Greybox

**Date:** 2026-07-18

## Rubric

| Check | Result |
|---|---|
| Truck on procedural highway | Pass — chunk streaming ± ahead/behind |
| Chase cam | Pass — lagged follow behind rig |
| Arcade physics + steeringLag | Pass — exposed dial in HUD |
| Fog + night | Pass — FogExp2 + sodium/teal mood |
| Cold build | Pass — `npm run build` |

## Notes

- WebGLRenderer (not WebGPU) per sprint plan.
- Low-poly flatShading materials; draw distance via fog.
- FPS not measured in headless cloud; pixelRatio capped at 1.5 for potato laptops.
