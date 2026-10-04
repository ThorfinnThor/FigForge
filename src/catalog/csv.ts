export type CsvTable = {
  headers: string[];
  rows: Record<string, string>[];
};

export type CsvVisitResult = {
  headers: string[];
  rowCount: number;
};

function* csvRecords(input: string, fileName: string): Generator<string[]> {
  const text = input.replace(/^\uFEFF/u, "");
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
        yield record;
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
      yield record;
    }
  }
}

export const visitCsvRows = (
  input: string,
  fileName: string,
  visit: (row: Record<string, string>, rowNumber: number) => void,
): CsvVisitResult => {
  const records = csvRecords(input, fileName);
  const first = records.next();
  if (first.done) {
    throw new Error(`CSV ${fileName} is empty`);
  }

  const headers = first.value.map((header) => header.trim());
  if (headers.some((header) => header.length === 0) || new Set(headers).size !== headers.length) {
    throw new Error(`CSV ${fileName} has empty or duplicate headers`);
  }

  let rowCount = 0;
  for (const values of records) {
    if (values.length !== headers.length) {
      throw new Error(
        `CSV ${fileName} row ${rowCount + 2} has ${values.length} fields; expected ${headers.length}`,
      );
    }
    visit(Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])), rowCount + 2);
    rowCount += 1;
  }

  return { headers, rowCount };
};

export const parseCsv = (input: string, fileName: string): CsvTable => {
  const rows: Record<string, string>[] = [];
  const { headers } = visitCsvRows(input, fileName, (row) => rows.push(row));

  return { headers, rows };
};

export const requireColumns = (table: CsvTable, fileName: string, columns: readonly string[]): void => {
  for (const column of columns) {
    if (!table.headers.includes(column)) {
      throw new Error(`CSV ${fileName} is missing required column ${column}`);
    }
  }
};
