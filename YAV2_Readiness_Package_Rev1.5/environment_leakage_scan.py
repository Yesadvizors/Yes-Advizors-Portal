#!/usr/bin/env python3
"""environment_leakage_scan.py

Scans the deterministic package members for environment-specific leakage —
absolute home/temp paths, machine-specific locations and similar values that
must never appear inside hashed package members.

Patterns are assembled from fragments at run time so this scanner never matches
its own source. Office binaries (.docx/.xlsx) are produced from controlled XML
and are not scanned as text.

Exit codes:
  0  no leakage found
  1  leakage found (when run with --enforce) or write/scan error

Usage:
  python environment_leakage_scan.py --source-dir . [--out environment_leakage_scan.json] [--enforce]
"""
import json
import os
import re
import sys

import package_members

TEXT_EXT = (".py", ".js", ".json", ".txt", ".md", ".csv")

# Fragments assembled so the literal trigger strings never appear verbatim here.
SEP = "/"
PATTERNS = [
    ("posix_home_dir", re.compile(SEP + "home" + SEP + r"[A-Za-z0-9._-]+" + SEP)),
    ("posix_users_dir", re.compile(SEP + "Users" + SEP + r"[A-Za-z0-9._-]+" + SEP)),
    ("posix_root_home", re.compile(SEP + "root" + SEP)),
    ("posix_tmp_abs", re.compile(r"(?<![\w.])" + SEP + "tmp" + SEP)),
    ("posix_private_var", re.compile(SEP + "private" + SEP + "var" + SEP)),
    ("posix_var_folders", re.compile(SEP + "var" + SEP + "folders" + SEP)),
    ("windows_user_temp", re.compile(r"[A-Za-z]:\\\\(?:Users|Temp|tmp|Windows)\\\\", re.IGNORECASE)),
    ("windows_user_path", re.compile(r"[A-Za-z]:\\(?:Users|Temp|tmp)\\", re.IGNORECASE)),
]


def arg(flag, default=None):
    return sys.argv[sys.argv.index(flag) + 1] if flag in sys.argv else default


def scan_text(name, text):
    findings = []
    for lineno, line in enumerate(text.splitlines(), start=1):
        for label, pat in PATTERNS:
            if pat.search(line):
                findings.append({
                    "member": name, "line": lineno, "pattern": label,
                    "excerpt": line.strip()[:160],
                })
    return findings


def main():
    src = arg("--source-dir", ".")
    out = arg("--out", os.path.join(src, "environment_leakage_scan.json"))
    enforce = "--enforce" in sys.argv

    # Deterministic, fixed scan set derived from the authoritative member spec
    # (NOT from whatever files happen to exist on disk). The scanner's own JSON
    # output is excluded so the result never depends on prior build state.
    scan_set = [n for n in package_members.hashed_members()
                if n.lower().endswith(TEXT_EXT) and n != "environment_leakage_scan.json"]

    findings = []
    scanned = []
    absent = []
    for name in scan_set:
        path = os.path.join(src, name)
        if not os.path.isfile(path):
            absent.append(name)
            continue
        scanned.append(name)
        # Do not flag this scanner's own pattern-definition source.
        if name == "environment_leakage_scan.py":
            continue
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            text = fh.read()
        findings.extend(scan_text(name, text))

    result = {
        "package": "YAV2_Portal_Product_Readiness_UAT_and_SOP_Package_Rev1.5",
        "revision": "Rev1.5",
        "scan_set": sorted(scan_set),
        "members_scanned": sorted(scanned),
        "members_scanned_count": len(scanned),
        "members_absent_at_scan": sorted(absent),
        "environment_leakage_findings": len(findings),
        "findings": findings,
        "result": "PASS" if not findings else "FAIL",
    }
    with open(out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(result, indent=2, sort_keys=True) + "\n")

    sys.stdout.write("environment_leakage_scan.py: %d members scanned, %d findings (%s)\n"
                     % (len(scanned), len(findings), result["result"]))
    if findings:
        for f in findings[:20]:
            sys.stderr.write("  LEAK %s:%d [%s] %s\n"
                             % (f["member"], f["line"], f["pattern"], f["excerpt"]))
        if enforce:
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
