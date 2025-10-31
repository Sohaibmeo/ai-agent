const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

export const formatCurrency = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return "–";
  return GBP.format(amount);
};

export const formatNumber = (value: number | undefined | null, options?: Intl.NumberFormatOptions) => {
  if (value === undefined || value === null || Number.isNaN(value)) return "–";
  return new Intl.NumberFormat("en-GB", options).format(value);
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const prettyJsonSnippet = (data: unknown, maxLines = 10) => {
  if (data === undefined) return "No data";
  try {
    const text = JSON.stringify(data, null, 2);
    const lines = text.split("\n");
    if (lines.length <= maxLines) return text;
    const truncated = lines.slice(0, maxLines - 1);
    truncated.push("  …");
    return truncated.join("\n");
  } catch {
    return String(data);
  }
};
