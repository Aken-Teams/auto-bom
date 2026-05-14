"""Generate output Excel files: C-CMAX import list + 3 ERP upload files."""
from pathlib import Path
from datetime import datetime
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill


HEADER_FONT = Font(name="Microsoft YaHei", bold=True, size=10, color="FFFFFF")
HEADER_FILL = PatternFill(start_color="2B3A67", end_color="2B3A67", fill_type="solid")
CELL_FONT = Font(name="Microsoft YaHei", size=10)
THIN_BORDER = Border(
    left=Side(style="thin"),
    right=Side(style="thin"),
    top=Side(style="thin"),
    bottom=Side(style="thin"),
)


def _style_header(ws, headers: list[str]):
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = THIN_BORDER


def _style_row(ws, row_idx: int, col_count: int):
    for col in range(1, col_count + 1):
        cell = ws.cell(row=row_idx, column=col)
        cell.font = CELL_FONT
        cell.border = THIN_BORDER


def generate_cmax_list(items: list[dict], output_dir: Path) -> str:
    """Generate C-CMAX import list Excel file (料号清单 + 罐头 sheets)."""
    wb = Workbook()

    # --- Sheet 1: 料号清单 ---
    ws1 = wb.active
    ws1.title = "料号清单"
    headers1 = [
        "料号", "摘要", "内规文件编号", "大分类", "中分类",
        "替代结构", "TYPE", "FAMILY", "PACKAGE", "LINE", "FUNCTION",
        "原件", "原件摘要",
        "焊接罐头", "成型罐头", "包装罐头",
    ]
    _style_header(ws1, headers1)

    for idx, item in enumerate(items, 2):
        row_data = [
            item.get("item_no", ""),
            item.get("summary", ""),
            item.get("doc_no", ""),
            item.get("category_l", ""),
            item.get("category_m", ""),
            item.get("alt_structure", ""),
            item.get("type_name", ""),
            item.get("family", ""),
            item.get("package", ""),
            item.get("line", ""),
            item.get("function", ""),
            item.get("component", ""),
            item.get("component_summary", ""),
            item.get("weld_can", ""),
            item.get("mold_can", ""),
            item.get("pack_can", ""),
        ]
        for col, val in enumerate(row_data, 1):
            ws1.cell(row=idx, column=col, value=val)
        _style_row(ws1, idx, len(headers1))

    for col in range(1, len(headers1) + 1):
        ws1.column_dimensions[chr(64 + col) if col < 27 else "A" + chr(64 + col - 26)].width = 18

    # --- Sheet 2: 罐头 (unique can mappings) ---
    ws2 = wb.create_sheet("罐头")
    headers2 = [
        "FUNCTION", "原件(WAF)", "焊接罐头", "焊接罐头摘要",
        "成型罐头", "成型罐头摘要", "包装罐头", "包装罐头摘要",
    ]
    _style_header(ws2, headers2)

    seen_cans = set()
    can_row = 2
    for item in items:
        comp = item.get("component", "")
        if not comp or comp in seen_cans:
            continue
        seen_cans.add(comp)
        ws2.cell(row=can_row, column=1, value=item.get("function", ""))
        ws2.cell(row=can_row, column=2, value=comp)
        ws2.cell(row=can_row, column=3, value=item.get("weld_can", ""))
        ws2.cell(row=can_row, column=4, value="")
        ws2.cell(row=can_row, column=5, value=item.get("mold_can", ""))
        ws2.cell(row=can_row, column=6, value="")
        ws2.cell(row=can_row, column=7, value=item.get("pack_can", ""))
        ws2.cell(row=can_row, column=8, value="")
        _style_row(ws2, can_row, len(headers2))
        can_row += 1

    for col in range(1, len(headers2) + 1):
        ws2.column_dimensions[chr(64 + col)].width = 20

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"C-CMAX_import_list_{ts}.xlsx"
    filepath = output_dir / filename
    wb.save(str(filepath))
    return str(filepath)


