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

// XlsxTableParser — parses the iQiyi《LED 大屏播放素材统计表》template into
// a flat array of normalized row records. The template's first 3 rows are
// metadata (title / date / headers), data starts at row 4. Column layout is
// matched by SUBSTRING on header text, not by index — so column reordering
// in future template versions is forgiving.
const XlsxTableParser = {
  // Maps canonical field names to header substrings. Substring match is
  // case-sensitive and works on the raw cell text (with newlines / parens
  // left intact, since the iQiyi template has stuff like
  // '\n视频格式\n建议ProRes422HQ').
  // `required: false` means the column may be missing in older templates —
  // we tolerate it and just leave the field empty. (Seen in case-07 fixture
  // which only has 15 cols; the full iQiyi template has 16 incl. 原始拍摄
  // 素材文件名称.)
  HEADER_KEYS: {
    serial:              { needle: '序号',                 required: true  },
    currentName:         { needle: '文件命名',             required: true  },
    sceneName:           { needle: '场景名称',             required: true  },
    location:            { needle: '拍摄地理名称',         required: true  },
    time:                { needle: '气氛时间',             required: true  },
    weather:             { needle: '天气',                 required: true  },
    format:              { needle: '视频格式',             required: true  },
    isCameraOrig:        { needle: '原始拍摄素材',         required: true  },
    originalMaterialName:{ needle: '原始拍摄素材文件名称', required: false }
  },

  parse(arrayBuffer) {
    if (typeof XLSX === 'undefined') {
      throw new Error('SheetJS (XLSX) 未加载 — 请检查 CDN 是否可达');
    }
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) throw new Error('xlsx 里没有 sheet');

    // sheet_to_json with header:1 gives us a 2D array; defval:null keeps
    // empty cells as null instead of dropping them (which would shift
    // column indices).
    const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

    // Find the header row: first row containing '序号' in column 0.
    let headerRowIdx = -1;
    for (let i = 0; i < grid.length; i++) {
      const c0 = grid[i]?.[0];
      if (c0 != null && String(c0).trim() === this.HEADER_KEYS.serial.needle) {
        headerRowIdx = i;
        break;
      }
    }
    if (headerRowIdx < 0) {
      throw new Error('找不到表头行(第一列应为 "序号")');
    }

    // Build a column-index map from the header row. Substring match:
    // '拍摄地理名称（素材拍摄位置）' contains '拍摄地理名称' → match.
    // required:false columns may be missing (older templates) — leave -1.
    const headerRow = grid[headerRowIdx];
    const colMap = {};
    for (const [key, spec] of Object.entries(this.HEADER_KEYS)) {
      const needle = spec.needle;
      let found = -1;
      for (let c = 0; c < headerRow.length; c++) {
        const cell = headerRow[c];
        if (cell == null) continue;
        if (String(cell).includes(needle)) { found = c; break; }
      }
      if (found < 0) {
        if (spec.required) throw new Error(`表头缺少列 "${needle}"`);
        colMap[key] = -1;  // optional column absent — leave parsed as ''
        continue;
      }
      colMap[key] = found;
    }

    // Data rows: from headerRow+1, stop at first row where 序号 is null
    // (sheet_to_json pads trailing rows with nulls sometimes; the iQiyi
    // template also leaves tail rows blank).
    const rows = [];
    for (let r = headerRowIdx + 1; r < grid.length; r++) {
      const row = grid[r];
      if (!row) continue;
      const serial = row[colMap.serial];
      if (serial == null || serial === '') break;  // sentinel: end of data
      // Defensive: skip rows where 序号 isn't a number (avoids random
      // footer / notes rows in some templates).
      if (typeof serial !== 'number' && isNaN(parseInt(serial, 10))) continue;

      rows.push({
        serial: parseInt(serial, 10),
        currentName: row[colMap.currentName] != null ? String(row[colMap.currentName]) : '',
        sceneName:   row[colMap.sceneName]   != null ? String(row[colMap.sceneName]).trim()   : '',
        location:    row[colMap.location]    != null ? String(row[colMap.location]).trim()    : '',
        time:        row[colMap.time]        != null ? String(row[colMap.time]).trim()        : '',
        weather:     row[colMap.weather]     != null ? String(row[colMap.weather]).trim()     : '',
        format:      row[colMap.format]      != null ? String(row[colMap.format]).trim()      : '',
        isCameraOriginal: this._truthy(row[colMap.isCameraOrig]),
        originalMaterialName: colMap.originalMaterialName >= 0 && row[colMap.originalMaterialName] != null
          ? String(row[colMap.originalMaterialName]).trim()
          : ''
      });
    }

    return { rows, colMap };
  },

  _truthy(v) {
    if (v == null) return false;
    const s = String(v).trim();
    return s === '是' || s.toLowerCase() === 'yes' || s === 'true' || s === '1';
  }
};

