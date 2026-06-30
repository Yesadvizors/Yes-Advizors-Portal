#!/usr/bin/env python3
"""verify_checksums.py

Verifies every member listed in SHA256SUMS.txt by recomputing its SHA-256 and
comparing against the recorded value, then writes a verification log.

Display label (corrected in Rev1.5):
    YAV2 Rev1.5 - CHECKSUM VERIFICATION

Exit codes:
  0  all listed members verified
  1  any mismatch / missing member / unreadable manifest

Usage: python verify_checksums.py --source-dir . [--out checksum_verification.txt]
"""
import hashlib
import os
import sys

DISPLAY_LABEL = "YAV2 Rev1.5 - CHECKSUM VERIFICATION"


def arg(flag, default=None):
    return sys.argv[sys.argv.index(flag) + 1] if flag in sys.argv else default


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    src = arg("--source-dir", ".")
    out = arg("--out", os.path.join(src, "checksum_verification.txt"))
    sums_path = os.path.join(src, "SHA256SUMS.txt")

    lines = [DISPLAY_LABEL, "Manifest: SHA256SUMS.txt"]
    if not os.path.isfile(sums_path):
        lines.append("RESULT: FAIL (SHA256SUMS.txt not found)")
        with open(out, "w", encoding="utf-8", newline="\n") as fh:
            fh.write("\n".join(lines) + "\n")
        sys.stderr.write("verify_checksums.py: SHA256SUMS.txt missing\n")
        return 1

    entries = []
    with open(sums_path, "r", encoding="utf-8") as fh:
        for raw in fh:
            raw = raw.rstrip("\n")
            if not raw.strip():
                continue
            expected, name = raw.split("  ", 1)
            entries.append((expected, name))

    all_ok = True
    verified = 0
    for expected, name in entries:
        path = os.path.join(src, name)
        if not os.path.isfile(path):
            lines.append("MISSING  %s" % name)
            all_ok = False
            continue
        actual = sha256_file(path)
        if actual == expected:
            lines.append("OK       %s" % name)
            verified += 1
        else:
            lines.append("MISMATCH %s" % name)
            lines.append("         expected %s" % expected)
            lines.append("         actual   %s" % actual)
            all_ok = False

    lines.append("")
    lines.append("Members listed: %d" % len(entries))
    lines.append("Members verified: %d" % verified)
    lines.append("RESULT: %s" % ("PASS" if all_ok else "FAIL"))
    with open(out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(lines) + "\n")

    sys.stdout.write("verify_checksums.py: %s — %d/%d verified (%s)\n"
                     % (DISPLAY_LABEL, verified, len(entries), "PASS" if all_ok else "FAIL"))
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
