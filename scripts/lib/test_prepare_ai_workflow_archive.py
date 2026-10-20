import importlib.util
from io import BytesIO
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import patch

MODULE_PATH = Path(__file__).with_name("prepare-ai-workflow-archive.py")
SPEC = importlib.util.spec_from_file_location("prepare_ai_workflow_archive", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class PrepareArchiveTests(unittest.TestCase):
    def test_extract_excludes_environment_files_and_preserves_license(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive = root / "source.zip"
            with zipfile.ZipFile(archive, "w") as bundle:
                bundle.writestr("project/LICENSE", "MIT License")
                bundle.writestr("project/README.md", "A public workflow")
                bundle.writestr("project/.env", "COS_SECRET_KEY=should-not-ship")
            source = root / "source"

            result = MODULE.extract_archive({"root": str(root), "archive": str(archive), "target": str(source), "licensePath": "LICENSE"})

            self.assertEqual(result["files"], 2)
            self.assertTrue((source / "LICENSE").is_file())
            self.assertFalse((source / ".env").exists())

    def test_extract_rejects_parent_path_traversal(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive = root / "source.zip"
            with zipfile.ZipFile(archive, "w") as bundle:
                bundle.writestr("project/LICENSE", "MIT License")
                bundle.writestr("project/../../outside.txt", "must not escape")
            with self.assertRaisesRegex(ValueError, "UNSAFE_ARCHIVE_PATH"):
                MODULE.extract_archive({"root": str(root), "archive": str(archive), "target": str(root / "source"), "licensePath": "LICENSE"})
            self.assertFalse((root.parent / "outside.txt").exists())

    def test_extract_rejects_content_that_exceeds_the_declared_zip_size(self):
        class FakeBundle:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def infolist(self):
                entry = zipfile.ZipInfo("project/LICENSE")
                entry.file_size = 1
                return [entry]

            def open(self, _entry):
                return BytesIO(b"content larger than declared size")

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            archive = root / "source.zip"
            archive.write_bytes(b"fixture")
            with patch.object(MODULE.zipfile, "ZipFile", return_value=FakeBundle()):
                with self.assertRaisesRegex(ValueError, "ARCHIVE_SIZE_MISMATCH"):
                    MODULE.extract_archive({"root": str(root), "archive": str(archive), "target": str(root / "source"), "licensePath": "LICENSE"})

    def test_package_rejects_extra_files_that_overwrite_repository_files(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            source.mkdir()
            (source / "README.md").write_text("Upstream README", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "INVALID_PACKAGE_EXTRAS"):
                MODULE.package_source({
                    "root": str(root),
                    "source": str(source),
                    "output": str(root / "package.zip"),
                    "extraFiles": {"README.md": "replacement"},
                })


if __name__ == "__main__":
    unittest.main()
