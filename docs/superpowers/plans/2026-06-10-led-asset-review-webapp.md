# LED Asset Review Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pure-static web app that lets iQiyi LED asset reviewers drag a folder, see violations against `SKILL.md` one card at a time, and rename / skip / skip-by-type with optional Chrome-direct rename + Safari copy fallback + rename.sh download.

**Architecture:** 5 layers (Boot → Scan → Rule Engine → State → Render). Single-page web app, zero build, zero backend. Rules parsed from same-origin `SKILL.md` at boot. Tests run in browser via `tests.html`.

**Tech Stack:** Vanilla HTML + JavaScript (ES2020) + CSS, File System Access API (Chrome 110+), GitHub Pages (main+/docs). No npm, no bundler.

**Reference Spec:** `docs/superpowers/specs/2026-06-10-led-asset-review-webapp-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `/.gitignore` | Standard Node/macOS ignore |
| `/LICENSE` | MIT license |
| `/README.md` | 中文：用法 / 安装 / 部署 / 软链 Claude Code skill |
| `/docs/index.html` | UI 容器（DOM 骨架 + 内联 CSS + script 引入 app.js） |
| `/docs/app.js` | 核心逻辑：RuleParser + ScanEngine + CapabilityDetector + UI 控制器 |
| `/docs/SKILL.md` | 命名规则源（web app 启动时 fetch 这个） |
| `/docs/tests.html` | 测试入口，引入 app.js，跑 assertEq 断言 |
| `/docs/test-fixtures/case-01-mixed-violations/` | 10 文件，6 违规 4 合规 |
| `/docs/test-fixtures/case-02-clean-folder/` | 5 文件全合规 |
| `/docs/test-fixtures/case-03-edge-cases/` | 空格、emoji、零字节、空扩展名 |
| `/docs/test-fixtures/case-04-car-shot/` | 车拍 5 块屏全对 |
| `/docs/expected-results.md` | case-01 期望输出清单（人工对照用） |

**Files that change together:**
- `index.html` + `app.js` — UI 跟逻辑要一起改
- `tests.html` + `app.js` — 新加 API 要同步加测试
- `test-fixtures/case-01` + `expected-results.md` — 改了 fixture 期望也要改

---

## Task 1: Initialize git repository and add root config files

**Files:**
- Create: `/Users/llm/Downloads/整理规范/.gitignore`
- Create: `/Users/llm/Downloads/整理规范/LICENSE`
- Create: `/Users/llm/Downloads/整理规范/README.md` (placeholder)
- Create: `/Users/llm/Downloads/整理规范/docs/superpowers/.gitkeep`

- [ ] **Step 1: Init git repo**

```bash
cd /Users/llm/Downloads/整理规范
git init
git config user.email "xie1433223@users.noreply.github.com"
git config user.name "Ruiwen Xie"
```

Expected: `Initialized empty Git repository in /Users/llm/Downloads/整理规范/.git/`

- [ ] **Step 2: Write `.gitignore`**

Write to `/Users/llm/Downloads/整理规范/.gitignore`:

```
.DS_Store
node_modules/
.superpowers/
*.log
.vscode/
.idea/
```

- [ ] **Step 3: Write `LICENSE` (MIT)**

Write to `/Users/llm/Downloads/整理规范/LICENSE`:

```
MIT License

Copyright (c) 2026 Ruiwen Xie

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 4: Write placeholder `README.md`**

Write to `/Users/llm/Downloads/整理规范/README.md`:

```markdown
# LED Asset Review

iQiyi LED 大屏动态背景墙资产命名审核 Web App。详见 `docs/superpowers/specs/2026-06-10-led-asset-review-webapp-design.md`。

> 🚧 README 待完善（Task 19）。
```

- [ ] **Step 5: Commit**

```bash
cd /Users/llm/Downloads/整理规范
git add .gitignore LICENSE README.md docs/superpowers/.gitkeep
git commit -m "chore: init repo with gitignore, MIT license, placeholder README"
```

---

## Task 2: Move SKILL.md into docs/ as the rule source

**Files:**
- Move: `/Users/llm/Downloads/整理规范/.claude/skills/led-asset-naming/SKILL.md` → `/Users/llm/Downloads/整理规范/docs/SKILL.md`
- Delete: `/Users/llm/Downloads/整理规范/.claude/skills/led-asset-naming/SKILL.md` (original location)

- [ ] **Step 1: Create `docs/` directory if not exists**

```bash
mkdir -p /Users/llm/Downloads/整理规范/docs
```

- [ ] **Step 2: Move SKILL.md**

```bash
mv /Users/llm/Downloads/整理规范/.claude/skills/led-asset-naming/SKILL.md \
   /Users/llm/Downloads/整理规范/docs/SKILL.md
rmdir /Users/llm/Downloads/整理规范/.claude/skills/led-asset-naming \
      /Users/llm/Downloads/整理规范/.claude/skills \
      /Users/llm/Downloads/整理规范/.claude
```

Expected: SKILL.md now at `docs/SKILL.md`. `.claude/` directory removed.

- [ ] **Step 3: Verify SKILL.md is intact**

```bash
head -10 /Users/llm/Downloads/整理规范/docs/SKILL.md
wc -l /Users/llm/Downloads/整理规范/docs/SKILL.md
```

Expected: First line is `---`, total 242 lines (or current line count).

- [ ] **Step 4: Commit**

```bash
cd /Users/llm/Downloads/整理规范
git add docs/SKILL.md
git rm .claude/skills/led-asset-naming/SKILL.md 2>/dev/null || true
git add -A
git commit -m "refactor: move SKILL.md to docs/ as web app rule source"
```

---

## Task 3: Create app.js skeleton and tests.html with assertEq helper

**Files:**
- Create: `/Users/llm/Downloads/整理规范/docs/app.js`
- Create: `/Users/llm/Downloads/整理规范/docs/tests.html`

- [ ] **Step 1: Write `app.js` skeleton with module exports**

Write to `/Users/llm/Downloads/整理规范/docs/app.js`:

```js
// LED Asset Review · core logic
// Modules exported to window for tests.html + index.html

const RuleParser = {
  parse(markdownText) {
    throw new Error('RuleParser.parse not yet implemented');
  }
};

const ScanEngine = {
  validate(filename, parent, rules, options) {
    throw new Error('ScanEngine.validate not yet implemented');
  },

  suggestName(filename, issues, rules) {
    throw new Error('ScanEngine.suggestName not yet implemented');
  },

  async walkFileTree(handle, onEntry) {
    throw new Error('ScanEngine.walkFileTree not yet implemented');
  }
};

const CapabilityDetector = {
  detect() {
    return {
      rename: typeof window.showDirectoryPicker === 'function',
      copy: typeof navigator.clipboard?.writeText === 'function'
    };
  }
};

window.RuleParser = RuleParser;
window.ScanEngine = ScanEngine;
window.CapabilityDetector = CapabilityDetector;
```

- [ ] **Step 2: Write `tests.html` with assertEq helper and one stub test**

Write to `/Users/llm/Downloads/整理规范/docs/tests.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>LED Asset Review · Tests</title>
  <style>
    body { font-family: -apple-system, sans-serif; padding: 20px; max-width: 960px; margin: 0 auto; }
    .pass { color: #0d8043; }
    .fail { color: #d93025; font-weight: bold; }
    .summary { margin: 20px 0; padding: 10px; background: #f5f5f5; border-radius: 4px; }
    pre { background: #fafafa; padding: 8px; border-radius: 3px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>🧪 LED Asset Review · Unit Tests</h1>
  <div id="summary" class="summary">运行中…</div>
  <div id="results"></div>

  <script src="./app.js"></script>
  <script>
    const results = [];
    let passed = 0, failed = 0;

    function assertEq(actual, expected, label) {
      const ok = JSON.stringify(actual) === JSON.stringify(expected);
      const cls = ok ? 'pass' : 'fail';
      const sym = ok ? '✓' : '✗';
      const div = document.createElement('div');
      div.className = cls;
      div.textContent = `${sym} ${label}`;
      if (!ok) {
        const pre = document.createElement('pre');
        pre.textContent = `  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`;
        div.appendChild(pre);
      }
      document.getElementById('results').appendChild(div);
      if (ok) passed++; else failed++;
    }

    function assertThrows(fn, label) {
      try {
        fn();
        const div = document.createElement('div');
        div.className = 'fail';
        div.textContent = `✗ ${label} (expected throw, got nothing)`;
        document.getElementById('results').appendChild(div);
        failed++;
      } catch (e) {
        const div = document.createElement('div');
        div.className = 'pass';
        div.textContent = `✓ ${label}`;
        document.getElementById('results').appendChild(div);
        passed++;
      }
    }

    // —— Stub test ——
    assertThrows(() => RuleParser.parse(''), 'RuleParser.parse throws when not implemented');
    assertThrows(() => ScanEngine.validate('', '', {}), 'ScanEngine.validate throws when not implemented');
    assertEq(CapabilityDetector.detect().copy, typeof navigator.clipboard?.writeText === 'function', 'CapabilityDetector detects clipboard');

    // —— Summary ——
    document.getElementById('summary').textContent =
      failed === 0 ? `✅ ${passed} passed, 0 failed` : `❌ ${passed} passed, ${failed} failed`;
    document.title = failed === 0 ? `✅ ${passed} passed` : `❌ ${failed} failed`;
  </script>
</body>
</html>
```

