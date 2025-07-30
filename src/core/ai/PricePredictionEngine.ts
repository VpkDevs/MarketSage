/**
 * AI-Powered Price Prediction Engine
 * Uses machine learning to predict future price trends and optimal buying times
 */

import * as tf from '@tensorflow/tfjs';
import { ErrorHandler, ErrorSeverity, ErrorCategory } from '../../common/errors/ErrorHandler';
import { Storage } from '../../common/utils/storage';
import { Product } from '../../common/types';
import { Service } from '../di/ServiceContainer';
import { AsyncErrorHandler } from '../../common/utils/decorators';

export interface PricePrediction {
  productId: string;
  currentPrice: number;
  predictedPrice: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  optimalBuyTime: {
    recommendation: 'buy_now' | 'wait' | 'buy_soon';
    estimatedSavings?: number;
    timeframe?: string;
  };
  historicalAccuracy: number;
}

export interface MarketTrend {
  category: string;
  avgPriceChange: number;
  volatility: number;
  seasonalPatterns: SeasonalPattern[];
  demandIndicators: DemandIndicator[];
}

export interface SeasonalPattern {
  period: 'weekly' | 'monthly' | 'yearly';
  pattern: number[];
  strength: number;
}

export interface DemandIndicator {
  source: 'search_volume' | 'social_mentions' | 'competitor_pricing';
  value: number;
  impact: 'high' | 'medium' | 'low';
}

@Service('PricePredictionEngine')
export class PricePredictionEngine {
  private model: tf.LayersModel | null = null;
  private isTraining = false;
  private readonly PREDICTION_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
  private readonly MODEL_VERSION = '1.0';
  
  constructor() {
    this.initializeModel();
  }

  /**
   * Initialize or load the TensorFlow model
   */
  @AsyncErrorHandler()
  private async initializeModel(): Promise<void> {
    try {
      // Try to load existing model
      const modelData = await Storage.getModelData('price_prediction');
      if (modelData && modelData.version === this.MODEL_VERSION) {
        this.model = await tf.loadLayersModel(tf.io.fromMemory(modelData.modelTopology, modelData.weightSpecs, modelData.weightData));
        console.log('Loaded existing price prediction model');
      } else {
        // Create new model
        this.model = this.createModel();
        console.log('Created new price prediction model');
      }
    } catch (error) {
      ErrorHandler.getInstance().error(
        'Failed to initialize price prediction model',
        'MODEL_INIT_ERROR',
        ErrorSeverity.HIGH,
        ErrorCategory.ANALYSIS,
        { error }
      );
      // Fallback to simple model
      this.model = this.createSimpleModel();
    }
  }

