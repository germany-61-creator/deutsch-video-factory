const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

const archiver = require("archiver");

// PDF + DOCX
const PDFDocument = require("pdfkit");
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require("docx");

const { createLogger } = require("./app/main/logger.cjs");
const { createSettingsStore } = require("./app/main/settingsStore.cjs");
const { renderAll } = require("./app/main/renderAll.cjs");

let mainWindow;
let settingsStore;
let logger;

let isRendering = false;
let lastZipPath = null;         // exports içindeki zip
let lastDesktopZipPath = null;  // masaüstüne (veya fallback) kopyalanan zip

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile("index.html");
}

function stampNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const Y = d.getFullYear();
  const M = pad(d.getMonth() + 1);
  const D = pad(d.getDate());
  const h = pad(d.getHours());
  const m = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  return `${Y}${M}${D}_${h}${m}${s}`;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeExists(p) {
  try { return fs.existsSync(p); } catch (_) { return false; }
}

function rmRecursive(p) {
  try {
    if (!safeExists(p)) return;
    fs.rmSync(p, { recursive: true, force: true });
  } catch (e) {
    if (logger) logger.info("RM_FAILED", { path: p, err: String(e) });
  }
}

function copyRecursive(src, dst) {
  fs.cpSync(src, dst, { recursive: true, force: true });
}

function copyFileSafe(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function zipFolderNode(srcFolder, zipPath) {
  return new Promise((resolve, reject) => {
    ensureDir(path.dirname(zipPath));
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve(zipPath));
    output.on("error", (err) => reject(err));

    archive.on("warning", (err) => {
      if (logger) logger.info("ZIP_WARNING", { err: String(err) });
    });
    archive.on("error", (err) => reject(err));

    archive.pipe(output);
    archive.directory(srcFolder, false);
    archive.finalize();
  });
}

function cleanupExportsKeepOnlyZips(exportsDir) {
  const entries = fs.readdirSync(exportsDir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(exportsDir, e.name);
    if (e.isFile() && e.name.toLowerCase().endsWith(".zip")) continue;
    rmRecursive(full);
  }
}

function loadDialogueJson(projectRoot) {
  const p = path.join(projectRoot, "sample.json");
  const raw = fs.readFileSync(p, "utf8");
  const j = JSON.parse(raw);
  const dialogue = Array.isArray(j.dialogue) ? j.dialogue : [];
  return { dialogue, sourcePath: p };
}

function generatePdf(stagingDir, projectRoot) {
  const { dialogue } = loadDialogueJson(projectRoot);
  const outPath = path.join(stagingDir, "document.pdf");

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = fs.createWriteStream(outPath);

    stream.on("finish", () => resolve(outPath));
    stream.on("error", (e) => reject(e));

    doc.pipe(stream);

    doc.fontSize(20).text("Deutsch Video Factory — Diyalog Dokümanı", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#555").text(`Oluşturma: ${new Date().toISOString()}`);
    doc.moveDown(1);
    doc.fillColor("#000");

    let i = 0;
    for (const s of dialogue) {
      i++;
      const speaker = (s.speaker || "?").toString();
      const de = (s.de || "").toString();
      const trPron = (s.trPron || "").toString();
      const tr = (s.tr || "").toString();

      doc.fontSize(14).fillColor("#000").text(`${i}) Konuşan: ${speaker}`);
      doc.moveDown(0.2);
      doc.fontSize(12).fillColor("#0b74b5").text(`DE: ${de}`);
      if (trPron) doc.fontSize(12).fillColor("#b7791f").text(`TR Telaffuz: ${trPron}`);
      doc.fontSize(12).fillColor("#000").text(`TR: ${tr}`);

      const kws = Array.isArray(s.keywords) ? s.keywords : [];
      if (kws.length) {
        doc.moveDown(0.2);
        doc.fontSize(12).fillColor("#000").text("Kelimeler:");
        for (const kw of kws) {
          const kde = kw && kw.de ? String(kw.de) : "";
          const ktr = kw && kw.tr ? String(kw.tr) : "";
          if (kde || ktr) doc.text(`• ${kde} = ${ktr}`);
        }
      }

      doc.moveDown(0.8);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#ddd").stroke();
      doc.moveDown(0.8);
    }

    doc.end();
  });
}

async function generateDocx(stagingDir, projectRoot) {
  const { dialogue } = loadDialogueJson(projectRoot);
  const outPath = path.join(stagingDir, "document.docx");

  const children = [];
  children.push(new Paragraph({ text: "Deutsch Video Factory — Diyalog Dokümanı", heading: HeadingLevel.HEADING_1 }));
  children.push(new Paragraph({ children: [new TextRun({ text: `Oluşturma: ${new Date().toISOString()}`, color: "666666" })] }));
  children.push(new Paragraph({ text: " " }));

  let i = 0;
  for (const s of dialogue) {
    i++;
    const speaker = (s.speaker || "?").toString();
    const de = (s.de || "").toString();
    const trPron = (s.trPron || "").toString();
    const tr = (s.tr || "").toString();

    children.push(new Paragraph({ text: `${i}) Konuşan: ${speaker}`, heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ children: [new TextRun({ text: `DE: ${de}`, color: "0B74B5" })] }));
    if (trPron) children.push(new Paragraph({ children: [new TextRun({ text: `TR Telaffuz: ${trPron}`, color: "B7791F" })] }));
    children.push(new Paragraph({ text: `TR: ${tr}` }));

    const kws = Array.isArray(s.keywords) ? s.keywords : [];
    if (kws.length) {
      children.push(new Paragraph({ text: "Kelimeler:", spacing: { before: 200 } }));
      for (const kw of kws) {
        const kde = kw && kw.de ? String(kw.de) : "";
        const ktr = kw && kw.tr ? String(kw.tr) : "";
        if (kde || ktr) children.push(new Paragraph({ text: `• ${kde} = ${ktr}` }));
      }
    }

    children.push(new Paragraph({ text: " " }));
  }

  const doc = new Document({ sections: [{ children }] });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buf);
  return outPath;
}

