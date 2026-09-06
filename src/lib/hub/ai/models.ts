/** Model choices per job (approved plan: cheap vision/classification, Opus 5 for the intelligence). */
export const MODELS = {
  vision: "claude-haiku-4-5",
  visionFallback: "claude-sonnet-5",
  classify: "claude-haiku-4-5",
  phrase: "claude-haiku-4-5",
  brief: "claude-opus-5",
  review: "claude-opus-5",
  coach: "claude-opus-5",
} as const;
