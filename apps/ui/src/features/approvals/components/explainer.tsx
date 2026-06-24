import { ShieldCheck } from "lucide-react";

import { Card } from "@/shared/ui/card";

/** A short explainer so anyone landing on the dashboard understands the problem
 * this screen solves and how. */
export function Explainer() {
  return (
    <Card className="bg-card/60 flex gap-3">
      <ShieldCheck
        className="text-primary mt-0.5 size-5 shrink-0"
        aria-hidden
      />
      <div className="flex flex-col gap-1 text-sm">
        <p className="font-medium">Why you&rsquo;re seeing this</p>
        <p className="text-muted-foreground">
          An AI agent is doing the work below. It reads untrusted input &mdash;
          customer messages, web pages, the output of other tools &mdash; so a
          prompt injection or a simple mistake could make it send, pay, or
          delete something it shouldn&rsquo;t.
        </p>
        <p className="text-muted-foreground">
          Airlock gates the dangerous steps. Safe actions (lookups, reads) run
          on their own, but anything{" "}
          <span className="text-sensitive font-medium">sensitive</span> &mdash;
          a refund, an email, a transfer &mdash; pauses here and cannot run
          until you decide. The boundary is enforced by the architecture, not by
          trusting the model.
        </p>
        <p className="text-muted-foreground">
          <span className="text-approved font-medium">Approve</span> lets the
          action run &middot; <span className="font-medium">Edit</span> changes
          its details first &middot;{" "}
          <span className="text-rejected font-medium">Reject</span> blocks it.
        </p>
      </div>
    </Card>
  );
}
