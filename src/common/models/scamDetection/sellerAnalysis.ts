import { Storage } from "../../utils/storage";

export class SellerAnalysisEngine {
  async analyzeSeller(sellerId: string): Promise<{
    score: number;
    reasons: string[];
  }> {
    // This is a mock implementation for testing
    let score = 0;
    const reasons: string[] = [];
    
    // Get seller rating
    const rating = await Storage.getSellerRating(sellerId);
    
    // Check if seller is new (no rating)
    if (rating === null) {
      score = 0.7;
      reasons.push('New seller with no rating history');
    } else if (rating < 3.5) {
      // Low rating
      score = 0.6;
      reasons.push(`Seller has a low rating (${rating.toFixed(1)} out of 5)`);
    } else if (rating === 5.0) {
      // Perfect rating might be suspicious
      score = 0.4;
      reasons.push('Seller has a perfect 5.0 rating, which can sometimes indicate fake reviews');
    }
    
    // Mock check for seller account age
    const isNewAccount = this.mockIsNewAccount(sellerId);
    if (isNewAccount) {
      score = Math.max(score, 0.5);
      reasons.push('Seller account is less than 30 days old');
    }
    
    // Mock check for large inventory on new account
    if (isNewAccount && this.mockHasLargeInventory(sellerId)) {
      score = Math.max(score, 0.8);
      reasons.push('New account (< 30 days) with unusually large product catalog');
    }
    
    return { score, reasons };
  }
  
  private mockIsNewAccount(sellerId: string): boolean {
    // This is a mock implementation
    // In a real implementation, this would check the seller's join date
    return sellerId.includes('new') || Math.random() < 0.3;
  }
  
  private mockHasLargeInventory(sellerId: string): boolean {
    // This is a mock implementation
    // In a real implementation, this would check the seller's inventory size
    return Math.random() < 0.5;
  }
}
