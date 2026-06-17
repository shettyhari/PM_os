export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatPercentage(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(value / 100);
}

export function getPlatformColor(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'google': return '#4285F4';
    case 'meta': return '#0082FB';
    case 'linkedin': return '#0A66C2';
    case 'microsoft': return '#00A4EF';
    default: return '#888888';
  }
}
