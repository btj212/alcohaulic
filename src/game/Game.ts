import * as THREE from "three";
import {
  DEFAULT_INVENTORY,
  DEFAULT_METERS,
  applyConsumable,
  applyJobProgress,
  applySleep,
  buyItem,
  checkFired,
  drunkVisionIntensity,
  steeringLagFromBac,
  tickMeters,
  tremorIntensity,
  type Consumable,
  type DeathCause,
  type Inventory,
  type MeterState,
} from "../systems/meters";
import {
  createTruck,
  isCrashing,
  speedMph,
  stepTruck,
  type TruckState,
} from "../systems/physics";
import { createHighway, updateHighway } from "../systems/highway";
import { applyDrunkVision, createDrunkVision } from "../systems/drunkVision";
import { createDeer, updateDeer } from "../systems/deer";
import { createRadio, unmuteRadio, updateRadio } from "../systems/radio";
import { createTruckMesh, syncTruckMesh } from "../render/truck";
import { createHUD, setHudSpeed } from "../ui/hud";
import { deathCardFor } from "../content/deathCopy";
import { PULLOFF_LINES, pickLine } from "../content/dispatch";

type Phase = "title" | "playing" | "pulloff" | "dead" | "won";

const HAUL_QUOTA = 12; // miles — ~3–6 min at highway speed with drama
const PRICES: Record<Consumable, number> = { beer: 4, liquor: 12, coffee: 3 };

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private truck!: TruckState;
  private truckMesh!: THREE.Group;
  private highway = createHighway();
  private deer = createDeer();
  private keys = new Set<string>();
  private meters: MeterState = { ...DEFAULT_METERS };
  private inventory: Inventory = { ...DEFAULT_INVENTORY };
  private phase: Phase = "title";
  private hud = createHUD(document.body);
  private vision = createDrunkVision(document.body);
  private radio = createRadio(document.body);
  private microSleep = false;
  private microTimer = 0;
  private night = 1;
  private sun!: THREE.DirectionalLight;
  private hemi!: THREE.HemisphereLight;
  private pulloffIndex = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05060a);
    this.scene.fog = new THREE.FogExp2(0x0a0c14, 0.028);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      220,
    );

    this.hemi = new THREE.HemisphereLight(0x1a2030, 0x0a0806, 0.55);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0x6a7a99, 0.35);
    this.sun.position.set(-20, 40, 10);
    this.scene.add(this.sun);

    // Teal sodium mood light
    const mood = new THREE.PointLight(0x3a8a8a, 1.2, 80);
    mood.position.set(0, 12, 0);
    this.scene.add(mood);

    this.scene.add(this.highway.group);
    this.truckMesh = createTruckMesh();
    this.scene.add(this.truckMesh);
    this.scene.add(this.deer.mesh);

    this.truck = createTruck();
    this.bindInput();
    this.bindHUD();

    window.addEventListener("resize", () => this.onResize());
    this.hud.showTitle(true);
  }

  private bindHUD(): void {
    this.hud.onStart = () => {
      unmuteRadio(this.radio);
      this.resetRun();
      this.phase = "playing";
      this.hud.showTitle(false);
      this.hud.showDeath(null);
    };
    this.hud.onRestart = () => {
      this.hud.showDeath(null);
      this.hud.showTitle(true);
      this.phase = "title";
    };
    this.hud.onPulloffAction = (action) => {
      if (action.startsWith("buy:")) {
        const item = action.slice(4) as Consumable;
        const { meters, inventory, ok } = buyItem(
          this.meters,
          this.inventory,
          item,
          PRICES[item],
        );
        if (ok) {
          this.meters = meters;
          this.inventory = inventory;
          this.hud.showPulloff(true, this.meters, this.inventory);
        }
      } else if (action === "sleep") {
        this.meters = applySleep(this.meters);
        this.hud.showPulloff(true, this.meters, this.inventory);
      }
    };
    this.hud.onResume = () => {
      this.phase = "playing";
      this.hud.showPulloff(false, this.meters, this.inventory);
    };
  }

  private bindInput(): void {
    window.addEventListener("keydown", (e) => {
      this.keys.add(e.code);
      if (this.phase !== "playing") return;
      if (e.code === "Digit1") this.consume("beer");
      if (e.code === "Digit2") this.consume("liquor");
      if (e.code === "Digit3") this.consume("coffee");
      if (e.code === "KeyP") this.openPulloff();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
  }

  private consume(item: Consumable): void {
    const { meters, inventory, ok } = applyConsumable(
      this.meters,
      this.inventory,
      item,
    );
    if (ok) {
      this.meters = meters;
      this.inventory = inventory;
    }
  }

  private openPulloff(): void {
    if (this.phase !== "playing") return;
    this.phase = "pulloff";
    const blurb = this.hud.root.querySelector("#pulloff-blurb");
    if (blurb) {
      blurb.textContent = pickLine(PULLOFF_LINES, this.pulloffIndex++);
    }
    this.hud.showPulloff(true, this.meters, this.inventory);
  }

  private resetRun(): void {
    this.meters = { ...DEFAULT_METERS };
    this.inventory = { ...DEFAULT_INVENTORY };
    this.truck = createTruck();
    this.microSleep = false;
    this.microTimer = 0;
    this.night = 1;
  }

  private die(cause: DeathCause): void {
    if (this.phase === "dead") return;
    this.phase = "dead";
    if (cause === "blackout") {
      // Soft fail: wake with consequences, then death card still (run ends)
      this.meters = applyJobProgress(this.meters, {
        onTime: false,
        crashed: true,
      });
    }
    if (cause === "crash") {
      this.meters = applyJobProgress(this.meters, {
        onTime: false,
        crashed: true,
      });
    }
    this.hud.showDeath(
      deathCardFor(cause, this.meters.miles, this.meters.drinksTaken),
    );
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  start(): void {
    this.clock.start();
    const loop = () => {
      this.frame();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private frame(): void {
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;

    if (this.phase === "playing") {
      this.tickPlay(dt, t);
    } else {
      // Idle camera drift on title
      this.camera.position.set(
        Math.sin(t * 0.15) * 6,
        4,
        this.truck.z - 12,
      );
      this.camera.lookAt(this.truck.x, 1.5, this.truck.z);
      updateHighway(this.highway, this.truck.z);
    }

    // Mood: night-heavy
    const fog = this.scene.fog as THREE.FogExp2;
    fog.density = 0.024 + this.night * 0.01;
    this.hemi.intensity = 0.35 + (1 - this.night) * 0.4;

    this.renderer.render(this.scene, this.camera);
  }

  private tickPlay(dt: number, t: number): void {
    let steer = 0;
    let throttle = 0;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) steer -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) steer += 1;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) throttle += 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) throttle -= 1;

    if (this.microSleep) {
      this.microTimer -= dt;
      steer += (Math.random() - 0.5) * 1.8;
      if (this.microTimer <= 0) this.microSleep = false;
    }

    const lag = steeringLagFromBac(this.meters);
    this.truck = stepTruck(this.truck, {
      throttle,
      steer,
      dt,
      steeringLag: lag,
      laneHalfWidth: this.highway.laneHalfWidth,
    });

    syncTruckMesh(this.truckMesh, this.truck);
    updateHighway(this.highway, this.truck.z);

    // Chase cam
    const behind = 11;
    const height = 4.2;
    const camX = this.truck.x - Math.sin(this.truck.yaw) * behind;
    const camZ = this.truck.z - Math.cos(this.truck.yaw) * behind;
    this.camera.position.lerp(
      new THREE.Vector3(camX, height, camZ),
      1 - Math.exp(-dt * 4),
    );
    this.camera.lookAt(
      this.truck.x + Math.sin(this.truck.yaw) * 8,
      1.4,
      this.truck.z + Math.cos(this.truck.yaw) * 8,
    );

    const mph = speedMph(this.truck);
    const tick = tickMeters(this.meters, {
      dt,
      speedMph: mph,
      nightFactor: this.night,
      consuming: false,
    });
    this.meters = tick.meters;

    if (tick.microSleep && !this.microSleep) {
      this.microSleep = true;
      this.microTimer = 0.55 + Math.random() * 0.4;
    }

    updateDeer(this.deer, {
      belowFloor: this.meters.bac < this.meters.floor,
      truckX: this.truck.x,
      truckZ: this.truck.z,
      truckYaw: this.truck.yaw,
      dt,
    });

    applyDrunkVision(this.vision, {
      intensity: drunkVisionIntensity(this.meters),
      tremor: tremorIntensity(this.meters),
      microSleep: this.microSleep,
      camera: this.camera,
      time: t,
    });

    updateRadio(this.radio, dt, true);
    this.hud.setPlaying(this.meters, this.inventory, HAUL_QUOTA, lag);
    setHudSpeed(this.hud, mph, this.meters.miles, lag);

    // Fail states
    if (isCrashing(this.truck, this.highway.laneHalfWidth)) {
      this.die("crash");
      return;
    }
    if (tick.death) {
      this.die(tick.death);
      return;
    }
    if (checkFired(this.meters)) {
      this.die("fired");
      return;
    }

    // Win haul
    if (this.meters.miles >= HAUL_QUOTA) {
      this.phase = "won";
      this.hud.showDeath({
        headline: "LOAD DELIVERED",
        sub: `Mile ${Math.floor(this.meters.miles)} · still employed, still thirsty`,
        tip: "The pocket doesn't reset. Another haul?",
      });
    }

    // Dawn creeps (visual only) as miles accumulate
    this.night = Math.max(0.35, 1 - this.meters.miles / (HAUL_QUOTA * 1.4));
  }
}
