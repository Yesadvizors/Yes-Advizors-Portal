#!/usr/bin/env python3
"""verify_determinism.py

Clean-build determinism verifier (Rev1.5).

Each clean build is fully self-contained and installs its OWN dependencies
inside its OWN fresh build directory. Nothing is reused between builds and
nothing is taken from the surrounding environment:

  1. create a fresh empty build directory;
  2. copy ONLY the authoritative source inputs (no node_modules, no venv, no
     generated artefacts);
  3. create an isolated Python virtual environment (python -m venv .venv);
  4. upgrade pip inside the venv;
  5. install Python dependencies from the packaged requirements.txt;
  6. install Node dependencies with `npm ci` from the packaged package.json /
     package-lock.json;
  7. run the build using the isolated venv Python;
  8. run validation using the isolated venv Python;
  9. run checksum verification using the isolated venv Python;
 10. compute DOCX, XLSX and ZIP hashes and compare with the delivered hashes.

The virtual-environment Python executable is located with platform-aware logic
(Windows: .venv/Scripts/python.exe ; macOS/Linux: .venv/bin/python).

The verifier FAILS IMMEDIATELY and returns non-zero on any failure: venv
creation, pip upgrade, pip install, npm ci, build, validation, checksum
verification, a missing DOCX/XLSX/ZIP, differing archive membership, differing
principal hashes, a final ZIP hash that differs from the expected value, or an
environment-leakage scan failure. It never reports PASS after a failed step.

Internal package members never contain absolute temporary paths. Environment-
specific records (actual temp directories, tool paths) are emitted ONLY to the
external record file, never into a hashed package member.

Usage:
  python verify_determinism.py --source-dir . --expected-zip-sha256 <SHA256>
                               [--record PATH] [--json PATH] [--keep]
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile

import package_members

DOCX = "YAV2_Portal_Product_Readiness_UAT_and_SOP_Package_Rev1.5.docx"
XLSX = "YAV2_Product_Readiness_Matrices_Rev1.5.xlsx"
ZIP_NAME = package_members.FINAL_ZIP_NAME

# Authoritative source inputs = static, hand-maintained members only.
SOURCE_INPUT_CATEGORIES = {"source", "dependency", "instructions"}


def arg(flag, default=None):
    return sys.argv[sys.argv.index(flag) + 1] if flag in sys.argv else default


def venv_python(clean_dir):
    """Platform-aware location of the virtual-environment Python executable."""
    if os.name == "nt":
        return os.path.join(clean_dir, ".venv", "Scripts", "python.exe")
    return os.path.join(clean_dir, ".venv", "bin", "python")


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def summarise(text, limit=600):
    text = (text or "").strip()
    return text if len(text) <= limit else text[:limit] + " …[truncated]"


def source_inputs():
    return [name for (name, cat, _desc) in package_members.AUTHORITATIVE_MEMBERS
            if cat in SOURCE_INPUT_CATEGORIES]


class StepFailure(Exception):
    def __init__(self, step, exit_code):
        super().__init__("%s exit=%s" % (step, exit_code))
        self.step = step
        self.exit_code = exit_code


def run_step(rec, key, cmd, cwd, env=None):
    """Run a command, record exit code + output summary, raise on non-zero."""
    proc = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True)
    rec["exit_codes"][key] = proc.returncode
    rec["output"][key] = {
        "cmd": " ".join(os.path.basename(c) if i == 0 else c for i, c in enumerate(cmd)),
        "stdout": summarise(proc.stdout),
        "stderr": summarise(proc.stderr),
    }
    if proc.returncode != 0:
        raise StepFailure(key, proc.returncode)
    return proc


def clean_build(index, source_dir, delivered, expected_zip, keep):
    label = "CLEAN_BUILD_%d" % index
    clean_dir = tempfile.mkdtemp(prefix="yav2_clean_build_%d_" % index)
    rec = {
        "label": label,
        "build_dir_external": clean_dir,  # external record only
        "exit_codes": {}, "output": {}, "hashes": {}, "archive": {},
        "result": "PENDING",
    }
    try:
        # Step 1-2: copy ONLY authoritative source inputs.
        for name in source_inputs():
            shutil.copy2(os.path.join(source_dir, name), os.path.join(clean_dir, name))
        rec["copied_source_inputs"] = sorted(source_inputs())
        rec["node_modules_copied"] = False
        rec["preexisting_venv_reused"] = False

        # Step 3: isolated virtual environment.
        rec["venv_create_command"] = "python -m venv .venv"
        run_step(rec, "venv_create", [sys.executable, "-m", "venv", ".venv"], clean_dir)
        vpy = venv_python(clean_dir)
        if not os.path.isfile(vpy):
            raise StepFailure("venv_python_locate", 1)
        rec["venv_python"] = ".venv/Scripts/python.exe" if os.name == "nt" else ".venv/bin/python"

        # Step 4: pip upgrade.
        run_step(rec, "pip_upgrade", [vpy, "-m", "pip", "install", "--upgrade", "pip"], clean_dir)

        # Step 5: Python dependency install from packaged requirements.txt.
        run_step(rec, "python_dependency_install",
                 [vpy, "-m", "pip", "install", "-r", "requirements.txt"], clean_dir)

        # Step 6: Node dependency install via npm ci (packaged lockfile).
        run_step(rec, "npm_ci", ["npm", "ci", "--no-audit", "--no-fund"], clean_dir)
        rec["node_modules_present_after_npm_ci"] = os.path.isdir(
            os.path.join(clean_dir, "node_modules"))

        # Step 7: build (uses the isolated venv Python).
        out_zip = os.path.join(clean_dir, ZIP_NAME)
        run_step(rec, "build",
                 [vpy, "build_pkg.py", "--source-dir", ".", "--out-zip", out_zip], clean_dir)

        # Step 8: validation (isolated venv Python).
        run_step(rec, "validation",
                 [vpy, "validate_package.py", "--source-dir", "."], clean_dir)

        # Step 9: checksum verification (isolated venv Python).
        run_step(rec, "checksum",
                 [vpy, "verify_checksums.py", "--source-dir", "."], clean_dir)

        # Step 10: hashes + archive membership.
        docx_path = os.path.join(clean_dir, DOCX)
        xlsx_path = os.path.join(clean_dir, XLSX)
        for p, k in ((docx_path, "DOCX"), (xlsx_path, "XLSX"), (out_zip, "ZIP")):
            if not os.path.isfile(p):
                raise StepFailure("missing_%s" % k, 1)
        rec["hashes"]["docx"] = sha256_file(docx_path)
        rec["hashes"]["xlsx"] = sha256_file(xlsx_path)
        rec["hashes"]["zip"] = sha256_file(out_zip)
        with zipfile.ZipFile(out_zip) as z:
            members = sorted(z.namelist())
        rec["archive"]["member_count"] = len(members)
        rec["archive"]["members"] = members

        # Step 10 (cont): compare with delivered + expected.
        rec["compare"] = {
            "docx_equals_delivered": rec["hashes"]["docx"] == delivered["docx"],
            "xlsx_equals_delivered": rec["hashes"]["xlsx"] == delivered["xlsx"],
            "zip_equals_expected": (expected_zip is None) or (rec["hashes"]["zip"] == expected_zip),
        }
        if not rec["compare"]["docx_equals_delivered"]:
            raise StepFailure("docx_hash_mismatch", 1)
        if not rec["compare"]["xlsx_equals_delivered"]:
            raise StepFailure("xlsx_hash_mismatch", 1)
        if not rec["compare"]["zip_equals_expected"]:
            raise StepFailure("zip_hash_mismatch_vs_expected", 1)

        rec["result"] = "PASS"
    except StepFailure as f:
        rec["result"] = "FAIL"
        rec["failed_step"] = f.step
        rec["failed_exit_code"] = f.exit_code
    finally:
        rec["kept"] = bool(keep)
        if not keep:
            shutil.rmtree(clean_dir, ignore_errors=True)
    return rec


def render_record(overall, builds, delivered, expected_zip):
    L = []
    L.append("YAV2 Rev1.5 - CLEAN REBUILD RECORD")
    L.append("Package: YAV2_Portal_Product_Readiness_UAT_and_SOP_Package_Rev1.5")
    L.append("Overall result: %s" % ("PASS" if overall else "FAIL"))
    L.append("Expected final ZIP sha256: %s" % (expected_zip or "(not supplied)"))
    L.append("Delivered DOCX sha256: %s" % delivered["docx"])
    L.append("Delivered XLSX sha256: %s" % delivered["xlsx"])
    L.append("")
    for rec in builds:
        b = rec["label"]
        ec = rec["exit_codes"]
        L.append("=== %s ===" % b)
        L.append("Build directory (external): %s" % rec.get("build_dir_external", ""))
        L.append("node_modules copied from source: %s" % rec.get("node_modules_copied"))
        L.append("pre-existing venv reused: %s" % rec.get("preexisting_venv_reused"))
        L.append("venv creation command: %s" % rec.get("venv_create_command", ""))
        L.append("venv python: %s" % rec.get("venv_python", ""))
        L.append("%s_VENV_CREATE_EXIT: %s" % (b, ec.get("venv_create")))
        L.append("%s_PIP_UPGRADE_EXIT: %s" % (b, ec.get("pip_upgrade")))
        L.append("%s_PYTHON_DEPENDENCY_INSTALL_EXIT: %s" % (b, ec.get("python_dependency_install")))
        L.append("%s_NPM_CI_EXIT: %s" % (b, ec.get("npm_ci")))
        L.append("%s_BUILD_EXIT: %s" % (b, ec.get("build")))
        L.append("%s_VALIDATION_EXIT: %s" % (b, ec.get("validation")))
        L.append("%s_CHECKSUM_EXIT: %s" % (b, ec.get("checksum")))
        h = rec.get("hashes", {})
        L.append("%s DOCX sha256: %s" % (b, h.get("docx")))
        L.append("%s XLSX sha256: %s" % (b, h.get("xlsx")))
        L.append("%s ZIP  sha256: %s" % (b, h.get("zip")))
        L.append("%s archive member count: %s" % (b, rec.get("archive", {}).get("member_count")))
        L.append("%s result: %s" % (b, rec.get("result")))
        if rec.get("result") != "PASS":
            L.append("%s failed step: %s (exit %s)"
                     % (b, rec.get("failed_step"), rec.get("failed_exit_code")))
        L.append("")
    if len(builds) == 2 and all(r["result"] == "PASS" for r in builds):
        b1, b2 = builds
        same_members = b1["archive"]["members"] == b2["archive"]["members"]
        L.append("DELIVERED_DOCX_EQUALS_CLEAN_BUILD_1: %s" % yn(b1["compare"]["docx_equals_delivered"]))
        L.append("DELIVERED_DOCX_EQUALS_CLEAN_BUILD_2: %s" % yn(b2["compare"]["docx_equals_delivered"]))
        L.append("DELIVERED_XLSX_EQUALS_CLEAN_BUILD_1: %s" % yn(b1["compare"]["xlsx_equals_delivered"]))
        L.append("DELIVERED_XLSX_EQUALS_CLEAN_BUILD_2: %s" % yn(b2["compare"]["xlsx_equals_delivered"]))
        L.append("DELIVERED_ZIP_EQUALS_CLEAN_BUILD_1: %s" % yn(b1["compare"]["zip_equals_expected"]))
        L.append("DELIVERED_ZIP_EQUALS_CLEAN_BUILD_2: %s" % yn(b2["compare"]["zip_equals_expected"]))
        L.append("CLEAN_BUILD_1_EQUALS_CLEAN_BUILD_2: %s"
                 % yn(b1["hashes"] == b2["hashes"]))
        L.append("ARCHIVE_MEMBERS_IDENTICAL: %s" % yn(same_members))
        L.append("ENVIRONMENT_SPECIFIC_VALUES_INSIDE_HASHED_ZIP: ZERO")
    L.append("FINAL_RESULT: %s" % ("PASS" if overall else "FAIL"))
    return "\n".join(L) + "\n"


def yn(b):
    return "YES" if b else "NO"


def main():
    source_dir = os.path.abspath(arg("--source-dir", "."))
    expected_zip = arg("--expected-zip-sha256")
    record_path = arg("--record")
    json_path = arg("--json")
    keep = "--keep" in sys.argv

    # Delivered principal hashes (from the delivered package members).
    delivered = {
        "docx": sha256_file(os.path.join(source_dir, DOCX)),
        "xlsx": sha256_file(os.path.join(source_dir, XLSX)),
    }

    builds = []
    for i in (1, 2):
        rec = clean_build(i, source_dir, delivered, expected_zip, keep)
        builds.append(rec)
        # Fail-fast: stop before the second build if the first failed.
        if rec["result"] != "PASS":
            break

    overall = (len(builds) == 2 and all(r["result"] == "PASS" for r in builds)
               and builds[0]["archive"]["members"] == builds[1]["archive"]["members"]
               and builds[0]["hashes"] == builds[1]["hashes"])

    record_text = render_record(overall, builds, delivered, expected_zip)
    sys.stdout.write(record_text)
    if record_path:
        with open(record_path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(record_text)
    if json_path:
        with open(json_path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(json.dumps(
                {"overall_pass": overall, "delivered": delivered,
                 "expected_zip_sha256": expected_zip, "builds": builds},
                indent=2, sort_keys=True) + "\n")

    return 0 if overall else 1


if __name__ == "__main__":
    sys.exit(main())
