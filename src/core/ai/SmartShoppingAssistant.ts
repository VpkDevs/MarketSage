/**
 * Smart Shopping Assistant with Natural Language Processing
 * Provides intelligent shopping assistance using NLP and conversational AI
 */

import { ErrorHandler, ErrorSeverity, ErrorCategory } from '../../common/errors/ErrorHandler';
import { Storage } from '../../common/utils/storage';
import { Service } from '../di/ServiceContainer';
import { AsyncErrorHandler } from '../../common/utils/decorators';
import { Product, Platform } from '../../common/types';
import { PricePredictionEngine } from '../ai/PricePredictionEngine';
import { AdvancedThreatDetection } from '../security/AdvancedThreatDetection';

export interface ShoppingQuery {
  query: string;
  context?: ShoppingContext;
  userId: string;
  timestamp: number;
}

export interface ShoppingContext {
  budget?: number;
  preferences?: UserPreferences;
  previousSearches?: string[];
  shoppingCart?: Product[];
  urgency?: 'low' | 'medium' | 'high';
  category?: string;
}

export interface UserPreferences {
  brands: string[];
  priceRange: { min: number; max: number };
  quality: 'low' | 'medium' | 'high' | 'premium';
  shipping: 'standard' | 'fast' | 'instant';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  sustainabilityFocus: boolean;
  localPreference: boolean;
}

export interface AssistantResponse {
  type: 'answer' | 'product_recommendation' | 'comparison' | 'warning' | 'clarification';
  message: string;
  products?: Product[];
  alternatives?: Product[];
  reasoning?: string[];
  confidence: number;
  followUpSuggestions?: string[];
  actionButtons?: ActionButton[];
}

export interface ActionButton {
  label: string;
  action: 'search' | 'compare' | 'buy' | 'save' | 'share' | 'report';
  data?: any;
}

export interface ConversationContext {
  userId: string;
  sessionId: string;
  messages: ConversationMessage[];
  currentIntent: string | null;
  extractedEntities: Map<string, any>;
  userProfile: UserProfile;
}

export interface ConversationMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: any;
}

export interface UserProfile {
  preferences: UserPreferences;
  shoppingHistory: ShoppingHistory[];
  interests: string[];
  loyaltyPrograms: string[];
  communicationStyle: 'formal' | 'casual' | 'technical';
}

export interface ShoppingHistory {
  productId: string;
  action: 'viewed' | 'searched' | 'purchased' | 'abandoned';
  timestamp: number;
  metadata?: any;
}

export interface Intent {
  name: string;
  confidence: number;
  entities: Map<string, EntityValue>;
}

export interface EntityValue {
  value: string;
  confidence: number;
  synonyms?: string[];
}

@Service('SmartShoppingAssistant')
export class SmartShoppingAssistant {
  private pricePrediction: PricePredictionEngine;
  private threatDetection: AdvancedThreatDetection;
  private conversationContexts: Map<string, ConversationContext> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  
  // Intent patterns for NLP
  private readonly intentPatterns = new Map([
    ['find_product', [
      /find|search|look for|show me|need|want/i,
      /buy|purchase|get|acquire/i
    ]],
    ['compare_products', [
      /compare|vs|versus|difference|better|best/i,
      /which one|what's the difference/i
    ]],
    ['price_inquiry', [
      /price|cost|how much|expensive|cheap|affordable/i,
      /budget|money|pay|spend/i
    ]],
    ['safety_check', [
      /safe|secure|trustworthy|legitimate|scam|fraud/i,
      /reliable|authentic|genuine|fake/i
    ]],
    ['recommendation', [
      /recommend|suggest|advice|opinion|think/i,
      /should i|would you|what do you/i
    ]],
    ['shipping_inquiry', [
      /shipping|delivery|when|arrive|fast|quick/i,
      /how long|time|days|weeks/i
    ]]
  ]);

  constructor(
    pricePrediction: PricePredictionEngine,
    threatDetection: AdvancedThreatDetection
  ) {
    this.pricePrediction = pricePrediction;
    this.threatDetection = threatDetection;
  }

