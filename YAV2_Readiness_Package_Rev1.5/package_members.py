#!/usr/bin/env python3
"""package_members.py

Single authoritative specification of the Rev1.5 deterministic package.

This module is the ONE place that defines:
  * the ordered set of package members;
  * which members are covered by the checksum manifest (non-recursive model);
  * how the deterministic ZIP, MANIFEST, FILE_INVENTORY, checksum manifest and
    member-consistency record are produced.

Hash / integrity model (non-recursive):
  * SHA256SUMS.txt records the SHA-256 of every member EXCEPT the two integrity
    artefacts themselves (SHA256SUMS.txt and checksum_verification.txt). This
    avoids any self-referential / recursive hash dependency.
  * MANIFEST.txt and FILE_INVENTORY.csv carry member names and metadata only
    (no sizes or hashes), so they too are free of recursive dependencies and
    are themselves covered by SHA256SUMS.txt.

Determinism model:
  * the ZIP is written with members in fixed authoritative order, a fixed entry
    timestamp (1980-01-01), fixed UNIX create-system and fixed permissions, at a
    fixed compression level — a pure function of the member bytes.

No environment-specific value (absolute path, timestamp, hostname, user) is ever
written into a packaged member by this module.
"""
import csv
import hashlib
import io
import json
import os
import sys
import zipfile

REVISION = "Rev1.5"
FINAL_ZIP_NAME = "YAV2_Portal_Product_Readiness_UAT_and_SOP_Package_Rev1.5.zip"
FIXED_DOS_DATE = (1980, 1, 1, 0, 0, 0)

# Members excluded from SHA256SUMS.txt (the integrity artefacts themselves).
INTEGRITY_EXCLUDED = ("SHA256SUMS.txt", "checksum_verification.txt")

# --- THE SINGLE AUTHORITATIVE MEMBER SPECIFICATION (ordered) ---------------
# (filename, category, description)
AUTHORITATIVE_MEMBERS = [
    ("YAV2_Portal_Product_Readiness_UAT_and_SOP_Package_Rev1.5.docx", "deliverable",
     "Product Readiness, UAT and SOP package document."),
    ("YAV2_Product_Readiness_Matrices_Rev1.5.xlsx", "deliverable",
     "Product readiness matrices workbook."),
    ("build_pkg.py", "source", "Build orchestrator."),
    ("build_workbook.py", "source", "Deterministic XLSX builder."),
    ("build_docx.js", "source", "Deterministic DOCX builder."),
    ("normalize_office.py", "source", "Deterministic Office-file normaliser."),
    ("validate_package.py", "source", "Content and structural validator."),
    ("verify_checksums.py", "source", "Checksum verifier."),
    ("verify_determinism.py", "source", "Clean-build determinism verifier."),
    ("environment_leakage_scan.py", "source", "Environment-leakage scanner."),
    ("package_members.py", "source", "Authoritative member specification and packager."),
    ("package_content.json", "source", "Single authoritative product content source."),
    ("requirements.txt", "dependency", "Pinned Python dependencies."),
    ("package.json", "dependency", "Node package manifest (version 1.5.0)."),
    ("package-lock.json", "dependency", "Pinned Node dependency lock (version 1.5.0)."),
    ("BUILD_INSTRUCTIONS.txt", "instructions", "Exact clean-build commands and behaviour."),
    ("BUILD_PROFILE.txt", "instructions", "Fixed build profile (tool versions)."),
    ("CHANGELOG_Rev1.5.txt", "instructions", "Rev1.4 to Rev1.5 change log."),
    ("validation_report.md", "report", "Human-readable validation report."),
    ("validation_results.json", "report", "Machine-readable validation results."),
    ("uat_coverage_report.txt", "report", "UAT coverage report (positive + empty-state)."),
    ("mandatory_validation_traceability_report.txt", "report",
     "Mandatory-validation traceability report."),
    ("readiness_consistency_report.txt", "report", "Readiness-classification consistency report."),
    ("workbook_structural_validation.txt", "report", "Workbook structural validation report."),
    ("environment_leakage_scan.json", "report", "Environment-leakage scan result."),
    ("package_member_consistency.json", "report", "Member-consistency record."),
    ("MANIFEST.txt", "integrity", "Package manifest (member names and descriptions)."),
    ("FILE_INVENTORY.csv", "integrity", "Package file inventory (member names and categories)."),
    ("SHA256SUMS.txt", "integrity", "SHA-256 checksum manifest (non-recursive)."),
    ("checksum_verification.txt", "integrity", "Checksum verification log."),
]


def member_names():
    return [m[0] for m in AUTHORITATIVE_MEMBERS]


def hashed_members():
    """Members covered by SHA256SUMS.txt (everything except integrity artefacts)."""
    return [n for n in member_names() if n not in INTEGRITY_EXCLUDED]


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


# --- MANIFEST ---------------------------------------------------------------
def write_manifest(source_dir, out_path):
    lines = []
    lines.append("YAV2 %s - PACKAGE MANIFEST" % REVISION)
    lines.append("Package: YAV2_Portal_Product_Readiness_UAT_and_SOP_Package_%s" % REVISION)
    lines.append("Authoritative member count: %d" % len(AUTHORITATIVE_MEMBERS))
    lines.append("Hash model: non-recursive (SHA256SUMS excludes %s)"
                 % ", ".join(INTEGRITY_EXCLUDED))
    lines.append("")
    lines.append("ORDER  CATEGORY      MEMBER  ::  DESCRIPTION")
    for i, (name, cat, desc) in enumerate(AUTHORITATIVE_MEMBERS, start=1):
        lines.append("%3d   %-12s  %s  ::  %s" % (i, cat, name, desc))
    with open(out_path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(lines) + "\n")


