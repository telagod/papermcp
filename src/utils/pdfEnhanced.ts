import * as pdfjsLib from 'pdfjs-dist';
import { createCanvas } from 'canvas';
import fs from 'fs/promises';

pdfjsLib.GlobalWorkerOptions.workerSrc = `pdfjs-dist/build/pdf.worker.mjs`;

export interface PaperSection {
  type: 'title' | 'abstract' | 'section' | 'paragraph' | 'list' | 'table' | 'figure';
  content: string;
  page: number;
  level?: number;
}

export interface PaperImage {
  page: number;
  index: number;
  width: number;
  height: number;
  data: string; // base64 (without data URI prefix)
  mimeType: string; // image/png, image/jpeg
}

export interface EnhancedPaperContent {
  text: string;
  sections: PaperSection[];
  images: PaperImage[];
  metadata: {
    pages: number;
    title?: string;
    authors?: string[];
  };
}

export const extractEnhancedContent = async (pdfPath: string): Promise<EnhancedPaperContent> => {
  const data = await fs.readFile(pdfPath);
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  const sections: PaperSection[] = [];
  const images: PaperImage[] = [];
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // 提取文本
    let pageText = '';
    let lastY = 0;
    let currentSection = '';

    for (const item of textContent.items) {
      if ('str' in item) {
        const y = item.transform[5];

        // 检测换行
        if (lastY && Math.abs(y - lastY) > 5) {
          if (currentSection.trim()) {
            sections.push({
              type: detectSectionType(currentSection),
              content: currentSection.trim(),
              page: i,
            });
          }
          currentSection = '';
        }

        currentSection += item.str + ' ';
        pageText += item.str + ' ';
        lastY = y;
      }
    }

    if (currentSection.trim()) {
      sections.push({
        type: detectSectionType(currentSection),
        content: currentSection.trim(),
        page: i,
      });
    }

    fullText += pageText + '\n\n';

    // 提取图片
    const ops = await page.getOperatorList();
    let imgIndex = 0;

    for (let j = 0; j < ops.fnArray.length; j++) {
      if (ops.fnArray[j] === pdfjsLib.OPS.paintImageXObject) {
        try {
          const imgName = ops.argsArray[j][0];
          const img = await page.objs.get(imgName);

          if (img && img.width && img.height) {
            const canvas = createCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d');
            const imageData = ctx.createImageData(img.width, img.height);
            imageData.data.set(img.data);
            ctx.putImageData(imageData, 0, 0);

            const base64 = canvas.toDataURL('image/png').split(',')[1]; // 移除 data:image/png;base64, 前缀

            images.push({
              page: i,
              index: imgIndex++,
              width: img.width,
              height: img.height,
              data: base64,
              mimeType: 'image/png',
            });
          }
        } catch (err) {
          // 跳过无法提取的图片
        }
      }
    }
  }

  const metadata = await pdf.getMetadata();
  const info = metadata.info as any;

  return {
    text: fullText.trim(),
    sections,
    images,
    metadata: {
      pages: pdf.numPages,
      title: info?.Title,
      authors: info?.Author ? [info.Author] : [],
    },
  };
};

const detectSectionType = (text: string): PaperSection['type'] => {
  const lower = text.toLowerCase();

  if (lower.startsWith('abstract')) return 'abstract';
  if (/^(introduction|background|methods|results|discussion|conclusion)/i.test(text)) return 'section';
  if (/^(figure|fig\.|table|tab\.)\s*\d+/i.test(text)) return 'figure';
  if (/^\d+\./.test(text) || /^[a-z]\)/.test(text)) return 'list';
  if (text.length < 100 && /^[A-Z]/.test(text)) return 'title';

  return 'paragraph';
};