  /**
   * Create a new neural network model for price prediction
   */
  private createModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [15], // Features: price history, market trends, seasonal factors, etc.
          units: 64,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'linear' // For regression (price prediction)
        })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return model;
  }

  /**
   * Create a simple fallback model
   */
  private createSimpleModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [5], units: 10, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'linear' })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return model;
  }

  /**
   * Predict future price for a product
   */
  @AsyncErrorHandler()
  async predictPrice(productId: string): Promise<PricePrediction> {
    // Check cache first
    const cached = await Storage.getCachedPrediction(productId);
    if (cached && Date.now() - cached.timestamp < this.PREDICTION_CACHE_TTL) {
      return cached.prediction;
    }

    if (!this.model) {
      throw new Error('Model not initialized');
    }

    // Gather features for prediction
    const features = await this.extractFeatures(productId);
    const featureTensor = tf.tensor2d([features]);

    try {
      // Make prediction
      const prediction = this.model.predict(featureTensor) as tf.Tensor;
      const predictedPrice = await prediction.data();
      
      // Get current price and calculate confidence
      const product = await Storage.getCachedProduct(productId);
      const currentPrice = product?.price.current || 0;
      
      const confidence = await this.calculateConfidence(features, predictedPrice[0]);
      const trend = this.determineTrend(currentPrice, predictedPrice[0]);
      const optimalBuyTime = await this.calculateOptimalBuyTime(productId, currentPrice, predictedPrice[0], trend);
      
      const result: PricePrediction = {
        productId,
        currentPrice,
        predictedPrice: predictedPrice[0],
        confidence,
        trend,
        optimalBuyTime,
        historicalAccuracy: await this.getHistoricalAccuracy(productId)
      };

      // Cache the prediction
      await Storage.cachePrediction(productId, result);
      
      return result;
    } finally {
      featureTensor.dispose();
    }
  }

  /**
   * Extract features for the ML model
   */
  private async extractFeatures(productId: string): Promise<number[]> {
    const priceHistory = await Storage.getPriceHistory(productId);
    const marketTrends = await Storage.getMarketTrends();
    const seasonalData = await this.getSeasonalData();
    
    const features = [
      // Recent price changes (last 7 days)
      ...this.calculatePriceChanges(priceHistory, 7),
      // Market volatility
      this.calculateVolatility(priceHistory),
      // Seasonal factor
      this.getSeasonalFactor(seasonalData),
      // Competition factor
      await this.getCompetitionFactor(productId),
      // Demand indicator
      await this.getDemandIndicator(productId),
      // Category trend
      await this.getCategoryTrend(productId)
    ];

    // Ensure we have exactly 15 features (pad or truncate if necessary)
    while (features.length < 15) {
      features.push(0);
    }
    
    return features.slice(0, 15);
  }

  /**
   * Calculate confidence score for the prediction
   */
  private async calculateConfidence(features: number[], prediction: number): Promise<number> {
    // Calculate confidence based on:
    // 1. Model certainty
    // 2. Data quality
    // 3. Historical accuracy
    
    const dataQuality = features.filter(f => f !== 0).length / features.length;
    const volatility = Math.abs(features[6] || 0); // Volatility feature
    const historicalAccuracy = 0.75; // Default historical accuracy
    
    let confidence = dataQuality * 0.4 + (1 - volatility) * 0.3 + historicalAccuracy * 0.3;
    confidence = Math.max(0.1, Math.min(0.95, confidence));
    
    return Math.round(confidence * 100) / 100;
  }

  /**
   * Determine price trend direction
   */
  private determineTrend(currentPrice: number, predictedPrice: number): 'increasing' | 'decreasing' | 'stable' {
    const changePercent = (predictedPrice - currentPrice) / currentPrice;
    
    if (changePercent > 0.05) return 'increasing';
    if (changePercent < -0.05) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate optimal buying time recommendation
   */
  private async calculateOptimalBuyTime(
    productId: string,
    currentPrice: number,
    predictedPrice: number,
    trend: 'increasing' | 'decreasing' | 'stable'
  ): Promise<PricePrediction['optimalBuyTime']> {
    const changeAmount = predictedPrice - currentPrice;
    const changePercent = changeAmount / currentPrice;
    
    if (trend === 'decreasing' && Math.abs(changePercent) > 0.1) {
      return {
        recommendation: 'wait',
        estimatedSavings: Math.abs(changeAmount),
        timeframe: '1-2 weeks'
      };
    }
    
    if (trend === 'increasing' && Math.abs(changePercent) > 0.05) {
      return {
        recommendation: 'buy_now',
        timeframe: 'immediately'
      };
    }
    
    return {
      recommendation: 'buy_soon',
      timeframe: 'next few days'
    };
  }

  /**
   * Train the model with new data
   */
  @AsyncErrorHandler()
  async trainModel(): Promise<void> {
    if (this.isTraining || !this.model) {
      return;
    }

    this.isTraining = true;
    
    try {
      const trainingData = await this.prepareTrainingData();
      
      if (trainingData.xs.length < 100) {
        console.log('Insufficient training data, skipping model training');
        return;
      }

      const xsTensor = tf.tensor2d(trainingData.xs);
      const ysTensor = tf.tensor2d(trainingData.ys);

      await this.model.fit(xsTensor, ysTensor, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        verbose: 0,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              console.log(`Training epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}`);
            }
          }
        }
      });

      // Save the trained model
      await this.saveModel();
      
      console.log('Model training completed successfully');
    } catch (error) {
      ErrorHandler.getInstance().error(
        'Failed to train price prediction model',
        'MODEL_TRAINING_ERROR',
        ErrorSeverity.HIGH,
        ErrorCategory.ANALYSIS,
        { error }
      );
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Prepare training data from historical price data
   */
  private async prepareTrainingData(): Promise<{ xs: number[][], ys: number[][] }> {
    const allProducts = await Storage.getAllProductHistory();
    const xs: number[][] = [];
    const ys: number[][] = [];

    for (const productHistory of allProducts) {
      const features = await this.extractHistoricalFeatures(productHistory);
      const targets = this.extractTargets(productHistory);
      
      for (let i = 0; i < features.length; i++) {
        if (targets[i] !== undefined) {
          xs.push(features[i]);
          ys.push([targets[i]]);
        }
      }
    }

    return { xs, ys };
  }

  /**
   * Get market trends for multiple categories
   */
  @AsyncErrorHandler()
  async getMarketTrends(): Promise<MarketTrend[]> {
    const categories = await Storage.getCategories();
    const trends: MarketTrend[] = [];

    for (const category of categories) {
      const categoryProducts = await Storage.getProductsByCategory(category);
      const priceChanges = categoryProducts.map(p => this.calculateRecentPriceChange(p.priceHistory));
      
      const trend: MarketTrend = {
        category,
        avgPriceChange: priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length,
        volatility: this.calculateArrayVolatility(priceChanges),
        seasonalPatterns: await this.detectSeasonalPatterns(category),
        demandIndicators: await this.collectDemandIndicators(category)
      };
      
      trends.push(trend);
    }

    return trends;
  }

  // Helper methods
  private calculatePriceChanges(priceHistory: any[], days: number): number[] {
    // Implementation for calculating price changes
    return [0, 0, 0]; // Placeholder
  }

  private calculateVolatility(priceHistory: any[]): number {
    // Implementation for calculating price volatility
    return 0.1; // Placeholder
  }

  private getSeasonalFactor(seasonalData: any): number {
    // Implementation for seasonal factor calculation
    return 1.0; // Placeholder
  }

  private async getCompetitionFactor(productId: string): Promise<number> {
    // Implementation for competition factor
    return 0.5; // Placeholder
  }

  private async getDemandIndicator(productId: string): Promise<number> {
    // Implementation for demand indicator
    return 0.7; // Placeholder
  }

  private async getCategoryTrend(productId: string): Promise<number> {
    // Implementation for category trend
    return 0.3; // Placeholder
  }

  private async getSeasonalData(): Promise<any> {
    // Implementation for seasonal data
    return {}; // Placeholder
  }

  private async getHistoricalAccuracy(productId: string): Promise<number> {
    // Implementation for historical accuracy calculation
    return 0.75; // Placeholder
  }

  private async extractHistoricalFeatures(productHistory: any): Promise<number[][]> {
    // Implementation for historical feature extraction
    return []; // Placeholder
  }

  private extractTargets(productHistory: any): number[] {
    // Implementation for target extraction
    return []; // Placeholder
  }

  private async saveModel(): Promise<void> {
    if (!this.model) return;
    
    const modelData = await this.model.save(tf.io.withSaveHandler(async (artifacts) => {
      await Storage.saveModelData('price_prediction', {
        version: this.MODEL_VERSION,
        modelTopology: artifacts.modelTopology,
        weightSpecs: artifacts.weightSpecs,
        weightData: artifacts.weightData
      });
      return { modelArtifactsInfo: { dateSaved: new Date() } };
    }));
  }

  private calculateRecentPriceChange(priceHistory: any[]): number {
    // Implementation for recent price change calculation
    return 0.05; // Placeholder
  }

  private calculateArrayVolatility(values: number[]): number {
    // Implementation for array volatility calculation
    return 0.1; // Placeholder
  }

  private async detectSeasonalPatterns(category: string): Promise<SeasonalPattern[]> {
    // Implementation for seasonal pattern detection
    return []; // Placeholder
  }

  private async collectDemandIndicators(category: string): Promise<DemandIndicator[]> {
    // Implementation for demand indicator collection
    return []; // Placeholder
  }
}
