// Keep quoted multiline comments intact when joining paginated CSV downloads.
export function reviewCsvRecords(value) {
  const source = value.replace(/^\uFEFF/, '');
  const records = [];
  let quoted = false, start = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (!quoted && (char === '\n' || char === '\r')) {
      const record = source.slice(start, index);
      if (record.trim()) records.push(record);
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      start = index + 1;
    }
  }
  if (quoted) return null;
  const last = source.slice(start);
  if (last.trim()) records.push(last);
  return records.length ? records : null;
}
