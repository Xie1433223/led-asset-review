# NTFS 写入问题：macOS 26 (Tahoe) 上免费栈全部失效

**日期**: 2026-06-11
**问题域**: macOS 上对 NTFS 卷（`/Volumes/新加卷`、`/Volumes/《生日降至》整理02`）做写入
**目标**: 让我能在 Mac 上用 Chrome + File System Access API 对 NTFS 卷上的文件执行 `move()` 改名

---

## 1. 现状（已验证）

### 1.1 系统信息

```
ProductName:    macOS
ProductVersion: 26.5
BuildVersion:   25F71
```
**这是 macOS 26 (Tahoe)**，不是 macOS 15 (Sequoia)。

### 1.2 卷挂载状态

```
$ mount | grep -E "(新加卷|生日降至)"
/dev/disk2s2 on /Volumes/新加卷 (ntfs, local, nodev, nosuid, read-only, noowners, noatime, fskit)
/dev/disk4s2 on /Volumes/《生日降至》整理02 (ntfs, local, nodev, nosuid, read-only, noowners, noatime, fskit)
```

**两个 NTFS 卷都是 read-only**，由 macOS 内建 NTFS 驱动以 RO 模式挂载。

### 1.3 已安装组件（全部通过 `which` / `ls /Library/Filesystems` 验证）

| 组件 | 版本 | 路径 | 状态 |
|---|---|---|---|
| macFUSE (pref pane) | 5.2.0 | 系统设置面板 | ✅ 装 |
| macFUSE kext | 5.1.3 | `/Library/Filesystems/macfuse.fs/Contents/Extensions/26/macfuse.kext` | ✅ 装了，**已加载**（`kmutil showloaded \| grep macfuse` 有 `io.macfuse.filesystems.macfuse.25 (5.1.3)`） |
| Mounty.app | 2.4 | `/Applications/Mounty.app` | ✅ 装，进程在跑（PID 829） |
| **ntfs-3g** | — | — | ❌ **没装**（`which ntfs-3g`、`brew list \| grep ntfs` 都为空） |
| **ntfs-3g-mac** | — | — | ❌ **没装** |
| **mount_ntfs-3g** | — | — | ❌ **没装** |
| Paragon NTFS | — | — | ❌ **没装** |

---

## 2. 已尝试路径

### 2.1 Homebrew 安装 macFUSE（第一次）

```
$ brew install --cask macfuse
...
sudo: a terminal is required to read the password
Error: Failure while executing; `/usr/bin/sudo -u root ... -- /usr/sbin/installer -pkg .../macFUSE 5.2.0.pkg -target /` exited with 1.
```

**结果**: 失败——brew 在 Claude Code 的非交互 shell 里跑，sudo 没法弹密码。

**注**: 实际 macFUSE 后来**通过手动下载 .dmg + GUI 安装器**装上了（用户报告系统设置面板出现 macFUSE 5.2.0，**Update available: 5.3.0**）。点 Update 5.3.0 后**无反应**，未确认是否真的升级。

### 2.2 手动 `kmutil load` 加载 kext

```
$ sudo kmutil load --bundle-path /Library/Extensions/macfuse.kext
The operation couldn't be completed. No such file or directory
```
**错误路径**。实际 kext 在 `/Library/Filesystems/macfuse.fs/Contents/Extensions/26/macfuse.kext`（在 macfuse.fs bundle 内、按 macOS 版本分子目录）。

```
$ sudo kmutil load --bundle-path "/Library/Filesystems/macfuse.fs/Contents/Extensions/26/macfuse.kext"
```
**无输出**——但 `kmutil showloaded` 显示已经加载（之前那次重启后就已经加载了）。所以这条路径**实际上**没用，它早就加载了。

### 2.3 Homebrew 安装 ntfs-3g-mac（Mounty 官网推荐路径）

```
$ brew tap gromgit/fuse
$ brew install gromgit/fuse/ntfs-3g-mac
```

`brew tap` 阶段输出：
```
Homebrew will ignore formulae, casks and commands from these taps when `HOMEBREW_REQUIRE_TAP_TRUST` is set.
...
==> Fetching downloads for: ntfs-3g-mac
```
（这是 Homebrew 5.x 的 tap 信任机制警告，**非阻塞**，继续）

`brew install` 阶段**编译失败**，日志最后 15 行：
```
/bin/sh ../libtool  --tag=CC   --mode=link clang  -DFUSE_USE_VERSION=26 -I/usr/local/include/fuse -D_FILE_OFFSET_BITS=64 -I../include/ntfs-3g -DPLUGIN_DIR=\"/usr/local/Cellar/ntfs-3g-mac/2026.2.25/lib/ntfs-3g\" -g -O2 -Wall  -lintl -framework CoreFoundation -o ntfs-3g ntfs_3g-ntfs-3g.o ntfs_3g-ntfs-3g_common.o  -L/usr/local/lib -lfuse -pthread ../libntfs-3g/libntfs-3g.la
libtool: link: clang ... -o .libs/ntfs-3g ... /usr/local/lib/libfuse.dylib -liconv -licucore ../libntfs-3g/.libs/libntfs-3g.dylib -lintl -framework MFMount -framework DiskArbitration -framework CoreFoundation -pthread
ld: framework 'MFMount' not found
clang: error: linker command failed with exit code 1
make[2]: *** [ntfs-3g] Error 1
```

