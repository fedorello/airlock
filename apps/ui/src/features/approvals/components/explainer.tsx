import { ShieldCheck } from "lucide-react";

import { Card } from "@/shared/ui/card";

/** A short explainer so anyone landing on the dashboard understands the problem
 * this screen solves and how. */
export function Explainer() {
  return (
    <Card className="bg-card/60 flex gap-3 p-5">
      <ShieldCheck
        className="text-primary mt-0.5 size-5 shrink-0"
        aria-hidden
      />
      <div className="flex flex-col gap-2.5 text-sm">
        <p className="text-foreground font-medium">
          Why you&rsquo;re seeing this
        </p>
        <p className="text-muted-foreground leading-relaxed">
          An AI agent is doing the work below. It reads untrusted input &mdash;
          customer messages, web pages, the output of other tools &mdash; so a
          prompt injection or a simple mistake could make it send, pay, or
          delete something it shouldn&rsquo;t.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Airlock gates the dangerous steps. Safe actions (lookups, reads) run
          on their own, but anything{" "}
          <span className="text-sensitive font-medium">sensitive</span> &mdash;
          a refund, an email, a transfer &mdash; pauses here and cannot run
          until you decide. The safety lives in the{" "}
          <strong>architecture</strong>, not in a system prompt the model could
          be talked out of. We assume the agent can be hijacked &mdash; and put
          the gate outside it, so it still can&rsquo;t act on its own.
        </p>
        <p className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 pt-0.5">
          <span>
            <span className="text-approved font-medium">Approve</span>
            {" — let it run"}
          </span>
          <span>
            <span className="font-medium">Edit</span>
            {" — change the details first"}
          </span>
          <span>
            <span className="text-rejected font-medium">Reject</span>
            {" — block it"}
          </span>
        </p>
      </div>
    </Card>
  );
}
