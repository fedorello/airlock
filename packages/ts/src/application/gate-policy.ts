import { RiskTier } from "../domain/tool";
import type { GateDecisionInput, GatePolicy } from "./ports/gate-policy";

/**
 * Default gate policy: tools tagged `sensitive` require human approval; `safe`
 * tools run automatically (see ADR-0003). The rule lives here, not in the tool
 * definitions or the prompt, so it is deterministic and testable.
 */
export class RiskBasedGatePolicy implements GatePolicy {
  requiresApproval(input: GateDecisionInput): boolean {
    return input.tool.risk === RiskTier.Sensitive;
  }
}
