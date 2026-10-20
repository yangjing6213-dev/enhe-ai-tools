import json
import os
import re
import stat
import sys
import zipfile
from pathlib import Path, PurePosixPath

MAX_FILES = 20000
MAX_FILE_BYTES = 50 * 1024 * 1024
MAX_TOTAL_BYTES = 250 * 1024 * 1024
SKIP_PARTS = {".git", "node_modules", ".venv", "venv", "__pycache__", ".next", "dist", "coverage", ".pytest_cache"}
SKIP_NAMES = {".env", ".env.local", ".env.production", ".npmrc", ".pypirc", "credentials.csv", "service-account.json"}
SECRET_NAME = re.compile(r"(?:^|/)(?:id_rsa|id_ed25519|.*\.(?:pem|p12|pfx|key))$", re.I)
SECRET_BODY = re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bAKIA[0-9A-Z]{16}\b|\bsk-[A-Za-z0-9_-]{32,}\b")
LFS_PREFIX = b"version https://git-lfs.github.com/spec/v1"


def within(root: Path, path: Path) -> bool:
    return path == root or root in path.parents


def safe_relative(name: str) -> PurePosixPath:
    normalized = name.replace("\\", "/")
    path = PurePosixPath(normalized)
    if path.is_absolute() or not path.parts or any(part in ("", ".", "..") for part in path.parts):
        raise ValueError("UNSAFE_ARCHIVE_PATH")
    if re.match(r"^[A-Za-z]:", normalized) or "\x00" in normalized:
        raise ValueError("UNSAFE_ARCHIVE_PATH")
    return path


def allowed_file(path: PurePosixPath) -> bool:
    lowered_parts = {part.lower() for part in path.parts}
    name = path.name.lower()
    if any(part in SKIP_PARTS for part in lowered_parts):
        return False
    if name.startswith(".env") or name in SKIP_NAMES or SECRET_NAME.search(path.as_posix()):
        return False
    return True


def extract_archive(config: dict) -> dict:
    root = Path(config["root"]).resolve(strict=True)
    archive = Path(config["archive"]).resolve(strict=True)
    target = Path(config["target"]).resolve()
    if not within(root, archive) or not within(root, target) or target.exists():
        raise ValueError("UNSAFE_RUN_PATH")
    target.mkdir(parents=True, exist_ok=False)
    total = 0
    count = 0
    license_seen = False
    source_prefix = None
    with zipfile.ZipFile(archive) as bundle:
        entries = bundle.infolist()
        if len(entries) > MAX_FILES:
            raise ValueError("ARCHIVE_FILE_LIMIT")
        for entry in entries:
            if entry.is_dir():
                continue
            rel = safe_relative(entry.filename)
            if source_prefix is None:
                source_prefix = rel.parts[0]
            if rel.parts[0] != source_prefix:
                raise ValueError("ARCHIVE_ROOT_MISMATCH")
            if len(rel.parts) < 2:
                continue
            relative_path = PurePosixPath(*rel.parts[1:])
            if relative_path.as_posix().lower() == ".gitmodules":
                raise ValueError("UNSUPPORTED_SUBMODULES")
            if not allowed_file(relative_path):
                continue
            mode = entry.external_attr >> 16
            if stat.S_ISLNK(mode):
                raise ValueError("UNSAFE_ARCHIVE_SYMLINK")
            if entry.file_size > MAX_FILE_BYTES:
                raise ValueError("ARCHIVE_FILE_TOO_LARGE")
            with bundle.open(entry) as source:
                content = source.read(MAX_FILE_BYTES + 1)
                if len(content) > MAX_FILE_BYTES or source.read(1):
                    raise ValueError("ARCHIVE_FILE_TOO_LARGE")
            if len(content) != entry.file_size:
                raise ValueError("ARCHIVE_SIZE_MISMATCH")
            total += len(content)
            if total > MAX_TOTAL_BYTES:
                raise ValueError("ARCHIVE_EXPANSION_LIMIT")
            if content.startswith(LFS_PREFIX):
                raise ValueError("UNSUPPORTED_GIT_LFS")
            if SECRET_BODY.search(content):
                raise ValueError("POSSIBLE_SECRET_IN_SOURCE")
            destination = target.joinpath(*relative_path.parts)
            resolved = destination.resolve()
            if not within(target, resolved):
                raise ValueError("UNSAFE_ARCHIVE_PATH")
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(content)
            count += 1
            if relative_path.as_posix() == config["licensePath"]:
                license_seen = True
    if count == 0 or not license_seen:
        raise ValueError("LICENSE_FILE_MISSING")
    return {"ok": True, "files": count, "sourceBytes": total}


def package_source(config: dict) -> dict:
    root = Path(config["root"]).resolve(strict=True)
    source = Path(config["source"]).resolve(strict=True)
    archive = Path(config["output"]).resolve()
    if not within(root, source) or not within(root, archive) or archive.exists():
        raise ValueError("UNSAFE_RUN_PATH")
    files = []
    total = 0
    for parent, dirs, names in os.walk(source, followlinks=False):
        base = Path(parent)
        dirs[:] = [name for name in dirs if name.lower() not in SKIP_PARTS and not (base / name).is_symlink()]
        for name in names:
            file_path = base / name
            if file_path.is_symlink():
                raise ValueError("UNSAFE_SOURCE_SYMLINK")
            relative = PurePosixPath(file_path.relative_to(source).as_posix())
            if not allowed_file(relative):
                continue
            content_size = file_path.stat().st_size
            if content_size > MAX_FILE_BYTES:
                raise ValueError("PACKAGE_FILE_TOO_LARGE")
            total += content_size
            if total > MAX_TOTAL_BYTES:
                raise ValueError("PACKAGE_SIZE_LIMIT")
            with file_path.open("rb") as stream:
                if SECRET_BODY.search(stream.read(min(content_size, MAX_FILE_BYTES))):
                    raise ValueError("POSSIBLE_SECRET_IN_SOURCE")
            files.append((file_path, relative.as_posix()))
    extras = config.get("extraFiles", {})
    if not isinstance(extras, dict) or len(extras) > 4:
        raise ValueError("INVALID_PACKAGE_EXTRAS")
    existing_names = {relative for _, relative in files}
    extra_names = set()
    for name, content in extras.items():
        rel = safe_relative(name).as_posix()
        if rel in existing_names or rel in extra_names or not isinstance(content, str) or len(content) > 30000:
            raise ValueError("INVALID_PACKAGE_EXTRAS")
        extra_names.add(rel)
    with zipfile.ZipFile(archive, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as output:
        for file_path, relative in files:
            output.write(file_path, relative)
        for name, content in extras.items():
            rel = safe_relative(name)
            output.writestr(rel.as_posix(), content.encode("utf-8"))
    return {"ok": True, "files": len(files) + len(extras), "sourceBytes": total}


def main() -> None:
    try:
        config = json.load(sys.stdin)
        if config.get("action") == "extract":
            result = extract_archive(config)
        elif config.get("action") == "package":
            result = package_source(config)
        else:
            raise ValueError("INVALID_ACTION")
        sys.stdout.write(json.dumps(result, ensure_ascii=False))
    except Exception as error:
        code = str(error) if isinstance(error, ValueError) else "ARCHIVE_PREPARATION_FAILED"
        sys.stdout.write(json.dumps({"ok": False, "code": code}))
        sys.exit(1)


if __name__ == "__main__":
    main()
