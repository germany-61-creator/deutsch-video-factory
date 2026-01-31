const { createCanvas } = require('canvas');
const fs = require('fs');

function generateScenePng(scene, outputPath) {
  const width = 1080;
  const height = 1920;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  // Header
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 64px Arial';
  ctx.fillText('Deutsch Video Factory', 60, 120);

  // Speaker badge
  const sp = (scene.speaker || '?').toString();
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 48px Arial';
  ctx.fillText(`Konuşan: ${sp}`, 60, 200);

  // German sentence
  ctx.font = 'bold 72px Arial';
  ctx.fillStyle = '#38bdf8';
  wrapText(ctx, scene.de || '', 60, 320, width - 120, 90);

  // Turkish pron
  ctx.font = '48px Arial';
  ctx.fillStyle = '#facc15';
  wrapText(ctx, scene.trPron || '', 60, 820, width - 120, 64);

  // Turkish meaning
  ctx.font = '48px Arial';
  ctx.fillStyle = '#ffffff';
  wrapText(ctx, scene.tr || '', 60, 960, width - 120, 64);

  // Keywords strip
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(60, 1500, width - 120, 320);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px Arial';
  ctx.fillText('Kelimeler', 90, 1570);

  ctx.font = '40px Arial';
  const kws = Array.isArray(scene.keywords) ? scene.keywords : [];
  let y = 1640;
  for (const kw of kws.slice(0, 6)) {
    const de = kw && kw.de ? String(kw.de) : '';
    const tr = kw && kw.tr ? String(kw.tr) : '';
    const line = `• ${de} = ${tr}`;
    ctx.fillText(line, 90, y);
    y += 60;
  }

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

module.exports = { generateScenePng };
