"""Parse uploaded Excel files (BOM base, standard operations)."""
from pathlib import Path
from openpyxl import load_workbook


def parse_bom_base(file_path: str) -> list[dict]:
    """Parse MBU2 BOM底稿 (WXBMR005) and return structured records."""
    wb = load_workbook(file_path, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    wb.close()

    items = []
    for row in rows:
        vals = list(row)
        if not vals[0]:
            continue
        items.append({
            "item_no": str(vals[0] or ""),
            "summary": str(vals[1] or ""),
            "doc_no": str(vals[2] or ""),
            "category_l": str(vals[3] or ""),
            "category_m": str(vals[4] or ""),
            "alt_structure": str(vals[5] or ""),
            "bom_note": str(vals[6] or "") if len(vals) > 6 else "",
            "type_name": str(vals[7] or "") if len(vals) > 7 else "",
            "family": str(vals[8] or "") if len(vals) > 8 else "",
            "package": str(vals[9] or "") if len(vals) > 9 else "",
            "line": str(vals[10] or "") if len(vals) > 10 else "",
            "function": str(vals[11] or "") if len(vals) > 11 else "",
            "seq_no": str(vals[12] or "") if len(vals) > 12 else "",
            "component": str(vals[13] or "") if len(vals) > 13 else "",
            "component_summary": str(vals[14] or "") if len(vals) > 14 else "",
        })
    return items


def _can_label(desc: str) -> str:
    """Build a short display label from a can description.

    e.g. "包裝/SMC/TR 7\"/////0.8K/" -> "SMC / TR 7\" / 0.8K"
    Drops the leading type segment and any empty segments.
    """
    parts = [p.strip() for p in desc.split("/")]
    meaningful = [p for p in parts[1:] if p]
    return " / ".join(meaningful)


def parse_can_template(file_path: str) -> dict:
    """Parse 罐头 sheet from C-CMAX导入清单.

    Each row is ONE can; its type is encoded in the description (col 11):
      焊接 -> weld (matched by WAF code, one-to-one)
      成型 -> mold (general can, no WAF)
      包裝/包装 -> pack (general can, no WAF)

    Returns {"weld": [<CanTemplate dicts>], "options": [<general can dicts>]}.
    """
    wb = load_workbook(file_path, read_only=True, data_only=True)
    ws = wb["罐头"] if "罐头" in wb.sheetnames else wb.active
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    wb.close()

    weld_templates = []
    options = []
    seen_options = set()
    for row in rows:
        vals = list(row)
        waf = str(vals[1] or "") if len(vals) > 1 else ""
        can_code = str(vals[10] or "") if len(vals) > 10 else ""
        can_desc = str(vals[11] or "") if len(vals) > 11 else ""
        if not can_code and not waf:
            continue

        if can_desc.startswith("成型"):
            can_type = "mold"
        elif can_desc.startswith("包裝") or can_desc.startswith("包装"):
            can_type = "pack"
        elif can_desc.startswith("焊接") or waf:
            can_type = "weld"
        else:
            continue

        if can_type == "weld":
            weld_templates.append({
                "function": str(vals[0] or ""),
                "waf_code": waf,
                "supplier": str(vals[2] or "") if len(vals) > 2 else "",
                "wafer_size": str(vals[3] or "") if len(vals) > 3 else "",
                "mil": str(vals[5] or "") if len(vals) > 5 else "",
                "weld_can": can_code,
                "weld_desc": can_desc,
                "mold_can": "",
                "mold_desc": "",
                "pack_can": "",
                "pack_desc": "",
            })
        else:
            key = (can_type, can_code)
            if can_code and key not in seen_options:
                seen_options.add(key)
                options.append({
                    "can_type": can_type,
                    "can_code": can_code,
                    "can_desc": can_desc,
                    "label": _can_label(can_desc),
                })

    return {"weld": weld_templates, "options": options}


def parse_item_list(file_path: str) -> list[dict]:
    """Parse 料号清单 sheet from C-CMAX导入清单."""
    wb = load_workbook(file_path, read_only=True, data_only=True)
    ws = wb["料号清单"] if "料号清单" in wb.sheetnames else wb.active
    rows = list(ws.iter_rows(min_row=2, values_only=True))
    wb.close()

    items = []
    for row in rows:
        vals = list(row)
        if not vals[0]:
            continue
        items.append({
            "item_no": str(vals[0] or ""),
            "summary": str(vals[1] or ""),
            "doc_no": str(vals[2] or ""),
            "category_l": str(vals[3] or ""),
            "category_m": str(vals[4] or ""),
            "alt_structure": str(vals[5] or ""),
            "max_alt_structure": str(vals[6] or "") if len(vals) > 6 else "",
            "type_name": str(vals[7] or "") if len(vals) > 7 else "",
            "family": str(vals[8] or "") if len(vals) > 8 else "",
            "package": str(vals[9] or "") if len(vals) > 9 else "",
            "line": str(vals[10] or "") if len(vals) > 10 else "",
            "function": str(vals[11] or "") if len(vals) > 11 else "",
            "seq_no": str(vals[12] or "") if len(vals) > 12 else "",
            "component": str(vals[13] or "") if len(vals) > 13 else "",
            "component_summary": str(vals[14] or "") if len(vals) > 14 else "",
        })
    return items


def parse_std_operations(file_path: str, limit: int = 0) -> list[dict]:
    """Parse WXBMR004 standard operations.

    Args:
        file_path: Path to the Excel file.
        limit: If > 0, only parse the first `limit` valid rows (for quick validation).
    """
    wb = load_workbook(file_path, read_only=True, data_only=True)
    ws = wb.active

    ops = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        vals = list(row)
        if not vals[0]:
            continue
        try:
            op_id = int(vals[0])
        except (ValueError, TypeError):
            continue  # skip non-numeric rows (wrong file or header)
        try:
            seq = int(vals[5]) if vals[5] else 0
        except (ValueError, TypeError):
            seq = 0
        ops.append({
            "op_id": op_id,
            "code": str(vals[1] or ""),
            "summary": str(vals[2] or ""),
            "department": str(vals[3] or ""),
            "dept_summary": str(vals[4] or ""),
            "seq": seq,
            "resource": str(vals[6] or "") if len(vals) > 6 else "",
            "resource_summary": str(vals[7] or "") if len(vals) > 7 else "",
            "unit": str(vals[8] or "") if len(vals) > 8 else "",
            "pph": str(vals[9] or "") if len(vals) > 9 else "",
        })
        if limit and len(ops) >= limit:
            break
    wb.close()
    return ops
