#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
try {
  const src = path.join(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.js');
  const destDir = path.join(__dirname, '../public');
  const dest = path.join(destDir, 'pdf.worker.min.js');
  if (fs.existsSync(src)) {
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
    console.log('PDF worker copiado para public/');
  }
} catch (e) {
  console.warn('copy-pdf-worker:', e.message);
}
