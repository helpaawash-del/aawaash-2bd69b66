/** Shared motion tokens so the left rail and the bottom dock animate identically. */
export const DOCK_DURATION_MS = 420;
export const DOCK_EASE = "cubic-bezier(0.32,0.72,0,1)";
export const DOCK_TRANSITION = `transition-[width,transform,opacity,padding] duration-[${DOCK_DURATION_MS}ms] ease-[${DOCK_EASE}] motion-reduce:transition-none`;
