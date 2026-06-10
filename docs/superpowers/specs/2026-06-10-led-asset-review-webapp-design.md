# LED Asset Review Web App · Design Spec

**日期**：2026-06-10
**作者**：Claude (brainstorm with 用户)
**状态**：Draft — 待用户 review
**关联**：
- 规则源：`/Users/llm/Downloads/整理规范/.claude/skills/led-asset-naming/SKILL.md`
- 项目根：`/Users/llm/Downloads/整理规范/`
- 仓库（GitHub）：`led-asset-review`（私有 / 个人 / MIT / main+docs 部署）

---

## 1. 背景与目标

### 1.1 痛点
iQiyi LED 大屏动态背景墙资产有 6 字段硬性命名规范 + 4 套词典 + 项目级约定。当前只有一份 `SKILL.md` 文档供人肉眼对照，**逐个文件名人工核对**费时且易漏。

### 1.2 目标
把 `SKILL.md` 包装成**纯静态 Web App**，用户拖入文件夹后：
1. 自动按规则扫描
2. 一张张弹违规卡（Card Stack）
3. 用户实时决定：改名 / 跳过 / 跳过此类
4. 兜底提供 `rename.sh` 下载供批量改

### 1.3 非目标（YAGNI）
- ❌ 不做 i18n（全中文）
- ❌ 不做账号系统 / 云端同步
- ❌ 不做历史记录持久化
- ❌ 不做实际写入 iQiyi 资产库
- ❌ 不支持多文件夹批量扫描（一次一个）

---

## 2. 架构总览

### 2.1 五层架构

```
┌─────────────────────────────────────────┐
│  启动层 (BootView)                      │
│  fetch ./SKILL.md → 解析 → 检测浏览器能力 │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  扫描层 (DragZone + ScanEngine)         │
│  拖入 → walk 目录树 → 校验每文件         │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  规则引擎 (RuleParser + 校验函数)        │
│  纯函数：filename + rules → violations  │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  状态层 (State)                          │
│  phase / violations / currentIndex /     │
│  skippedTypes / history                 │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  渲染层 (CardStack)                      │
│  DragZone / SummaryBar /                │
│  ViolationCard / DoneScreen             │
└─────────────────────────────────────────┘
```

### 2.2 浏览器能力矩阵 + 改名方案

| 浏览器 | `showDirectoryPicker` | rename 通道 | 兜底 |
|---|---|---|---|
| Chrome 110+ / Edge 110+ | ✅ | 实测 `FileSystemFileHandle.move()` | rename.sh 下载 |
| Safari 17+ / Firefox 125+ | ❌ | 复制建议名到剪贴板 | rename.sh 下载 |

**核心约束**：浏览器安全模型不允许任意改本地文件名，故采用 **C + A hybrid**：
- **有能力** → 实测改名（写盘）
- **无能力** → 复制建议名 + 提示用户用 Finder/Explorer 改名

---

## 3. 目录与文件结构

### 3.1 仓库布局

```
led-asset-review/                          ← GitHub 仓库根
├── .gitignore                              ← 标准 Node/macOS 忽略
├── LICENSE                                 ← MIT
├── README.md                               ← 中文：用法 / 安装 / 部署 / 截图
└── docs/                                   ← GitHub Pages 根目录
    ├── index.html                          # 单文件 web app（UI 容器）
    ├── app.js                              # 核心逻辑（RuleParser + ScanEngine + UI 控制器）
    ├── SKILL.md                            # 命名规则源文档（web app 启动时 fetch 这个）
    ├── tests.html                          # 测试入口
    ├── test-fixtures/                      # 真实文件夹 fixture
    │   ├── case-01-mixed-violations/
    │   ├── case-02-clean-folder/
    │   ├── case-03-edge-cases/
    │   └── case-04-car-shot/
    └── expected-results.md                 # case-01 期望输出清单
```

### 3.2 关键设计点

1. **`docs/` 是 GitHub Pages 根** —— 仓库 Settings → Pages → Source 选 `main` 分支 `/docs` 目录
2. **`docs/SKILL.md` 是 web app 的唯一规则源** —— `index.html` 启动时 `fetch('./SKILL.md')`，同源、零网络
3. **`app.js` 独立** —— 让 `tests.html` 可以 `<script src="./app.js">` 直接引入跑断言，UI 跟逻辑解耦
4. **`.claude/skills/led-asset-naming/SKILL.md` 合并到 `docs/SKILL.md`** —— 单一文件 + README 教软链用法：
   ```bash
   ln -s /path/to/led-asset-review/docs/SKILL.md \
         ~/.claude/skills/led-asset-naming/SKILL.md
   ```
