from __future__ import annotations
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'frontend' / 'public' / 'demo' / 'arr-v2-demo-import.xlsx'

transaction_rows = [
    ['Customer','Date','Transaction Type','Num','Product/Service','Memo/Description','Qty','Sales Price','Amount','Subscription Start Date','Subscription End Date','Account','Class','Balance'],
    ['Northstar Health','2025-04-01','Invoice','INV-1001','Enterprise Analytics Platform','Annual platform renewal','12','28000','336000','2025-04-01','2026-03-31','Recurring Revenue','Healthcare','0'],
    ['Northstar Health','2025-04-01','Invoice','INV-1001','Premium Support Subscription','Premium support term','12','5000','60000','2025-04-01','2026-03-31','Recurring Revenue','Healthcare','0'],
    ['Apex Retail Group','2025-04-15','Invoice','INV-1002','Retail Insights Platform','Annual retail analytics contract','12','26000','312000','2025-04-15','2026-04-14','Recurring Revenue','Retail','0'],
    ['Apex Retail Group','2025-10-01','Invoice','INV-1088','AI Forecasting Module','Cross-sell AI forecasting expansion','6','14000','84000','2025-10-01','2026-03-31','Recurring Revenue','Retail','0'],
    ['Harbor Logistics','2025-05-01','Invoice','INV-1017','Logistics Control Tower','Core logistics platform','12','24000','288000','2025-05-01','2026-04-30','Recurring Revenue','Logistics','0'],
    ['Beacon Education','2025-09-01','Invoice','INV-1124','Campus Insights Suite','District-wide analytics rollout','12','23000','276000','2025-09-01','2026-08-31','Recurring Revenue','Education','0'],
    ['Beacon Education','2026-03-12','Invoice','INV-1292','Student Retention Add-On','Spring expansion module','12','4333.33','51999.96','2026-03-12','2027-03-11','Recurring Revenue','Education','0'],
    ['Summit Workforce','2025-12-01','Invoice','INV-1198','Workforce Planning Cloud','Annual workforce planning subscription','12','22800','273600','2025-12-01','2026-11-30','Recurring Revenue','Staffing','0'],
    ['Riverbank Clinics','2026-01-01','Invoice','INV-1211','Clinic Performance Suite','Clinic operating dashboard','12','21500','258000','2026-01-01','2026-12-31','Recurring Revenue','Healthcare','0'],
    ['Blue Harbor Media','2026-01-15','Invoice','INV-1220','Audience Intelligence Suite','Core subscription','12','21000','252000','2026-01-15','2027-01-14','Recurring Revenue','Media','0'],
    ['Granite Foods','2026-02-01','Invoice','INV-1249','Supply Chain Visibility','Food distribution visibility subscription','12','19800','237600','2026-02-01','2027-01-31','Recurring Revenue','Food','0'],
    ['Pioneer Transit','2026-02-15','Invoice','INV-1268','Transit Operations Cloud','Transit performance subscription','12','17600','211200','2026-02-15','2027-02-14','Recurring Revenue','Transit','0'],
    ['Lattice Security','2026-03-01','Invoice','INV-1288','Threat Response Analytics','Security analytics subscription','12','15800','189600','2026-03-01','2027-02-28','Recurring Revenue','Security','0'],
    ['Northstar Health','2026-02-10','Invoice','INV-1238','Implementation Services','Hospital network onboarding support','1','18000','18000','','','Services Revenue','Healthcare','0'],
    ['Harbor Logistics','2026-03-05','Invoice','INV-1289','Usage Overage Pack','Peak season transaction overage','1','14700','14700','','','Usage Revenue','Logistics','0'],
    ['Apex Retail Group','2026-03-20','Invoice','INV-1304','Advanced Benchmarking Add-On','Quarter-end benchmarking expansion','12','6500','78000','2026-03-20','2027-03-19','Recurring Revenue','Retail','0'],
]

mapping_rows = [
    ['Product/Service','Dashboard Subscription','Website Hosting / Support Subscription','Professional Services','Usage Revenue'],
    ['Enterprise Analytics Platform','Yes','','',''],
    ['Premium Support Subscription','','Yes','',''],
    ['Retail Insights Platform','Yes','','',''],
    ['AI Forecasting Module','Yes','','',''],
    ['Logistics Control Tower','Yes','','',''],
    ['Campus Insights Suite','Yes','','',''],
    ['Student Retention Add-On','Yes','','',''],
    ['Workforce Planning Cloud','Yes','','',''],
    ['Clinic Performance Suite','Yes','','',''],
    ['Audience Intelligence Suite','Yes','','',''],
    ['Supply Chain Visibility','Yes','','',''],
    ['Transit Operations Cloud','Yes','','',''],
    ['Threat Response Analytics','Yes','','',''],
    ['Implementation Services','','','Yes',''],
    ['Usage Overage Pack','','','','Yes'],
    ['Advanced Benchmarking Add-On','Yes','','',''],
]