**错误根因**: `MFMount` 是 Apple 的私有 framework。**macOS 26 (Tahoe) SDK 不再包含 MFMount**。ntfs-3g-mac 的 build 系统在链接时硬要求 `-framework MFMount`，导致 build 在最后一步失败。

**这是硬阻塞**，不是配置问题。

---

## 3. 关于版本号的一个澄清

容易混淆：
- **macFUSE 5.2.0** 是 **pref pane / app bundle** 版本号
- **macFUSE 5.1.3** 是 **kext** 版本号
- 它们**是配对的**——macFUSE 5.2.0 这个 release 部署到 macOS 26 的 kext 内部版本就是 5.1.3

`/Library/Filesystems/macfuse.fs/Contents/Extensions/26/macfuse.kext/Contents/Info.plist` 里 `CFBundleVersion = 5.1.3`——这是对的，不存在"旧 kext 残留"。

---

## 4. 我（assistant）自己的错误记录

为了避免误导 reviewer：

1. ❌ 之前说"Mounty 12.x"——**瞎编**，官网最新是 2.4 (2023-12-29)。已被用户当面指出。
2. ❌ 之前说"5.1.3 kext 是老版本残留，要用 5.2.0"——**错的**，5.1.3 就是配对的当前 kext。
3. ❌ 之前给错 kext 路径 `/Library/Extensions/macfuse.kext`——实际在 `macfuse.fs` bundle 里。
4. ❌ 多次推 Paragon，但用户选 A 后还在继续推——**不尊重用户选择**。
5. ❌ 在没核实 `which ntfs-3g` 的情况下甩"漏装 ntfs-3g"的诊断——碰巧对，但**流程上不严谨**。

---

## 5. 想问 Codex 的问题

**核心问题**: macOS 26 (Tahoe) 上，对 NTFS 卷做**用户态任意文件**写入（不只是 mount 上读写，还包括 Chrome + File System Access API 的 `handle.move()` 改名），**当前哪些方案真正可用**？

具体：

1. **ntfs-3g-mac 的 MFMount 框架问题有没有 workaround？**
   - 给 gromgit/fuse 提 PR 移除 MFMount？源码里 MFMount 是干嘛的？移除后是否还能挂 NTFS？
   - 用老 SDK 重新 build（`SDKROOT=macosx15` 或 `MACOSX_DEPLOYMENT_TARGET=15.0`）？能绕过吗？
   - 网上有没有现成的 patch？

2. **macFUSE 自带的 macOS 原生 NTFS 写能力能不能用？**
   - 我以为 macFUSE 只是框架，**不带 NTFS**。但 macOS 14+ 是不是有个隐藏的 NTFS 写能力可以靠 `mount -t ntfs -o rw` 启用？

3. **有没有 Paragon 之外、真正能在 macOS 26 上做 NTFS 写的方案？**
   - Tuxera？
   - iBoysoft？
   - open-source fork？
   - 实验性的 hack（比如改 Apple internals）？

4. **如果非要走"不写入"的方案**——我的 web app 能在 read-only NTFS 卷上做什么？
   - 当前 app 已经有 `下载 rename.sh` 功能（生成 bash 脚本给到 Windows 跑）——这个**在 RO 卷上能用**吗？还是说脚本里写死了绝对路径导致在 Mac 上读不到？
   - 有没有"复制到本地 APFS → 在本地改 → 复制回 NTFS"之外的实用方案？

5. **降级 macOS 到 15 (Sequoia)** 是不是真的能解决（因为 Sequoia SDK 还在）？还是说 Sequoia 上免费栈也半残？

---

## 6. 项目背景（如果需要）

- **App 仓库**: `/Users/llm/Downloads/整理规范/`
- **App 技术栈**: vanilla HTML + JS，File System Access API，无 build step
- **App 入口**: `docs/index.html`（含 inline script）
- **App 核心逻辑**: `docs/app.js`（RuleParser + ScanEngine + CapabilityDetector）
- **当前 HEAD**: `460e29d` (T28)
- **改写功能依赖**:
  - `await liveFileHandle.move(v.suggestedName)`（FileSystemFileHandle.move）
  - 或 fallback: `parentHandle.removeEntry(oldName)` + `parentHandle.getFileHandle(newName, {create:true})` + write stream
- **在 Mac 本地 APFS 卷**上的全流程已经实测通过（子目录 + 根目录都成功）
- **挂到 NTFS RO 卷上** → FSA 抛 `NoModificationAllowedError`（OS 层级，Chrome 没有权限绕过）

---

## 7. 我已经拒绝的方案（以及为什么）

| 方案 | 拒绝原因 |
|---|---|
| 把生产数据**复制到本地 APFS**，在本地改名，复制回 NTFS | **复制回 NTFS 同样会写**——RO 限制不解决。 |
| **在 Windows 上跑** rename.sh | 用户的工作流是 Mac + Chrome + File System Access API。Windows 不在选项里。 |
| 改用纯 Python 脚本 (`os.rename`) 跑 | `os.rename` 在 macOS 上走的也是 OS 层 syscall，**同样会撞 RO**。 |
| 不让用户动文件，只做**只读审计** | 用户的核心需求就是改名。审计是次要的。 |

---

**谢谢你帮我看，Codex** 🙏
