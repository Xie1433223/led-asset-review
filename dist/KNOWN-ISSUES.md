# 已知问题 · 磁盘改写路径

> 给最终用户的简短说明。这份文档只谈「在我 Mac 上为什么改名按钮不灵 / 报错」，
> 规则部分、用法部分在主 README。

## TL;DR

**能正常改名的卷**（实测通过）：
- Mac 本地盘（APFS）— SSD、内置硬盘、Time Machine 目标盘
- 任意 USB-C / Thunderbolt 外接盘，只要是 Mac 格式（APFS / Mac OS 扩展）

**改不了名的卷**（典型场景）：
- NTFS 盘（Windows 硬盘、相机 CFexpress 套卡读卡器没格式化成 exFAT 的）— **这是 macOS 26 的硬限制**
- macFUSE 挂载的 FUSE 卷（ntfs-3g、sshfs 等）— Chrome 的 File System Access API 在 FUSE 上有兼容问题
- SMB / NFS / WebDAV 等网络挂载 — Chrome FSA 普遍只读

**改不了名时的兜底**：每张违规卡片右下角有 `📥 生成 rename.sh`，下载后到 Terminal 跑一下就行。

---

## 1. 为什么 NTFS 改不了名？

macOS 26 (Tahoe) 自带的 NTFS 驱动叫 **fskit**，只读、且没有公开接口改成读写。

市面上能写 NTFS 的方案就两个：
- **Paragon NTFS**（付费，~$20）
- **macFUSE + ntfs-3g**（免费，命令行挂载，macOS 26 上需要打补丁才能编译）

两者装上之后，**shell 层面**（`touch`、`mv`、`rm`）确实能写 NTFS。

**但 Chrome 的 File System Access API 是另一回事**。Chrome 跟操作系统的文件变更通知（APFS / FSEvents）深度耦合，到了 FUSE 层就有两种失败模式：
- `InvalidStateError`：句柄的"快照"被底层失效，Chrome 直接拒绝
- `EROFS`（`read-only filesystem`）：即使 shell 能写，Chrome FSA 仍报只读

这是 Chrome 的实现选择，不是 bug。`move()` 失败的 fallback（`copy+remove`）也一样会撞 EROFS。

### 我们测试时尝试过的组合

| 状态 | 行为 |
|---|---|
| fskit RO（macOS 默认） | ❌ 改不了 — 系统层只读 |
| macFUSE + ntfs-3g 挂 RW | ⚠️ shell 能写 / Chrome FSA 报 EROFS |
| 把 NTFS 文件复制到 APFS 本地改 | ✅ 能改（但等于绕过 NTFS） |

我们这版 web app **不**自动复制到本地 — 那会让用户的原始目录结构被拆成两份，
且复制回 NTFS 同样撞 EROFS。所以这条路留给你自己决定。

---

## 2. 兜底方案 · `rename.sh`

不管改名按钮灵不灵，**每张违规卡片都有 `📥 生成 rename.sh` 按钮**：

1. 跳过你想跳过的卡片（按 `跳过` 或 `跳过此类`）
2. 在最后一张想处理的卡片上点 `📥 生成 rename.sh`
3. 浏览器下载 `rename.sh`（里面是 `mv` 命令的批处理）
4. Terminal 里：

   ```bash
   cd <你的资产根目录>
   bash ~/Downloads/rename.sh
   ```

脚本里走的是**你 shell 用的文件系统**（不是 Chrome），
所以 shell 能写 NTFS（装好 ntfs-3g 之后）它就能写，shell 不能写它就报错 — 至少报错对得上。

---

## 3. 想在 macOS 26 上让 Chrome 也能改 NTFS？

短答案：**现在没有完美方案**。

| 方案 | 状态 |
|---|---|
| Paragon NTFS | 装上后 shell 写没问题，**Chrome FSA 行为未在本项目里测试过**（理论上也可能撞 EROFS） |
| macFUSE + ntfs-3g（免费） | 需要打 `MFMount` framework 补丁才能在 macOS 26 上编译。Patch 在 `gromgit/fuse` 仓库有讨论但还没合并。`brew install gromgit/fuse/ntfs-3g-mac` 在 26 上直接报 `ld: framework 'MFMount' not found` |
| 降级到 macOS 15 (Sequoia) | 旧 SDK 里 MFMount 还在，能装。但你已经升上来了没回头路 |
| 改用 exFAT 重新格式化 | 一了百了，但 Windows 那边的写权限会丢，且没有 NTFS 的元数据/权限模型 |

如果你的工作流是"Windows 上交付、Mac 上整理"，**最务实的做法是**：
1. NTFS 盘在 Windows 上用 Windows 工具改完名
2. 或者：把 Mac 上要改的文件 `cp -r` 到本地 APFS，改完 `rsync` 回 NTFS（绕开 Chrome）

---

## 4. 报错速查

| UI 上的提示 | 原因 | 怎么办 |
|---|---|---|
| `NotFoundError: File handle was already invalidated` | Chrome 句柄缓存失效（FUSE 上常见） | 关掉这个 tab 重新拖一次目录 |
| `NoModificationAllowedError` | 文件系统只读（fskit RO） | 见 § 1，要么装驱动，要么用 `rename.sh` |
| `EROFS: read-only filesystem` | FSA 层判定只读（即使 shell 能写） | 同上 |
| `NotAllowedError: User denied permission` | 你在权限弹窗点了"不允许" | 重选目录，弹窗选"允许" |
| `Operation not permitted` (macOS 系统级) | 你的 Terminal / Chrome 没有 Full Disk Access | 系统设置 → 隐私与安全 → 完全磁盘访问权限，加上 |

---

## 5. 浏览器支持

| 浏览器 | 改名能力 |
|---|---|
| **Chrome 110+ / Edge 110+** | ✅ 可在 UI 内直接改名 |
| **Safari 17+** | ⚠️ 部分支持（`showDirectoryPicker` 在 macOS Safari TP 有但不稳定） |
| **Firefox 125+** | ⚠️ 部分支持（默认无 FSA，建议用 Chrome 拿最佳体验） |
| **任何老浏览器** | 用 `📋 复制建议名` 按钮，手动去 Finder 改 |

---

## 6. 数据不会丢

我们这版 app 的所有写操作都是显式触发 — 点 `改名` 按钮之前什么都不会动。
可以放心拖大目录试，UI 里所有违规都是"待处理"状态，没有自动批改。

跑 `rename.sh` 之前可以 `cat rename.sh` 看一眼要执行的命令，
不放心就 `cp -r <你的目录> <备份目录>` 先。

---

如果你跑出新的报错 / 发现新的边界场景，欢迎补到这个文件。
