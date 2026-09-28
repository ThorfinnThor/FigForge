import importlib.util
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[2] / "tools/run_local_catalog_pipeline.py"
SPEC = importlib.util.spec_from_file_location("local_catalog_pipeline", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class LocalCatalogPipelineTest(unittest.TestCase):
    def test_rebrickable_allowlist_accepts_catalog_download(self) -> None:
        MODULE.validate_rebrickable_url(
            "parts.csv.gz",
            "https://cdn.rebrickable.com/media/downloads/parts.csv.gz",
        )

    def test_rebrickable_allowlist_rejects_api_and_moc_urls(self) -> None:
        for url in (
            "https://rebrickable.com/api/v3/lego/parts/",
            "https://cdn.rebrickable.com/media/mocs/moc-1.zip",
        ):
            with self.assertRaises(RuntimeError):
                MODULE.validate_rebrickable_url("parts.csv.gz", url)

    def test_safe_ldraw_extraction_rejects_path_traversal(self) -> None:
        import zipfile

        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            archive = base / "unsafe.zip"
            with zipfile.ZipFile(archive, "w") as output:
                output.writestr("../outside.txt", "not allowed")
            with self.assertRaises(RuntimeError):
                MODULE.safe_extract_ldraw(archive, base / "extracted")

    def test_default_audit_targets_series_29(self) -> None:
        arguments = MODULE.parse_args([])
        self.assertIsNone(arguments.audit_set_prefix)
        self.assertFalse(arguments.skip_verify)

    def test_download_uses_system_curl_instead_of_python_ssl(self) -> None:
        source = SCRIPT.read_text(encoding="utf-8")
        self.assertIn('"curl",', source)
        self.assertNotIn("urllib.request", source)

    def test_pipeline_includes_placement_candidate_analysis(self) -> None:
        source = SCRIPT.read_text(encoding="utf-8")
        self.assertIn('["npm", "run", "assets:analyze:placement-candidates"]', source)


if __name__ == "__main__":
    unittest.main()
