import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfLib = require('pdf-parse');
const pdf = pdfLib.default || pdfLib;
const mammoth = require('mammoth');
const officeParser = require('officeparser');

export async function parseFile(filePath, mimeType, extension) {
  const ext = extension.toLowerCase();

  if (ext === '.pdf') {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (err) {
      console.warn('⚠️ pdf-parse failed, trying fallback...');
      return 'PDF parsing failed. Possibly scanned or unsupported format.';
    }
  } else if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } else if (ext === '.doc') {
    return new Promise((resolve, reject) => {
      officeParser.parseOffice(filePath, (data, err) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  } else if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf8');
  } else {
    throw new Error('Unsupported file type for parsing');
  }
}
