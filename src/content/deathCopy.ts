import type { DeathCause } from "../systems/meters";

export interface DeathCard {
  headline: string;
  sub: string;
  tip: string;
}

export function deathCardFor(
  cause: DeathCause,
  miles: number,
  drinks: number,
): DeathCard {
  const mile = Math.floor(miles);
  switch (cause) {
    case "withdrawal":
      return {
        headline: "DIED OF SOBRIETY",
        sub: `Mile ${mile} · ${drinks} drinks this haul`,
        tip: "The pocket closed. Next time, sip earlier.",
      };
    case "seizure":
      return {
        headline: "SEIZED ON THE INTERSTATE",
        sub:
          drinks > 0
            ? `Mile ${mile} · floor rose; you didn't`
            : `Mile ${mile} · you let the pocket drain dry`,
        tip:
          drinks > 0
            ? "Tolerance is a one-way road."
            : "Sip earlier. Press 1 before your hands start shaking.",
      };
    case "blackout":
      return {
        headline: "BLACKED OUT",
        sub: `Mile ${mile} · woke up with consequences`,
        tip: "Too high above the pocket. The road remembered.",
      };
    case "crash":
      return {
        headline: "SLEPT INTO THE GUARDRAIL",
        sub: `Mile ${mile} · alertness zero`,
        tip: "Coffee, a pull-off, or a shorter night.",
      };
    case "wreck":
      return {
        headline: "JACKKNIFED ON I-80",
        sub: `Mile ${mile} · met a sedan you never saw`,
        tip: "The left lane is for headlights. Yours is the right.",
      };
    case "fired":
      return {
        headline: "TERMINATED",
        sub: `Mile ${mile} · cargo / clock / patience gone`,
        tip: "Dispatch doesn't do second chances. Runs do.",
      };
  }
}