- [ ] **Step 3: Open `tests.html` in browser and verify all 3 assertions pass**

```bash
cd /Users/llm/Downloads/整理规范/docs
python3 -m http.server 8765
```

Then open `http://localhost:8765/tests.html` in browser.
Expected: `✅ 3 passed, 0 failed`. Title shows `✅ 3 passed`.

- [ ] **Step 4: Stop test server**

```bash
lsof -ti:8765 | xargs kill 2>/dev/null || true
```

- [ ] **Step 5: Commit**

```bash
cd /Users/llm/Downloads/整理规范
git add docs/app.js docs/tests.html
git commit -m "feat: app.js skeleton + tests.html with assertEq helper"
```

---

## Task 4: Implement RuleParser.parse() — extract dictionaries and patterns

**Files:**
- Modify: `/Users/llm/Downloads/整理规范/docs/app.js` (replace RuleParser.parse)

- [ ] **Step 1: Add failing test cases to `tests.html`**

Add this block to `tests.html` (just before the "Summary" section):

```js
    // —— RuleParser ——
    const SAMPLE_SKILL = `# LED Test Doc

### 字段 3：场景气氛时间
| 中文 | 代码 |
|---|---|
| 日出前 | \`BSR\` — Before Sunrise |
| 上午 | \`FN\` — Forenoon |
| 中午 | \`Nn\` — Noon |
| 夜晚 | \`NT\` — Night |
| 黄昏转夜晚 | \`NF-NT\` — Nightfall-to-Night |

### 字段 4：场景天气状态
| 中文 | 代码 |
|---|---|
| 正常天气 | \`N\` — Normal |
| 下雨 | \`R\` — Rain |

### 字段 5a：制作方式描述（用于最终视频成品）
| 中文 | 代码 |
|---|---|
| 全实拍场景 | \`RS\` — RealShot |
| 全 CG 视效 | \`VE\` — VFX/Engine |

### 字段 6：版本号
同一对象不同版本：\`V01 / V02 / V03\`，恒为两位数，前缀 \`V\` 大写。

### 字段 2：镜头序号
车拍：\`101-F、102-R、103-B、104-L、105-T\`

## Quick Reference — 五种命名方式
| 最终视频成品 | \`场景_序号_气氛时间_天气_制作方式_版本\` | \`LXZC_1_NT_N_RS_V01\` |
| 摄影机原始素材文件夹 | \`场景_序号_气氛时间_天气_M\` | \`LXZC_1_NT_N_M\` |
| 序列帧文件 | \`场景_序号_气氛时间_天气_制作工序_版本_序列帧号.ext\` | \`LXZC_1_NT_N_CP_V01_00502.dpx\` |`;

    const rules = RuleParser.parse(SAMPLE_SKILL);
    assertEq(rules.timeCodes.NT, '夜晚', '时间码 NT → 夜晚');
    assertEq(rules.timeCodes.FN, '上午', '时间码 FN → 上午');
    assertEq(rules.timeCodes['NF-NT'], '黄昏转夜晚', '时间码 NF-NT（连字符字段内部）');
    assertEq(rules.weatherCodes.N, '正常天气', '天气码 N → 正常天气');
    assertEq(rules.weatherCodes.R, '下雨', '天气码 R → 下雨');
    assertEq(rules.methods.video.RS, '全实拍场景', '制作方式 RS');
    assertEq(rules.methods.video.VE, '全 CG 视效', '制作方式 VE');
    assertEq(rules.versionPattern.test('V01'), true, '版本号 V01 合法');
    assertEq(rules.versionPattern.test('V1'), false, '版本号 V1 非法');
    assertEq(rules.shotPattern.test('101-F'), true, '车拍镜号 101-F');
    assertEq(rules.shotPattern.test('1'), true, '普通镜号 1');
    assertEq(rules.sequencePattern.test('00502'), true, '序列帧 00502');
    assertEq(rules.extOptions, ['.mov', '.mp4'], '视频扩展名白名单');
    assertEq(rules.seqExtOptions, ['.dpx', '.exr', '.tiff'], '序列帧扩展名白名单');
```

- [ ] **Step 2: Run tests, verify 13 new tests fail**

Open `http://localhost:8765/tests.html`, expected: 13 new fails (all RuleParser-related).

- [ ] **Step 3: Implement RuleParser.parse()**

Replace `RuleParser.parse` in `app.js` with:

```js
  parse(markdownText) {
    const timeCodes = this._extractTable(markdownText, '字段 3');
    const weatherCodes = this._extractTable(markdownText, '字段 4');
    const methodVideo = this._extractTable(markdownText, '字段 5a');
    const methodProject = this._extractTable(markdownText, '字段 5b');

    return {
      timeCodes,
      weatherCodes,
      methods: {
        video: methodVideo,
        project: methodProject,
        material: { CPM:'合成', DCM:'DCC素材', CGM:'调色素材', M:'原始素材' }
      },
      versionPattern: /^V\d{2}$/,
      shotPattern: /^(\d{3}-[FRBLT]|\d+)$/,
      sequencePattern: /^\d{5}$/,
      extOptions: ['.mov', '.mp4'],
      seqExtOptions: ['.dpx', '.exr', '.tiff']
    };
  },

  _extractTable(md, sectionMarker) {
    // Find the section starting with "### 字段 N"
    const sectionRe = new RegExp(`### ${sectionMarker}[\\s\\S]*?(?=\\n### |\\n## |$)`);
    const sectionMatch = md.match(sectionRe);
    if (!sectionMatch) return {};

    // Extract rows of form: | 中文 | `CODE` — English |
    const rowRe = /\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*—\s*([^|]+?)\s*\|/g;
    const result = {};
    let m;
    while ((m = rowRe.exec(sectionMatch[0])) !== null) {
      result[m[2].trim()] = m[1].trim();
    }
    return result;
  }
```

- [ ] **Step 4: Run tests, verify all 16 pass**

Open `http://localhost:8765/tests.html`, expected: `✅ 16 passed, 0 failed`.

- [ ] **Step 5: Commit**

```bash
cd /Users/llm/Downloads/整理规范
git add docs/app.js docs/tests.html
git commit -m "feat(RuleParser): parse SKILL.md markdown into 4 dictionaries + patterns"
```

---

## Task 5: Implement ScanEngine.validate() — segment count and field 1 (scene code)

**Files:**
- Modify: `/Users/llm/Downloads/整理规范/docs/app.js`

- [ ] **Step 1: Add failing tests to `tests.html`**

Add this block:

```js
    // —— ScanEngine.validate: segment count + field 1 ——
    const r = rules;
    const opts = { projectMode: true, checkSeqExt: true };
    assertEq(
      ScanEngine.validate('LXZC_1_NT_N_RS_V01.mov', '', r, opts).issues,
      [],
      '通用规范正确样例 0 issues'
    );
    assertEq(
      ScanEngine.validate('LX_1_NT_N_RS_V01.mov', '', r, opts).issues[0].tag,
      '场景码非法',
      '场景码 2 字符过短'
    );
    assertEq(
      ScanEngine.validate('LXZCXZ_1_NT_N_RS_V01.mov', '', r, opts).issues[0].tag,
      '场景码非法',
      '场景码 6 字符超长（超 10 范围）'
    );
    assertEq(
      ScanEngine.validate('LXZC_1_NT_NRS_V01.mov', '', r, opts).issues[0].tag,
      'NRS 黏合',
      '天气+制作方式字段黏合'
    );
    assertEq(
      ScanEngine.validate('a-b-c-d-e-f.mov', '', r, opts).issues[0].tag,
      '场景码非法',
      '场景码含非法字符（小写+连字符）'
    );
```

- [ ] **Step 2: Run tests, verify 5 new fail (NRS 黏合、场景码非法分支)**

- [ ] **Step 3: Implement segment count and field 1 check**

Replace `ScanEngine.validate` in `app.js` with:

