import fs from 'fs';
import path from 'path';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { PNG } from 'pngjs';

const pdfPath = 'C:/Users/HP/Downloads/MUZ_SDD.docx (1).pdf';
const outDir = 'C:/Users/HP/Documents/MUZ/.tmp_sdd_images';
fs.mkdirSync(outDir, { recursive: true });

const data = new Uint8Array(fs.readFileSync(pdfPath));
const doc = await getDocument({ data, disableWorker: true }).promise;
console.log('pages', doc.numPages);

function toPng(img, dest) {
  const width = img.width;
  const height = img.height;
  const raw = Buffer.from(img.data);
  const png = new PNG({ width, height });
  const expectedRgb = width * height * 3;
  const expectedRgba = width * height * 4;
  if (raw.length === expectedRgba) {
    raw.copy(png.data);
  } else if (raw.length === expectedRgb) {
    for (let i = 0, j = 0; i < expectedRgb; i += 3, j += 4) {
      png.data[j] = raw[i];
      png.data[j + 1] = raw[i + 1];
      png.data[j + 2] = raw[i + 2];
      png.data[j + 3] = 255;
    }
  } else {
    console.log('odd bytes', dest, raw.length, expectedRgb, expectedRgba);
    return;
  }
  fs.writeFileSync(dest, PNG.sync.write(png));
}

for (let p = 17; p <= 19; p++) {
  const page = await doc.getPage(p);
  const text = await page.getTextContent();
  console.log('page', p, text.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').slice(0, 160));
  const ops = await page.getOperatorList();
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    if (fn !== OPS.paintImageXObject && fn !== OPS.paintJpegXObject) continue;
    const name = ops.argsArray[i][0];
    const img = await new Promise((resolve, reject) => {
      page.objs.get(name, resolve);
      setTimeout(() => reject(new Error('timeout ' + name)), 8000);
    });
    if (!img?.data) continue;
    const dest = path.join(outDir, `page${p}_${name}_${img.width}x${img.height}.png`);
    toPng(img, dest);
    console.log('saved', dest);
  }
}