  /**
   * Process a natural language shopping query
   */
  @AsyncErrorHandler()
  async processQuery(query: ShoppingQuery): Promise<AssistantResponse> {
    // Get or create conversation context
    const context = await this.getOrCreateContext(query.userId);
    
    // Add user message to conversation
    const messageId = this.generateMessageId();
    context.messages.push({
      id: messageId,
      type: 'user',
      content: query.query,
      timestamp: query.timestamp
    });

    // Extract intent and entities
    const intent = this.extractIntent(query.query);
    const entities = this.extractEntities(query.query);
    
    // Update context with extracted information
    context.currentIntent = intent.name;
    entities.forEach((value, key) => {
      context.extractedEntities.set(key, value);
    });

    // Generate response based on intent
    const response = await this.generateResponse(intent, entities, context, query);
    
    // Add assistant response to conversation
    context.messages.push({
      id: this.generateMessageId(),
      type: 'assistant',
      content: response.message,
      timestamp: Date.now(),
      metadata: { type: response.type, confidence: response.confidence }
    });

    // Save conversation context
    await this.saveContext(context);
    
    return response;
  }

  /**
   * Extract intent from user query using NLP
   */
  private extractIntent(query: string): Intent {
    let bestMatch = { name: 'general_inquiry', confidence: 0.3 };
    
    for (const [intentName, patterns] of this.intentPatterns) {
      let matches = 0;
      let totalPatterns = patterns.length;
      
      for (const pattern of patterns) {
        if (pattern.test(query)) {
          matches++;
        }
      }
      
      const confidence = matches / totalPatterns;
      if (confidence > bestMatch.confidence) {
        bestMatch = { name: intentName, confidence };
      }
    }

    return {
      name: bestMatch.name,
      confidence: bestMatch.confidence,
      entities: new Map()
    };
  }

  /**
   * Extract entities from user query
   */
  private extractEntities(query: string): Map<string, EntityValue> {
    const entities = new Map<string, EntityValue>();
    
    // Extract product names
    const productMatch = query.match(/(?:for|buy|find|get)\s+(?:a\s+|an\s+|the\s+)?([a-zA-Z\s]+?)(?:\s+(?:that|which|with|under|for|in|on|at|$))/i);
    if (productMatch) {
      entities.set('product', {
        value: productMatch[1].trim(),
        confidence: 0.8
      });
    }

    // Extract price ranges
    const priceMatch = query.match(/(?:under|below|less than|max|maximum)\s*\$?(\d+(?:\.\d{2})?)/i);
    if (priceMatch) {
      entities.set('max_price', {
        value: priceMatch[1],
        confidence: 0.9
      });
    }

    // Extract colors
    const colorMatch = query.match(/\b(red|blue|green|yellow|black|white|gray|purple|pink|orange|brown)\b/i);
    if (colorMatch) {
      entities.set('color', {
        value: colorMatch[1],
        confidence: 0.7
      });
    }

    // Extract sizes
    const sizeMatch = query.match(/\b(small|medium|large|xl|xxl|xs|s|m|l|\d+(?:GB|TB|inch|ft))\b/i);
    if (sizeMatch) {
      entities.set('size', {
        value: sizeMatch[1],
        confidence: 0.8
      });
    }

    // Extract brands
    const brandMatch = query.match(/\b(apple|samsung|nike|adidas|sony|lg|dell|hp|amazon|google)\b/i);
    if (brandMatch) {
      entities.set('brand', {
        value: brandMatch[1],
        confidence: 0.9
      });
    }

    // Extract urgency
    const urgencyMatch = query.match(/\b(urgent|asap|immediately|soon|rush|emergency|tonight|today|tomorrow)\b/i);
    if (urgencyMatch) {
      entities.set('urgency', {
        value: urgencyMatch[1].includes('urgent') || urgencyMatch[1].includes('asap') ? 'high' : 'medium',
        confidence: 0.8
      });
    }

    return entities;
  }

