export const roundRules = {
  1: {
    title: "ROUND 1",
    label: "Describe freely",
    detail: "Say anything except the name on the card.",
  },
  2: {
    title: "ROUND 2",
    label: "One word only",
    detail: "Choose one clue word. No extra sounds or gestures.",
  },
  3: {
    title: "ROUND 3",
    label: "Mime only",
    detail: "No words. Act it out.",
  },
} as const;

export function ruleForRound(roundNumber: number) {
  return roundRules[(roundNumber as 1 | 2 | 3) || 1] ?? roundRules[1];
}
