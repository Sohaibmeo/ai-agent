export const gbp = (n: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);

export const round2 = (n: number) => Math.round(n * 100) / 100;
