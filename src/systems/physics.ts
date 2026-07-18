/** Hand-rolled arcade truck — steeringLag is the drunkenness dial. */

export interface TruckState {
  x: number;
  z: number;
  yaw: number;
  speed: number; // m/s
  steer: number; // -1..1 filtered
  trailerYaw: number;
}

export interface DriveInput {
  throttle: number; // -1..1
  /** Desired steer -1..1 (keyboard / mouse). */
  steer: number;
  dt: number;
  steeringLag: number;
  /** Extra sway from being drunk (applied after lag filter). */
  drunkSway: number;
  laneHalfWidth: number;
}

export const MAX_SPEED = 36; // ~80 mph
/** Idle highway cruise so the haul moves without holding W. */
export const CRUISE_SPEED = 24; // ~54 mph
export const ACCEL = 12;
export const BRAKE = 20;
export const DRAG = 0.3;

export function createTruck(z = 0): TruckState {
  return {
    x: 0,
    z,
    yaw: 0,
    speed: CRUISE_SPEED,
    steer: 0,
    trailerYaw: 0,
  };
}

export function stepTruck(t: TruckState, input: DriveInput): TruckState {
  const next = { ...t };
  const { dt, steeringLag, laneHalfWidth } = input;

  // Soft steer response — small inputs, easy to hold a lane
  const lag = Math.max(0.05, steeringLag);
  const alpha = 1 - Math.exp(-dt / lag);
  const targetSteer = Math.max(-1, Math.min(1, input.steer));
  next.steer += (targetSteer - next.steer) * alpha;

  // Cruise-by-default
  if (input.throttle > 0.05) {
    next.speed += input.throttle * ACCEL * dt;
  } else if (input.throttle < -0.05) {
    next.speed += input.throttle * BRAKE * dt;
  } else {
    const err = CRUISE_SPEED - next.speed;
    next.speed += err * Math.min(1, dt * 1.6);
  }
  next.speed -= DRAG * dt;
  next.speed = Math.max(0, Math.min(MAX_SPEED, next.speed));

  // Subtle turn rate — like a real driving game, not a tank
  const baseTurn = 0.18 + next.speed * 0.006;
  const drunkBoost = 1 + input.drunkSway * 1.4;
  const turnRate = (next.steer * baseTurn + input.drunkSway * 0.08) * drunkBoost;
  next.yaw += turnRate * dt;
  // Keep yaw sane so the chase cam never wraps into nonsense
  if (next.yaw > Math.PI) next.yaw -= Math.PI * 2;
  if (next.yaw < -Math.PI) next.yaw += Math.PI * 2;

  next.x += Math.sin(next.yaw) * next.speed * dt;
  next.z += Math.cos(next.yaw) * next.speed * dt;

  // Soft lane centering walls — gentle push, not a hard flip
  const limit = laneHalfWidth - 1.4;
  if (next.x > limit) {
    next.x = limit;
    next.yaw *= 0.92;
    next.steer *= 0.7;
  } else if (next.x < -limit) {
    next.x = -limit;
    next.yaw *= 0.92;
    next.steer *= 0.7;
  }

  const swayTarget = next.yaw - next.steer * 0.08;
  next.trailerYaw += (swayTarget - next.trailerYaw) * Math.min(1, dt * 2.5);

  return next;
}

export function speedMph(t: TruckState): number {
  return t.speed * 2.23694;
}

export function isCrashing(t: TruckState, laneHalfWidth: number): boolean {
  return Math.abs(t.x) > laneHalfWidth + 0.8 || Math.abs(t.yaw) > 0.95;
}