# --- FILE INVENTORY ---------------------------------------------------------
def write_inventory(source_dir, out_path):
    rows = []
    hashed = set(hashed_members())
    for i, (name, cat, desc) in enumerate(AUTHORITATIVE_MEMBERS, start=1):
        rows.append([i, name, cat, "yes" if name in hashed else "no", desc])
    with open(out_path, "w", encoding="utf-8", newline="\n") as fh:
        w = csv.writer(fh, lineterminator="\n")
        w.writerow(["order", "filename", "category", "in_sha256sums", "description"])
        for r in rows:
            w.writerow(r)


# --- MEMBER CONSISTENCY -----------------------------------------------------
def write_consistency(source_dir, out_path):
    """Presence check of all members. The integrity artefacts and the
    consistency record itself are generated in a later stage, so they are
    reported as 'deferred' rather than missing."""
    # Members generated at or after the consistency stage cannot be present yet:
    # the integrity artefacts (MANIFEST, FILE_INVENTORY, SHA256SUMS,
    # checksum_verification), the environment-leakage record and this record
    # itself. They are reported as deferred rather than missing.
    deferred = {name for (name, cat, _d) in AUTHORITATIVE_MEMBERS if cat == "integrity"}
    deferred.add("package_member_consistency.json")
    deferred.add("environment_leakage_scan.json")
    members = []
    all_ok = True
    for name, cat, desc in AUTHORITATIVE_MEMBERS:
        present = os.path.isfile(os.path.join(source_dir, name))
        if name in deferred:
            status = "deferred_integrity_stage"
        elif present:
            status = "present"
        else:
            status = "MISSING"
            all_ok = False
        members.append({"member": name, "category": cat, "status": status})
    result = {
        "package": "YAV2_Portal_Product_Readiness_UAT_and_SOP_Package_%s" % REVISION,
        "revision": REVISION,
        "authoritative_member_count": len(AUTHORITATIVE_MEMBERS),
        "hashed_member_count": len(hashed_members()),
        "integrity_excluded": list(INTEGRITY_EXCLUDED),
        "all_required_present": all_ok,
        "members": members,
    }
    with open(out_path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(result, indent=2, sort_keys=True) + "\n")
    return all_ok


# --- SHA256SUMS -------------------------------------------------------------
def write_sha256sums(source_dir, out_path):
    lines = []
    for name in hashed_members():
        path = os.path.join(source_dir, name)
        if not os.path.isfile(path):
            raise FileNotFoundError("cannot checksum missing member: %s" % name)
        lines.append("%s  %s" % (sha256_file(path), name))
    with open(out_path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(lines) + "\n")


# --- DETERMINISTIC ZIP ------------------------------------------------------
def build_zip(source_dir, out_zip):
    missing = [n for n in member_names() if not os.path.isfile(os.path.join(source_dir, n))]
    if missing:
        raise FileNotFoundError("cannot build ZIP, missing members: %s" % ", ".join(missing))
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name in member_names():  # fixed authoritative order
            with open(os.path.join(source_dir, name), "rb") as fh:
                payload = fh.read()
            zi = zipfile.ZipInfo(filename=name, date_time=FIXED_DOS_DATE)
            zi.compress_type = zipfile.ZIP_DEFLATED
            zi.create_system = 3
            zi.external_attr = 0o644 << 16
            zi.internal_attr = 0
            z.writestr(zi, payload)
    data = buf.getvalue()
    with open(out_zip, "wb") as fh:
        fh.write(data)
    return len(data), hashlib.sha256(data).hexdigest()


def _arg(argv, flag, default=None):
    return argv[argv.index(flag) + 1] if flag in argv else default


def main(argv):
    if len(argv) < 2:
        sys.stderr.write(
            "usage: package_members.py {list|manifest|inventory|consistency|sha256sums|zip} "
            "[--source-dir DIR] [--out PATH]\n")
        return 2
    cmd = argv[1]
    source = _arg(argv, "--source-dir", ".")
    out = _arg(argv, "--out")
    if cmd == "list":
        for i, (n, c, d) in enumerate(AUTHORITATIVE_MEMBERS, 1):
            sys.stdout.write("%2d  %-12s %s\n" % (i, c, n))
        return 0
    if cmd == "manifest":
        write_manifest(source, out or os.path.join(source, "MANIFEST.txt"))
    elif cmd == "inventory":
        write_inventory(source, out or os.path.join(source, "FILE_INVENTORY.csv"))
    elif cmd == "consistency":
        ok = write_consistency(source, out or os.path.join(source, "package_member_consistency.json"))
        if not ok:
            sys.stderr.write("package_members.py: MEMBER CONSISTENCY FAILED\n")
            return 1
    elif cmd == "sha256sums":
        write_sha256sums(source, out or os.path.join(source, "SHA256SUMS.txt"))
    elif cmd == "zip":
        size, digest = build_zip(source, out or os.path.join(source, FINAL_ZIP_NAME))
        sys.stdout.write("package_members.py: ZIP %d bytes sha256=%s\n" % (size, digest))
    else:
        sys.stderr.write("package_members.py: unknown command %s\n" % cmd)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