5. **`LED规范.docx` 留在仓库根** —— iQiyi 原始规范文档，留作"溯源参考"
6. **`.gitignore`** 包括：`.DS_Store`、`node_modules/`（万一以后加构建）、`.superpowers/`（brainstorm state）

### 3.3 取舍说明
- **symlink 同步 SKILL.md vs 单一文件 + 软链** —— 跨平台 symlink 在 Git for Windows 上坑多，选单一文件
- **`LED规范.docx` 进 git** —— 1.2MB 一次性成本，下载仓库就能看到原文

---

## 4. 数据流 / 组件 / 状态

### 4.1 端到端数据流

```
[打开 index.html]
       ↓
[启动层] fetch ./SKILL.md → 解析为 4 套词典
       ↓ 失败 → 致命错误屏（重试按钮）
[扫描层] 拖入文件夹 → walkFileTree() → 每个 entry 提取 (parent, name)
       ↓
[规则引擎] 对每个文件名跑 6 字段校验 → 产出 violations[]
       ↓ 空 → "全部合规" 屏
[渲染层] CardStack 弹第 1 张违规卡
       ↓
[用户操作] [改名] / [跳过] / [跳过此类] / [上一条] / [生成 rename.sh]
       ↓
[循环] 直到 violations 处理完 → 完成屏（汇总：改名 X / 跳过 Y / 跳过此类 Z 类）
```

### 4.2 7 个模块

| 模块 | 职责 | 依赖 |
|---|---|---|
| `BootView` | 启动：fetch SKILL.md + 检测浏览器能力 | RuleParser, CapabilityDetector |
| `RuleParser` | 解析 SKILL.md markdown → 4 套 dict + 模式串 | — |
| `CapabilityDetector` | 检测 `showDirectoryPicker` 是否存在 | — |
| `DragZone` | drop 事件 + `<input webkitdirectory>` 备用 | ScanEngine |
| `ScanEngine` | walk 目录树 + 校验每文件 → 产出 `Violation[]` | RuleParser |
| `CardStack` | 状态机：渲染当前卡 / 按钮处理 / 推进 / 回退 | ViolationCard, SummaryBar |
| `ViolationCard` | 单卡 UI：原名 / 建议名 / 复制按钮 / 原因 / 规则展开 | — |
| `SummaryBar` | 顶栏进度条 + 计数 | — |
| `DoneScreen` | 完成汇总 + [生成 rename.sh] 兜底按钮 | — |

**关键边界**：`RuleParser` 和 `ScanEngine` 是纯函数，输入输出明确，方便单测。

### 4.3 状态模型

```js
const State = {
  phase: 'boot' | 'idle' | 'scanning' | 'reviewing' | 'done' | 'error',

  // 启动后只读
  capability: 'rename' | 'copy-only',
  rules: null | {
    sceneCode: { pattern: /^[A-Z]{2,8}$/ },
    timeCodes: { NT:'夜晚', FN:'上午', ... },
    weatherCodes: { N:'正常', R:'下雨', ... },
    methods: {
      video:    { RS:'全实拍', RVC:'实拍+CG', VE:'全CG' },
      project:  { CP:'合成', DC:'DCC', UE:'UE', CG:'调色' },
      material: { CPM:'合成素材', DCM:'DCC素材', CGM:'调色素材', M:'原始素材' }
    },
    versionPattern: /^V\d{2}$/,
    shotPattern: /^\d{3}-[FRBLT]$/,
    sequencePattern: /^\d{5}$/
  },

  // 扫描后填入
  files: FileEntry[],
  violations: Violation[],

  // 审核中变化
  currentIndex: number,
  skippedTypes: Set<string>,
  history: Action[]
}

type Violation = {
  file: FileEntry,
  parent: string,
  issues: { tag: string, detail: string, ruleRef: string }[],
  suggestedName: string,
  status: 'pending' | 'renamed' | 'skipped',
  skippedType?: string
}
```

### 4.4 流转规则