// XlsxNamer — builds the suggested file name from a parsed xlsx row + the
// existing rules (timeCodes / weatherCodes / methods). Field 1 (scene code)
// is derived from the Chinese 场景名称 via pinyin-pro. Field 2 (shot
// number) is derived from 拍摄地理名称: in order of first appearance, the
// 1st unique value → 镜1, 2nd → 镜2, etc. Method + version are GLOBAL
// options (one per upload) since the template has no per-row column.
const XlsxNamer = {
  // Returns: { name, status, warnings[] }
  //   status: 'ok' | 'warn' | 'err'
  //   name is the suggested file name WITHOUT extension (per project
  //   convention from the user — extension stripped from the output)
  build(row, rules, options) {
    const { method = 'RVC', version = 'V01' } = options || {};
    const warnings = [];

    // Field 1: scene code via pinyin-pro.
    if (!row.sceneName) {
      return { name: null, status: 'err', warnings: ['场景名称为空'] };
    }
    if (typeof pinyin === 'undefined') {
      return { name: null, status: 'err', warnings: ['pinyin-pro 未加载 — 请检查 CDN'] };
    }
    let sceneCode;
    try {
      // pinyin('青梧镇街道', { pattern: 'first', toneType: 'none', type: 'array' })
      //   → ['q','w','z','j','d']
      const initials = pinyin(row.sceneName, { pattern: 'first', toneType: 'none', type: 'array' });
      sceneCode = initials.join('').toUpperCase();
    } catch (e) {
      return { name: null, status: 'err', warnings: ['拼音转换失败: ' + e.message] };
    }
    if (!/^[A-Z]{2,15}$/.test(sceneCode)) {
      return { name: null, status: 'err', warnings: [`场景码 "${sceneCode}" 不合法`] };
    }

    // Field 3: time code — Chinese → code via rules.timeCodes (reverse map).
    // Rules parser stores {CODE: '中文'}, so build the reverse.
    const timeReverseMap = this._reverseMap(rules.timeCodes);
    let timeCode = timeReverseMap[row.time];
    if (!timeCode) {
      // Common colloquial variants that aren't in SKILL.md's official list.
      // SKILL.md uses formal 早晨/上午/中午/下午/黄昏/日落/夜晚/深夜; users
      // (esp. iQiyi form fillers) often write colloquial 早上/晚上/傍晚/夜里.
      if (row.time === '傍晚') timeCode = 'NF';        // → 黄昏 (Nightfall)
      else if (row.time === '晚上') timeCode = 'NT';   // → 夜晚 (Night)
      else if (row.time === '夜里') timeCode = 'NT';   // → 夜晚 (Night)
      else if (row.time === '早上') timeCode = 'MO';   // → 早晨 (Morning)
    }
    if (!timeCode) {
      return { name: null, status: 'err', warnings: [`未知气氛时间 "${row.time}"`] };
    }

    // Field 4: weather code.
    const weatherReverseMap = this._reverseMap(rules.weatherCodes);
    let weatherCode = weatherReverseMap[row.weather];
    if (!weatherCode) {
      // 晴天 (sunny) is the most common default; spec only lists 阴天 for
      // cloudy. 晴天 → N is the "no special weather" default in the spec.
      if (row.weather === '晴天') weatherCode = 'N';
    }
    if (!weatherCode) {
      return { name: null, status: 'err', warnings: [`未知天气 "${row.weather}"`] };
    }

    // Field 5: method (global, user-set).
    const methodDict = { ...rules.methods.video, ...rules.methods.project };
    if (!methodDict[method]) {
      return { name: null, status: 'err', warnings: [`未知制作方式 "${method}"`] };
    }

    // Build the name. Two patterns per SKILL.md:
    //   摄影机原始素材: <scene>_<shot>_<time>_<weather>_M       (no version)
    //   最终视频成品:   <scene>_<shot>_<time>_<weather>_<method>_<version>
    const name = row.isCameraOriginal
      ? `${sceneCode}_${options.shotCode}_${timeCode}_${weatherCode}_M`
      : `${sceneCode}_${options.shotCode}_${timeCode}_${weatherCode}_${method}_${version}`;

    // Soft warnings (status stays 'ok' / 'warn'):
    if (row.format === '否') {
      warnings.push('视频格式未达到 ProRes422HQ 建议');
    }
    if (row.isCameraOriginal && method !== 'RS') {
      warnings.push('摄影机原始素材不应标"全实拍"以外的方式');
    }
    if (!row.location) {
      warnings.push('拍摄地理名称为空 — 镜头序号可能不准确');
    }
    return { name, status: warnings.length > 0 ? 'warn' : 'ok', warnings };
  },

  _reverseMap(obj) {
    const out = {};
    for (const [code, cn] of Object.entries(obj)) {
      out[cn] = code;
    }
    return out;
  },

  // Compute shot numbers for a batch of rows. Pre-pass: walk rows in order,
  // assign a 1-based integer to each unique 拍摄地理名称. Rows with empty
  // location fall back to parsing the "N-x" prefix from currentName
  // (e.g. "1-1Apple ProRes..." → shot 1), then to "1" as last resort.
  computeShotMap(rows) {
    const shotByLocation = {};
    let nextShot = 1;
    for (const row of rows) {
      const key = row.location || '';
      if (key) {
        if (!(key in shotByLocation)) {
          shotByLocation[key] = String(nextShot++);
        }
        row._shotCode = shotByLocation[key];
      } else {
        // Fallback 1: parse "N-x" from currentName
        const m = (row.currentName || '').match(/^(\d+)-/);
        if (m) {
          row._shotCode = m[1];
        } else {
          row._shotCode = '1';
          row._shotFallback = true;
        }
      }
    }
    return shotByLocation;
  },

  // Match xlsx rows to files in the user's directory. Two-column match:
  //   candidate keys = [normalize(currentName), normalize(originalMaterialName)]
  // "两列都试" — either column counts, first match wins. The iQiyi template's
  // 文件命名 column has the playback file name (no extension); the 原始拍摄
  // 素材文件名称 column has the camera-original file name (no extension).
  // Real files on disk have extensions (.mov, .png, .mp4) — we strip those
  // before lookup so xlsx strings (extensionless) match.
  //
  // fileIndex: Map<normalizedName, fileEntry[]>  — built by App._buildFileIndex
  // fileEntry: { fullName, fileHandle, pathSegments } (pathSegments for
  //            re-resolving the parent at execute time, per existing FSA rules)
  //
  // Sets on each row:
  //   _matchedFile: fileEntry | null
  //   _matchStatus: 'ok' | 'miss' | 'conflict'
  //   _matchSource: 'currentName' | 'originalMaterialName' (which col won)
  // conflict: a file was claimed by ≥2 rows. First row (in xlsx order) wins,
  //   other rows get _matchStatus='conflict' and _matchedFile=null. This
  //   mirrors folder-drop's first-claim-wins behavior.
  matchRowsToFiles(rows, fileIndex) {
    // Track which file is already claimed by which row, to detect conflicts.
    const claimedBy = new Map();  // normalizedName → rowIndex
    let okCount = 0, missCount = 0, conflictCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Build candidate (name, sourceLabel) pairs. currentName first because
      // it's the canonical column; originalMaterialName is the fallback.
      const candidates = [
        { name: row.currentName,           source: 'currentName' },
        { name: row.originalMaterialName,  source: 'originalMaterialName' }
      ].filter(c => c.name && c.name.trim());

      let hit = null;
      for (const c of candidates) {
        const key = this._normalizeForMatch(c.name);
        if (!key) continue;
        const entry = fileIndex.get(key);
        if (entry && entry.length > 0) {
          // If already claimed by an earlier row, mark as conflict (skip).
          if (claimedBy.has(key)) {
            conflictCount++;
            row._matchedFile = null;
            row._matchStatus = 'conflict';
            row._matchSource = null;
            hit = { conflict: true };
            break;
          }
          hit = { entry: entry[0], source: c.source, key };
          break;
        }
      }

      if (!hit) {
        row._matchedFile = null;
        row._matchStatus = 'miss';
        row._matchSource = null;
        missCount++;
      } else if (hit.conflict) {
        // already counted in the loop above; nothing to do
      } else {
        row._matchedFile = hit.entry;
        row._matchStatus = 'ok';
        row._matchSource = hit.source;
        claimedBy.set(hit.key, i);
        okCount++;
      }
    }
    return { okCount, missCount, conflictCount };
  },

  // Normalize a name for matching: trim, strip a single trailing extension.
  // We strip ".mov" / ".png" / ".mp4" etc. so xlsx's extensionless strings
  // match real files. This is a single-segment strip, not a path strip —
  // xlsx columns shouldn't contain paths, but be defensive.
  _normalizeForMatch(name) {
    if (!name) return '';
    return String(name).trim().replace(/\.(mov|png|mp4|jpg|jpeg|mxf|braw|r3d|ari|exr)$/i, '');
  }
};

window.RuleParser = RuleParser;
window.ScanEngine = ScanEngine;
window.CapabilityDetector = CapabilityDetector;
window.XlsxTableParser = XlsxTableParser;
window.XlsxNamer = XlsxNamer;
