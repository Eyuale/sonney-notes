// Local embedding service using Transformers.js
// Runs COMPLETELY OFFLINE on your computer - NO API calls, NO internet required!

import { Embeddings, EmbeddingsParams } from '@langchain/core/embeddings';
import { pipeline, Pipeline } from '@xenova/transformers';

// Cache the pipeline to avoid reloading
let embeddingPipeline: Pipeline | null = null;

export class LocalEmbeddings extends Embeddings {
  modelName: string;
  private initPromise: Promise<void> | null = null;

  constructor(params?: EmbeddingsParams & { modelName?: string }) {
    super(params ?? {});
    this.modelName = params?.modelName || 'Xenova/all-MiniLM-L6-v2';
  }

  /**
   * Initialize the model (downloads once, then cached)
   */
  private async initialize(): Promise<void> {
    if (embeddingPipeline) return;
    
    if (!this.initPromise) {
      this.initPromise = (async () => {
        console.log('🚀 Loading local embedding model (first time only, ~25MB download)...');
        embeddingPipeline = await pipeline('feature-extraction', this.modelName);
        console.log('✅ Local embedding model loaded and ready!');
      })();
    }
    
    return this.initPromise;
  }

  /**
   * Mean pooling to get sentence embeddings
   */
  private meanPooling(output: any, attentionMask: any): number[] {
    const tokenEmbeddings = output.tolist();
    const inputMaskExpanded = attentionMask.tolist();
    
    const sumEmbeddings = tokenEmbeddings[0].reduce((acc: number[], token: number[], idx: number) => {
      return acc.map((val, i) => val + token[i] * inputMaskExpanded[0][idx]);
    }, new Array(tokenEmbeddings[0][0].length).fill(0));
    
    const sumMask = inputMaskExpanded[0].reduce((a: number, b: number) => a + b, 0);
    
    return sumEmbeddings.map(val => val / sumMask);
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    await this.initialize();
    
    const embeddings: number[][] = [];
    
    console.log(`🔄 Generating embeddings for ${documents.length} chunks locally...`);
    
    for (let i = 0; i < documents.length; i++) {
      try {
        const doc = documents[i];
        
        // Generate embedding
        const output = await embeddingPipeline!(doc, { pooling: 'mean', normalize: true });
        
        // Convert to array
        const embedding = Array.from(output.data as Float32Array);
        
        embeddings.push(embedding);
        
        // Log progress every 10 chunks
        if ((i + 1) % 10 === 0) {
          console.log(`  ✓ Processed ${i + 1}/${documents.length} chunks`);
        }
      } catch (error) {
        console.error(`Error generating embedding for chunk ${i}:`, error);
        // Return a zero vector on error
        const zeroVector = new Array(384).fill(0);
        embeddings.push(zeroVector);
      }
    }
    
    console.log(`✅ Generated ${embeddings.length} embeddings locally`);
    return embeddings;
  }

  async embedQuery(query: string): Promise<number[]> {
    await this.initialize();
    
    try {
      const output = await embeddingPipeline!(query, { pooling: 'mean', normalize: true });
      return Array.from(output.data as Float32Array);
    } catch (error) {
      console.error('Error generating query embedding:', error);
      throw error;
    }
  }
}

