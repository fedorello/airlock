import { Inbox } from "lucide-react";

export default function ApprovalsPage() {
  return (
    <div className="border-border flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center">
      <Inbox className="text-muted-foreground size-10" aria-hidden />
      <h1 className="text-lg font-medium">No actions waiting</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        When an agent reaches a sensitive action, it appears here for you to
        approve, edit, or reject.
      </p>
    </div>
  );
}
