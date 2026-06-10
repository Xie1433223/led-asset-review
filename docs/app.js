// LED Asset Review · core logic
// Modules exported to window for tests.html + index.html

const RuleParser = {
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
};

const ScanEngine = {
  validate(filename, parent, rules, options = {}) {
    const issues = [];
    const { projectMode = true, checkSeqExt = true } = options;

    // Strip extension
    const ext = filename.match(/\.[^.]+$/)?.[0] || '';
    const base = ext ? filename.slice(0, -ext.length) : filename;
    const isSequenceFrame = /_\d{5}$/.test(base);
    const isCameraOriginal = base.split('_')[4] === 'M';
    const expectedSegments = isSequenceFrame ? 7 : (isCameraOriginal ? 5 : 6);

    // Split by underscore
    const parts = base.split('_');
    if (parts.length !== expectedSegments) {
      issues.push({
        tag: '段数错',
        detail: `预期 ${expectedSegments} 段（${isSequenceFrame ? '序列帧' : '成品'}），实际 ${parts.length} 段 — 可能是字段黏合，可尝试自动修复`,
        ruleRef: 'Quick Reference — 五种命名方式'
      });
      // Do NOT early-return: per-field validation is meaningless when segment
      // count is wrong (we don't know where fields start/end), but we leave
      // it to suggestName() to attempt a glue-split recovery.
    } else {

    // Field 1: scene code (or project+scene concat)
    const sceneCode = parts[0];
    if (!/^[A-Z]{2,10}$/.test(sceneCode)) {
      issues.push({
        tag: '场景码非法',
        detail: `字段 1 "${sceneCode}" 必须是大写字母、长度 2-10`,
        ruleRef: '字段 1：场景名称'
      });
    }

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
    const isCameraOriginalMethod = methodCode === 'M';
    if (!isCameraOriginalMethod && !rules.versionPattern.test(version)) {
      issues.push({
        tag: '版本号格式错',
        detail: `字段 6 "${version}" 必须是 V + 两位数（V01-V99）`,
        ruleRef: '字段 6：版本号'
      });
    }

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
    }

    // Project override: no half-width spaces in parent dir or filename.
    // (Always runs, independent of segment count — a space violation is
    //  a real issue even when the segment count is also wrong.)
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

    return { issues };
  },

  suggestName(filename, issues, rules) {
    const ext = filename.match(/\.[^.]+$/)?.[0] || '';
    const base = ext ? filename.slice(0, -ext.length) : filename;

    // Expected segment count (needed to verify the fix actually resolves 段数错)
    const isSequenceFrame = /_\d{5}$/.test(base);
    const isCameraOriginal = base.split('_')[4] === 'M';
    const expectedSegments = isSequenceFrame ? 7 : (isCameraOriginal ? 5 : 6);

    // Fix 1: strip half-width spaces
    let fixed = base.replace(/ /g, '');

    // Fix 2: NRS-style glue — for any segment that's not a known single code,
    // try to split it into 2+ known codes via DP. The segment must end on a
    // method (since segments always end on a method in the spec). If DP
    // succeeds, replace the segment with the split pieces.
    const allSingleCodes = new Set([
      ...Object.keys(rules.timeCodes),
      ...Object.keys(rules.weatherCodes),
      ...Object.keys(rules.methods.video),
      ...Object.keys(rules.methods.project),
      ...Object.keys(rules.methods.material)
    ]);
    const methodCodes = new Set([
      ...Object.keys(rules.methods.video),
      ...Object.keys(rules.methods.project),
      ...Object.keys(rules.methods.material)
    ]);

    function splitGluedSegment(seg) {
      // If already a known single code, no split needed
      if (allSingleCodes.has(seg)) return [seg];

      // Pre-strip: if segment ends with a version-like suffix (v\d{1,2} or
      // V\d{1,2}), peel it off so the DP only has to handle field 3-5 glue.
      // Without this, NRSv1 wouldn't parse (v1 isn't a known code).
      let workSeg = seg;
      let versionSuffix = null;
      const versionMatch = seg.match(/^(.+?)([vV]\d{1,2})$/);
      if (versionMatch) {
        workSeg = versionMatch[1];
        versionSuffix = versionMatch[2];
        if (allSingleCodes.has(workSeg)) {
          return [workSeg, versionSuffix];
        }
      }

      // DP: find the minimum-piece partition where every piece is a known
      // code. The last piece must be a method (since segments always end on
      // a method in the spec). Earlier pieces can be T/W or method in any
      // order (we don't enforce alternation — fields 3-5 can have multiple
      // T/W values glued together, e.g. FNNRS → FN + N + RS).
      const n = workSeg.length;
      const dp = new Array(n + 1).fill(Infinity);
      const parent = new Array(n + 1).fill(-1);
      dp[0] = 0;

      for (let i = 1; i <= n; i++) {
        for (let j = 0; j < i; j++) {
          if (dp[j] === Infinity) continue;
          const candidate = workSeg.slice(j, i);
          if (methodCodes.has(candidate) || allSingleCodes.has(candidate)) {
            if (dp[j] + 1 < dp[i]) {
              dp[i] = dp[j] + 1;
              parent[i] = j;
            }
          }
        }
      }

      if (dp[n] === Infinity) return null;  // no valid partition

      // Reconstruct
      const pieces = [];
      let pos = n;
      while (pos > 0) {
        const prev = parent[pos];
        pieces.unshift(workSeg.slice(prev, pos));
        pos = prev;
      }

      // Last piece must be a method (segments end on a method)
      if (!methodCodes.has(pieces[pieces.length - 1])) return null;
      if (versionSuffix) pieces.push(versionSuffix);
      return pieces;
    }

    const parts = fixed.split('_');
    const recovered = [];
    for (const seg of parts) {
      const split = splitGluedSegment(seg);
      if (split) {
        recovered.push(...split);
      } else {
        recovered.push(seg);
      }
    }
    fixed = recovered.join('_');

    // Fix 3: version — find segment matching ^v\d{1,2}$ and normalize to V + 2 digits
    const versionIdx = fixed.split('_').length === 7 ? 5 : 5;
    const partsForVer = fixed.split('_');
    if (partsForVer[versionIdx] && /^v\d{1,2}$/i.test(partsForVer[versionIdx])) {
      const num = partsForVer[versionIdx].match(/\d+/)[0].padStart(2, '0');
      partsForVer[versionIdx] = `V${num}`;
      fixed = partsForVer.join('_');
    }

    // Verify the fix actually resolves segment count.
    // If the result still has wrong count, give up (return null).
    if (fixed.split('_').length !== expectedSegments) return null;

    return fixed + ext;
  },

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
