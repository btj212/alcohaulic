/** The cast. Dark comedy, real loneliness underneath. Tone checkpoint material. */

import type { Speaker } from "../systems/voice";

export interface StoryBeat {
  speaker: Speaker;
  name: string;
  text: string;
}

/**
 * Opening act — plays in order on haul 1. Sets pace, stakes, and one
 * hook you can't ignore: don't open the trailer.
 */
export const STORY_BEATS: StoryBeat[] = [
  {
    speaker: "marlene",
    name: "MARLENE — dispatch",
    text: "Earl, it's Marlene. Load 447, Reno by dawn. Manifest says medical supplies. Do me a favor — don't open the trailer.",
  },
  {
    speaker: "earl",
    name: "EARL — you",
    text: "Twenty-two years on this road. Never missed a sunrise. Never seen one sober, neither.",
  },
  {
    speaker: "marlene",
    name: "MARLENE — dispatch",
    text: "Last driver who missed Reno is bagging groceries in Elko. Weather says fog. I say drive.",
  },
  {
    speaker: "preacher",
    name: "PREACHER — CB, channel 19",
    text: "Big Bird, this is Preacher. Deer are moving tonight. The real ones don't flicker. You'll learn the difference.",
  },
  {
    speaker: "earl",
    name: "EARL — you",
    text: "Hands steady at point-three. Shaky at point-one. Doctor called it a problem. I call it a dosage.",
  },
  {
    speaker: "lucy",
    name: "LUCY — Lucky Lucy's",
    text: "First exit past the ridge, sugar. Cold cans, warm lights, no questions. Your cooler won't make Reno and you know it.",
  },
];

/** Ambient chatter after the opening act. Prefix shows in the ticker. */
export const DISPATCH_LINES: string[] = [
  "Marlene: You're burning dark you don't have, Earl. Roll.",
  "Preacher: Slow-roller ahead of you. Pass wide, pass sober-ish.",
  "Marlene: Trailer sensor pinged. If you hit something, I don't want to know what.",
  "Preacher: Saw your trailer wobble from a mile back. Sip or sleep, brother.",
  "Radio ad: Gas-N-Go Beans! Legally a beverage. Practically a friend.",
  "Marlene: Weigh station's dark. God looked away. Keep it that way.",
  "Preacher: Channel 19 says Lucy's got a new neon. Some men find religion. You found an exit ramp.",
  "Radio: Fog overnight. Thick as bad decisions, thin as excuses.",
  "Marlene: You want the Fresno run next week? Deliver this one with the doors SHUT.",
  "Preacher: If you're hearing angels, that's withdrawal. Pull over or push through, but pick one.",
  "Radio ad: Lucky Lucy's — the only lights on for sixty miles. Tell 'em the road sent you.",
  "Marlene: Don't get healthy on me now, Earl. Healthy men ask questions.",
];

export const PULLOFF_LINES: string[] = [
  "Sodium lights. A dying ice machine. Home, for an hour.",
  "The clerk doesn't look up. You don't either. Commerce.",
  "Somebody's praying in the lot. You buy beer. Same instinct.",
];

/** Earl's under-the-breath reactions — fed to the voice, not the ticker. */
export const EARL_REACTIONS = {
  sip: ["Hair of the dog.", "There she is.", "Medicine."],
  liquor: ["Whoa. Floor moved.", "That one had opinions."],
  pills: ["Heart says no. Schedule says yes.", "Eyes wide open now."],
  hit: ["Aw, hell.", "That's coming out of my check.", "Sorry, darlin'. Talking to the truck."],
  shaking: ["Hands. C'mon. Not now.", "Gettin' thin, gettin' thin..."],
};

export function pickLine(lines: string[], index: number): string {
  return lines[index % lines.length] ?? lines[0]!;
}
