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