- `[改名]` → `status: 'renamed'`，`currentIndex++`，push 到 history
- `[跳过]` → `status: 'skipped'`，`currentIndex++`，push 到 history
- `[跳过此类]` → 把 issues 里所有 tag 加入 `skippedTypes`；所有含这些 tag 的卡片自动 `status: 'skipped'`，`currentIndex` 跳到下一条未处理
- `[上一条]` → 弹栈还原上一动作
- `skippedTypes` 在整个会话内有效，**不持久化**

### 4.5 校验规则清单

| # | 校验 | 失败 tag | ruleRef |
|---|---|---|---|
| 1 | 按 `_` 切，应得 6 段（序列帧 7 段） | "段数错" | Quick Reference |
| 2 | 字段 1：大写字母、长度 2-10 | "场景码非法" | 字段 1 |
| 3 | 字段 2：车拍 `^\d{3}-[FRBLT]$` 或普通 `^\d+$` | "镜号格式错" | 字段 2 |
| 4 | 字段 3：在 `timeCodes` 里 | "时间码未知" | 字段 3 |
| 5 | 字段 4：在 `weatherCodes` 里 | "天气码未知" | 字段 4 |
| 6 | 字段 5：在对应 `methods` 字典里 | "工序码未知" | 字段 5a/5b |
| 7 | 字段 6：匹配 `^V\d{2}$`（摄影原始素材 `_M` 结尾除外） | "版本号格式错" | 字段 6 |
| 8 | 序列帧：第 7 段 5 位数字 + 扩展名 ∈ {`.dpx`, `.exr`, `.tiff`} | "序列帧扩展名错" | Common Mistakes |
| 9 | 项目级覆盖（仅在 UI 开关"启用项目级约定"勾选时跑）：父目录中文名**无半角空格** + 文件名**无半角空格** | "项目约定违反" | 项目级约定 |

**关于 #9 的边界**：v1 不维护"项目前缀清单"（不知道 `CZ` 是哪个项目、也不知道场景名边界），所以"项目+场景直接连写"这条**只做文档说明，不做自动校验**。若用户硬要自动校验，得在 SKILL.md 里加一份项目前缀表（解析器同步更新），属于 v2 范围。

---

## 5. UI 设计

### 5.1 Card Stack 卡片

```
┌────────────────────────────────────────┐
│  ❌ 违规 3 / 47      📁 常州戚墅街道/CP │
│                                        │
│  原文件名                              │
│  ┌──────────────────────────────────┐ │
│  │ CZ_QSJD_101-F_FN_NRS_V01.mov     │ │
│  └──────────────────────────────────┘ │
│                                        │
│  建议改为                              │
│  ┌──────────────────────────────────┐ │
│  │ CZQSJD_101-F_FN_N_RS_V01.mov     │ [📋 复制]│
│  └──────────────────────────────────┘ │
│                                        │
│  ⚠ NRS 黏合：天气与制作方式字段必须拆开│
│  ▾ SKILL.md 章节展开...                │
│                                        │
│  [跳过] [跳过此类] [上一条] [改名]      │
│  [生成 rename.sh]  ←── 批量兜底         │
└────────────────────────────────────────┘
```

### 5.2 按钮行为

| 按钮 | 行为 | 出现条件 |
|---|---|---|
| 主操作 [改名] | 调 `FileSystemFileHandle.move()` 改名 | Chrome/Edge rename 模式 |
| 主操作 [复制建议名] | 复制建议名到剪贴板，提示用户在 Finder 改名 | Safari/Firefox copy-only 模式 |
| 内联 [📋 复制] | 复制建议名（小按钮，通用） | 永远在建议名右侧 |
| [跳过] | 标记 `status:'skipped'`，下一张 | 通用 |
| [跳过此类] | 加入 `skippedTypes` 集合 | 通用 |
| [上一条] | 弹 history 栈 | 通用 |
| [生成 rename.sh] | 下载 shell 脚本（兜底） | 通用 |

**避免命名歧义**：主操作按钮在两种模式下叫不同名（[改名] vs [复制建议名]），内联小按钮统一叫 [📋 复制]。

### 5.3 顶部开关

```
┌────────────────────────────────────────────┐
│  ☑ 启用项目级约定（iQiyi 内部项目）          │
│  ☑ 校验序列帧扩展名                          │
└────────────────────────────────────────────┘
```

- **启用项目级约定**（默认开）：开启后跑 §4.5 #9 检查（父目录/文件名无空格）。若用户在做 iQiyi 直交付（无项目层），关掉。
- **校验序列帧扩展名**（默认开）：开启后 §4.5 #8 严格只允许 `.dpx / .exr / .tiff`。若项目允许 `.png / .jpg` 序列帧，关掉。

