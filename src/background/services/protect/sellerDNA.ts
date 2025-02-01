import * as tf from "@tensorflow/tfjs"; // Correct import for TensorFlow.js

export class SellerDNAProfiling {
  private model: any; // Using a generic type for the model temporarily

  constructor() {
    this.model = this.loadModel(); // Load the model
  private preprocessData(data: any): any {