assumption_rows = [
    ['', 'Revenue Recognition Period Assumptions', ''],
    ['', 'Category', 'Rule'],
    ['', 'Dashboard Subscription', 'Recognize recurring revenue ratably from Subscription Start Date through Subscription End Date.'],
    ['', 'Website Hosting / Support Subscription', 'Recognize recurring revenue ratably from Subscription Start Date through Subscription End Date.'],
    ['', 'Professional Services', 'Recognize all revenue on the invoice date when invoiced.'],
    ['', 'Usage Revenue', 'Recognize all revenue on the invoice date when invoiced.'],
]

sheets = [
    ('Transaction Detail', transaction_rows),
    ('Product/Service Mapping', mapping_rows),
    ('Recognition Assumptions', assumption_rows),
]


def col_name(idx: int) -> str:
    out = ''
    idx += 1
    while idx:
        idx, rem = divmod(idx - 1, 26)
        out = chr(65 + rem) + out
    return out


shared_strings: list[str] = []
shared_index: dict[str, int] = {}


def sst_idx(value: str) -> int:
    if value not in shared_index:
        shared_index[value] = len(shared_strings)
        shared_strings.append(value)
    return shared_index[value]


def cell_xml(ref: str, value: str) -> str:
    if value == '':
        return ''
    try:
        float(value)
        if value.strip().startswith('0') and value.strip() not in ('0', '0.0'):
            raise ValueError
        if value.count('-') == 2 and len(value) == 10:
            raise ValueError
        if value.startswith('INV-'):
            raise ValueError
        return f'<c r="{ref}"><v>{value}</v></c>'
    except Exception:
        idx = sst_idx(value)
        return f'<c r="{ref}" t="s"><v>{idx}</v></c>'


worksheet_xml = []
for _, rows in sheets:
    row_xml = []
    for r_idx, row in enumerate(rows, start=1):
        cells = []
        for c_idx, value in enumerate(row):
            xml = cell_xml(f'{col_name(c_idx)}{r_idx}', str(value))
            if xml:
                cells.append(xml)
        row_xml.append(f'<row r="{r_idx}">{"".join(cells)}</row>')
    worksheet_xml.append(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<sheetData>{"".join(row_xml)}</sheetData>'
        '</worksheet>'
    )

# populate shared strings before building xml
for _, rows in sheets:
    for row in rows:
        for value in row:
            cell_xml('A1', str(value))

shared_strings_xml = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    f'<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="{len(shared_strings)}" uniqueCount="{len(shared_strings)}">'
    + ''.join(f'<si><t>{escape(s)}</t></si>' for s in shared_strings) +
    '</sst>'
)

workbook_xml = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    '<sheets>' + ''.join(
        f'<sheet name="{escape(name)}" sheetId="{i}" r:id="rId{i}"/>' for i, (name, _) in enumerate(sheets, start=1)
    ) + '</sheets></workbook>'
)

workbook_rels_xml = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + ''.join(
        f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i}.xml"/>'
        for i in range(1, len(sheets) + 1)
    )
    + f'<Relationship Id="rId{len(sheets)+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>'
    + '</Relationships>'
)

root_rels_xml = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
    '</Relationships>'
)

content_types_xml = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    '<Default Extension="xml" ContentType="application/xml"/>'
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'
    + ''.join(
        f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        for i in range(1, len(sheets) + 1)
    )
    + '</Types>'
)

OUT.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(OUT, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
    zf.writestr('[Content_Types].xml', content_types_xml)
    zf.writestr('_rels/.rels', root_rels_xml)
    zf.writestr('xl/workbook.xml', workbook_xml)
    zf.writestr('xl/_rels/workbook.xml.rels', workbook_rels_xml)
    zf.writestr('xl/sharedStrings.xml', shared_strings_xml)
    for i, xml in enumerate(worksheet_xml, start=1):
        zf.writestr(f'xl/worksheets/sheet{i}.xml', xml)

print(OUT)
