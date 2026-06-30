#!/usr/bin/env node
/*
 * build_docx.js
 * Deterministic builder for:
 *   YAV2_Portal_Product_Readiness_UAT_and_SOP_Package_Rev1.5.docx
 *
 * Reads the single authoritative content file (package_content.json) and emits
 * a valid Office Open XML (.docx) document. All Office Open XML parts are
 * constructed by hand so the output is a pure function of the input content;
 * no timestamps, GUIDs, locale or environment values are read at build time.
 * The jszip container is written with a fixed entry date. normalize_office.py
 * performs a second deterministic normalisation pass.
 *
 * Usage: node build_docx.js [content.json] [output.docx]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const CONTENT = process.argv[2] || path.join(__dirname, 'package_content.json');
const OUTPUT = process.argv[3] || path.join(__dirname, 'YAV2_Portal_Product_Readiness_UAT_and_SOP_Package_Rev1.5.docx');
const FIXED_DATE = new Date(Date.UTC(1980, 0, 1, 0, 0, 0));

const data = JSON.parse(fs.readFileSync(CONTENT, 'utf8'));

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function para(text, style) {
  const pPr = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : '';
  const run = text === '' ? '' : `<w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
  return `<w:p>${pPr}${run}</w:p>`;
}

function bullet(text) {
  return `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}

function cell(text, widthDxa, bold) {
  const rpr = bold ? '<w:rPr><w:b/></w:rPr>' : '';
  return `<w:tc><w:tcPr><w:tcW w:w="${widthDxa}" w:type="dxa"/></w:tcPr>` +
    `<w:p><w:r>${rpr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p></w:tc>`;
}

function table(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const grid = widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('');
  const borders =
    '<w:tblBorders>' +
    ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
      .map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="999999"/>`)
      .join('') +
    '</w:tblBorders>';
  const tblPr = `<w:tblPr><w:tblW w:w="${total}" w:type="dxa"/>${borders}</w:tblPr>`;
  const headRow =
    '<w:tr><w:trPr><w:tblHeader/></w:trPr>' +
    headers.map((h, i) => cell(h, widths[i], true)).join('') +
    '</w:tr>';
  const bodyRows = rows
    .map(
      (r) =>
        '<w:tr>' + r.map((c, i) => cell(c, widths[i], false)).join('') + '</w:tr>'
    )
    .join('');
  return `<w:tbl>${tblPr}<w:tblGrid>${grid}</w:tblGrid>${headRow}${bodyRows}</w:tbl>`;
}

const body = [];
const P = (t, s) => body.push(para(t, s));
const B = (t) => body.push(bullet(t));
const T = (h, r, w) => body.push(table(h, r, w));

// --- Title block ---
P(data.title, 'Title');
P(data.subtitle, 'Subtitle');
P(`Package: ${data.package}`, 'Heading2');
P(`Revision: ${data.revision}`, 'Normal');
P(`Business owner / final approver: ${data.owner}`, 'Normal');
P(`Prepared by: ${data.prepared_by}`, 'Normal');
P('', null);

// --- 1. Governance, Ownership & Authority ---
P('1. Governance, Ownership and Authority', 'Heading1');
const g = data.governance;
P('Role separation', 'Heading2');
g.ownership.forEach(B);
P('Authority state', 'Heading2');
B(`PRODUCT_OPS_ALIGNMENT_REV1.1: ${g.product_ops_alignment_rev1_1}`);
B(`CURRENT_LIVE_AUTHORITY: ${g.current_live_authority}`);
B(`EXECUTION_ATTEMPTS_AUTHORISED: ${g.execution_attempts_authorised}`);
B(`IMPLEMENTATION_AUTHORITY: ${g.implementation_authority}`);
B(`V1_ACCESS: ${g.v1_access}`);
B(`CEP_REV1.6_STATUS: ${g.cep_rev1_6_status}`);
B(`PACKAGE_STATUS: ${g.package_status}`);
B(`PJ_APPROVAL_STATUS: ${g.pj_approval_status}`);
B(`NEXT_REQUIRED_GATE: ${g.next_required_gate}`);
P(g.scope_note, 'Normal');
P('', null);

// --- 2. Readiness model ---
P('2. Readiness Model', 'Heading1');
P(`Classes: ${data.readiness_model.classes.join(', ')}`, 'Normal');
P(`Overall: ${data.readiness_model.overall}`, 'Normal');
P(data.readiness_model.note, 'Normal');
P('', null);

// --- 3. Module catalogue ---
P('3. Module Catalogue (15 Modules)', 'Heading1');
T(
  ['ID', 'Module', 'Description', 'Readiness'],
  data.modules.map((m) => [m.id, m.name, m.description, m.readiness]),
  [700, 2300, 4800, 1800]
);
P('', null);

// --- 4. UAT cases ---
P('4. User Acceptance Test Cases (70 Cases)', 'Heading1');
P(
  'Coverage includes a positive case and an empty-state case for every one of the 15 modules, plus validation, negative, boundary and permission cases.',
  'Normal'
);
T(
  ['UAT ID', 'Module', 'Type', 'Title / Scenario', 'Expected Result', 'Priority'],
  data.uat_cases.map((c) => [c.id, c.module, c.type, c.title, c.expected, c.priority]),
  [900, 700, 1100, 3600, 2700, 900]
);
P('', null);

// --- 5. Mandatory validation mappings ---
P('5. Mandatory Validation Mappings (28 Mappings)', 'Heading1');
T(
  ['MV ID', 'Validation Rule', 'Module', 'Field', 'UAT Case'],
  data.mandatory_validations.map((m) => [m.id, m.rule, m.module, m.field, m.uat_case]),
  [800, 4200, 800, 2200, 1100]
);
P('', null);

// --- 6. SOPs ---
P('6. Standard Operating Procedures (15 SOPs)', 'Heading1');
data.sops.forEach((s) => {
  P(`${s.id} — ${s.title} (${s.module})`, 'Heading2');
  P(`Purpose: ${s.purpose}`, 'Normal');
  s.steps.forEach((step, i) => B(`Step ${i + 1}: ${step}`));
});
P('', null);

// --- 7. Open PJ decisions ---
P('7. Open PJ Decisions (14, all OPEN)', 'Heading1');
T(
  ['ID', 'Topic', 'Detail', 'Status'],
  data.pj_decisions.map((d) => [d.id, d.topic, d.detail, d.status]),
  [800, 3200, 4200, 1400]
);
P('', null);

// --- 8. Backlog ---
P('8. Backlog (17 Items)', 'Heading1');
T(
  ['ID', 'Backlog Item', 'Priority'],
  data.backlog.map((b) => [b.id, b.title, b.priority]),
  [900, 7000, 1700]
);
P('', null);

// --- 9. Revision history ---
P('9. Revision History and Review Results', 'Heading1');
T(
  ['Revision', 'Independent Review Result'],
  data.revision_history.map((r) => [r.revision, r.review_result]),
  [1600, 8000]
);
P('', null);

// --- 10. Rev1.5 change log ---
P('10. Change Log — Rev1.4 to Rev1.5', 'Heading1');
data.change_log_rev1_5.forEach(B);

const bodyXml = body.join('');

const documentXml =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
  '<w:body>' +
  bodyXml +
  '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>' +
  '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>' +
  '</w:sectPr>' +
  '</w:body></w:document>';

const stylesXml =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
  '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>' +
  '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:spacing w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="48"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:pPr><w:spacing w:after="200"/></w:pPr><w:rPr><w:i/><w:sz w:val="28"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="26"/></w:rPr></w:style>' +
  '<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:pPr><w:ind w:left="720"/></w:pPr></w:style>' +
  '</w:styles>';

const numberingXml =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
  '<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>' +
  '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>' +
  '</w:numbering>';

const contentTypesXml =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
  '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' +
  '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
  '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
  '</Types>';

const rootRels =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
  '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
  '</Relationships>';

const wordRels =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' +
  '</Relationships>';

const coreXml =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
  'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
  'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
  `<dc:title>${esc(data.title)}</dc:title>` +
  '<dc:creator>Claude.ai (product documentation)</dc:creator>' +
  '<cp:lastModifiedBy>Claude.ai (product documentation)</cp:lastModifiedBy>' +
  '<cp:revision>1</cp:revision>' +
  '<dcterms:created xsi:type="dcterms:W3CDTF">1980-01-01T00:00:00Z</dcterms:created>' +
  '<dcterms:modified xsi:type="dcterms:W3CDTF">1980-01-01T00:00:00Z</dcterms:modified>' +
  '</cp:coreProperties>';

const appXml =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">' +
  '<Application>YAV2 Deterministic DOCX Builder</Application>' +
  '<Company>Yes Advizors</Company>' +
  '</Properties>';

const parts = [
  ['[Content_Types].xml', contentTypesXml],
  ['_rels/.rels', rootRels],
  ['word/document.xml', documentXml],
  ['word/styles.xml', stylesXml],
  ['word/numbering.xml', numberingXml],
  ['word/_rels/document.xml.rels', wordRels],
  ['docProps/core.xml', coreXml],
  ['docProps/app.xml', appXml],
];

const zip = new JSZip();
// Deterministic order; fixed date on every entry.
parts.forEach(([name, content]) => {
  zip.file(name, content, { date: FIXED_DATE });
});

zip
  .generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
    platform: 'UNIX',
  })
  .then((buf) => {
    fs.writeFileSync(OUTPUT, buf);
    process.stdout.write(`build_docx.js: wrote ${OUTPUT} (${buf.length} bytes)\n`);
  })
  .catch((err) => {
    process.stderr.write(`build_docx.js: ERROR ${err && err.stack ? err.stack : err}\n`);
    process.exit(1);
  });