def generate_bom_loader(items: list[dict], output_dir: Path) -> str:
    """Generate pj_bom_loader Excel file."""
    wb = Workbook()
    ws = wb.active
    ws.title = "主BOM"

    headers = [
        "", "assembly_item\n組裝料號", "alternate_bom_designator\n替代結構",
        "operation_sequence_number\n作業序號", "component_item\n元件",
        "quantity_per_assembly\nERP數量", "component_yield_factor\n良品率",
    ]
    _style_header(ws, headers)

    row_idx = 2
    for item in items:
        component = item.get("component", "")
        alt = item.get("alt_structure", "")
        weld = item.get("weld_can", "")
        mold = item.get("mold_can", "")
        pack = item.get("pack_can", "")

        # seq 10: 切割 - component (WAF)
        if component:
            ws.cell(row=row_idx, column=2, value=item["item_no"])
            ws.cell(row=row_idx, column=3, value=alt)
            ws.cell(row=row_idx, column=4, value=10)
            ws.cell(row=row_idx, column=5, value=component)
            ws.cell(row=row_idx, column=6, value=1)
            ws.cell(row=row_idx, column=7, value=1)
            _style_row(ws, row_idx, 7)
            row_idx += 1

        # seq 20: 焊接罐头
        if weld:
            ws.cell(row=row_idx, column=2, value=item["item_no"])
            ws.cell(row=row_idx, column=3, value=alt)
            ws.cell(row=row_idx, column=4, value=20)
            ws.cell(row=row_idx, column=5, value=weld)
            ws.cell(row=row_idx, column=6, value=1)
            ws.cell(row=row_idx, column=7, value=1)
            _style_row(ws, row_idx, 7)
            row_idx += 1

        # seq 30: 成型罐头
        if mold:
            ws.cell(row=row_idx, column=2, value=item["item_no"])
            ws.cell(row=row_idx, column=3, value=alt)
            ws.cell(row=row_idx, column=4, value=30)
            ws.cell(row=row_idx, column=5, value=mold)
            ws.cell(row=row_idx, column=6, value=1)
            ws.cell(row=row_idx, column=7, value=1)
            _style_row(ws, row_idx, 7)
            row_idx += 1

        # seq 80: 包装罐头
        if pack:
            ws.cell(row=row_idx, column=2, value=item["item_no"])
            ws.cell(row=row_idx, column=3, value=alt)
            ws.cell(row=row_idx, column=4, value=80)
            ws.cell(row=row_idx, column=5, value=pack)
            ws.cell(row=row_idx, column=6, value=1)
            ws.cell(row=row_idx, column=7, value=1)
            _style_row(ws, row_idx, 7)
            row_idx += 1

    for col in range(1, 8):
        ws.column_dimensions[chr(64 + col)].width = 25

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"pj_bom_loader_{ts}.xlsx"
    filepath = output_dir / filename
    wb.save(str(filepath))
    return str(filepath)


def generate_routings(items: list[dict], output_dir: Path) -> str:
    """Generate routings Excel file."""
    wb = Workbook()
    ws = wb.active
    ws.title = "替代结构"

    headers = [
        "", "ROUTING_SEQUENCE_ID", "ASSEMBLY_ITEM_ID", "ORGANIZATION_ID",
        "ALTERNATE_ROUTING_DESIGNATOR", "LAST_UPDATE_DATE", "LAST_UPDATED_BY",
        "CREATION_DATE", "CREATED_BY", "LAST_UPDATE_LOGIN", "ROUTING_TYPE",
    ]
    _style_header(ws, headers)

    seen = set()
    row_idx = 2
    for item in items:
        key = (item["item_no"], item.get("alt_structure", ""))
        if key in seen:
            continue
        seen.add(key)

        ws.cell(row=row_idx, column=5, value=item.get("alt_structure", ""))
        ws.cell(row=row_idx, column=11, value=1)
        _style_row(ws, row_idx, 11)
        row_idx += 1

    for col in range(1, 12):
        ws.column_dimensions[chr(64 + col)].width = 22

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"routings_{ts}.xlsx"
    filepath = output_dir / filename
    wb.save(str(filepath))
    return str(filepath)


def generate_sequences(items: list[dict], std_ops: dict, output_dir: Path) -> str:
    """Generate sequences-raw Excel file."""
    wb = Workbook()
    ws = wb.active
    ws.title = "替代结构"

    headers = [
        "", "OPERATION_SEQUENCE_ID", "ROUTING_SEQUENCE_ID",
        "OPERATION_SEQ_NUM", "LAST_UPDATE_DATE", "LAST_UPDATED_BY",
        "CREATION_DATE", "CREATED_BY", "LAST_UPDATE_LOGIN",
        "STANDARD_OPERATION_ID", "DEPARTMENT_ID",
    ]
    _style_header(ws, headers)

    # Standard sequence: 10=切割, 20=焊接, 30=成型, 40=包装
    seq_steps = [10, 20, 30, 40]

    seen = set()
    row_idx = 2
    for item in items:
        key = (item["item_no"], item.get("alt_structure", ""))
        if key in seen:
            continue
        seen.add(key)

        for step in seq_steps:
            ws.cell(row=row_idx, column=4, value=step)
            # Look up standard operation ID based on step and family
            op_key = f"{step}_{item.get('family', '')}"
            std_op_id = std_ops.get(op_key, "")
            ws.cell(row=row_idx, column=10, value=std_op_id)
            _style_row(ws, row_idx, 11)
            row_idx += 1

    for col in range(1, 12):
        ws.column_dimensions[chr(64 + col)].width = 22

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"sequences_raw_{ts}.xlsx"
    filepath = output_dir / filename
    wb.save(str(filepath))
    return str(filepath)
