/** The current instant, injected so time-dependent rendering is deterministic in
 * tests (e.g. "waiting for 2m"). The frontend converts UTC to local only at render. */
export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class FixedClock implements Clock {
  constructor(private readonly instant: Date) {}

  now(): Date {
    return this.instant;
  }
}