  /**
   * Generate response based on intent and entities
   */
  private async generateResponse(
    intent: Intent,
    entities: Map<string, EntityValue>,
    context: ConversationContext,
    query: ShoppingQuery
  ): Promise<AssistantResponse> {
    switch (intent.name) {
      case 'find_product':
        return this.handleProductSearch(entities, context, query);
      
      case 'compare_products':
        return this.handleProductComparison(entities, context, query);
      
      case 'price_inquiry':
        return this.handlePriceInquiry(entities, context, query);
      
      case 'safety_check':
        return this.handleSafetyCheck(entities, context, query);
      
      case 'recommendation':
        return this.handleRecommendation(entities, context, query);
      
      case 'shipping_inquiry':
        return this.handleShippingInquiry(entities, context, query);
      
      default:
        return this.handleGeneralInquiry(entities, context, query);
    }
  }

  /**
   * Handle product search requests
   */
  private async handleProductSearch(
    entities: Map<string, EntityValue>,
    context: ConversationContext,
    query: ShoppingQuery
  ): Promise<AssistantResponse> {
    const productEntity = entities.get('product');
    const maxPrice = entities.get('max_price');
    const brand = entities.get('brand');
    const color = entities.get('color');
    
    if (!productEntity) {
      return {
        type: 'clarification',
        message: "I'd be happy to help you find a product! Could you tell me what specific item you're looking for?",
        confidence: 0.9,
        followUpSuggestions: [
          "I'm looking for a laptop",
          "I want to buy headphones",
          "I need a phone case"
        ]
      };
    }

    // Search for products
    const searchQuery = this.buildSearchQuery(entities);
    const products = await this.searchProducts(searchQuery, context.userProfile.preferences);
    
    if (products.length === 0) {
      return {
        type: 'answer',
        message: `I couldn't find any ${productEntity.value} matching your criteria. Would you like me to broaden the search or suggest alternatives?`,
        confidence: 0.8,
        followUpSuggestions: [
          "Broaden the search",
          "Show similar products",
          "Try different brands"
        ]
      };
    }

    // Analyze products for safety and pricing
    const analyzedProducts = await this.analyzeProducts(products);
    
    let message = `I found ${products.length} ${productEntity.value}${products.length > 1 ? 's' : ''} for you! `;
    
    if (maxPrice) {
      message += `I've filtered them to stay under $${maxPrice.value}. `;
    }
    
    message += "Here are my top recommendations based on your preferences:";

    const reasoning = [
      `Searched for "${productEntity.value}"`,
      `Found ${products.length} matching products`,
      'Analyzed for safety and value',
      'Ranked by relevance and your preferences'
    ];

    return {
      type: 'product_recommendation',
      message,
      products: analyzedProducts.slice(0, 5), // Top 5 recommendations
      reasoning,
      confidence: 0.85,
      actionButtons: [
        { label: 'Compare All', action: 'compare', data: { products: products.slice(0, 5) } },
        { label: 'Price Alerts', action: 'save', data: { type: 'price_alert' } },
        { label: 'View More', action: 'search', data: { query: searchQuery, offset: 5 } }
      ]
    };
  }

  /**
   * Handle product comparison requests
   */
  private async handleProductComparison(
    entities: Map<string, EntityValue>,
    context: ConversationContext,
    query: ShoppingQuery
  ): Promise<AssistantResponse> {
    // Get products from context or search
    let products = context.extractedEntities.get('comparison_products')?.value || [];
    
    if (products.length < 2) {
      return {
        type: 'clarification',
        message: "I'd be happy to compare products for you! Could you specify which products you'd like me to compare?",
        confidence: 0.9,
        followUpSuggestions: [
          "Compare iPhone vs Samsung Galaxy",
          "Compare laptops under $1000",
          "Show me the best headphones"
        ]
      };
    }

    const comparison = await this.compareProducts(products);
    
    return {
      type: 'comparison',
      message: "Here's a detailed comparison of the products you're considering:",
      products: comparison.products,
      reasoning: comparison.reasoning,
      confidence: 0.9,
      actionButtons: [
        { label: 'View Details', action: 'search', data: { detailed: true } },
        { label: 'Check Prices', action: 'compare', data: { type: 'price' } }
      ]
    };
  }

