import type { Clock } from "../../application/ports/clock";

/** A clock pinned to a fixed instant. Makes time deterministic in tests. */
export class FixedClock implements Clock {
  constructor(private readonly instant: Date) {}

  now(): Date {
    return this.instant;
  }
}