function normalizeOutputs(o) {
  const d = {
    videoFinal: true,
    videoShorts: true,
    audioWav: true,
    scenesPng: true,
    ttsFiles: true,
    pdf: true,
    docx: true
  };
  if (!o || typeof o !== "object") return d;

  const out = { ...d };
  for (const k of Object.keys(d)) {
    if (typeof o[k] === "boolean") out[k] = o[k];
  }

  const any = Object.values(out).some(Boolean);
  if (!any) out.videoFinal = true;

  return out;
}

function getExportDropDir() {
  // Desktop bazen policy/redirect yüzünden sorunlu olabiliyor.
  // Bu yüzden önce Desktop, olmazsa Documents fallback.
  const desktop = app.getPath("desktop");
  if (desktop && typeof desktop === "string" && desktop.trim().length > 0) {
    return path.join(desktop, "DeutschVideoFactory_Exports");
  }
  const docs = app.getPath("documents");
  return path.join(docs, "DeutschVideoFactory_Exports");
}

app.whenReady().then(() => {
  const userData = app.getPath("userData");

  logger = createLogger(userData);
  settingsStore = createSettingsStore(userData, logger);

  settingsStore.load();
  createWindow();

  ipcMain.handle("settings:get", async () => settingsStore.load());
  ipcMain.handle("settings:set", async (_evt, data) => settingsStore.save(data));
  ipcMain.handle("settings:applyPreset", async (_evt, name) => settingsStore.applyPreset(name));

  ipcMain.handle("render:all", async (_evt, payload) => {
    if (isRendering) throw new Error("Zaten render çalışıyor. Bitmesini bekleyin.");

    isRendering = true;
    try {
      const latestSettings = settingsStore.load();
      const outputs = normalizeOutputs(payload && payload.outputs);

      const result = await renderAll({
        projectRoot: __dirname,
        settings: latestSettings,
        logger
      });

      const exportsDir = path.join(__dirname, "exports");
      ensureDir(exportsDir);

      const stamp = stampNow();
      const stagingDir = path.join(__dirname, ".staging_export", stamp);
      ensureDir(stagingDir);

      const maybeCopy = (rel) => {
        const src = path.join(exportsDir, rel);
        const dst = path.join(stagingDir, rel);
        if (safeExists(src)) copyRecursive(src, dst);
      };

      if (outputs.videoFinal)  maybeCopy("video_final.mp4");
      if (outputs.videoShorts) maybeCopy("video_shorts.mp4");
      if (outputs.audioWav)    maybeCopy("audio.wav");
      if (outputs.scenesPng)   maybeCopy("scenes");
      if (outputs.ttsFiles)    maybeCopy("_tts");

      if (outputs.pdf)  await generatePdf(stagingDir, __dirname);
      if (outputs.docx) await generateDocx(stagingDir, __dirname);

      const zipPath = path.join(exportsDir, `export_${stamp}.zip`);
      await zipFolderNode(stagingDir, zipPath);

      rmRecursive(path.join(__dirname, ".staging_export"));
      cleanupExportsKeepOnlyZips(exportsDir);

      lastZipPath = zipPath;

      // ✅ Desktop/Documents kopyası (hata olursa render bozulmasın)
      let desktopZipDir = null;
      let desktopZipPath = null;
      let desktopCopyError = null;

      try {
        desktopZipDir = getExportDropDir();
        ensureDir(desktopZipDir);

        desktopZipPath = path.join(desktopZipDir, path.basename(zipPath));
        copyFileSafe(zipPath, desktopZipPath);

        lastDesktopZipPath = desktopZipPath;

        logger?.info("ZIP_DESKTOP_COPY_OK", { desktopZipDir, desktopZipPath });
      } catch (e) {
        desktopCopyError = String(e);
        logger?.info("ZIP_DESKTOP_COPY_FAILED", { err: desktopCopyError });
        // fallback: lastDesktopZipPath set etmiyoruz
      }

      const out = {
        ...(result || {}),
        exportsDir,
        zipPath,
        desktopZipDir,
        desktopZipPath,
        desktopCopyError,
        outputs
      };

      logger?.info("RENDER_DONE_ONLYZIP", out);
      return out;
    } finally {
      isRendering = false;
    }
  });

  // "Videoları Aç" => desktopZipDir varsa onu aç, yoksa exports aç
  ipcMain.handle("exports:open", async () => {
    const exportsDir = path.join(__dirname, "exports");
    ensureDir(exportsDir);

    const desktopDir = getExportDropDir();
    ensureDir(desktopDir);

    // Öncelik: desktop drop dir
    const target = desktopDir;

    const err = await shell.openPath(target);
    if (err) throw new Error(err);

    return { exportsDir, desktopZipDir: desktopDir, lastDesktopZipPath };
  });

  ipcMain.handle("zip:revealLast", async () => {
    const p = (lastDesktopZipPath && safeExists(lastDesktopZipPath))
      ? lastDesktopZipPath
      : (lastZipPath && safeExists(lastZipPath) ? lastZipPath : null);

    if (!p) throw new Error("Henüz ZIP yok.");
    shell.showItemInFolder(p);
    return p;
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
