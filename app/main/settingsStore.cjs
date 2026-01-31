const fs = require("fs");
const path = require("path");

const DEFAULT_SETTINGS = {
  showGerman: true,
  showTurkish: true,
  showPronunciation: true,
  showWords: true,
  showSpeaker: true,
  preset: "shorts"
};

const PRESETS = {
  shorts: {
    preset: "shorts",
    sceneSeconds: 2.5,
    fontScale: 1.2
  },
  lesson: {
    preset: "lesson",
    sceneSeconds: 4,
    fontScale: 1.0
  },
  listening: {
    preset: "listening",
    sceneSeconds: 6,
    fontScale: 0.9,
    showGerman: false,
    showTurkish: false,
    showPronunciation: false,
    showWords: false,
    showSpeaker: false
  }
};

function ensureDir(p) {
  try {
    fs.mkdirSync(p, { recursive: true });
  } catch {}
}

function createSettingsStore(userDataPath, logger) {
  const file = path.join(userDataPath, "settings.json");

  function load() {
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      return { ...DEFAULT_SETTINGS, ...data };
    } catch {
      save(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
  }

  function save(settings) {
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, JSON.stringify(settings, null, 2));
    logger?.info("SETTINGS_SAVED", settings);
    return settings;
  }

  function applyPreset(name) {
    const preset = PRESETS[name] || PRESETS.shorts;
    const merged = { ...load(), ...preset };
    save(merged);
    logger?.info("PRESET_APPLIED", { preset: name });
    return merged;
  }

  return {
    load,
    save,
    applyPreset,
    PRESETS
  };
}

module.exports = { createSettingsStore };
