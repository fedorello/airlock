import { ShieldAlert } from "lucide-react";

import { type RiskTier, RiskTier as RiskTiers } from "@/domain/contract";
import { Badge } from "@/shared/ui/badge";

export function RiskBadge({ risk }: { risk: RiskTier }) {
  if (risk !== RiskTiers.Sensitive) {
    return <Badge>Safe</Badge>;
  }
  return (
    <Badge variant="sensitive">
      <ShieldAlert className="size-3" aria-hidden />
      Needs approval
    </Badge>
  );
}
