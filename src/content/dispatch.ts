/** Dark comedy dispatch + radio lines. Tone checkpoint material. */

export const DISPATCH_LINES: string[] = [
  "Dispatch: Load 447. Reno by dawn. Don't make me call your mother.",
  "Dispatch: You're burning daylight you don't have. Move.",
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
