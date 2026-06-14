export const motionDurations = {
  fast: 150,
  normal: 260,
  celebration: 720,
} as const;

export const motionEasing = {
  softOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  springSoft: "cubic-bezier(0.2, 0.9, 0.2, 1)",
} as const;

export const motionClass = {
  page: "motion-page",
  panel: "motion-panel",
  badge: "motion-badge-pop",
  listItem: "motion-list-item",
  scorePop: "motion-score-pop",
  leader: "motion-leader-in",
  readyOn: "motion-ready-on",
  readyOff: "motion-ready-off",
  shake: "motion-shake",
  timerWarn: "motion-timer-warn",
  timerDanger: "motion-timer-danger",
  winner: "motion-winner-reveal",
  shine: "motion-shine-once",
} as const;
