/** RFC 4180-style parser: quoted delimiters, doubled quotes and embedded newlines. */
export function parseCsv(text: string, delimiter = text.split(/\r?\n/, 1)[0].includes(';') ? ';' : ','): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], value = '', quoted = false, closedQuote = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (char === '"') { quoted = false; closedQuote = true; }
      else value += char;
    } else if (char === '"' && value === '' && !closedQuote) quoted = true;
    else if (char === delimiter || char === '\n' || char === '\r') {
      row.push(value); value = ''; closedQuote = false;
      if (char !== delimiter) {
        if (row.some(cell => cell.length)) rows.push(row);
        row = [];
        if (char === '\r' && text[i + 1] === '\n') i++;
      }
    } else {
      if (closedQuote && char.trim()) throw new Error('Caractère inattendu après un champ entre guillemets.');
      if (!closedQuote) value += char;
    }
  }
  if (quoted) throw new Error('Champ CSV entre guillemets non terminé.');
  row.push(value);
  if (row.some(cell => cell.length)) rows.push(row);
  return rows;
}
