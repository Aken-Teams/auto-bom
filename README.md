# BOM 表自动生成 (Auto-BOM)

BOM 自动化生成工具，将 BOM 底稿快速转换为 ERP 系统所需的上传文件。

## 功能

### 阶段一：生成 C-CMAX 导入清单
1. **上传底稿** — 上传 BOM 底稿 (WXBMR005) + 罐头对照表（可选）
2. **筛选料号** — 从底稿中选择需要建立 BOM 的料号
3. **配置罐头** — 自动匹配或手动配置焊接、成型、包装罐头
4. **生成清单** — 导出 C-CMAX 导入清单 Excel 文件（含料号清单 + 罐头两个 sheet）

### 阶段二：生成 ERP 上传文件
5. **生成文件** — 上传标准作业文件 (WXBMR004)，自动生成 3 个 ERP 上传文件：
   - `pj_bom_loader` — BOM 汇入（23 栏）
   - `routings` — 工艺路线（60 栏）
   - `sequences-raw` — 作业序列（99 栏）

### 其他功能
- 历史记录 — 查看、下载、删除历史任务
- 多语系 — 简体中文 / 繁体中文 / English
- 文件管理 — 上传和产出文件按任务分文件夹存放

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS 4 |
| 后端 | Python + FastAPI + SQLAlchemy |
| 数据库 | MySQL |
| Excel 处理 | openpyxl |

## 项目结构

```
auto-bom/
├── frontend/          # React 前端
│   ├── src/
│   │   ├── pages/     # 页面（WizardPage, HistoryPage）
│   │   ├── components/# 组件（Layout, StepIndicator, Toast 等）
│   │   ├── api/       # API 调用
│   │   └── i18n/      # 多语系（zh-CN, zh-TW, en）
│   └── public/        # 静态资源（logo.png）
├── backend/           # FastAPI 后端
│   └── app/
│       ├── routes/    # API 路由（upload, tasks）
│       ├── services/  # 业务逻辑（bom_generator, excel_parser）
│       ├── models/    # 数据模型（BomTask, BomTaskItem, CanTemplate）
│       ├── config.py  # 配置（数据库、文件路径）
│       └── database.py
├── data/              # 参考文件和测试数据
├── uploads/           # 上传文件（按 task_{id} 分文件夹）
└── outputs/           # 产出文件（按 task_{id} 分文件夹）
```

## 快速开始

### 后端

```bash
cd backend
pip install fastapi uvicorn sqlalchemy pymysql openpyxl
uvicorn app.main:app --host 0.0.0.0 --port 12063
```

### 前端

```bash
cd frontend
pnpm install
pnpm dev
```

前端默认运行在 `http://localhost:12062`，通过 Vite proxy 代理到后端 `http://localhost:12063`。

## 数据库配置

在 `backend/app/config.py` 中配置 MySQL 连接：

```python
DATABASE_URL = "mysql+pymysql://user:password@host:port/dbname"
```