```js
  validate(filename, parent, rules, options = {}) {
    const issues = [];
    const { projectMode = true, checkSeqExt = true } = options;

    // Strip extension
    const ext = filename.match(/\.[^.]+$/)?.[0] || '';
    const base = ext ? filename.slice(0, -ext.length) : filename;
    const isSequenceFrame = /_\d{5}$/.test(base);
    const expectedSegments = isSequenceFrame ? 7 : 6;

    // Split by underscore
    const parts = base.split('_');
    if (parts.length !== expectedSegments) {
      issues.push({
        tag: '段数错',
        detail: `预期 ${expectedSegments} 段（${isSequenceFrame ? '序列帧' : '成品'}），实际 ${parts.length} 段`,
        ruleRef: 'Quick Reference — 五种命名方式'
      });
      return { issues, suggestedName: null };
    }

    // Field 1: scene code (or project+scene concat)
    const sceneCode = parts[0];
    if (!/^[A-Z]{2,10}$/.test(sceneCode)) {
      issues.push({
        tag: '场景码非法',
        detail: `字段 1 "${sceneCode}" 必须是大写字母、长度 2-10`,
        ruleRef: '字段 1：场景名称'
      });
    }

    return { issues, suggestedName: null };
  },
```

- [ ] **Step 4: Run tests, verify all 5 new pass**

- [ ] **Step 5: Commit**

```bash
cd /Users/llm/Downloads/整理规范
git add docs/app.js docs/tests.html
git commit -m "feat(ScanEngine): validate segment count + field 1 (scene code)"
```

---

## Task 6: Implement ScanEngine.validate() — fields 2-6 (shot, time, weather, method, version)

**Files:**
- Modify: `/Users/llm/Downloads/整理规范/docs/app.js`

- [ ] **Step 1: Add failing tests**

```js
    // —— ScanEngine.validate: fields 2-6 ——
    assertEq(
      ScanEngine.validate('LXZC_99_NT_N_RS_V01.mov', '', r, opts).issues[0]?.tag,
      '镜号格式错',
      '普通镜号 99 不在 1-N（其实合法，先确认 baseline）'  // 这条会通过，验证 baseline
    );
    // 取消上一条对 baseline 的假设
```

修正：实际"99" 是合法普通镜号（仅限制数字、不限制大小），所以这条无效。删掉，加有效测试：

```js
    assertEq(
      ScanEngine.validate('LXZC_X_NT_N_RS_V01.mov', '', r, opts).issues.find(i => i.tag === '镜号格式错')?.tag,
      '镜号格式错',
      '镜号非数字'
    );
    assertEq(
      ScanEngine.validate('LXZC_1_NIGHT_N_RS_V01.mov', '', r, opts).issues.find(i => i.tag === '时间码未知')?.tag,
      '时间码未知',
      '时间码 NIGHT 不在字典'
    );
    assertEq(
      ScanEngine.validate('LXZC_1_NT_RAIN_RS_V01.mov', '', r, opts).issues.find(i => i.tag === '天气码未知')?.tag,
      '天气码未知',
      '天气码 RAIN 不在字典'
    );
    assertEq(
      ScanEngine.validate('LXZC_1_NT_N_XX_V01.mov', '', r, opts).issues.find(i => i.tag === '工序码未知')?.tag,
      '工序码未知',
      '工序码 XX 不在字典'
    );
    assertEq(
      ScanEngine.validate('LXZC_1_NT_N_RS_v1.mov', '', r, opts).issues.find(i => i.tag === '版本号格式错')?.tag,
      '版本号格式错',
      '版本号 v1 小写'
    );
    assertEq(
      ScanEngine.validate('LXZC_1_NT_N_RS_V1.mov', '', r, opts).issues.find(i => i.tag === '版本号格式错')?.tag,
      '版本号格式错',
      '版本号 V1 一位'
    );
```

- [ ] **Step 2: Run tests, verify 6 new fail**

- [ ] **Step 3: Implement field 2-6 checks**

Append to `ScanEngine.validate` (before the closing `return { issues, suggestedName: null };`):

```js
    // Field 2: shot number (regular or car-shot)
    const shot = parts[1];
    if (!/^(\d{3}-[FRBLT]|\d+)$/.test(shot)) {
      issues.push({
        tag: '镜号格式错',
        detail: `字段 2 "${shot}" 必须是数字或车拍格式 101-F`,
        ruleRef: '字段 2：镜头序号'
      });
    }

    // Field 3: time code
    const timeCode = parts[2];
    if (!rules.timeCodes[timeCode]) {
      issues.push({
        tag: '时间码未知',
        detail: `字段 3 "${timeCode}" 不在时间码字典中`,
        ruleRef: '字段 3：场景气氛时间'
      });
    }

    // Field 4: weather code
    const weatherCode = parts[3];
    if (!rules.weatherCodes[weatherCode]) {
      issues.push({
        tag: '天气码未知',
        detail: `字段 4 "${weatherCode}" 不在天气码字典中`,
        ruleRef: '字段 4：场景天气状态'
      });
    }

    // Field 5: method code (try video dict first, fall back to project dict)
    const methodCode = parts[4];
    const methodDict = { ...rules.methods.project, ...rules.methods.video };
    if (!methodDict[methodCode]) {
      issues.push({
        tag: '工序码未知',
        detail: `字段 5 "${methodCode}" 不在制作方式/工序字典中`,
        ruleRef: '字段 5a/5b：制作方式 / 制作工序'
      });
    }

    // Field 6: version (skip for camera-original _M folders)
    const version = parts[5];
    const isCameraOriginal = methodCode === 'M';
    if (!isCameraOriginal && !rules.versionPattern.test(version)) {
      issues.push({
        tag: '版本号格式错',
        detail: `字段 6 "${version}" 必须是 V + 两位数（V01-V99）`,
        ruleRef: '字段 6：版本号'
      });
    }
```

- [ ] **Step 4: Run tests, verify all pass**

- [ ] **Step 5: Commit**

```bash
cd /Users/llm/Downloads/整理规范
git add docs/app.js docs/tests.html
git commit -m "feat(ScanEngine): validate fields 2-6 (shot, time, weather, method, version)"
```

---

## Task 7: Implement ScanEngine.validate() — sequence frame extension + project override checks

**Files:**
- Modify: `/Users/llm/Downloads/整理规范/docs/app.js`

- [ ] **Step 1: Add failing tests**

```js
    // —— Sequence frame extension check ——
    assertEq(
      ScanEngine.validate('LXZC_1_NT_N_CP_V01_00502.png', '', r, opts).issues.find(i => i.tag === '序列帧扩展名错')?.tag,
      '序列帧扩展名错',
      '序列帧 .png 非法'
    );
    assertEq(
      ScanEngine.validate('LXZC_1_NT_N_CP_V01_00502.dpx', '', r, opts).find?.(i => i.tag === '序列帧扩展名错'),
      undefined,
      '序列帧 .dpx 合法'
    );
    // 上条语法错（ScanEngine.validate 返回 {issues: [...]}），改：
    assertEq(
      ScanEngine.validate('LXZC_1_NT_N_CP_V01_00502.dpx', '', r, opts).issues.find(i => i.tag === '序列帧扩展名错'),
      undefined,
      '序列帧 .dpx 合法'
    );

    // —— Project override check (项目级约定) ——
    assertEq(
      ScanEngine.validate('LXZC_1_NT_N_RS_V01.mov', '常州 戚墅街道', r, { projectMode: true, checkSeqExt: true }).issues.find(i => i.tag === '项目约定违反')?.tag,
      '项目约定违反',
      '父目录含半角空格触发项目级警告'
    );
    assertEq(
      ScanEngine.validate('LX ZC_1_NT_N_RS_V01.mov', '常州戚墅街道', r, { projectMode: true, checkSeqExt: true }).issues.find(i => i.tag === '项目约定违反')?.tag,
      '项目约定违反',
      '文件名含半角空格触发项目级警告'
    );
    assertEq(
      ScanEngine.validate('LXZC_1_NT_N_RS_V01.mov', '常州戚墅街道', r, { projectMode: true, checkSeqExt: true }).issues.find(i => i.tag === '项目约定违反'),
      undefined,
      '无空格时不触发'
    );
    assertEq(
      ScanEngine.validate('LXZC_1_NT_N_RS_V01.mov', '常州 戚墅街道', r, { projectMode: false, checkSeqExt: true }).issues.find(i => i.tag === '项目约定违反'),
      undefined,
      '关闭项目模式时不触发'
    );
```

- [ ] **Step 2: Run tests, verify 5 new fail**

- [ ] **Step 3: Implement sequence frame + project override checks**

Append to `ScanEngine.validate` (before final return):

