import * as tf from '@tensorflow/tfjs/dist/tf';
import { Storage } from '../../../common/utils/storage';

export class ModelManager {
  private static instance: ModelManager;
  private models: Map<string, tf.LayersModel> = new Map();
  private modelLoadPromises: Map<string, Promise<tf.LayersModel>> = new Map();

  private constructor() {}

  static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  async getModel(modelId: string): Promise<tf.LayersModel> {
    // Return cached model if available
    if (this.models.has(modelId)) {
      return this.models.get(modelId)!;
    }

    // Return existing load promise if model is being loaded
    if (this.modelLoadPromises.has(modelId)) {
      return this.modelLoadPromises.get(modelId)!;
    }

    // Create new load promise
    const loadPromise = this.loadModel(modelId);
    this.modelLoadPromises.set(modelId, loadPromise);

    try {
      const model = await loadPromise;
      this.models.set(modelId, model);
      this.modelLoadPromises.delete(modelId);
      return model;
    } catch (error) {
      this.modelLoadPromises.delete(modelId);
      throw error;
    }
  }

  private async loadModel(modelId: string): Promise<tf.LayersModel> {
    const modelUrl = `https://storage.marketsage.com/models/${modelId}/model.json`;
    
    try {
      const model = await tf.loadLayersModel(modelUrl, {
        onProgress: (fraction) => {
          console.debug(`Loading model ${modelId}: ${Math.round(fraction * 100)}%`);
        }
      });

      // Warm up the model
      const warmupResult = await this.warmupModel(model);
      console.debug(`Model ${modelId} warmup complete:`, warmupResult);

      return model;
    } catch (error) {
      console.error(`Failed to load model ${modelId}:`, error);
      throw error;
    }
  }

  private async warmupModel(model: tf.LayersModel): Promise<tf.Tensor> {
    const warmupData = tf.zeros(model.inputs[0].shape);
    const result = await model.predict(warmupData) as tf.Tensor;
    warmupData.dispose();
    return result;
  }

  async disposeModel(modelId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (model) {
      await model.dispose();
      this.models.delete(modelId);
    }
  }

  async clearAllModels(): Promise<void> {
    for (const [modelId, model] of this.models) {
      await model.dispose();
    }
    this.models.clear();
    this.modelLoadPromises.clear();
    tf.disposeVariables();
  }
}