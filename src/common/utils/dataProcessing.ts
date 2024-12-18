export class DataProcessing {
  static normalizePrice(price: number, currency: string): string {
    return `${currency} ${price.toFixed(2)}`;
  }

  static normalizeTitle(title: string): string {
    return title.trim().replace(/\s+/g, ' ');
  }

  static normalizeDescription(description: string): string {
    return description.trim();
  }

  static normalizeImages(images: string[]): string[] {
    return images.map(img => img.trim()).filter(Boolean);
  }

  static normalizeSpecifications(specifications: Record<string, string>): Record<string, string> {
    const normalized: Record<string, string> = {};
    for (const key in specifications) {
      if (specifications.hasOwnProperty(key)) {
        normalized[key.trim()] = specifications[key].trim();
      }
    }
    return normalized;
  }

  static extractNumericPrice(priceText: string): number {
    // Handle European number format (comma as decimal separator)
    if (priceText.includes(',') && !priceText.includes('.')) {
      priceText = priceText.replace(',', '.');
    }
    
    // Remove thousand separators
    priceText = priceText.replace(/[^\d.,]/g, '');
    
    // Handle cases where both comma and dot are present (e.g., 1.234,56)
    if (priceText.includes(',') && priceText.includes('.')) {
      // If comma comes after dot, it's the decimal separator
      if (priceText.lastIndexOf(',') > priceText.lastIndexOf('.')) {
        priceText = priceText.replace(/\./g, '').replace(',', '.');
      } else {
        // Otherwise, remove commas (they're thousand separators)
        priceText = priceText.replace(/,/g, '');
      }
    }

    const matches = priceText.match(/[\d.]+/);
    if (!matches) return 0;
    return parseFloat(matches[0]);
  }

  static calculateDiscount(original: number, current: number): number {
    if (original <= 0) return 0;
    if (current <= 0) return 100;
    const discount = ((original - current) / original) * 100;
    return Math.round(discount);
  }
}