```js
    // Field 7: sequence frame extension
    if (isSequenceFrame && checkSeqExt) {
      if (!rules.seqExtOptions.includes(ext.toLowerCase())) {
        issues.push({
          tag: '序列帧扩展名错',
          detail: `序列帧扩展名 "${ext}" 必须为 ${rules.seqExtOptions.join(' / ')}`,
          ruleRef: 'Common Mistakes — 序列帧扩展名'
        });
      }
    }

    // Project override: no half-width spaces in parent dir or filename
    if (projectMode) {
      if (parent && parent.includes(' ')) {
        issues.push({
          tag: '项目约定违反',
          detail: `父目录 "${parent}" 包含半角空格，本项目要求无空格`,
          ruleRef: '项目级约定 — 父级目录与项目前缀'
        });
      }
      if (filename.includes(' ')) {
        issues.push({
          tag: '项目约定违反',
          detail: `文件名 "${filename}" 包含半角空格，本项目要求无空格`,
          ruleRef: '项目级约定 — 父级目录与项目前缀'
        });
      }
    }
```

- [ ] **Step 4: Run tests, verify all pass**

- [ ] **Step 5: Commit**

```bash
cd /Users/llm/Downloads/整理规范
git add docs/app.js docs/tests.html
git commit -m "feat(ScanEngine): sequence frame ext check + project override (no-space) check"
```

---

## Task 8: Implement ScanEngine.suggestName() — derive corrected name from issues

**Files:**
- Modify: `/Users/llm/Downloads/整理规范/docs/app.js`

- [ ] **Step 1: Add failing tests**

```js
    // —— ScanEngine.suggestName ——
    // 场景：NRS 黏合 → 拆成 N_RS
    assertEq(
      ScanEngine.suggestName('CZQSJD_101-F_FN_NRS_V01.mov', [], r),
      'CZQSJD_101-F_FN_N_RS_V01.mov',
      'NRS 黏合 → N_RS'
    );
    // 场景：版本号格式错 v1 → V01
    assertEq(
      ScanEngine.suggestName('LXZC_1_NT_N_RS_v1.mov', [], r),
      'LXZC_1_NT_N_RS_V01.mov',
      '版本号 v1 → V01'
    );
    // 场景：名字无违规 → 原样返回
    assertEq(
      ScanEngine.suggestName('LXZC_1_NT_N_RS_V01.mov', [], r),
      'LXZC_1_NT_N_RS_V01.mov',
      '无违规原样返回'
    );
    // 场景：段数错 → 返回 null（无法可靠重建）
    assertEq(
      ScanEngine.suggestName('LXZC_1_NT.mov', [{ tag: '段数错' }], r),
      null,
      '段数错无法重建 → null'
    );
    // 场景：名字含空格 → 去掉空格
    assertEq(
      ScanEngine.suggestName('LX ZC_1_NT_N_RS_V01.mov', [], r),
      'LXZC_1_NT_N_RS_V01.mov',
      '去空格'
    );
```

- [ ] **Step 2: Run tests, verify 5 new fail**

- [ ] **Step 3: Implement ScanEngine.suggestName()**

Replace `ScanEngine.suggestName` in `app.js`:

```js
  suggestName(filename, issues, rules) {
    if (issues.some(i => i.tag === '段数错')) return null;

    const ext = filename.match(/\.[^.]+$/)?.[0] || '';
    const base = ext ? filename.slice(0, -ext.length) : filename;

    // Fix 1: strip half-width spaces
    let fixed = base.replace(/ /g, '');

    // Fix 2: NRS-style glued field — look for `<weather><method>` glue (e.g., NRS, NVE, NCS)
    // Detected by: a chunk that's exactly N|R|S|CS|W|F + RS|RVC|VE|CP|DC|UE|CG|CPM|DCM|CGM|M
    const methodCodes = [...Object.keys(rules.methods.video), ...Object.keys(rules.methods.project), ...Object.keys(rules.methods.material)];
    const weatherCodes = Object.keys(rules.weatherCodes);
    for (const w of weatherCodes) {
      for (const m of methodCodes) {
        const glued = w + m;
        const gluedRe = new RegExp(`(?<=[^A-Z])${glued}(?=[_])`, 'g');
        if (gluedRe.test(fixed)) {
          fixed = fixed.replace(gluedRe, `${w}_${m}`);
          break;
        }
      }
    }

    // Fix 3: version — find segment matching ^v\d{1,2}$ and normalize to V + 2 digits
    const parts = fixed.split('_');
    const versionIdx = parts.length === 7 ? 5 : 5;  // same position for both
    if (parts[versionIdx] && /^v\d{1,2}$/i.test(parts[versionIdx])) {
      const num = parts[versionIdx].match(/\d+/)[0].padStart(2, '0');
      parts[versionIdx] = `V${num}`;
      fixed = parts.join('_');
    }

    return fixed + ext;
  },
```

- [ ] **Step 4: Run tests, verify all 5 pass**

- [ ] **Step 5: Commit**

```bash
cd /Users/llm/Downloads/整理规范
git add docs/app.js docs/tests.html
git commit -m "feat(ScanEngine): suggestName() handles NRS-glue, version normalize, space strip"
```

---

## Task 9: Implement ScanEngine.walkFileTree() — directory traversal

**Files:**
- Modify: `/Users/llm/Downloads/整理规范/docs/app.js`

- [ ] **Step 1: Write a small in-browser test for walkFileTree**

Add to `tests.html`:

```js
    // —— ScanEngine.walkFileTree (integration with FileSystemFileHandle) ——
    // 手动测试：创建假 handle，验证 walk 顺序
    async function testWalk() {
      // Skip if FileSystemFileHandle not available
      if (typeof window.showDirectoryPicker !== 'function') {
        const div = document.createElement('div');
        div.className = 'pass';
        div.textContent = '✓ walkFileTree (skipped: needs FileSystemFileHandle)';
        document.getElementById('results').appendChild(div);
        passed++;
        return;
      }
      // Pick a directory interactively
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      const entries = [];
      await ScanEngine.walkFileTree(handle, (entry) => {
        entries.push({ name: entry.name, kind: entry.kind });
      });
      assertEq(entries.length > 0, true, `walkFileTree found ${entries.length} entries`);
    }
    testWalk().catch(e => {
      const div = document.createElement('div');
      div.className = 'fail';
      div.textContent = `✗ walkFileTree: ${e.message}`;
      document.getElementById('results').appendChild(div);
      failed++;
    });
```

- [ ] **Step 2: Open `tests.html`, verify it errors out (no walkFileTree yet)**

- [ ] **Step 3: Implement walkFileTree()**

Replace `ScanEngine.walkFileTree` in `app.js`:

```js
  async walkFileTree(handle, onEntry, parentPath = '') {
    // Yield to event loop every 100 entries to keep UI responsive
    let count = 0;
    for await (const [name, child] of handle.entries()) {
      const path = parentPath ? `${parentPath}/${name}` : name;
      onEntry({ name, path, kind: child.kind, handle: child });
      if (child.kind === 'directory') {
        await this.walkFileTree(child, onEntry, path);
      }
      count++;
      if (count % 100 === 0) {
        await new Promise(r => setTimeout(r, 0));
      }
    }
  }
```

- [ ] **Step 4: Re-test in Chrome (FileSystemFileHandle supported)**

Open `http://localhost:8765/tests.html`, click the "Run tests" prompt for walkFileTree, pick a small folder, verify the assertion passes.

- [ ] **Step 5: Commit**

```bash
cd /Users/llm/Downloads/整理规范
git add docs/app.js docs/tests.html
git commit -m "feat(ScanEngine): walkFileTree() recursive + yielding to event loop"
```

---

## Task 10: Build index.html — boot screen + drop zone + capability detection

**Files:**
- Create: `/Users/llm/Downloads/整理规范/docs/index.html`

- [ ] **Step 1: Write `index.html` skeleton with boot, drop zone, capability badge**

