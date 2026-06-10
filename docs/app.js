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

    return { issues, suggestedName: null };
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
