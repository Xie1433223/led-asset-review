# LED Asset Review

iQiyi LED 大屏动态背景墙资产命名审核 Web App —— 把 `SKILL.md` 包装成可拖即用、Card Stack 引导式单页 web app。

## 功能

- 📁 拖入文件夹，自动按 6 字段规则扫描
- 🎴 一张张弹违规卡（Card Stack），可视化原名 / 建议名 / 违规原因
- ✏️ Chrome 110+ 直接改名（File System Access API），Safari / Firefox 复制建议名到剪贴板
- ⏭️ [跳过此类] 按钮：遇到一批同类违规时一键跳过
- 📥 兜底：生成 `rename.sh` 下载，shell 里跑

## 用法

### 1. 本地打开

```bash
cd docs/
python3 -m http.server 8765
# 浏览器打开 http://localhost:8765/index.html
```

> **不要直接双击 `index.html`** —— `fetch('./SKILL.md')` 需要走 http 协议才能跑。

### 2. 部署到 GitHub Pages

1. 在 GitHub 创私有仓库 `led-asset-review`
2. `git remote add origin git@github.com:xie1433223/led-asset-review.git`
3. `git push -u origin main`
4. 仓库 Settings → Pages → Source 选 `main` 分支 `/docs` 目录
5. 等 1 分钟后访问 `https://xie1433223.github.io/led-asset-review/`

## 同时作为 Claude Code Skill 用

若你也在用 Claude Code 写 iQiyi LED 项目的资产命名，把 `docs/SKILL.md` 软链到 `~/.claude/skills/`：

```bash
ln -s /path/to/led-asset-review/docs/SKILL.md \
      ~/.claude/skills/led-asset-naming/SKILL.md
```

之后 Claude Code 会自动加载这个 skill，命名时可以引用规则。

## 项目结构

```
led-asset-review/
├── LICENSE                                 # MIT
├── README.md                               # 本文件
└── docs/
    ├── index.html                          # Web App UI
    ├── app.js                              # 核心逻辑（RuleParser + ScanEngine + UI 控制器）
    ├── SKILL.md                            # 命名规则源（Claude Code skill 同源）
    ├── tests.html                          # 单元测试入口
    ├── test-fixtures/                      # 真实文件夹 fixture
    │   ├── case-01-mixed-violations/       # 10 文件，6 违规
    │   ├── case-02-clean-folder/           # 5 文件全合规
    │   ├── case-03-edge-cases/             # 4 文件：空格、emoji、零字节、空扩展名
    │   └── case-04-car-shot/               # 5 文件：车拍 5 块屏全对
    └── expected-results.md                 # case-01 期望输出
```

## 开发

```bash
# 本地跑（任何静态服务器都行）
cd docs/ && python3 -m http.server 8765

# 跑测试
# 浏览器打开 http://localhost:8765/tests.html
```

## 浏览器支持

| 浏览器 | 改名方式 |
|---|---|
| Chrome 110+ / Edge 110+ | 直接改名（File System Access API） |
| Safari 17+ / Firefox 125+ | 复制建议名 + 手动 Finder 改名 |

## License

MIT
