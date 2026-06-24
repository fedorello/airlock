// Branded identifier types. They are plain strings at runtime but distinct at
// the type level, so a RunId can never be passed where a RequestId is expected.
// Identifiers are produced only by the IdGenerator port.

declare const brand: unique symbol;

/** A nominal ("branded") wrapper over a base type. */
export type Branded<TBase, TBrand extends string> = TBase & {
  readonly [brand]: TBrand;
};

export type RunId = Branded<string, "RunId">;
export type RequestId = Branded<string, "RequestId">;
export type ToolCallId = Branded<string, "ToolCallId">;
