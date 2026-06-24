"""Generate the support-agent golden eval dataset (deterministic, no randomness).

Each case is a scripted scenario: the tools and their risk, the sequence of tool
calls the model makes (across one or more turns), and the expected results derived
from the gate rule (sensitive tools are gated; safe tools are not). Both the
TypeScript and Python eval runners load the JSON this writes and assert the wired
agent reproduces `expected_executed` and `expected_gated`.

Run: `python evals/support-agent/generate_cases.py`
"""

import json
from pathlib import Path

TOOLS = {
    "search_kb": "safe",
    "lookup_order": "safe",
    "issue_refund": "sensitive",
    "send_email": "sensitive",
    "escalate": "sensitive",
}
ALL_TOOLS = list(TOOLS)


def _case(name: str, turns_calls: list[list[str]]) -> dict[str, object]:
    executed = [call for turn in turns_calls for call in turn]
    gated = [call for call in executed if TOOLS[call] == "sensitive"]
    turns: list[dict[str, object]] = [{"calls": turn} for turn in turns_calls]
    turns.append({"final": "All done."})
    return {
        "name": name,
        "request": f"Scenario: {name}.",
        "turns": turns,
        "expected_executed": executed,
        "expected_gated": gated,
    }


def _build_cases() -> list[dict[str, object]]:
    cases: list[dict[str, object]] = []
    # One call per tool, on its own.
    cases.extend(_case(f"single {tool}", [[tool]]) for tool in ALL_TOOLS)
    # Every ordered pair of distinct tools, one call per turn.
    cases.extend(
        _case(f"{first} then {second}", [[first], [second]])
        for first in ALL_TOOLS
        for second in ALL_TOOLS
        if first != second
    )
    # Two calls in a single turn.
    one_turn_pairs = [
        ["lookup_order", "issue_refund"],
        ["search_kb", "lookup_order"],
        ["issue_refund", "send_email"],
        ["lookup_order", "send_email"],
        ["search_kb", "escalate"],
        ["issue_refund", "escalate"],
    ]
    cases.extend(_case(f"{pair[0]} and {pair[1]} in one turn", [pair]) for pair in one_turn_pairs)
    # Three calls across three turns (mixed, including a repeated sensitive tool).
    triples = [
        ["lookup_order", "issue_refund", "send_email"],
        ["search_kb", "lookup_order", "escalate"],
        ["issue_refund", "send_email", "escalate"],
        ["search_kb", "issue_refund", "lookup_order"],
        ["lookup_order", "issue_refund", "issue_refund"],
    ]
    cases.extend(_case(" then ".join(triple), [[call] for call in triple]) for triple in triples)
    return cases


def main() -> None:
    dataset = {"version": 1, "tools": TOOLS, "cases": _build_cases()}
    out = Path(__file__).resolve().parent / "golden-cases.json"
    out.write_text(json.dumps(dataset, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(dataset['cases'])} cases to {out}")


if __name__ == "__main__":
    main()
