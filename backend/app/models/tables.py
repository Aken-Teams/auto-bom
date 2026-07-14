from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class UploadRecord(Base):
    """Records of uploaded BOM base files."""
    __tablename__ = "upload_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String(255))
    file_path: Mapped[str] = mapped_column(String(500))
    file_type: Mapped[str] = mapped_column(String(50), comment="bom_base | std_operation")
    row_count: Mapped[int] = mapped_column(Integer, default=0)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class BomTask(Base):
    """A generation task that produces output files."""
    __tablename__ = "bom_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default="draft", comment="draft | processing | completed | failed")
    upload_id: Mapped[int] = mapped_column(Integer, nullable=True)
    can_upload_id: Mapped[int] = mapped_column(Integer, nullable=True)
    std_upload_id: Mapped[int] = mapped_column(Integer, nullable=True)
    item_count: Mapped[int] = mapped_column(Integer, default=0)
    output_cmax_path: Mapped[str] = mapped_column(String(500), nullable=True)
    output_bom_path: Mapped[str] = mapped_column(String(500), nullable=True)
    output_routing_path: Mapped[str] = mapped_column(String(500), nullable=True)
    output_sequence_path: Mapped[str] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)


class BomTaskItem(Base):
    """Individual items selected for a BOM task."""
    __tablename__ = "bom_task_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[int] = mapped_column(Integer, index=True)
    item_no: Mapped[str] = mapped_column(String(100), comment="料号")
    summary: Mapped[str] = mapped_column(String(500), nullable=True, comment="摘要")
    doc_no: Mapped[str] = mapped_column(String(100), nullable=True, comment="内规文件编号")
    type_name: Mapped[str] = mapped_column(String(50), nullable=True, comment="TYPE")
    family: Mapped[str] = mapped_column(String(50), nullable=True, comment="FAMILY")
    package: Mapped[str] = mapped_column(String(50), nullable=True, comment="PACKAGE")
    line: Mapped[str] = mapped_column(String(50), nullable=True, comment="LINE")
    function: Mapped[str] = mapped_column(String(50), nullable=True, comment="FUNCTION")
    alt_structure: Mapped[str] = mapped_column(String(50), nullable=True, comment="MAX替代结构")
    component: Mapped[str] = mapped_column(String(100), nullable=True, comment="原件WAF")
    component_summary: Mapped[str] = mapped_column(String(500), nullable=True)
    weld_can: Mapped[str] = mapped_column(String(100), nullable=True, comment="焊接罐头")
    mold_can: Mapped[str] = mapped_column(String(100), nullable=True, comment="成型罐头")
    pack_can: Mapped[str] = mapped_column(String(100), nullable=True, comment="包装罐头")


class CanTemplate(Base):
    """Can (罐头) template lookup table."""
    __tablename__ = "can_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    function: Mapped[str] = mapped_column(String(50), nullable=True, comment="FUNCTION e.g. SKY/SUPER")
    waf_code: Mapped[str] = mapped_column(String(100), index=True, comment="WAF code")
    supplier: Mapped[str] = mapped_column(String(50), nullable=True)
    wafer_size: Mapped[str] = mapped_column(String(20), nullable=True)
    mil: Mapped[str] = mapped_column(String(20), nullable=True)
    weld_can: Mapped[str] = mapped_column(String(100), nullable=True, comment="焊接罐头代码")
    weld_desc: Mapped[str] = mapped_column(String(500), nullable=True)
    mold_can: Mapped[str] = mapped_column(String(100), nullable=True, comment="成型罐头代码")
    mold_desc: Mapped[str] = mapped_column(String(500), nullable=True)
    pack_can: Mapped[str] = mapped_column(String(100), nullable=True, comment="包装罐头代码")
    pack_desc: Mapped[str] = mapped_column(String(500), nullable=True)


class CanOption(Base):
    """General (通用) can options that are NOT matched by WAF code.

    Mold/pack cans in the 罐头 file have no WAF and apply across items
    according to user-defined rules (see CanRule). Replaced on each upload.
    """
    __tablename__ = "can_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    can_type: Mapped[str] = mapped_column(String(20), index=True, comment="mold | pack")
    can_code: Mapped[str] = mapped_column(String(100), comment="罐头代码 e.g. SMC_PA0009")
    can_desc: Mapped[str] = mapped_column(String(500), nullable=True, comment="原始描述")
    label: Mapped[str] = mapped_column(String(200), nullable=True, comment="精简显示标签")


class CanRule(Base):
    """User-defined rule for assigning a general can to items.

    Persisted globally so the rule panel remembers the last configuration.
    """
    __tablename__ = "can_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    can_type: Mapped[str] = mapped_column(String(20), index=True, comment="mold | pack")
    match_field: Mapped[str] = mapped_column(String(30), default="item_no", comment="item_no|type_name|family|package|component")
    match_op: Mapped[str] = mapped_column(String(20), default="contains", comment="all|contains|equals|regex")
    match_value: Mapped[str] = mapped_column(String(200), nullable=True)
    can_code: Mapped[str] = mapped_column(String(100), comment="套用的罐头代码")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class PlatingRule(Base):
    """User-defined rule for electroplating film thickness (5um / 8um).

    Default is 5um; a matching rule promotes an item to the target thickness.
    e.g. 摘要 包含 'S021' -> 8um; 料号 包含 '-AU' -> 8um.
    """
    __tablename__ = "plating_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    match_field: Mapped[str] = mapped_column(String(20), default="summary", comment="summary(摘要) | item_no(料号)")
    match_value: Mapped[str] = mapped_column(String(200), comment="包含的关键字")
    target_um: Mapped[int] = mapped_column(Integer, default=8, comment="目标膜厚 um (5 或 8)")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class StdOperation(Base):
    """Standard operation lookup from WXBMR004."""
    __tablename__ = "std_operations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    op_id: Mapped[int] = mapped_column(Integer, index=True, comment="标准作业ID")
    code: Mapped[str] = mapped_column(String(20), nullable=True, comment="代码")
    summary: Mapped[str] = mapped_column(String(255), nullable=True, comment="摘要")
    department: Mapped[str] = mapped_column(String(50), nullable=True, comment="部门")
    dept_summary: Mapped[str] = mapped_column(String(100), nullable=True, comment="部门摘要")
    seq: Mapped[int] = mapped_column(Integer, nullable=True, comment="序号")
    resource: Mapped[str] = mapped_column(String(50), nullable=True, comment="资源")
    resource_summary: Mapped[str] = mapped_column(String(255), nullable=True, comment="资源摘要")
    unit: Mapped[str] = mapped_column(String(20), nullable=True, comment="单位")
    pph: Mapped[str] = mapped_column(String(50), nullable=True, comment="PPH")
