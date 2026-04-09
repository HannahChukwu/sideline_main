/**
 * Replicate image model for POST /api/generate.
 * Single source of truth — import here in the API route and Generator UI.
 */
export const REPLICATE_IMAGE_MODEL_ID = "google/nano-banana-pro" as const;

/** Friendly name for labels (model card / marketing name) */
export const REPLICATE_IMAGE_MODEL_LABEL = "Nano Banana Pro";
