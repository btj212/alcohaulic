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
  steer: number; // -1..1
  dt: number;
  steeringLag: number;
  laneHalfWidth: number;
}

export const MAX_SPEED = 38; // ~85 mph
/** Idle highway cruise so the haul moves without holding W. */
export const CRUISE_SPEED = 24; // ~54 mph
export const ACCEL = 14;
export const BRAKE = 22;
export const DRAG = 0.35;

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

  // Lagged steering — higher lag = drunker / shakier
  const lag = Math.max(0.02, steeringLag);
  const alpha = 1 - Math.exp(-dt / lag);
  next.steer += (input.steer - next.steer) * alpha;

  // Cruise-by-default: coast toward cruise unless braking or boosting
  if (input.throttle > 0.05) {
    next.speed += input.throttle * ACCEL * dt;
  } else if (input.throttle < -0.05) {
    next.speed += input.throttle * BRAKE * dt;
  } else {
    const err = CRUISE_SPEED - next.speed;
    next.speed += err * Math.min(1, dt * 1.8);
  }
  next.speed -= DRAG * dt;
  next.speed = Math.max(0, Math.min(MAX_SPEED, next.speed));

  // Yaw from steer * speed
  const turnRate = next.steer * (0.55 + next.speed * 0.02);
  next.yaw += turnRate * dt;

  // Integrate position (yaw 0 = +Z forward)
  next.x += Math.sin(next.yaw) * next.speed * dt;
  next.z += Math.cos(next.yaw) * next.speed * dt;

  // Soft lane walls
  const limit = laneHalfWidth - 1.2;
  if (next.x > limit) {
    next.x = limit;
    next.yaw *= 0.85;
    next.steer *= 0.5;
  } else if (next.x < -limit) {
    next.x = -limit;
    next.yaw *= 0.85;
    next.steer *= 0.5;
  }

  // Trailer sway
  const swayTarget = next.yaw - next.steer * 0.15;
  next.trailerYaw += (swayTarget - next.trailerYaw) * Math.min(1, dt * 3);

  return next;
}

export function speedMph(t: TruckState): number {
  return t.speed * 2.23694;
}

/** Off-road / hard crash if lateral error huge or yaw wild. */
export function isCrashing(t: TruckState, laneHalfWidth: number): boolean {
  return Math.abs(t.x) > laneHalfWidth + 0.5 || Math.abs(t.yaw) > 1.1;
}