  /**
   * Handle price-related inquiries
   */
  private async handlePriceInquiry(
    entities: Map<string, EntityValue>,
    context: ConversationContext,
    query: ShoppingQuery
  ): Promise<AssistantResponse> {
    const productEntity = entities.get('product');
    
    if (!productEntity) {
      return {
        type: 'clarification',
        message: "I can help you with pricing information! What product are you interested in learning about?",
        confidence: 0.9
      };
    }

    // Get price predictions and market analysis
    const products = await this.searchProducts(productEntity.value, context.userProfile.preferences);
    
    if (products.length === 0) {
      return {
        type: 'answer',
        message: `I couldn't find pricing information for "${productEntity.value}". Could you be more specific about the product?`,
        confidence: 0.7
      };
    }

    const priceAnalysis = await this.analyzePricing(products);
    
    return {
      type: 'answer',
      message: this.generatePriceInsights(priceAnalysis),
      products: products.slice(0, 3),
      confidence: 0.85,
      actionButtons: [
        { label: 'Set Price Alert', action: 'save', data: { type: 'price_alert' } },
        { label: 'View Trends', action: 'search', data: { type: 'price_history' } }
      ]
    };
  }

  /**
   * Handle safety and security checks
   */
  private async handleSafetyCheck(
    entities: Map<string, EntityValue>,
    context: ConversationContext,
    query: ShoppingQuery
  ): Promise<AssistantResponse> {
    const productEntity = entities.get('product');
    
    if (!productEntity) {
      return {
        type: 'clarification',
        message: "I can help you check the safety and authenticity of products! What specific product or seller would you like me to analyze?",
        confidence: 0.9
      };
    }

    const products = await this.searchProducts(productEntity.value, context.userProfile.preferences);
    
    if (products.length === 0) {
      return {
        type: 'answer',
        message: `I couldn't find "${productEntity.value}" to analyze. Could you provide more details or a product link?`,
        confidence: 0.7
      };
    }

    const safetyAnalysis = await this.analyzeSafety(products);
    
    return {
      type: 'warning',
      message: this.generateSafetyReport(safetyAnalysis),
      products: products.slice(0, 3),
      confidence: 0.9,
      actionButtons: [
        { label: 'Report Issue', action: 'report', data: { type: 'safety' } },
        { label: 'Find Alternatives', action: 'search', data: { safe_alternatives: true } }
      ]
    };
  }

  /**
   * Handle recommendation requests
   */
  private async handleRecommendation(
    entities: Map<string, EntityValue>,
    context: ConversationContext,
    query: ShoppingQuery
  ): Promise<AssistantResponse> {
    const userProfile = context.userProfile;
    const recommendations = await this.generatePersonalizedRecommendations(userProfile, entities);
    
    return {
      type: 'product_recommendation',
      message: "Based on your preferences and shopping history, here are my personalized recommendations:",
      products: recommendations.products,
      reasoning: recommendations.reasoning,
      confidence: 0.8,
      actionButtons: [
        { label: 'Save for Later', action: 'save', data: { type: 'wishlist' } },
        { label: 'Get More Ideas', action: 'search', data: { type: 'similar' } }
      ]
    };
  }

  /**
   * Handle shipping and delivery inquiries
   */
  private async handleShippingInquiry(
    entities: Map<string, EntityValue>,
    context: ConversationContext,
    query: ShoppingQuery
  ): Promise<AssistantResponse> {
    const urgency = entities.get('urgency');
    const productEntity = entities.get('product');
    
    let message = "I can help you with shipping information! ";
    
    if (urgency?.value === 'high') {
      message += "Since you need it urgently, I'll prioritize fast shipping options. ";
    }
    
    if (productEntity) {
      const shippingOptions = await this.getShippingOptions(productEntity.value, urgency?.value);
      message += shippingOptions.message;
      
      return {
        type: 'answer',
        message,
        products: shippingOptions.products,
        confidence: 0.85,
        actionButtons: [
          { label: 'Filter by Shipping', action: 'search', data: { filter: 'fast_shipping' } }
        ]
      };
    }
    
    return {
      type: 'clarification',
      message: message + "What product are you interested in checking shipping for?",
      confidence: 0.8
    };
  }