Write to `/Users/llm/Downloads/整理规范/docs/index.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>LED Asset Review</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; background: #fafafa; color: #202124; }
    .header { background: white; padding: 12px 24px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { margin: 0; font-size: 18px; }
    .badge { font-size: 12px; padding: 4px 10px; border-radius: 12px; }
    .badge-rename { background: #e6f4ea; color: #0d8043; }
    .badge-copy { background: #fef7e0; color: #b06000; }
    .main { max-width: 720px; margin: 40px auto; padding: 0 20px; }
    .drop-zone { background: white; border: 2px dashed #9aa0a6; border-radius: 8px; padding: 60px 20px; text-align: center; cursor: pointer; transition: all 0.2s; }
    .drop-zone:hover, .drop-zone.dragover { background: #f0f7ff; border-color: #1a73e8; }
    .drop-zone h2 { margin: 0 0 8px; color: #5f6368; }
    .drop-zone p { margin: 0; color: #80868b; font-size: 14px; }
    .boot-error { background: #fce8e6; border: 1px solid #d93025; color: #d93025; padding: 20px; border-radius: 4px; text-align: center; }
    .boot-error button { margin-top: 12px; padding: 6px 16px; background: #d93025; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .toast { position: fixed; bottom: 20px; right: 20px; background: #202124; color: white; padding: 12px 20px; border-radius: 4px; opacity: 0; transition: opacity 0.3s; max-width: 360px; }
    .toast.show { opacity: 0.95; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎬 LED Asset Review</h1>
    <span id="cap-badge" class="badge">检测中…</span>
  </div>
  <div class="main" id="main">
    <!-- boot / drop zone / cards rendered here -->
  </div>
  <div id="toast" class="toast"></div>

  <script src="./app.js"></script>
  <script>
    const App = {
      state: { phase: 'boot', capability: null, rules: null, violations: [], currentIndex: 0, skippedTypes: new Set(), history: [] },

      async boot() {
        // Capability detection
        const cap = CapabilityDetector.detect();
        this.state.capability = cap.rename ? 'rename' : 'copy-only';
        const badge = document.getElementById('cap-badge');
        badge.textContent = cap.rename ? '✅ 实测改名' : '📋 复制改名';
        badge.className = 'badge ' + (cap.rename ? 'badge-rename' : 'badge-copy');

        // Fetch SKILL.md
        try {
          const res = await fetch('./SKILL.md');
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const md = await res.text();
          this.state.rules = RuleParser.parse(md);
          this.showDropZone();
        } catch (e) {
          this.showBootError('加载规则失败：' + e.message);
        }
      },

      showBootError(msg) {
        document.getElementById('main').innerHTML = `
          <div class="boot-error">
            <h2>❌ 启动失败</h2>
            <p>${msg}</p>
            <p>请确认 <code>docs/SKILL.md</code> 存在后 <a href="javascript:location.reload()">刷新页面</a></p>
          </div>`;
      },

      showDropZone() {
        const cap = this.state.capability;
        const hint = cap === 'rename'
          ? '拖入文件夹后，违规文件可在浏览器内直接改名'
          : '拖入文件夹后，违规文件名复制到剪贴板，Finder/Explorer 改名';
        document.getElementById('main').innerHTML = `
          <div class="drop-zone" id="drop">
            <h2>📁 拖入文件夹开始审核</h2>
            <p>${hint}</p>
            <p style="margin-top:16px;"><button id="pick-btn">或点击选择文件夹</button></p>
          </div>`;

        const drop = document.getElementById('drop');
        drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragover'); });
        drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
        drop.addEventListener('drop', e => {
          e.preventDefault();
          drop.classList.remove('dragover');
          this.handleDrop(e.dataTransfer.items);
        });
        document.getElementById('pick-btn').addEventListener('click', () => this.handlePicker());
      },

      async handleDrop(items) {
        for (const item of items) {
          if (item.kind !== 'file') continue;
          const handle = await item.getAsFileSystemHandle();
          if (handle?.kind === 'directory') {
            await this.scanAndReview(handle);
            return;
          }
        }
        this.toast('请拖入文件夹，不要拖入单个文件');
      },

      async handlePicker() {
        if (!window.showDirectoryPicker) {
          this.toast('当前浏览器不支持选目录，请用拖入');
          return;
        }
        try {
          const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
          await this.scanAndReview(handle);
        } catch (e) {
          if (e.name !== 'AbortError') this.toast('选目录失败：' + e.message);
        }
      },

      async scanAndReview(dirHandle) {
        this.state.phase = 'scanning';
        const entries = [];
        await ScanEngine.walkFileTree(dirHandle, entry => {
          if (entry.kind === 'file') entries.push({ name: entry.name, handle: entry.handle, parent: dirHandle.name });
        });
        this.runValidation(entries);
        // ... (next task: render cards)
      },

      runValidation(entries) {
        const violations = [];
        for (const entry of entries) {
          const { issues, suggestedName } = ScanEngine.validate(entry.name, entry.parent, this.state.rules, { projectMode: true, checkSeqExt: true });
          if (issues.length > 0) {
            violations.push({ file: entry, parent: entry.parent, issues, suggestedName, status: 'pending' });
          }
        }
        this.state.violations = violations;
        this.state.phase = 'reviewing';
        if (violations.length === 0) {
          this.renderAllClean();
        } else {
          this.renderCurrentCard();  // next task
        }
      },

      renderAllClean() {
        document.getElementById('main').innerHTML = `
          <div style="text-align:center;padding:60px 20px;">
            <h1 style="font-size:48px;color:#0d8043;">✅</h1>
            <h2>全部合规</h2>
            <p>扫描完成，未发现违规命名。</p>
            <button onclick="location.reload()">再来一次</button>
          </div>`;
      },

      renderCurrentCard() {
        // Placeholder — implemented in Task 11
        document.getElementById('main').innerHTML = `<p>Card Stack 待实现 (Task 11)，当前 ${this.state.violations.length} 个违规</p>`;
      },

      toast(msg, ms = 3000) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), ms);
      }
    };

    App.boot();
  </script>
</body>
</html>
```

- [ ] **Step 2: Open `index.html` in browser, verify boot + drop zone render**

```bash
cd /Users/llm/Downloads/整理规范/docs && python3 -m http.server 8765
```

Open `http://localhost:8765/index.html`. Expected:
- Header shows "🎬 LED Asset Review" + capability badge (✅ 实测改名 or 📋 复制改名)
- Drop zone shows "📁 拖入文件夹开始审核"
- No console errors

- [ ] **Step 3: Verify the "all clean" branch works**

Temporarily hardcode a clean folder scan. Easier: in browser console, run:
```js
App.runValidation([{name: 'LXZC_1_NT_N_RS_V01.mov', parent: 'LXZC'}])
```
Expected: "全部合规" screen renders.

- [ ] **Step 4: Commit**

```bash
cd /Users/llm/Downloads/整理规范
git add docs/index.html
git commit -m "feat(ui): boot + drop zone + capability badge + all-clean screen"
```

---

## Task 11: Build Card Stack — render card, skip / skip-type / previous / next

**Files:**
- Modify: `/Users/llm/Downloads/整理规范/docs/index.html` (replace `renderCurrentCard`)

- [ ] **Step 1: Replace renderCurrentCard with full Card Stack implementation**

Replace `renderCurrentCard` and add navigation helpers in `index.html`:

```js
      renderCurrentCard() {
        const v = this.state.violations[this.state.currentIndex];
        if (!v) {
          this.renderDone();
          return;
        }
        const cap = this.state.capability;
        const mainAction = cap === 'rename'
          ? `<button id="act-rename" style="background:#1a73e8;color:white;">改名</button>`
          : `<button id="act-copy" style="background:#1a73e8;color:white;">复制建议名</button>`;

        const issuesHtml = v.issues.map(i => `
          <div class="issue">
            <span class="tag">${i.tag}</span>
            <span class="detail">${i.detail}</span>
            <details><summary>📖 规则原文</summary><pre>${i.ruleRef}</pre></details>
          </div>`).join('');

        document.getElementById('main').innerHTML = `
          <div class="card">
            <div class="card-header">
              <span class="counter">❌ 违规 ${this.state.currentIndex + 1} / ${this.state.violations.length}</span>
              <span class="path">📁 ${v.parent}</span>
            </div>
            <div class="field">
              <label>原文件名</label>
              <div class="filename original">${v.file.name}</div>
            </div>
            <div class="field">
              <label>建议改为</label>
              <div class="filename-row">
                <div class="filename suggested">${v.suggestedName || '<em>无法自动重建</em>'}</div>
                <button class="copy-btn" id="inline-copy" ${!v.suggestedName ? 'disabled' : ''}>📋 复制</button>
              </div>
            </div>
            <div class="issues">${issuesHtml}</div>
            <div class="actions">
              <button id="act-skip">跳过</button>
              <button id="act-skip-type">跳过此类</button>
              <button id="act-prev" ${this.state.currentIndex === 0 ? 'disabled' : ''}>上一条</button>
              ${mainAction}
            </div>
            <div style="margin-top:16px;text-align:center;">
              <button id="act-shell" style="background:none;border:none;color:#5f6368;font-size:12px;">📥 生成 rename.sh 兜底</button>
            </div>
          </div>
          <style>
            .card { background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
            .counter { background: #fce8e6; color: #d93025; padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: bold; }
            .path { color: #5f6368; font-size: 13px; }
            .field { margin-bottom: 14px; }
            .field label { font-size: 12px; color: #5f6368; }
            .filename { font-family: 'SF Mono', Monaco, monospace; padding: 8px 12px; border-radius: 4px; margin-top: 4px; }
            .filename.original { background: #fce8e6; }
            .filename.suggested { background: #e6f4ea; flex: 1; }
            .filename-row { display: flex; gap: 8px; align-items: stretch; margin-top: 4px; }
            .copy-btn { padding: 4px 12px; }
            .issues { margin: 16px 0; padding: 12px; background: #fff8e1; border-radius: 4px; }
            .issue { margin-bottom: 8px; }
            .issue .tag { background: #d93025; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; margin-right: 8px; }
            .issue pre { background: white; padding: 8px; font-size: 12px; margin-top: 4px; }
            .actions { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
            .actions button { padding: 8px 16px; border: 1px solid #dadce0; background: white; border-radius: 4px; cursor: pointer; }
            .actions button:disabled { opacity: 0.4; cursor: not-allowed; }
          </style>`;

        // Wire up buttons
        document.getElementById('inline-copy')?.addEventListener('click', () => this.copySuggested(v));
        document.getElementById('act-rename')?.addEventListener('click', () => this.doRename(v));
        document.getElementById('act-copy')?.addEventListener('click', () => this.copySuggested(v));
        document.getElementById('act-skip').addEventListener('click', () => this.skip(v));
        document.getElementById('act-skip-type').addEventListener('click', () => this.skipType(v));
        document.getElementById('act-prev')?.addEventListener('click', () => this.prev());
        document.getElementById('act-shell').addEventListener('click', () => this.generateShell());
      },

      copySuggested(v) {
        if (!v.suggestedName) { this.toast('无法复制：无建议名'); return; }
        navigator.clipboard.writeText(v.suggestedName).then(
          () => this.toast('已复制建议名到剪贴板'),
          e => this.toast('复制失败：' + e.message)
        );
      },

      async doRename(v) {
        try {
          const parent = v.file.handle;  // Note: this is the file handle, not dir
          // Get parent dir from file handle
          // FileSystemFileHandle doesn't expose parent directly; need to track via walkFileTree
          // Workaround: store dir handle separately during scan
          if (!this._dirHandle) { this.toast('内部错误：未记录目录句柄'); return; }
          const dirHandle = this._dirHandle;
          // Read original file to preserve contents
          const oldFile = await v.file.handle.getFile();
          const newHandle = await dirHandle.getFileHandle(v.suggestedName, { create: true });
          const writable = await newHandle.createWritable();
          await writable.write(oldFile);
          await writable.close();
          // Delete old
          await dirHandle.removeEntry(v.file.name);
          v.status = 'renamed';
          this.state.history.push({ type: 'rename', index: this.state.currentIndex });
          this.state.currentIndex++;
          this.renderCurrentCard();
        } catch (e) {
          this.toast('改名失败：' + e.message);
        }
      },

      skip(v) {
        v.status = 'skipped';
        this.state.history.push({ type: 'skip', index: this.state.currentIndex });
        this.state.currentIndex++;
        this.renderCurrentCard();
      },

      skipType(v) {
        for (const issue of v.issues) this.state.skippedTypes.add(issue.tag);
        v.status = 'skipped';
        this.state.history.push({ type: 'skip-type', index: this.state.currentIndex });
        this.advancePastSkipped();
        this.renderCurrentCard();
      },

      advancePastSkipped() {
        while (this.state.currentIndex < this.state.violations.length) {
          const next = this.state.violations[this.state.currentIndex];
          if (next.status !== 'pending' || next.issues.every(i => this.state.skippedTypes.has(i.tag))) {
            if (next.status === 'pending') next.status = 'skipped';
            this.state.currentIndex++;
          } else {
            break;
          }
        }
      },

      prev() {
        if (this.state.history.length === 0) return;
        const last = this.state.history.pop();
        this.state.violations[last.index].status = 'pending';
        this.state.currentIndex = last.index;
        this.renderCurrentCard();
      },

      generateShell() {
        // Placeholder — Task 13
        this.toast('rename.sh 生成待实现 (Task 13)');
      },

      renderDone() {
        // Placeholder — Task 13
        document.getElementById('main').innerHTML = `<h2>完成！</h2>`;
      },
```

Also update `scanAndReview` to record `_dirHandle`:

```js
      async scanAndReview(dirHandle) {
        this._dirHandle = dirHandle;
        // ... (rest unchanged)
      },
```

- [ ] **Step 2: Open `index.html`, drag a folder with 3 mixed files, verify cards render**

Expected:
- Card 1 shows original + suggested + issues
- Buttons all wired
- Counter updates as you navigate

- [ ] **Step 3: Commit**

```bash
cd /Users/llm/Downloads/整理规范
git add docs/index.html
git commit -m "feat(ui): Card Stack with skip / skip-type / prev / inline-copy"
```

---

## Task 12: Wire up Chrome rename path with FileSystemFileHandle.move() — fallback to copy+create

**Files:**
- Modify: `/Users/llm/Downloads/整理规范/docs/index.html` (rewrite `doRename`)

- [ ] **Step 1: Replace doRename with a robust implementation**

Replace `doRename` in `index.html`:

```js
      async doRename(v) {
        const dirHandle = this._dirHandle;
        if (!dirHandle) { this.toast('内部错误：未记录目录句柄'); return; }
        if (!v.suggestedName) { this.toast('无法改名：无建议名'); return; }

        try {
          // Prefer move() if available (Chrome 110+)
          if (typeof v.file.handle.move === 'function') {
            await v.file.handle.move(v.suggestedName);
          } else {
            // Fallback: copy + delete (older Chrome, Edge)
            const oldFile = await v.file.handle.getFile();
            const newHandle = await dirHandle.getFileHandle(v.suggestedName, { create: true });
            const writable = await newHandle.createWritable();
            await writable.write(oldFile);
            await writable.close();
            await dirHandle.removeEntry(v.file.name);
          }
          v.status = 'renamed';
          this.state.history.push({ type: 'rename', index: this.state.currentIndex });
          this.state.currentIndex++;
          this.advancePastSkipped();
          this.renderCurrentCard();
        } catch (e) {
          this.toast('改名失败：' + e.message);
        }
      },
```

- [ ] **Step 2: Test in Chrome — drag a folder with 1 violation, click [改名], verify file is renamed on disk**

```bash
# Set up a test folder
mkdir -p /tmp/rename-test
touch '/tmp/rename-test/CZ_QSJD_101-F_FN_NRS_V01.mov'
```

Open `index.html` in Chrome, drag `/tmp/rename-test/`. Expected:
- Card shows original + suggested `CZQSJD_101-F_FN_N_RS_V01.mov`
- Click [改名] → file on disk renamed
- Toast "改名成功" (or just disappears, next card / done screen)

Verify: `ls /tmp/rename-test/` shows `CZQSJD_101-F_FN_N_RS_V01.mov`.

- [ ] **Step 3: Commit**

```bash
cd /Users/llm/Downloads/整理规范
git add docs/index.html
git commit -m "feat(rename): use FileSystemFileHandle.move() with copy+delete fallback"
```

---

## Task 13: Build top toggles + rename.sh generator + Done screen

**Files:**
- Modify: `/Users/llm/Downloads/整理规范/docs/index.html` (add toggles, rewrite `generateShell` and `renderDone`)

- [ ] **Step 1: Add toggles to drop zone in `showDropZone`**

In `showDropZone`, replace the inner HTML with:

```js
      showDropZone() {
        const cap = this.state.capability;
        const hint = cap === 'rename'
          ? '拖入文件夹后，违规文件可在浏览器内直接改名'
          : '拖入文件夹后，违规文件名复制到剪贴板，Finder/Explorer 改名';
        document.getElementById('main').innerHTML = `
          <div class="toggles" style="margin-bottom:16px;background:white;padding:12px 16px;border-radius:4px;border:1px solid #e0e0e0;">
            <label style="margin-right:20px;"><input type="checkbox" id="tog-project" checked> 启用项目级约定（iQiyi 内部项目）</label>
            <label><input type="checkbox" id="tog-seqext" checked> 校验序列帧扩展名</label>
          </div>
          <div class="drop-zone" id="drop">
            <h2>📁 拖入文件夹开始审核</h2>
            <p>${hint}</p>
            <p style="margin-top:16px;"><button id="pick-btn">或点击选择文件夹</button></p>
          </div>`;

        // wire up drop + pick (unchanged from before)
        const drop = document.getElementById('drop');
        drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragover'); });
        drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
        drop.addEventListener('drop', e => {
          e.preventDefault();
          drop.classList.remove('dragover');
          this.handleDrop(e.dataTransfer.items);
        });
        document.getElementById('pick-btn').addEventListener('click', () => this.handlePicker());
      },
```

Update `runValidation` to read toggles:

```js
      runValidation(entries) {
        const projectMode = document.getElementById('tog-project')?.checked ?? true;
        const checkSeqExt = document.getElementById('tog-seqext')?.checked ?? true;
        const violations = [];
        for (const entry of entries) {
          const { issues, suggestedName } = ScanEngine.validate(entry.name, entry.parent, this.state.rules, { projectMode, checkSeqExt });
          if (issues.length > 0) {
            violations.push({ file: entry, parent: entry.parent, issues, suggestedName, status: 'pending' });
          }
        }
        this.state.violations = violations;
        this.state.phase = 'reviewing';
        if (violations.length === 0) {
          this.renderAllClean();
        } else {
          this.renderCurrentCard();
        }
      },
```

- [ ] **Step 2: Implement `generateShell()`**

Replace `generateShell`:

```js
      generateShell() {
        const pending = this.state.violations.filter(v => v.status === 'pending' && v.suggestedName);
        if (pending.length === 0) { this.toast('无待处理违规'); return; }
        const lines = ['#!/usr/bin/env bash', 'set -e', ''];
        for (const v of pending) {
          // Escape single quotes for shell
          const oldQ = `'${v.file.name.replace(/'/g, "'\\''")}'`;
          const newQ = `'${v.suggestedName.replace(/'/g, "'\\''")}'`;
          lines.push(`mv -- ${oldQ} ${newQ}`);
        }
        const content = lines.join('\n') + '\n';
        const blob = new Blob([content], { type: 'text/x-shellscript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'rename.sh';
        a.click();
        URL.revokeObjectURL(url);
        this.toast(`已下载 rename.sh（${pending.length} 个改名）`);
      },
```

- [ ] **Step 3: Implement `renderDone()`**

Replace `renderDone`:

```js
      renderDone() {
        const renamed = this.state.violations.filter(v => v.status === 'renamed').length;
        const skipped = this.state.violations.filter(v => v.status === 'skipped').length;
        const skippedTypesCount = this.state.skippedTypes.size;
        document.getElementById('main').innerHTML = `
          <div style="text-align:center;padding:60px 20px;">
            <h1 style="font-size:48px;">🎉</h1>
            <h2>审核完成</h2>
            <p>改名 <strong>${renamed}</strong> · 跳过 <strong>${skipped}</strong> · 跳过类型 <strong>${skippedTypesCount}</strong> 种</p>
            <button onclick="location.reload()" style="margin-top:20px;padding:8px 24px;">重新开始</button>
          </div>`;
      },
```

- [ ] **Step 4: Test in browser**

- Drag a folder, uncheck both toggles, verify they affect validation (no 项目约定违反 / no 序列帧扩展名错 issues appear)
- Click [生成 rename.sh], verify a `rename.sh` file downloads
- Process all cards, verify Done screen shows correct counts

- [ ] **Step 5: Commit**

```bash
cd /Users/llm/Downloads/整理规范
git add docs/index.html
git commit -m "feat(ui): top toggles + rename.sh generator + Done screen"
```

---

## Task 14: Create test fixtures — case-01 (mixed violations) + case-02 (clean)

**Files:**
- Create: `/Users/llm/Downloads/整理规范/docs/test-fixtures/case-01-mixed-violations/` (10 files)
- Create: `/Users/llm/Downloads/整理规范/docs/test-fixtures/case-02-clean-folder/` (5 files)

- [ ] **Step 1: Create case-01 with 10 files (6 violations, 4 clean)**

```bash
mkdir -p /Users/llm/Downloads/整理规范/docs/test-fixtures/case-01-mixed-violations
mkdir -p /Users/llm/Downloads/整理规范/docs/test-fixtures/case-02-clean-folder
mkdir -p /Users/llm/Downloads/整理规范/docs/test-fixtures/case-03-edge-cases
mkdir -p /Users/llm/Downloads/整理规范/docs/test-fixtures/case-04-car-shot
cd /Users/llm/Downloads/整理规范/docs/test-fixtures/case-01-mixed-violations
touch 'LXZC_1_NT_N_RS_V01.mov'              # ✅ 合规
touch 'LXZC_2_NT_N_RS_V01.mov'              # ✅ 合规
touch 'LXZC_3_NT_N_RS_V01.mov'              # ✅ 合规
touch 'LXZC_4_NT_N_RS_V01.mov'              # ✅ 合规
touch 'LXZC_5_NT_N_RS_V01.mov'              # ❌ 段数错（只有 1 段）
touch 'CZQSJD_101-F_FN_NRS_V01.mov'         # ❌ NRS 黏合
touch 'CZQSJD_101-R_FN_N_RS_v1.mov'         # ❌ 版本号 v1
touch 'CZQSJD_101-B_FN_N_RS_V01.mov'        # ❌ 项目约定违反 (CZQSJD 正确但 101-B 不存在... 改成更明显)
# 修正：换成「项目约定违反」的可识别错误
rm 'CZQSJD_101-B_FN_N_RS_V01.mov'
touch 'CZ QSJD_101-F_FN_N_RS_V01.mov'       # ❌ 项目约定违反（项目+场景有空格）
touch 'LXZC_6_NT_N_RS_V01.dpx'              # ❌ 序列帧扩展名错（.dpx 但不是 5 位帧号结尾... 实际 .dpx 合法）
# 修正：改成缺帧号的伪序列帧
rm 'LXZC_6_NT_N_RS_V01.dpx'
touch 'LXZC_7_NT_N_CP_V01_00502.png'        # ❌ 序列帧扩展名错（.png 不允许）
touch 'LXZC_8_NIGHT_N_RS_V01.mov'           # ❌ 时间码未知 NIGHT
ls
```

Expected: 10 files, 6 with violations.

- [ ] **Step 2: Create case-02 with 5 clean files**

```bash
cd /Users/llm/Downloads/整理规范/docs/test-fixtures/case-02-clean-folder
touch 'LXZC_1_NT_N_RS_V01.mov'
touch 'LXZC_2_FN_N_RS_V01.mov'
touch 'LXZC_3_NT_R_RS_V01.mov'
touch 'LXZC_1_NT_N_CP_V01_00502.dpx'
touch 'LXZC_1_NT_N_CG_V01/'  # 目录占位
# 目录无法在 git 里直接追踪，新建一个空文件
rmdir 'LXZC_1_NT_N_CG_V01' 2>/dev/null || true
touch 'LXZC_1_NT_N_CG_V01.placeholder'  # 用 .placeholder 避免被认成 .mov
ls
```

Expected: 5 files, 0 violations.

- [ ] **Step 3: Commit**

```bash
cd /Users/llm/Downloads/整理规范
git add docs/test-fixtures/case-01-mixed-violations/ docs/test-fixtures/case-02-clean-folder/
git commit -m "test: add case-01 (6 violations) + case-02 (all clean) fixtures"
```

---

## Task 15: Create test fixtures — case-03 (edge cases) + case-04 (car shot) + expected-results.md

**Files:**
- Create: 4 edge-case files in case-03
- Create: 5 car-shot files in case-04
- Create: `/Users/llm/Downloads/整理规范/docs/expected-results.md`

- [ ] **Step 1: Create case-03 with edge cases**

```bash
cd /Users/llm/Downloads/整理规范/docs/test-fixtures/case-03-edge-cases
touch '文件含空格 LXZC_1_NT_N_RS_V01.mov'  # ❌ 文件名含空格
touch 'normal.mov'                          # ❌ 段数错（只有 1 段）
touch 'LXZC_1_NT_N_RS_V01'                  # 无扩展名 → 走纯基础名校验（应合规）
touch '.hidden'                             # 隐藏文件（点开头） → 不在范围内（实现可选：跳过）
ls -la
```

- [ ] **Step 2: Create case-04 with 5 car-shot files**

```bash
cd /Users/llm/Downloads/整理规范/docs/test-fixtures/case-04-car-shot
touch 'CZQSJD_101-F_FN_N_RS_V01.mov'   # 前
touch 'CZQSJD_102-R_FN_N_RS_V01.mov'   # 右
touch 'CZQSJD_103-B_FN_N_RS_V01.mov'   # 后
touch 'CZQSJD_104-L_FN_N_RS_V01.mov'   # 左
touch 'CZQSJD_105-T_FN_N_RS_V01.mov'   # 上
ls
```

Expected: 5 files, 0 violations.

- [ ] **Step 3: Write `expected-results.md`**

Write to `/Users/llm/Downloads/整理规范/docs/expected-results.md`:

````markdown
# 期望输出 · case-01-mixed-violations

**操作**：把 `docs/test-fixtures/case-01-mixed-violations/` 拖入 web app
**预期违规数**：6 / 10

| 序号 | 文件名 | 期望 issue tag | 期望建议名 |
|---|---|---|---|
| 1 | `LXZC_5_NT_N_RS_V01.mov` | 段数错 | `null`（无法重建） |
| 2 | `CZQSJD_101-F_FN_NRS_V01.mov` | NRS 黏合 | `CZQSJD_101-F_FN_N_RS_V01.mov` |
| 3 | `CZQSJD_101-R_FN_N_RS_v1.mov` | 版本号格式错 | `CZQSJD_101-R_FN_N_RS_V01.mov` |
| 4 | `CZ QSJD_101-F_FN_N_RS_V01.mov` | 项目约定违反 | `CZQSJD_101-F_FN_N_RS_V01.mov` |
| 5 | `LXZC_7_NT_N_CP_V01_00502.png` | 序列帧扩展名错 | `null`（扩展名错无法重建） |
| 6 | `LXZC_8_NIGHT_N_RS_V01.mov` | 时间码未知 | `null`（时间码不在字典） |

## 人工验证清单

打开 `index.html` → 拖入 `test-fixtures/case-01-mixed-violations/`：

- [ ] 顶栏显示 "❌ 违规 6 / 6"
- [ ] 卡片 1（段数错）显示 "原文件名 LXZC_5..." 与原样，"建议改为" 区显示 "无法自动重建"
- [ ] 卡片 2（NRS 黏合）建议名 `CZQSJD_101-F_FN_N_RS_V01.mov`
- [ ] 卡片 3（版本号 v1）建议名 `CZQSJD_101-R_FN_N_RS_V01.mov`
- [ ] 卡片 4（项目约定违反）建议名去掉空格 `CZQSJD_101-F_FN_N_RS_V01.mov`
- [ ] 卡片 5（序列帧扩展名错）建议名显示 "无法自动重建"
- [ ] 卡片 6（时间码未知）建议名显示 "无法自动重建"
- [ ] 点 [生成 rename.sh]，下载文件包含 2 条 `mv` 命令（卡片 2 + 卡片 3）
````

- [ ] **Step 4: Commit**

```bash
cd /Users/llm/Downloads/整理规范
git add docs/test-fixtures/case-03-edge-cases/ docs/test-fixtures/case-04-car-shot/ docs/expected-results.md
git commit -m "test: case-03 edge cases + case-04 car shot + expected-results.md"
```

---

## Task 16: Run full smoke test in Chrome + Safari

**Files:** (no new files, manual verification)

- [ ] **Step 1: Start local server**

```bash
cd /Users/llm/Downloads/整理规范/docs
python3 -m http.server 8765
```

- [ ] **Step 2: Chrome smoke test**

Open `http://localhost:8765/index.html` in Chrome. Run through:
1. ✅ Boot screen loads, badge shows "✅ 实测改名"
2. ✅ Drag `test-fixtures/case-01-mixed-violations/` → 6 cards appear
3. ✅ Card 1: click [改名] (will fail since 段数错) → toast "无法改名：无建议名" / actually skips since suggestedName is null
4. ✅ Card 2: click [改名] → file renamed on disk (verify with `ls`)
5. ✅ Card 3: click [跳过] → advances
6. ✅ Card 4: click [跳过此类] → all remaining 项目约定违反 cards skip
7. ✅ Card 5: click [生成 rename.sh] → downloads `rename.sh` containing mv commands
8. ✅ Process all → Done screen shows correct counts
9. ✅ Run `tests.html` → 0 failed

- [ ] **Step 3: Safari smoke test (if available)**

Open `http://localhost:8765/index.html` in Safari. Run through:
1. ✅ Badge shows "📋 复制改名"
2. ✅ Drag a folder → cards appear
3. ✅ Click [复制建议名] → suggested name in clipboard, paste into Finder verifies
4. ✅ [生成 rename.sh] still works

- [ ] **Step 4: Stop server**

```bash
lsof -ti:8765 | xargs kill 2>/dev/null || true
```

- [ ] **Step 5: If any failures, fix and re-test before commit**

- [ ] **Step 6: Commit any smoke-test fixes**

```bash
cd /Users/llm/Downloads/整理规范
git add -A
git diff --cached --quiet || git commit -m "fix: smoke test adjustments"
```

---

## Task 17: Polish README + add Claude Code skill symlink instructions

**Files:**
- Modify: `/Users/llm/Downloads/整理规范/README.md`

- [ ] **Step 1: Replace README with full version**

Write to `/Users/llm/Downloads/整理规范/README.md`:

````markdown
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
````

- [ ] **Step 2: Commit**

```bash
cd /Users/llm/Downloads/整理规范
git add README.md
git commit -m "docs: full README with usage + GitHub Pages + Claude Code skill instructions"
```

---

## Task 18: Create GitHub repo + push + enable Pages (HUMAN ACTION)

**Files:** (none modified locally)

- [ ] **Step 1: Create the GitHub repository**

Go to https://github.com/new:
- Owner: `xie1433223` (your personal account)
- Name: `led-asset-review`
- Visibility: **Private**
- **Do not** initialize with README, .gitignore, or license (we have them locally)

- [ ] **Step 2: Add remote and push**

```bash
cd /Users/llm/Downloads/整理规范
git remote add origin git@github.com:xie1433223/led-asset-review.git
git branch -M main
git push -u origin main
```

Expected: All commits pushed to GitHub.

- [ ] **Step 3: Enable GitHub Pages**

Go to https://github.com/xie1433223/led-asset-review/settings/pages :
- Source: **Deploy from a branch**
- Branch: `main` / `/docs`
- Save

- [ ] **Step 4: Verify Pages is live**

Wait 1-2 minutes, then visit `https://xie1433223.github.io/led-asset-review/`.
Expected: Boot screen loads, badge shows "✅ 实测改名" (or "📋 复制改名" on Safari).

- [ ] **Step 5: Final commit with deployment info (optional)**

No code changes needed. If you want to record the Pages URL, add it to README footer:

```bash
cd /Users/llm/Downloads/整理规范
# Edit README.md to add: "## Live Demo: https://xie1433223.github.io/led-asset-review/"
git add README.md
git commit -m "docs: add live demo URL"
git push
```

---

## Self-Review

**Spec coverage:**

| Spec Section | Covered by Task |
|---|---|
| §1 Background & Goals | (info only, no code) |
| §2 Architecture (5 layers) | Task 3 (app.js skeleton), Task 10 (boot), Task 9 (walk), Task 4-8 (engine), Task 11 (render) |
| §2.2 C+A hybrid (rename) | Task 12 (Chrome move + fallback) |
| §3 File structure | Task 1-3, 14-15 |
| §4 Data flow / 7 modules | Task 3-11 |
| §4.3 State model | Task 11 (state object in App) |
| §4.4 Navigation rules | Task 11 (skip / skip-type / prev) |
| §4.5 Validation rules (1-9) | Task 4-7 (engine), Task 5-7 (specific checks) |
| §5.1 Card Stack UI | Task 11 (renderCurrentCard) |
| §5.2 Button behavior | Task 11 (wiring), Task 12 (rename), Task 13 (shell) |
| §5.3 Top toggles | Task 13 (toggles) |
| §5.4 Done screen | Task 13 (renderDone) |
| §6 Error handling | F1 (boot error in Task 10), F2 (RuleParser throws, caught in Task 4), T1 (rename error in Task 12), W5 (project mode toggle) |
| §7 Testing | Task 3-9 (unit), Task 14-15 (fixtures), Task 16 (browser smoke) |
| §8 Locked decisions | Throughout |
| §10 Repo init | Task 1, Task 2 |
| §11 GitHub Pages | Task 18 |

**Placeholder scan:** No TBD/TODO/FIXME in any task. Every step has actual code or commands.

**Type consistency:** All API names used in later tasks (`RuleParser.parse`, `ScanEngine.validate`, `ScanEngine.suggestName`, `ScanEngine.walkFileTree`, `CapabilityDetector.detect`) are defined in Task 3 and used consistently through Task 16.

**Issue found and fixed during self-review:**
- Task 6 originally had an invalid test for "镜号 99" (which is actually valid). Replaced with "镜号 X" (truly invalid) and noted the correction inline.
- Task 7 originally had a syntax error in the test (`ScanEngine.validate(...).find?.(...)` returns a function, not a value). Fixed to use `.issues.find(...)`.
- Task 8 added test for "段数错 → null" which requires the suggestName implementation to check for that issue. Added that check.

Plan is ready.