**取舍说明**：与其把开关藏进"设置"页，不如常驻在拖入区域上方 —— 用户每次扫新文件夹都可能换项目场景，常驻可见避免来回进设置。

### 5.4 完成屏

### 5.3 完成屏

显示汇总：
- 改名 X 个
- 跳过 Y 个
- 跳过 Z 个 issue 类型
- [重新开始] 按钮（清空 state）

---

## 6. 错误处理

### 6.1 错误等级

| 等级 | 触发 | UI | 用户动作 |
|---|---|---|---|
| **F 致命** | SKILL.md 加载/解析失败 | 全屏红 + 重试 | 重试 / 回到 GitHub |
| **S 严重** | 文件夹权限被拒 / 拖入非文件夹 | 顶部黄条 | 重新拖入 |
| **W 警告** | 部分文件无法读取 / 字段未知 | 卡片内黄字 | 人工确认 |
| **T 瞬时** | 单次改名失败 / 复制失败 | Toast 3s | 重试 / 跳过 |

### 6.2 各层错误清单

#### 启动层
- **F1**: `fetch('./SKILL.md')` 404 → 屏："找不到 SKILL.md，请到 GitHub 重新拉取" + [重试]
- **F2**: SKILL.md 解析失败（关键章节缺失）→ 屏："规则解析失败：缺少 {章节}，请联系维护者" + console
- **T-能力降级**: `showDirectoryPicker` 不存在 → 静默降级到 `copy-only`

#### 扫描层
- **S1**: 拖入单个文件 / 多文件夹 → Toast "请拖入单个文件夹"
- **S2**: 空文件夹 → 屏 "📁 此文件夹无文件"
- **S3**: 权限被拒 → 顶部黄条 "⚠ 跳过 X 个无法访问的文件"
- **W1**: 文件名编码异常 → 归"未识别"组
- **W2**: 字段值不在字典里 → 标记 "未知码"，给建议
- **T-超时**: > 10k 文件 → 进度条 + 取消

#### 卡片操作
- **T1**: `move()` 失败（同名/被移走/权限）→ Toast 保留卡，按钮变 [重试] [跳过] [跳过此类]
- **T2**: 剪贴板 API 不可用 → 建议名输入框全选 + Toast "Cmd+C 复制"
- **T3**: rename.sh 失败 → 退化复制到剪贴板

#### 规则引擎
- **W3**: 摄影原始素材 `_M` → 跳过版本号校验
- **W4**: 序列帧 → 允许 7 段
- **W5**: 父目录缺失 → 提示 "无法判断项目级约定"

### 6.3 恢复策略

| 场景 | 策略 |
|---|---|
| 改名中途文件被外部改名 | 下次扫描重新发现违规 |
| 用户误跳过 | [上一条] 回退（仅限本会话） |
| 用户刷新页面 | 不持久化，提示 "进度丢失" 二次确认 |
| 浏览器崩溃 | 重新打开从第 1 张卡开始 |
| 解析器挂掉 | F2 明确指出缺哪个章节 |

### 6.4 三条 UX 承诺
1. **不丢数据** — 任何操作失败都不动用户文件
2. **不卡死** — 所有异步操作都有超时与降级
3. **可降级** — rename → copy → rename.sh 三级降级链

---

## 7. 测试方法

### 7.1 三层测试

| 层 | 目标 | 方式 | 自动化 |
|---|---|---|---|
| **层 1 纯函数单测** | `RuleParser.parse()` + `ScanEngine.validate()` + `suggestName()` | `tests.html` 跑 `assertEq` | ✅ 自动 |
| **层 2 集成流** | 真实文件夹 fixture | 拖入后对照 `expected-results.md` | ❌ 人工 checklist |
| **层 3 浏览器兼容** | Chrome/Edge/Safari/Firefox | 冒烟清单 6 步 | ❌ 人工 smoke test |

### 7.2 关键测试用例

