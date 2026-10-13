import importlib.util
import sys
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[2] / "tools/review_accessory_placements.py"
SPEC = importlib.util.spec_from_file_location("accessory_placement_qa", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class AccessoryPlacementQaTest(unittest.TestCase):
    def validation(self, grips: int = 1, collisions: int = 0) -> dict[str, int]:
        return {
            "collisionSampleCount": collisions,
            "gripCandidatesTested": grips,
        }

    def test_single_grip_without_extent_risk_is_screened_low_risk(self) -> None:
        result = MODULE.assess(
            "Weapon Sword / Cutlass",
            ["non-default-orientation"],
            self.validation(),
        )
        self.assertEqual(result.decision, MODULE.LOW_RISK)

    def test_long_multiple_or_orientation_sensitive_parts_stay_manual(self) -> None:
        cases = (
            ("Equipment Generic", ["long-accessory-extent"], self.validation()),
            ("Equipment Generic", [], self.validation(grips=2)),
            ("Musical Instrument Saxophone", [], self.validation()),
        )
        for name, flags, validation in cases:
            with self.subTest(name=name, flags=flags):
                self.assertEqual(MODULE.assess(name, flags, validation).decision, MODULE.MANUAL)

    def test_non_hand_held_semantics_and_collisions_recommend_block(self) -> None:
        incompatible_names = (
            "Equipment Scabbard",
            "Tap 1 x 2 with Dual Handles, Small",
            "Sports Soccer Minifig Stand with Spring and Green Pin [Complete Assembly]",
        )
        for name in incompatible_names:
            with self.subTest(name=name):
                self.assertEqual(
                    MODULE.assess(name, [], self.validation()).decision,
                    MODULE.BLOCK,
                )
        self.assertEqual(
            MODULE.assess("Equipment Generic", [], self.validation(collisions=1)).decision,
            MODULE.BLOCK,
        )

    def test_current_curated_decisions_are_safe_calibration_labels(self) -> None:
        reviews = MODULE.load_json(MODULE.DEFAULT_REVIEWS)["reviews"]
        calibration = MODULE.validate_calibration(reviews)
        self.assertEqual(calibration["falseSafeCount"], 0)
        self.assertEqual(calibration["falseBlockCount"], 0)
        self.assertGreaterEqual(calibration["curatedReviewCount"], 30)

    def test_legacy_long_review_metadata_stays_out_of_low_risk(self) -> None:
        review = {
            "selectedOrientationIndex": 0,
            "gripCandidatesTested": 1,
            "detectedGripLengthLdu": 140,
            "orientationCandidatesTested": 1064,
        }
        self.assertIn("long-accessory-extent", MODULE.risk_flags_for_review(review))

    def test_current_queue_is_completely_classified_and_fail_closed(self) -> None:
        report = MODULE.build_report(
            MODULE.load_json(MODULE.DEFAULT_QUEUE),
            MODULE.load_json(MODULE.DEFAULT_REVIEWS),
            MODULE.DEFAULT_QUEUE,
            MODULE.DEFAULT_REVIEWS,
        )
        summary = report["summary"]
        classified = (
            summary["screenedLowRiskPartCount"]
            + summary["manualThreeViewPartCount"]
            + summary["blockRecommendedPartCount"]
        )
        self.assertEqual(classified, summary["pendingPartCount"])
        self.assertFalse(report["releaseEligible"])
        self.assertEqual(
            summary["pendingRepresentativeCount"],
            len(report["pendingRepresentativePartNums"]),
        )
        self.assertEqual(
            summary["pendingRepresentativeCount"],
            len(set(report["pendingRepresentativePartNums"])),
        )
        self.assertLessEqual(summary["pendingRepresentativeCount"], summary["pendingPartCount"])
        self.assertLessEqual(
            summary["manualRepresentativeCount"],
            summary["manualThreeViewPartCount"] + summary["blockRecommendedPartCount"],
        )


if __name__ == "__main__":
    unittest.main()
