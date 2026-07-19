/** Dark comedy dispatch + radio lines. Tone checkpoint material. */

/** First-haul tutorial — plays in order before generic chatter. */
export const STORY_LINES: string[] = [
  "Dispatch: Load 447. Reno by dawn. Stay in the pocket — too sober kills you, too drunk kills the load.",
  "Dispatch: Cooler’s stocked for Lucy’s. That’s five minutes if you sip, not chug.",
  "CB: BAC drains while you drive. Tap 1 for beer when the bar slides left of the notch.",
  "Radio ad: Lucky Lucy’s — pink neon, cold cans, no questions. Next exit that isn’t a church.",
  "Dispatch: Coffee (3) wires you bright. Liquor (2) floats the wheel. Learn which devil you need.",
  "CB: If the road swims, you overdid it. If your hands shake, you underdid it.",
];

export const DISPATCH_LINES: string[] = [
  "Dispatch: You're burning daylight you don't have. Move.",
  "CB: Slow-roller ahead in your lane. Pass clean or eat the trailer.",
  "Dispatch: Cargo sensor says you hit something. Sensor better be drunk too.",
  "CB: Deer are moving tonight. The real ones don't flicker.",
  "Dispatch: Cargo's fragile. Unlike your liver.",
  "CB: Anybody copy? Got a ghost deer on 80 westbound. Again.",
  "Radio ad: Stay awake with Gas-N-Go Beans — legally a beverage.",
  "Dispatch: Mile marker check. Prefer you sober-adjacent, not saintly.",
  "CB: Lot lizard two exits up says she knows a guy. She always does.",
  "Dispatch: Late means fired. Fired means walking. Walking means sober. Don't.",
  "Radio: Weather overnight — fog thick as bad decisions.",
  "Dispatch: Weigh station's closed. God's drunk too.",
  "CB: If you're hearing angels, that's withdrawal. Pull over or push through.",
  "Dispatch: Good job on the last haul. Don't ruin it by getting healthy.",
];

export const PULLOFF_LINES: string[] = [
  "Sodium lights. Hum of a dying ice machine. Home, for an hour.",
  "Clerk doesn't look up. You don't either.",
  "Somebody's praying in the lot. You buy beer.",
];

export function pickLine(lines: string[], index: number): string {
  return lines[index % lines.length] ?? lines[0]!;
}
