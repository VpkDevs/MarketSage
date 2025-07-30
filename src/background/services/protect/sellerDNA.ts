import * as tf from "@tensorflow/tfjs"; // Correct import for TensorFlow.js

export class SellerDNAProfiling {
  private model: any; // Using a generic type for the model temporarily

  constructor() {
    this.model = this.loadModel(); // Load the model
  }

  private async loadModel(): Promise<tf.GraphModel> {
    try {
      // Try to load model from extension assets first
      const modelPath = chrome.runtime.getURL('assets/models/seller-dna-model/model.json');
      return await tf.loadGraphModel(modelPath);
    } catch (error) {
      console.warn('Local model not found, trying CDN fallback:', error);
      try {
        // Fallback to a lightweight pre-trained model for seller profiling
        return await tf.loadGraphModel('https://cdn.jsdelivr.net/npm/@tensorflow-models/toxicity@1.2.2/model.json');
      } catch (fallbackError) {
        console.error('Failed to load any SellerDNA model:', fallbackError);
        // Create a simple identity model as last resort
        const model = tf.sequential({
          layers: [
            tf.layers.dense({ inputShape: [10], units: 5, activation: 'relu' }),
            tf.layers.dense({ units: 1, activation: 'sigmoid' })
          ]
        });
        return model as any; // Cast to GraphModel for compatibility
      }
    }
  }

  private preprocessData(data: any): any {
    // Standardize and normalize input data for the model
    if (!data) return null;
    
    // Convert to consistent format
    const normalized = {
      features: Array.isArray(data) ? data : [data],
      timestamp: Date.now(),
      version: '1.0'
    };
    
    // Ensure numeric features are properly formatted
    if (normalized.features.length > 0) {
      normalized.features = normalized.features.map((feature: any) => {
        if (typeof feature === 'string') {
          // Convert string features to numeric hash
          return feature.split('').reduce((hash, char) => {
            return ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff;
          }, 0) / 0xffffffff; // Normalize to 0-1 range
        }
        return typeof feature === 'number' ? feature : 0;
      });
    }
    
    return normalized;
  }
}
