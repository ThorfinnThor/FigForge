#!/usr/bin/env python3
"""Fail-closed, dependency-free preflight for FigForge hand-accessory placement QA.

The preflight deliberately does not approve or reject catalog data. It separates
low-risk entries from placements that still need a three-view browser review and
emits the representative part numbers that the existing contact-sheet renderer
should capture. Curated decisions are used as regression labels on every run.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_QUEUE = ROOT / "data/generated/ldraw-accessory-orientation-review.json"
DEFAULT_REVIEWS = ROOT / "data/curated/ldraw-accessory-placement-reviews.json"
DEFAULT_OUTPUT = ROOT / "artifacts/accessory-auto-qa"

LOW_RISK = "screened-low-risk"
MANUAL = "manual-three-view-review"
BLOCK = "block-recommended"

# These shapes are not ordinary one-hand props. A detected cylinder alone is not
# enough evidence that the cylinder is the intended hand grip.
INCOMPATIBLE_HAND_PROP_PATTERNS = (
    re.compile(r"\bscabbard\b", re.IGNORECASE),
    re.compile(r"\bquiver\b", re.IGNORECASE),
)

# These objects have a visually meaningful front, mouthpiece, blade, head, or
# second-hand pose. Geometry-only candidate selection cannot confirm that intent.
ORIENTATION_SENSITIVE_PATTERNS = (
    re.compile(r"\bsaxophone\b", re.IGNORECASE),
    re.compile(r"\bclub\s+large\b", re.IGNORECASE),
    re.compile(r"\b(?:musical instrument|guitar|violin|cello|trumpet|camera)\b", re.IGNORECASE),
    re.compile(r"\b(?:bow|crossbow|chainsaw|whip|flail)\b", re.IGNORECASE),
    re.compile(r"^(?:equipment|weapon)\s+shield\b", re.IGNORECASE),
)


@dataclass(frozen=True)
class Assessment:
    decision: str
    reasons: tuple[str, ...]


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--queue", type=Path, default=DEFAULT_QUEUE)
    parser.add_argument("--reviews", type=Path, default=DEFAULT_REVIEWS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--check-only",
        action="store_true",
        help="Validate inputs and calibration without writing artifacts.",
    )
    return parser.parse_args(argv)


def load_json(path: Path) -> dict[str, Any]:
    document = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(document, dict):
        raise RuntimeError(f"Expected a JSON object in {path}")
    return document


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def matches_any(name: str, patterns: Iterable[re.Pattern[str]]) -> bool:
    return any(pattern.search(name) for pattern in patterns)


def assess(name: str, risk_flags: Iterable[str], validation: dict[str, Any]) -> Assessment:
    flags = frozenset(risk_flags)
    collision_samples = int(validation.get("collisionSampleCount", 0))
    grip_candidates = int(validation.get("gripCandidatesTested", 1))

    if collision_samples != 0:
        return Assessment(BLOCK, ("collision-samples-present",))
    if matches_any(name, INCOMPATIBLE_HAND_PROP_PATTERNS):
        return Assessment(BLOCK, ("semantic-shape-is-not-an-ordinary-hand-prop",))
    if matches_any(name, ORIENTATION_SENSITIVE_PATTERNS):
        return Assessment(MANUAL, ("orientation-sensitive-shape",))
    if "multiple-grip-candidates" in flags or grip_candidates > 1:
        return Assessment(MANUAL, ("multiple-grip-candidates",))
    if "long-accessory-extent" in flags:
        return Assessment(MANUAL, ("long-accessory-extent",))
    if flags.difference({"non-default-orientation"}):
        return Assessment(MANUAL, ("unknown-risk-flag",))

    reasons = ["collision-free-single-grip"]
    if "non-default-orientation" in flags:
        reasons.append("bounded-non-default-orientation")
    else:
        reasons.append("no-generated-risk-flags")
    return Assessment(LOW_RISK, tuple(reasons))


def risk_flags_for_review(review: dict[str, Any]) -> list[str]:
    flags: list[str] = []
    if int(review.get("selectedOrientationIndex", 0)) != 0:
        flags.append("non-default-orientation")
    if int(review.get("gripCandidatesTested", 1)) > 1:
        flags.append("multiple-grip-candidates")
    return flags


def validate_calibration(reviews: list[dict[str, Any]]) -> dict[str, Any]:
    false_safe: list[str] = []
    false_block: list[str] = []
    decisions: dict[str, int] = {LOW_RISK: 0, MANUAL: 0, BLOCK: 0}
    for review in reviews:
        validation = {
            "collisionSampleCount": 0,
            "gripCandidatesTested": review.get("gripCandidatesTested", 1),
        }
        assessment = assess(
            str(review.get("catalogName", "")),
            risk_flags_for_review(review),
            validation,
        )
        decisions[assessment.decision] += 1
        part_num = str(review.get("rebrickablePartNum", "unknown"))
        if review.get("decision") == "blocked" and assessment.decision == LOW_RISK:
            false_safe.append(part_num)
        if review.get("decision") == "approved" and assessment.decision == BLOCK:
            false_block.append(part_num)
    if false_safe or false_block:
        raise RuntimeError(
            "Accessory QA calibration failed: "
            f"blocked-classified-safe={false_safe}, approved-classified-block={false_block}"
        )
    return {
        "curatedReviewCount": len(reviews),
        "falseSafeCount": 0,
        "falseBlockCount": 0,
        "classifierDecisionCounts": decisions,
    }


def variant_base(part_num: str) -> str:
    return re.sub(r"(?:pr|pat)\d+$", "", part_num.lower())


def review_fingerprint(entry: dict[str, Any]) -> str:
    value = {
        "base": variant_base(str(entry["rebrickablePartNum"])),
        "transform": entry["placementTransformLdu"],
        "validation": entry["digitalValidation"],
    }
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def group_entries(entries: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for entry in entries:
        grouped.setdefault(review_fingerprint(entry), []).append(entry)
    return list(grouped.values())


def build_report(queue: dict[str, Any], reviews: dict[str, Any], queue_path: Path, reviews_path: Path) -> dict[str, Any]:
    entries = queue.get("entries")
    curated_reviews = reviews.get("reviews")
    if not isinstance(entries, list) or not isinstance(curated_reviews, list):
        raise RuntimeError("Accessory QA inputs do not contain entries/reviews arrays")

    component_ids = [entry.get("componentId") for entry in entries]
    if len(component_ids) != len(set(component_ids)):
        raise RuntimeError("Accessory QA queue contains duplicate component IDs")

    calibration = validate_calibration(curated_reviews)
    pending = [entry for entry in entries if entry.get("reviewStatus") == "pending-human-visual-review"]
    assessed: list[dict[str, Any]] = []
    for entry in pending:
        assessment = assess(entry["name"], entry["riskFlags"], entry["digitalValidation"])
        assessed.append({
            "componentId": entry["componentId"],
            "rebrickablePartNum": entry["rebrickablePartNum"],
            "name": entry["name"],
            "decision": assessment.decision,
            "reasons": list(assessment.reasons),
            "priorityTier": entry["priorityTier"],
            "riskFlags": entry["riskFlags"],
            "reviewFingerprint": review_fingerprint(entry),
        })

    by_component = {item["componentId"]: item for item in assessed}
    grouped = group_entries(pending)
    manual_groups: list[dict[str, Any]] = []
    for members in grouped:
        assessments = [by_component[member["componentId"]] for member in members]
        group_decisions = {item["decision"] for item in assessments}
        if len(group_decisions) != 1:
            raise RuntimeError("Equivalent accessory geometry received inconsistent QA decisions")
        decision = assessments[0]["decision"]
        if decision == LOW_RISK:
            continue
        manual_groups.append({
            "representativePartNum": members[0]["rebrickablePartNum"],
            "familyPartNums": [member["rebrickablePartNum"] for member in members],
            "decision": decision,
            "reasons": assessments[0]["reasons"],
            "priorityScore": max(int(member["priorityScore"]) for member in members),
        })
    manual_groups.sort(key=lambda item: (-item["priorityScore"], item["representativePartNum"].lower()))

    counts = {LOW_RISK: 0, MANUAL: 0, BLOCK: 0}
    for item in assessed:
        counts[item["decision"]] += 1
    if sum(counts.values()) != len(pending):
        raise RuntimeError("Accessory QA decision counts do not reconcile")

    return {
        "schemaVersion": 1,
        "generatedAt": date.today().isoformat(),
        "policy": "fail-closed-preflight",
        "releaseEligible": False,
        "sourcePolicy": queue.get("sourcePolicy"),
        "sourceHashes": {
            "orientationQueueSha256": sha256(queue_path),
            "curatedPlacementReviewsSha256": sha256(reviews_path),
        },
        "summary": {
            "pendingPartCount": len(pending),
            "screenedLowRiskPartCount": counts[LOW_RISK],
            "manualThreeViewPartCount": counts[MANUAL],
            "blockRecommendedPartCount": counts[BLOCK],
            "manualRepresentativeCount": len(manual_groups),
        },
        "calibration": calibration,
        "manualReviewGroups": manual_groups,
        "entries": assessed,
        "limitations": [
            "This preflight does not replace the three-view browser review for flagged geometry.",
            "A screened-low-risk result is not a catalog approval and never edits curated decisions.",
            "Semantic rules detect known classes of orientation-sensitive or non-hand-held shapes; they do not understand every possible accessory.",
        ],
    }


def markdown_summary(report: dict[str, Any]) -> str:
    summary = report["summary"]
    calibration = report["calibration"]
    return "\n".join((
        "# Automated accessory placement preflight",
        "",
        f"Generated: {report['generatedAt']}",
        "",
        f"- Pending parts checked: {summary['pendingPartCount']}",
        f"- Screened low-risk (not approved): {summary['screenedLowRiskPartCount']}",
        f"- Still needs three-view review: {summary['manualThreeViewPartCount']}",
        f"- Block recommended: {summary['blockRecommendedPartCount']}",
        f"- Three-view representative renders required: {summary['manualRepresentativeCount']}",
        f"- Curated regression labels checked: {calibration['curatedReviewCount']}",
        f"- False-safe calibration results: {calibration['falseSafeCount']}",
        f"- False-block calibration results: {calibration['falseBlockCount']}",
        "",
        "This is a fail-closed triage artifact. Only versioned curated reviews can change release eligibility.",
        "",
    ))


def write_outputs(report: dict[str, Any], output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    (output / "accessory-placement-preflight.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    (output / "accessory-placement-preflight.md").write_text(markdown_summary(report), encoding="utf-8")
    representatives = [
        group["representativePartNum"]
        for group in report["manualReviewGroups"]
    ]
    (output / "manual-review-parts.txt").write_text(
        "".join(f"{part_num}\n" for part_num in representatives),
        encoding="utf-8",
    )


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    queue_path = args.queue.resolve()
    reviews_path = args.reviews.resolve()
    report = build_report(
        load_json(queue_path),
        load_json(reviews_path),
        queue_path,
        reviews_path,
    )
    if not args.check_only:
        write_outputs(report, args.output.resolve())
    print(json.dumps({
        "message": "accessory placement preflight passed",
        **report["summary"],
        "calibration": report["calibration"],
        "output": None if args.check_only else str(args.output.resolve()),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
