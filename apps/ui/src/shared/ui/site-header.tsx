import { ShieldCheck } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="border-border bg-card/40 border-b">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-4">
        <ShieldCheck className="text-primary size-6" aria-hidden />
        <div className="leading-tight">
          <p className="font-semibold">Airlock</p>
          <p className="text-muted-foreground text-xs">Approvals dashboard</p>
        </div>
      </div>
    </header>
  );
}
