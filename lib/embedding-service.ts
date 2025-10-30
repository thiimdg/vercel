/**
 * Cliente para o microserviço de embeddings (BM25 + ColBERT)
 */

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:8000';

export interface BM25Embedding {
  indices: number[];
  values: number[];
}

export type ColBERTEmbedding = number[][];  // Matrix of token embeddings

/**
 * Gera sparse embedding BM25 para um texto
 */
export async function generateBM25Embedding(text: string): Promise<BM25Embedding> {
  const response = await fetch(`${EMBEDDING_SERVICE_URL}/embed/bm25`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      texts: [text],
      model: 'bm25',
    }),
  });

  if (!response.ok) {
    throw new Error(`BM25 embedding service error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.embeddings[0];
}

/**
 * Gera ColBERT multivector para um texto
 */
export async function generateColBERTEmbedding(text: string): Promise<ColBERTEmbedding> {
  const response = await fetch(`${EMBEDDING_SERVICE_URL}/embed/colbert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      texts: [text],
      model: 'colbert',
    }),
  });

  if (!response.ok) {
    throw new Error(`ColBERT embedding service error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.embeddings[0];
}

/**
 * Gera embeddings de query (usa query_embed do ColBERT)
 */
export async function generateQueryEmbeddings(text: string) {
  const response = await fetch(`${EMBEDDING_SERVICE_URL}/embed/query?text=${encodeURIComponent(text)}&models=bm25&models=colbert`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Query embedding service error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.embeddings;
}

/**
 * Verifica se o serviço de embeddings está online
 */
export async function checkEmbeddingServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${EMBEDDING_SERVICE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    return response.ok;
  } catch {
    return false;
  }
}
