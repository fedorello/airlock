import { TriangleAlert } from "lucide-react";

/** A heads-up shown for high-impact actions, so they aren't approved on autopilot. */
export function RiskNotice({ flags }: { flags: string[] }) {
  if (flags.length === 0) {
    return null;
  }
  return (
    <div className="border-sensitive/60 bg-sensitive-subtle/50 flex gap-2 rounded-md border px-3 py-2">
      <TriangleAlert
        className="text-sensitive mt-0.5 size-4 shrink-0"
        aria-hidden
      />
      <div className="flex flex-col gap-0.5 text-sm">
        <p className="text-sensitive font-medium">
          High-impact &mdash; review carefully before you approve
        </p>
        <ul className="text-muted-foreground list-inside list-disc">
          {flags.map((flag) => (
            <li key={flag}>{flag}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
