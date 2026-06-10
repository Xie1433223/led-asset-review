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
