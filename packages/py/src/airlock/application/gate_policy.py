"""The default gate policy."""

from airlock.application.ports.gate_policy import GateDecisionInput
from airlock.domain.tool import RiskTier


class RiskBasedGatePolicy:
    """Tools tagged `sensitive` require human approval; `safe` tools run
    automatically (see ADR-0003)."""

    def requires_approval(self, decision_input: GateDecisionInput) -> bool:
        return decision_input.tool.risk == RiskTier.SENSITIVE
