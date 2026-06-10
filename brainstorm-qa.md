# Brainstorm Q&A Log · LED Asset Review Web App

**日期**：2026-06-10
**项目**：基于 `/Users/llm/Downloads/整理规范/.claude/skills/led-asset-naming/SKILL.md` 包装带 UI 的 Web App
**状态**：恢复中 → 继续问 Q7-Q11

## 已敲定

| # | 议题 | 答案 |
|---|---|---|
| Q1 | UI 形态 | **A. Web App**（纯静态，浏览器跑） |
| Q2 | 文件访问 | **A. 拖拽 + 文件选择器**（File API，零后端） |
| Q3 | 功能深度 | 先生成审核报告 → 勾选 → 批量改名（人参与） |
| Q4 | 技术栈 | **A. 纯 HTML + Vanilla JS + CSS**（零构建） |
| Q5 | 扫描结果布局 | **A. 顶栏状态计数 + 单页表 + 行内建议名** |
| Q5b | 规则来源 | **B. 启动时 fetch 同源 SKILL.md 解析**（用户已确认接受解析器维护成本，约定"维护再找我"） |
| Q6 | UI 语言 | **A. 全中文**（不做 i18n） |
| GitHub | 账号 | 用户已有，仓库名待定 |

## 修订 1：项目级命名规则更新

> 用户在改 MD 时加了一条新约束，**盖过**之前 1:1 镜像规则：

- 父级目录中文名**取消半角空格**：`常州 戚墅街道/` → `常州戚墅街道/`
- 文件名项目前缀 ⇄ 场景名之间**取消任何分隔符**，拼音首字母**直接连写**：`CZ` + `QSJD` → `CZQSJD`
- 与父级目录**镜像结构**（不是镜像空格）

**对 Web App 解析器的影响**：
- 之前解析器期待"项目前缀 与 场景名 之间是空格"（split by space）
- 现在无法直接拆分"CZQSJD"为"CZ + QSJD"
- 解析方案二选一：
  1. **固定前缀表**：硬编码一份项目前缀清单（如 `CZ=常州, BJ=北京, SH=上海`），按前缀长度匹配
  2. **白名单前缀配置**：在 web app 里加一个"项目前缀"输入框，用户配置后解析
- 倾向 **方案 1**（无配置即可用），后续如果加项目才补清单

## 待问

- **Q7 收尾**：仓库名？个人 vs org？—— ✅ `led-asset-review` / 个人 / 私有 / main+/docs / MIT
- **Q8 报错原因细节**：—— ✅ C. 短标签 + 完整规则原文（hover 浮窗或展开）
- **Q9 报告导出**：—— ✅ ❌ **不要**导出报告，弹窗里直接改（"及时修改"）
- **Q10 弹窗交互**：—— ✅ A. Card Stack 引导式 + [跳过此类] 按钮
- **Q11 项目前缀解析**：—— ✅ A. 不拆，整体当 scene code

## 后续 Q&A 推演结果

### Q9 → "弹窗里直接改"实际样式

锁 **A · Card Stack**：
- 扫描完弹第一张违规卡：原文件名 / 建议名 / 原因（短标签 + SKILL.md 段落）/ 进度 3/47
- 按钮：**[改名] [跳过] [跳过此类] [上一条] [应用并下一个]**
- **放弃批量**（与 A 互斥）

### Q11 → 校验逻辑

6 字段切分后，第 1 字段**整体当 scene code**（不拆项目+场景），规则只判：
- 字符是否大写英文
- 长度是否合理（4–10）
- 不再二次拆 `CZQSJD`

### 仓库策略（Q7 后续）

- 私有仓库 + 无 Pages 部署（默认 C 方案）
- 团队成员 clone 后本地双击 `docs/index.html` 跑
- 后续想公开再改

## 下一步

- [x] 提 2-3 个实现方案对比（架构层面）→ C + A hybrid 锁定
- [x] 分段呈现设计（5 段：架构 / 目录 / 数据流 / 错误 / 测试）
- [x] 写 design doc
- [ ] 用户 review spec
- [ ] 转交 writing-plans

## 进度

- [x] 探索项目上下文
- [x] Visual Companion 提供
- [x] Q1-Q11 完成
- [x] 修订 1（去空格、连写）记录到档案
- [x] 提出 2-3 方案（rename 通道 4 选 1 → C + A hybrid）
- [x] 分段呈现设计（5 段全部 approved）
- [x] 写 design doc 到 `docs/superpowers/specs/2026-06-10-led-asset-review-webapp-design.md`（443 行）
- [x] Spec 自审（修了 §4.5 #9、§5.2 复制歧义、加 §5.3 顶部开关）
- [ ] 用户 review spec
- [ ] 转交 writing-plans

## 备注

- Visual Companion 已用完本轮设计，**无需再开**（剩余是写 spec + 用户 review + 写计划，纯文本）
- Design doc 路径：`/Users/llm/Downloads/整理规范/docs/superpowers/specs/2026-06-10-led-asset-review-webapp-design.md`
- GitHub 仓库还没建，等用户 review 完再 `git init` + 推 GitHub
