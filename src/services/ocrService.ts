/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createWorker } from 'tesseract.js';

export interface OCRExtractedData {
  time?: string; // HH:mm
  date?: string; // YYYY-MM-DD
  confidence: number;
}

export async function extractDataFromImage(imageBlob: Blob): Promise<OCRExtractedData | null> {
  const worker = await createWorker('por'); // Portuguese
  
  try {
    const imageUrl = URL.createObjectURL(imageBlob);
    const { data: { text, confidence } } = await worker.recognize(imageUrl);
    
    console.log('OCR Extracted Text:', text);
    
    // Regex for time: HH:mm or HHh mm
    const timeRegex = /\b([01]\d|2[0-3])[:h]\s?([0-5]\d)\b/i;
    const timeMatch = text.match(timeRegex);
    let time: string | undefined;
    if (timeMatch) {
      time = `${timeMatch[1]}:${timeMatch[2]}`;
    }

    // Regex for date: DD/MM/YYYY or DD/MM/YY
    const dateRegex = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/;
    const dateMatch = text.match(dateRegex);
    let date: string | undefined;
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      let year = dateMatch[3];
      if (year.length === 2) year = `20${year}`;
      date = `${year}-${month}-${day}`;
    }

    await worker.terminate();
    URL.revokeObjectURL(imageUrl);

    if (!time && !date) return null;

    return {
      time,
      date,
      confidence
    };
  } catch (error) {
    console.error('OCR Error:', error);
    await worker.terminate();
    return null;
  }
}
