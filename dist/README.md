# LED Asset Review · 单文件发行版

> ⚠️ **Test Version** (`v0.1-test`) — 功能集已自检通过,正式版前请勿用于对外交付。

iQiyi LED 大屏动态背景墙数字资产命名审核工具。

## 怎么用

**不需要任何安装。** 直接双击 `led-asset-review.html` 就能用。

或者拖到 Chrome / Edge 浏览器窗口里。

> 第一次用建议用 **Chrome 110+** 或 **Edge 110+** —— 这俩有 `showDirectoryPicker`，
> 能在 UI 内直接改名。Safari / Firefox 会降级到"复制建议名"模式。

## 流程

1. 打开 `led-asset-review.html`
2. 拖一个文件夹进窗口（或点 `或点击选择文件夹` 按钮）
3. 一张张弹违规卡，告诉你哪行字段错、应该改成什么
4. 点 `改名`（Chrome/Edge），或点 `复制建议名` 手动去 Finder 改
5. 完事看汇总

## 改不了名的情况

**重要**：如果在 Mac 上对一个 **NTFS 盘 / 移动硬盘** 跑这工具，改名按钮很可能会报
`read-only filesystem` 或 `NotAllowedError`。这不是 app 的问题，是 macOS + Chrome 的限制。

读 `KNOWN-ISSUES.md` 了解详情，**短答案是**用每张卡片右下的
`📥 生成 rename.sh` 按钮下载脚本，shell 里跑 — 那个路径在所有卷上都行。

## 文件清单

| 文件 | 用途 |
|---|---|
| `led-asset-review.html` | **核心**：单文件 web app，双击即用 |
| `README.md` | 本文件 |
| `KNOWN-ISSUES.md` | 改写相关坑（NTFS / FUSE / 浏览器权限等） |
| `LICENSE` | MIT 许可证 |

## 我要改规则怎么办？

这版规则是**内联在 HTML 文件里**的，搜索 `#skill-rules` 可以找到。

要系统化改规则（多版本管理 / 跟 Claude Code 集成），看项目根目录的
`README.md`（多文件开发版 + GitHub Pages 部署 + Claude Code skill 说明）。

## 隐私

- 所有扫描在浏览器内完成，**不上传任何文件名 / 文件内容**
- 只能改你**明确授权**的目录（拖入后 Chrome 会弹权限窗）
- 离线下也能跑（`file://` 直接打开就行）

---

有问题 / 报错截图 / 想要新功能 → 联系打包这个版本的人。
