// Custom type declarations for TensorFlow.js
declare module "@tensorflow/tfjs" {
  export * from "@tensorflow/tfjs-core";
  export * from "@tensorflow/tfjs-converter";
  export * from "@tensorflow/tfjs-layers";

  export function loadLayersModel(arg0: string): any {
    throw new Error("Function not implemented.");
  }
}
