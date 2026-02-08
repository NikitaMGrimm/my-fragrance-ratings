import { Perfume } from '../types';

const headerToField: Record<string, keyof Perfume> = {
  'brand': 'brand',
  'name': 'name',
  'pid': 'pid',
  'image url': 'imageUrl',
  'page url': 'pageUrl',
  'time rated': 'timeRated',
  'rating': 'rating'
};

const fieldToHeader: Record<string, string> = {
  'brand': 'Brand',
  'name': 'Name',
  'pid': 'PID',
  'imageUrl': 'Image URL',
  'pageUrl': 'Page URL',
  'timeRated': 'Time Rated',
  'rating': 'Rating',
  'price': 'Price'
};

const escapeCsv = (field: any) => {
  const str = String(field === undefined || field === null ? '' : field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const parseCSV = (csvText: string): any[] => {
  const lines = csvText.split('\n').filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  const splitLine = (line: string) => line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(val => val.trim().replace(/^"|"$/g, ''));

  const headerRaw = splitLine(lines[0]);
  const headers = headerRaw.map(h => {
    const lower = h.toLowerCase();
    if (headerToField[lower]) return headerToField[lower];
    if (lower.includes('price')) return 'price';
    return h;
  });

  const results: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    if (cols.length === 0) continue;

    const obj: any = {};
    let hasValues = false;

    headers.forEach((key, index) => {
      let val = cols[index];
      
      if (val !== undefined) {
          hasValues = true;
          val = val.trim();

          if (key === 'rating') {
             const num = parseFloat(val);
             obj[key] = !isNaN(num) ? num : 0;
          } else if (key === 'price') {
             const cleanPrice = val.replace(/[^0-9.]/g, '');
             const num = parseFloat(cleanPrice);
             if (!isNaN(num)) obj[key] = num;
          } else {
             obj[key] = val;
          }
      }
    });

    if (hasValues) {
        results.push(obj);
    }
  }

  return results;
};

export const perfumesToCSV = (perfumes: Perfume[]): string => {
  if (perfumes.length === 0) return '';

  const allKeys = new Set<string>();
  perfumes.forEach(p => Object.keys(p).forEach(k => allKeys.add(k)));

  const standardOrder = ['brand', 'name', 'pid', 'imageUrl', 'pageUrl', 'timeRated', 'rating', 'price'];
  
  const finalKeys: string[] = [];
  
  standardOrder.forEach(k => {
      if (allKeys.has(k)) {
          finalKeys.push(k);
          allKeys.delete(k);
      }
  });

  const dynamicKeys = Array.from(allKeys).sort();
  finalKeys.push(...dynamicKeys);

  const headerRow = finalKeys.map(k => fieldToHeader[k] || k).join(',');

  const rows = perfumes.map(p => {
      return finalKeys.map(k => {
          return escapeCsv(p[k]);
      }).join(',');
  });

  return [headerRow, ...rows].join('\n');
};