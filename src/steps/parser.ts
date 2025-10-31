import { parse } from "csv-parse/sync";
import dayjs from "../lib/dayjs";

export default async function parser(s: any) {
  const records = parse(s.csv, { columns: true, skip_empty_lines: true, trim: true });
  const rows = records.map((r: any) => {
    const amount = Number(r.amount);
    const date = dayjs(r.date).isValid() ? dayjs(r.date).format("YYYY-MM-DD") : String(r.date ?? "");
    const merchant = String(r.description ?? "").trim();
    const parse_confidence = (merchant && !Number.isNaN(amount)) ? 0.95 : 0.6;
    return { date, merchant, amount, parse_confidence };
  });
  return { rows };
}