```js
// RuleParser
assertEq(RuleParser.parse(SAMPLE).timeCodes.NT, '夜晚', '时间码 NT');
assertEq(RuleParser.parse(SAMPLE).methods.video.VE, '全CG视效', 'VE');

// ScanEngine.validate
assertEq(ScanEngine.validate('LXZC_1_NT_N_RS_V01.mov').issues.length, 0, '通用规范正确');
assertEq(ScanEngine.validate('CZ QSJD_101-F_FN_N_RS_V01.mov').issues[0].tag, '项目约定违反', '空格');
assertEq(ScanEngine.validate('CZQSJD_101-F_FN_NRS_V01.mov').issues[0].tag, 'NRS 黏合', '黏合');
assertEq(ScanEngine.validate('LXZC_1_NT_N_CP_V01_00502.dpx').issues.length, 0, '序列帧');
assertEq(ScanEngine.validate('LXZC_1_NT_N_CP_V01_00502.png').issues[0].tag, '序列帧扩展名错', '扩展名');

// suggestName
assertEq(ScanEngine.suggestName('CZQSJD_101-F_FN_NRS_V01.mov', rules),
         'CZQSJD_101-F_FN_N_RS_V01.mov', '拆 NRS → N_RS');
```

### 7.3 Fixture 文件夹

```
docs/test-fixtures/
├── case-01-mixed-violations/    # 10 文件，6 违规 4 合规
├── case-02-clean-folder/         # 5 文件全合规
├── case-03-edge-cases/           # 空格、emoji、零字节
└── case-04-car-shot/             # 车拍 5 块屏全对
```

### 7.4 验收标准

- ✅ `tests.html` 打开后所有断言 ✓（0 个 ✗）
- ✅ `case-01` 6 个违规全检出，issue tag 与 `expected-results.md` 一致
- ✅ 4 个浏览器冒烟清单全过
- ✅ Chrome 改名真实写盘 / Safari 复制可粘出建议名

---

## 8. 已敲定决策（索引）

| # | 议题 | 答案 |
|---|---|---|
| Q1 | UI 形态 | A. Web App（纯静态） |
| Q2 | 文件访问 | A. 拖拽 + 文件选择器 |
| Q3 | 功能深度 | Card Stack + 跳过此类（实时改，放弃批量） |
| Q4 | 技术栈 | A. 纯 HTML + Vanilla JS + CSS |
| Q5 | 扫描结果布局 | Card Stack 单卡流 |
| Q5b | 规则来源 | B. fetch 同源 SKILL.md 解析 |
| Q6 | UI 语言 | A. 全中文 |
| Q7 | 仓库 | `led-asset-review` / 个人 / 私有 / main+docs / MIT |
| Q8 | 报错原因 | C. 短标签 + 完整规则原文（可展开） |
| Q9 | 报告导出 | ❌ 不要，弹窗里直接改 |
| Q10 | 弹窗交互 | A. Card Stack + [跳过此类] |
| Q11 | 项目前缀解析 | A. 不拆，整体当 scene code |
| 实现 | 文件组织 | A. 单文件 `index.html` + 抽出 `app.js` |
| 改名 | 浏览器分支 | C + A hybrid（File System Access API + copy 兜底） |

### 8.1 修订 1：项目级约定

父级目录中文名**取消半角空格**（`常州 戚墅街道/` → `常州戚墅街道/`），项目前缀 ⇄ 场景名之间**取消任何分隔符**，拼音首字母**直接连写**（`CZ` + `QSJD` → `CZQSJD`）。与父级目录**镜像对齐**（镜像"项目+场景"结构，不是镜像空格）。

---

## 9. 下一步

- [ ] 用户 review 本 spec
- [ ] 改 → 改完再次自审
- [ ] 通过 → 转 writing-plans skill 拆任务
- [ ] writing-plans 输出后开始实现

---

## 10. 附录 A：版本与依赖

- 目标浏览器：Chrome 110+, Edge 110+, Safari 17+, Firefox 125+
- 零 npm 依赖，零构建步骤
- 部署：GitHub Pages 自动（`main` 分支 `/docs` 目录）
- 开发：本地 `python3 -m http.server` 在 `docs/` 目录跑即可

## 11. 附录 B：仓库初始化待办

- [ ] `git init` 在 `/Users/llm/Downloads/整理规范/`
- [ ] `git mv .claude/skills/led-asset-naming/SKILL.md docs/SKILL.md`
- [ ] 创建 `LICENSE`（MIT）
- [ ] 创建 `README.md`
- [ ] 创建 `.gitignore`
- [ ] 创建 `docs/index.html` + `docs/app.js`（实现见 writing-plans 输出）
- [ ] 创建 `docs/tests.html` + `docs/test-fixtures/`
- [ ] GitHub 创私有仓库 `led-asset-review`
- [ ] 推送 + 启用 Pages（main+docs）
