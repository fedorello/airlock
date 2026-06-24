import type { Clock } from "../../application/ports/clock";

/** Production clock. `Date` is epoch-based; `toISOString()` renders UTC. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
