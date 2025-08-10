// Formats a number into the full Indonesian Rupiah string (e.g., "Rp 100.000")
export function idrFormatter(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Formats a number into a short version for charts (e.g., "1.2jt" for 1,200,000)
export function shortIdrFormatter(value: number): string {
  if (value >= 1_000_000) {
    // Format as 'jt' (juta) for millions
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}jt`
  }
  if (value >= 1_000) {
    // Format as 'k' for thousands
    return `${(value / 1_000).toFixed(0)}k`
  }
  return value.toString()
}
