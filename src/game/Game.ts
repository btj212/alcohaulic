import * as THREE from "three";
import {
  DEFAULT_INVENTORY,
  DEFAULT_METERS,
  STRIP_CLUB_MILES,
  applyConsumable,
  applyJobProgress,
  applySleep,
  buyItem,
  checkFired,
  drunkSwayFromBac,
  drunkVisionIntensity,
  needsSip,
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
import {
  createCabAudio,
  playSipSound,
  startCabAudio,
  updateCabAudio,
} from "../systems/cabAudio";
import { createStripClub, updateStripClub } from "../systems/stripClub";
import { createTruckMesh, syncTruckMesh } from "../render/truck";
import { createHUD, setHudSpeed } from "../ui/hud";
import { createCabPortrait } from "../ui/cabPortrait";
import { deathCardFor } from "../content/deathCopy";
import { PULLOFF_LINES, STORY_LINES, pickLine } from "../content/dispatch";

type Phase = "title" | "playing" | "pulloff" | "dead" | "won";

const HAUL_QUOTA = 12;
const PRICES: Record<Consumable, number> = { beer: 4, liquor: 12, coffee: 3 };

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cameraRig: THREE.Group;
  private clock = new THREE.Clock();
  private truck!: TruckState;
  private truckMesh!: THREE.Group;
  private highway = createHighway();
  private stripClub = createStripClub();
  private deer = createDeer();
  private keys = new Set<string>();
  private mouseSteer = 0;
  private mouseActive = false;
  private meters: MeterState = { ...DEFAULT_METERS };
  private inventory: Inventory = { ...DEFAULT_INVENTORY };
  private phase: Phase = "title";
  private hud = createHUD(document.body);
  private portrait = createCabPortrait(document.body);
  private vision = createDrunkVision(document.body);
  private radio = createRadio(document.body);
  private cabAudio = createCabAudio();
  private lookNudge = { x: 0, y: 0 };
  private microSleep = false;
  private microTimer = 0;
  private night = 1;
  private sun!: THREE.DirectionalLight;
  private hemi!: THREE.HemisphereLight;
  private mood!: THREE.PointLight;
  private pulloffIndex = 0;
  private tipTimer = 0;
  private storyIndex = 0;
  private storyTimer = 2.5;
  private atStripClub = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c1018);
    this.scene.fog = new THREE.FogExp2(0x121826, 0.014);

    this.cameraRig = new THREE.Group();
    this.scene.add(this.cameraRig);
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      280,
    );
    this.cameraRig.add(this.camera);

    this.hemi = new THREE.HemisphereLight(0x6a7a99, 0x1a1410, 1.15);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xa8b8d0, 0.85);
    this.sun.position.set(-20, 40, 10);
    this.scene.add(this.sun);

    this.mood = new THREE.PointLight(0x5aa8a8, 2.4, 100);
    this.mood.position.set(0, 14, 0);
    this.scene.add(this.mood);

    const fill = new THREE.AmbientLight(0x2a3040, 0.45);
    this.scene.add(fill);

    this.scene.add(this.highway.group);
    this.scene.add(this.stripClub.group);
    const built = createTruckMesh();
    this.truckMesh = built.mesh;
    this.scene.add(this.truckMesh);
    this.scene.add(this.deer.mesh);

    this.truck = createTruck();
    syncTruckMesh(this.truckMesh, this.truck);
    updateHighway(this.highway, this.truck.z);
    this.cameraRig.position.set(0, 4.4, -12);

    this.bindInput();
    this.bindHUD();

    window.addEventListener("resize", () => this.onResize());
    this.hud.showTitle(true);
    this.portrait.root.classList.add("hidden");
  }

  private bindHUD(): void {
    this.hud.onStart = () => {
      unmuteRadio(this.radio);
      startCabAudio(this.cabAudio);
      this.resetRun();
      this.phase = "playing";
      this.tipTimer = 7;
      this.storyTimer = 1.5;
      this.storyIndex = 0;
      this.hud.showTitle(false);
      this.hud.showDeath(null);
      this.portrait.root.classList.remove("hidden");
      this.hud.showTip("Cruise is on. A/D or mouse to steer · 1 beer when the pocket dips");
    };
    this.hud.onRestart = () => {
      this.hud.showDeath(null);
      this.hud.showTip(null);
      this.hud.showTitle(true);
      this.portrait.root.classList.add("hidden");
      this.phase = "title";
      this.atStripClub = false;
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
          this.hud.showPulloff(true, this.meters, this.inventory, this.atStripClub);
        }
      } else if (action === "sleep") {
        this.meters = applySleep(this.meters);
        this.hud.showPulloff(true, this.meters, this.inventory, this.atStripClub);
      }
    };
    this.hud.onResume = () => {
      this.phase = "playing";
      this.hud.showPulloff(false, this.meters, this.inventory, false);
      if (this.atStripClub) {
        this.atStripClub = false;
        this.hud.showTip("Back on the blacktop. Pocket still shrinking.");
        this.tipTimer = 4;
      }
    };
  }

  private bindInput(): void {
    window.addEventListener("keydown", (e) => {
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(
          e.code,
        )
      ) {
        e.preventDefault();
      }
      this.keys.add(e.code);
      if (this.phase !== "playing") return;
      if (e.code === "Digit1") this.consume("beer");
      if (e.code === "Digit2") this.consume("liquor");
      if (e.code === "Digit3") this.consume("coffee");
      if (e.code === "KeyP") this.openPulloff(false);
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));

    window.addEventListener("mousemove", (e) => {
      if (this.phase !== "playing") return;
      // Mouse X → subtle steer; center of screen = straight
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseSteer = Math.max(-1, Math.min(1, nx * 0.85));
      this.mouseActive = true;
    });
    window.addEventListener("mouseleave", () => {
      this.mouseActive = false;
      this.mouseSteer = 0;
    });
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
      playSipSound(this.cabAudio);
      this.portrait.playConsume(item);
      if (item === "coffee") {
        this.hud.showTip("Gas-station lightning. Hands buzz. Eyes too open.");
        this.tipTimer = 2.5;
      } else if (item === "liquor") {
        this.hud.showTip("The wheel gets farther away.");
        this.tipTimer = 2.2;
      }
    }
  }

  private openPulloff(stripClub: boolean): void {
    if (this.phase !== "playing" && !stripClub) return;
    this.phase = "pulloff";
    this.atStripClub = stripClub;
    const blurb = this.hud.root.querySelector("#pulloff-blurb");
    if (blurb) {
      blurb.textContent = stripClub
        ? "Lucky Lucy's. Neon hum. Your cooler is a crime scene. Restock or regret."
        : pickLine(PULLOFF_LINES, this.pulloffIndex++);
    }
    this.hud.showPulloff(true, this.meters, this.inventory, stripClub);
  }

  private resetRun(): void {
    this.meters = { ...DEFAULT_METERS };
    this.inventory = { ...DEFAULT_INVENTORY };
    this.truck = createTruck();
    this.microSleep = false;
    this.microTimer = 0;
    this.night = 1;
    this.stripClub.approached = false;
    this.stripClub.offered = false;
    this.atStripClub = false;
    this.mouseSteer = 0;
  }

  private die(cause: DeathCause): void {
    if (this.phase === "dead") return;
    this.phase = "dead";
    this.hud.showTip(null);
    if (cause === "blackout" || cause === "crash") {
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

  private placeCamera(t: number, playing: boolean): void {
    const behind = 12;
    const height = 4.4;
    const yaw = this.truck.yaw;
    const camX = this.truck.x - Math.sin(yaw) * behind;
    const camZ = this.truck.z - Math.cos(yaw) * behind;

    if (playing) {
      this.cameraRig.position.x += (camX - this.cameraRig.position.x) * 0.14;
      this.cameraRig.position.y += (height - this.cameraRig.position.y) * 0.14;
      this.cameraRig.position.z += (camZ - this.cameraRig.position.z) * 0.14;
    } else {
      this.cameraRig.position.set(
        this.truck.x + Math.sin(t * 0.12) * 1.2,
        height,
        this.truck.z - behind,
      );
    }

    const lookX =
      this.truck.x +
      Math.sin(yaw) * 10 +
      (playing ? this.lookNudge.x : 0);
    const lookY = 1.5 + (playing ? this.lookNudge.y : 0);
    const lookZ = this.truck.z + Math.cos(yaw) * 10;
    this.cameraRig.lookAt(lookX, lookY, lookZ);
    // Camera stays identity under the rig — no Euler after lookAt
    this.camera.rotation.set(0, 0, 0);
    this.camera.position.set(0, 0, 0);
  }

  private frame(): void {
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;

    if (this.phase === "playing") {
      this.tickPlay(dt, t);
    } else if (this.phase === "pulloff") {
      syncTruckMesh(this.truckMesh, this.truck);
      updateHighway(this.highway, this.truck.z);
      updateStripClub(this.stripClub, this.truck.z, this.meters.miles);
      this.placeCamera(t, false);
      this.portrait.setState(this.meters, this.inventory);
    } else {
      this.truck.z += dt * 6;
      syncTruckMesh(this.truckMesh, this.truck);
      updateHighway(this.highway, this.truck.z);
      updateStripClub(this.stripClub, this.truck.z, 0);
      this.placeCamera(t, false);
    }

    this.mood.position.set(this.truck.x, 14, this.truck.z + 8);
    const fog = this.scene.fog as THREE.FogExp2;
    fog.density = 0.012 + this.night * 0.006;
    this.hemi.intensity = 0.85 + (1 - this.night) * 0.45;
    this.sun.intensity = 0.55 + (1 - this.night) * 0.5;

    this.renderer.render(this.scene, this.camera);
  }

  private tickPlay(dt: number, t: number): void {
    let steer = 0;
    let throttle = 0;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) steer -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) steer += 1;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) throttle += 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) throttle -= 1;

    // Blend mouse (subtle) with keyboard (stronger taps)
    if (this.mouseActive && Math.abs(steer) < 0.1) {
      steer = this.mouseSteer * 0.55;
    } else if (this.mouseActive) {
      steer = steer * 0.7 + this.mouseSteer * 0.3;
    }

    if (this.microSleep) {
      this.microTimer -= dt;
      steer += (Math.random() - 0.5) * 0.55;
      if (this.microTimer <= 0) this.microSleep = false;
    }

    const lag = steeringLagFromBac(this.meters);
    const sway = drunkSwayFromBac(this.meters);
    // Continuous drunk veer noise
    const drunkSway =
      sway * (Math.sin(t * 0.7) * 0.35 + Math.sin(t * 1.9) * 0.2);

    this.truck = stepTruck(this.truck, {
      throttle,
      steer,
      dt,
      steeringLag: lag,
      drunkSway,
      laneHalfWidth: this.highway.laneHalfWidth,
    });

    syncTruckMesh(this.truckMesh, this.truck);
    updateHighway(this.highway, this.truck.z);

    const club = updateStripClub(this.stripClub, this.truck.z, this.meters.miles);
    if (this.stripClub.approached && club.distanceM < 350 && club.distanceM > 100) {
      this.hud.showTip("Pink neon on the right — Lucky Lucy's. Your cooler is dying.");
      this.tipTimer = 3;
    }
    if (club.shouldOffer) {
      this.radio.el.textContent =
        "Dispatch: Exit coming. Restock or you're walking. Lucy's lights are on.";
      this.radio.el.classList.add("show");
      window.setTimeout(() => this.radio.el.classList.remove("show"), 6000);
      this.openPulloff(true);
      return;
    }

    this.placeCamera(t, true);

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
      this.microTimer = 0.45 + Math.random() * 0.35;
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
      wired: this.meters.wired,
      microSleep: this.microSleep,
      camera: this.camera,
      time: t,
      lookNudge: this.lookNudge,
    });

    const withdrawal = Math.max(
      0,
      (this.meters.floor + 0.04 - this.meters.bac) /
        Math.max(0.08, this.meters.floor),
    );
    updateCabAudio(this.cabAudio, { speedMph: mph, withdrawal, dt });

    // Story radio for the first leg
    this.storyTimer -= dt;
    if (this.storyTimer <= 0 && this.storyIndex < STORY_LINES.length) {
      this.radio.el.textContent = STORY_LINES[this.storyIndex]!;
      this.radio.el.classList.add("show");
      this.storyIndex += 1;
      this.storyTimer = 14 + Math.random() * 6;
      window.setTimeout(() => this.radio.el.classList.remove("show"), 6500);
    } else {
      updateRadio(this.radio, dt, this.storyIndex >= STORY_LINES.length);
    }

    this.hud.setPlaying(this.meters, this.inventory, HAUL_QUOTA, lag);
    setHudSpeed(this.hud, mph, this.meters.miles, lag);
    this.portrait.setState(this.meters, this.inventory);

    if (this.tipTimer > 0) {
      this.tipTimer -= dt;
      if (this.tipTimer <= 0) this.hud.showTip(null);
    } else if (needsSip(this.meters)) {
      const urgent = this.meters.bac < this.meters.floor;
      this.hud.showTip(
        urgent
          ? "HANDS SHAKING — 1 beer or 2 liquor"
          : "BAC dropping — press 1 to sip",
        urgent,
      );
    } else if (
      this.inventory.beer + this.inventory.liquor <= 2 &&
      this.meters.miles < STRIP_CLUB_MILES
    ) {
      this.hud.showTip("Cooler’s light. Make it to Lucy’s.");
    }

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

    if (this.meters.miles >= HAUL_QUOTA) {
      this.phase = "won";
      this.hud.showTip(null);
      this.hud.showDeath({
        headline: "LOAD DELIVERED",
        sub: `Mile ${Math.floor(this.meters.miles)} · still employed, still thirsty`,
        tip: "The pocket doesn't reset. Another haul?",
      });
    }

    this.night = Math.max(0.35, 1 - this.meters.miles / (HAUL_QUOTA * 1.4));
  }
}
