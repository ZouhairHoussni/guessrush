export interface TeamAccent {
  card: string;
  border: string;
  text: string;
  chip: string;
  softChip: string;
  stripe: string;
  scoreZone: string;
  glow: string;
  leaderGlow: string;
  icon: "comet" | "spark" | "rocket" | "glider";
}

const accents: Record<string, TeamAccent> = {
  blue: {
    card: "border-brand-blue-600/70 bg-gradient-to-br from-white via-brand-blue-100 to-white",
    border: "border-brand-blue-600/75",
    text: "text-brand-blue-900",
    chip: "bg-brand-blue-700 text-white",
    softChip: "bg-brand-blue-100 text-brand-blue-900",
    stripe: "bg-brand-blue-600",
    scoreZone: "bg-brand-blue-100 text-brand-blue-900",
    glow: "shadow-[0_18px_42px_rgba(46,144,250,0.18)]",
    leaderGlow: "shadow-[0_0_0_1px_rgba(46,144,250,0.34),0_24px_60px_rgba(46,144,250,0.32)]",
    icon: "comet",
  },
  yellow: {
    card: "border-brand-yellow-500/80 bg-gradient-to-br from-white via-[#fff7ce] to-white",
    border: "border-brand-yellow-500",
    text: "text-ink",
    chip: "bg-brand-yellow-500 text-ink",
    softChip: "bg-[#fff7ce] text-ink",
    stripe: "bg-brand-yellow-500",
    scoreZone: "bg-brand-yellow-500 text-ink",
    glow: "shadow-[0_18px_42px_rgba(255,210,63,0.16)]",
    leaderGlow: "shadow-[0_0_0_1px_rgba(255,210,63,0.42),0_24px_60px_rgba(255,210,63,0.34)]",
    icon: "spark",
  },
  coral: {
    card: "border-brand-orange-500/75 bg-gradient-to-br from-white via-[#fff0e8] to-white",
    border: "border-brand-orange-500",
    text: "text-ink",
    chip: "bg-brand-orange-500 text-ink",
    softChip: "bg-[#fff0e8] text-ink",
    stripe: "bg-brand-orange-500",
    scoreZone: "bg-[#fff0e8] text-ink",
    glow: "shadow-[0_18px_42px_rgba(247,144,9,0.16)]",
    leaderGlow: "shadow-[0_0_0_1px_rgba(247,144,9,0.34),0_24px_60px_rgba(247,144,9,0.28)]",
    icon: "rocket",
  },
  green: {
    card: "border-success/75 bg-gradient-to-br from-white via-[#ecfdf3] to-white",
    border: "border-success",
    text: "text-[#067647]",
    chip: "bg-success text-white",
    softChip: "bg-[#ecfdf3] text-[#067647]",
    stripe: "bg-success",
    scoreZone: "bg-[#ecfdf3] text-[#067647]",
    glow: "shadow-[0_18px_42px_rgba(18,183,106,0.14)]",
    leaderGlow: "shadow-[0_0_0_1px_rgba(18,183,106,0.32),0_24px_60px_rgba(18,183,106,0.26)]",
    icon: "glider",
  },
};

export function teamAccent(colorKey: string): TeamAccent {
  return accents[colorKey] ?? accents.blue;
}

export function isLeadingScore(score: number, scores: number[]): boolean {
  const best = Math.max(...scores);
  return scores.length > 0 && score === best && best > 0;
}
