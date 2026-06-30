#!/usr/bin/env python3
"""build_pkg.py

Direct build orchestrator for the Rev1.5 deterministic package.

Runs the full pipeline in dependency order using the CURRENT Python interpreter
(sys.executable — the isolated virtual-environment Python when invoked from a
clean build) and the local Node toolchain. Any failed step aborts the build
immediately with a non-zero exit code; the build never continues past a failure.

Pipeline:
  1. node build_docx.js                         -> DOCX
  2. python build_workbook.py                   -> XLSX
  3. python normalize_office.py DOCX XLSX        -> deterministic Office files
  4. python validate_package.py                 -> validation reports
  5. python environment_leakage_scan.py --enforce -> leakage gate
  6. python package_members.py consistency       -> member-consistency record
  7. python package_members.py manifest          -> MANIFEST.txt
  8. python package_members.py inventory         -> FILE_INVENTORY.csv
  9. python package_members.py sha256sums        -> SHA256SUMS.txt (non-recursive)
 10. python verify_checksums.py                  -> checksum_verification.txt
 11. python package_members.py zip               -> final deterministic ZIP

Usage:
  python build_pkg.py --source-dir . [--out-zip PATH]
"""
import hashlib
import os
import subprocess
import sys

import package_members

DOCX = "YAV2_Portal_Product_Readiness_UAT_and_SOP_Package_Rev1.5.docx"
XLSX = "YAV2_Product_Readiness_Matrices_Rev1.5.xlsx"


def arg(flag, default=None):
    return sys.argv[sys.argv.index(flag) + 1] if flag in sys.argv else default


def run(label, cmd, cwd):
    sys.stdout.write("build_pkg.py: [%s] %s\n" % (label, " ".join(cmd)))
    sys.stdout.flush()
    proc = subprocess.run(cmd, cwd=cwd)
    if proc.returncode != 0:
        sys.stderr.write("build_pkg.py: STEP FAILED [%s] exit=%d — aborting build\n"
                         % (label, proc.returncode))
        sys.exit(proc.returncode)


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    src = os.path.abspath(arg("--source-dir", "."))
    out_zip = arg("--out-zip", os.path.join(src, package_members.FINAL_ZIP_NAME))
    py = sys.executable  # isolated venv python when run from a clean build

    run("docx", ["node", "build_docx.js"], src)
    run("xlsx", [py, "build_workbook.py"], src)
    run("normalize", [py, "normalize_office.py", DOCX, XLSX], src)
    run("validate", [py, "validate_package.py", "--source-dir", "."], src)
    run("consistency", [py, "package_members.py", "consistency", "--source-dir", "."], src)
    run("manifest", [py, "package_members.py", "manifest", "--source-dir", "."], src)
    run("inventory", [py, "package_members.py", "inventory", "--source-dir", "."], src)
    run("leakage", [py, "environment_leakage_scan.py", "--source-dir", ".", "--enforce"], src)
    run("sha256sums", [py, "package_members.py", "sha256sums", "--source-dir", "."], src)
    run("checksum", [py, "verify_checksums.py", "--source-dir", "."], src)
    run("zip", [py, "package_members.py", "zip", "--source-dir", ".", "--out", out_zip], src)

    zsize = os.path.getsize(out_zip)
    zhash = sha256_file(out_zip)
    docx_hash = sha256_file(os.path.join(src, DOCX))
    xlsx_hash = sha256_file(os.path.join(src, XLSX))
    sys.stdout.write("build_pkg.py: BUILD OK\n")
    sys.stdout.write("  DOCX sha256=%s\n" % docx_hash)
    sys.stdout.write("  XLSX sha256=%s\n" % xlsx_hash)
    sys.stdout.write("  ZIP  sha256=%s size=%d name=%s\n"
                     % (zhash, zsize, os.path.basename(out_zip)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