  /**
   * Handle general inquiries
   */
  private async handleGeneralInquiry(
    entities: Map<string, EntityValue>,
    context: ConversationContext,
    query: ShoppingQuery
  ): Promise<AssistantResponse> {
    return {
      type: 'answer',
      message: "I'm here to help with your shopping needs! I can help you find products, compare prices, check safety, and provide personalized recommendations. What would you like assistance with?",
      confidence: 0.7,
      followUpSuggestions: [
        "Find me a good laptop",
        "Compare phone prices",
        "Is this seller trustworthy?",
        "What's the best headphones under $100?"
      ]
    };
  }

  // Helper methods
  private async getOrCreateContext(userId: string): Promise<ConversationContext> {
    let context = this.conversationContexts.get(userId);
    
    if (!context) {
      const userProfile = await Storage.getUserProfile(userId);
      context = {
        userId,
        sessionId: this.generateSessionId(),
        messages: [],
        currentIntent: null,
        extractedEntities: new Map(),
        userProfile: userProfile || this.createDefaultUserProfile()
      };
      this.conversationContexts.set(userId, context);
    }
    
    return context;
  }

  private buildSearchQuery(entities: Map<string, EntityValue>): string {
    const parts: string[] = [];
    
    const product = entities.get('product')?.value;
    const brand = entities.get('brand')?.value;
    const color = entities.get('color')?.value;
    const size = entities.get('size')?.value;
    
    if (product) parts.push(product);
    if (brand) parts.push(brand);
    if (color) parts.push(color);
    if (size) parts.push(size);
    
    return parts.join(' ');
  }

  private async searchProducts(query: string, preferences: UserPreferences): Promise<Product[]> {
    // Implementation for product search
    return [];
  }

  private async analyzeProducts(products: Product[]): Promise<Product[]> {
    // Implementation for product analysis
    return products;
  }

  private async compareProducts(products: Product[]): Promise<{ products: Product[], reasoning: string[] }> {
    // Implementation for product comparison
    return { products, reasoning: [] };
  }

  private async analyzePricing(products: Product[]): Promise<any> {
    // Implementation for pricing analysis
    return {};
  }

  private async analyzeSafety(products: Product[]): Promise<any> {
    // Implementation for safety analysis
    return {};
  }

  private async generatePersonalizedRecommendations(userProfile: UserProfile, entities: Map<string, EntityValue>): Promise<{ products: Product[], reasoning: string[] }> {
    // Implementation for personalized recommendations
    return { products: [], reasoning: [] };
  }

  private async getShippingOptions(product: string, urgency?: string): Promise<{ message: string, products: Product[] }> {
    // Implementation for shipping options
    return { message: '', products: [] };
  }

  private generatePriceInsights(analysis: any): string {
    // Implementation for price insights generation
    return 'Price analysis results will be displayed here.';
  }

  private generateSafetyReport(analysis: any): string {
    // Implementation for safety report generation
    return 'Safety analysis results will be displayed here.';
  }

  private createDefaultUserProfile(): UserProfile {
    return {
      preferences: {
        brands: [],
        priceRange: { min: 0, max: 1000 },
        quality: 'medium',
        shipping: 'standard',
        riskTolerance: 'moderate',
        sustainabilityFocus: false,
        localPreference: false
      },
      shoppingHistory: [],
      interests: [],
      loyaltyPrograms: [],
      communicationStyle: 'casual'
    };
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveContext(context: ConversationContext): Promise<void> {
    await Storage.saveConversationContext(context);
  }
}
