#!/usr/bin/env python3
"""normalize_office.py

Deterministic normalisation pass for Office Open XML files (.docx / .xlsx).

An OOXML file is a ZIP container. To guarantee byte-for-byte reproducible
output, this script:

  1. reads every member of the container;
  2. neutralises known non-deterministic metadata inside text/XML parts
     (created/modified timestamps, last-modified-by, revision-save ids);
  3. rewrites the container with members in canonical (sorted) order, a fixed
     entry timestamp, a fixed creator system and a fixed compression level.

The result is a pure function of the logical document content and is identical
across repeated builds in the same toolchain environment.

Usage: python normalize_office.py <file.docx|file.xlsx> [more files ...]
"""
import io
import re
import sys
import zipfile

FIXED_DOS_DATE = (1980, 1, 1, 0, 0, 0)
FIXED_W3CDTF = "1980-01-01T00:00:00Z"
TEXT_EXT = (".xml", ".rels")

# Regex normalisations applied to text parts (defensive — the builders already
# pin these, but normalisation guarantees it regardless of the producer).
SUBS = [
    (re.compile(r"(<dcterms:created[^>]*>)[^<]*(</dcterms:created>)"),
     r"\g<1>" + FIXED_W3CDTF + r"\g<2>"),
    (re.compile(r"(<dcterms:modified[^>]*>)[^<]*(</dcterms:modified>)"),
     r"\g<1>" + FIXED_W3CDTF + r"\g<2>"),
    (re.compile(r"(<cp:lastModifiedBy>)[^<]*(</cp:lastModifiedBy>)"),
     r"\g<1>Claude.ai (product documentation)\g<2>"),
    # Word revision-save ids and document ids, if any producer adds them.
    (re.compile(r"\s+w:rsid[A-Za-z]*=\"[0-9A-Fa-f]+\""), ""),
    (re.compile(r"<w:rsid [^>]*/>"), ""),
    (re.compile(r"\s+w15:docId=\"\{[0-9A-Fa-f-]+\}\""), ""),
    # Spreadsheet volatile last-edited markers, if any.
    (re.compile(r"\s+calcId=\"[0-9]+\""), ' calcId="0"'),
]


def normalize_bytes(name, raw):
    if not name.lower().endswith(TEXT_EXT):
        return raw
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        return raw
    for pattern, repl in SUBS:
        text = pattern.sub(repl, text)
    return text.encode("utf-8")


def normalize_file(path):
    with zipfile.ZipFile(path, "r") as zin:
        members = {}
        for info in zin.infolist():
            members[info.filename] = normalize_bytes(info.filename, zin.read(info.filename))

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zout:
        for name in sorted(members):
            zinfo = zipfile.ZipInfo(filename=name, date_time=FIXED_DOS_DATE)
            zinfo.compress_type = zipfile.ZIP_DEFLATED
            zinfo.create_system = 3  # always report UNIX
            zinfo.external_attr = 0o644 << 16
            zinfo.internal_attr = 0
            zout.writestr(zinfo, members[name])

    with open(path, "wb") as fh:
        fh.write(buf.getvalue())
    return len(buf.getvalue())


def main(argv):
    if len(argv) < 2:
        sys.stderr.write("usage: normalize_office.py <file> [more files ...]\n")
        return 2
    for path in argv[1:]:
        size = normalize_file(path)
        sys.stdout.write("normalize_office.py: normalised %s (%d bytes)\n" % (path, size))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
