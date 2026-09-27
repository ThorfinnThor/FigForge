export type CsvTable = {
  headers: string[];
  rows: Record<string, string>[];
};

export const parseCsv = (input: string, fileName: string): CsvTable => {
  const text = input.replace(/^\uFEFF/u, "");
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (character === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n") {
      record.push(field.endsWith("\r") ? field.slice(0, -1) : field);
      if (record.some((value) => value.length > 0)) {
        records.push(record);
      }
      record = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new Error(`CSV ${fileName} ends inside a quoted field`);
  }
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    if (record.some((value) => value.length > 0)) {
      records.push(record);
    }
  }
  if (records.length === 0) {
    throw new Error(`CSV ${fileName} is empty`);
  }

  const headers = records[0]!.map((header) => header.trim());
  if (headers.some((header) => header.length === 0) || new Set(headers).size !== headers.length) {
    throw new Error(`CSV ${fileName} has empty or duplicate headers`);
  }

  const rows = records.slice(1).map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw new Error(
        `CSV ${fileName} row ${rowIndex + 2} has ${values.length} fields; expected ${headers.length}`,
      );
    }
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });

  return { headers, rows };
};

export const requireColumns = (table: CsvTable, fileName: string, columns: readonly string[]): void => {
  for (const column of columns) {
    if (!table.headers.includes(column)) {
      throw new Error(`CSV ${fileName} is missing required column ${column}`);
    }
  }
};
