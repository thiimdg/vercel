import { VoyageAIClient } from 'voyageai';

if (!process.env.VOYAGE_API_KEY) {
  throw new Error('VOYAGE_API_KEY is not defined');
}

export const voyageClient = new VoyageAIClient({
  apiKey: process.env.VOYAGE_API_KEY,
});

/**
 * Gera embedding para um texto usando Voyage AI
 * Modelo: voyage-3.5-lite
 * @param text - Texto para gerar embedding
 * @param outputDimension - Dimensões do embedding (512 ou 1024)
 */
export async function generateVoyageEmbedding(
  text: string,
  outputDimension: 512 | 1024 = 512
): Promise<number[]> {
  const response = await voyageClient.embed({
    input: text,
    model: 'voyage-3.5-lite',
    outputDimension,
    inputType: 'query',
  });

  if (!response.data || !response.data[0]?.embedding) {
    throw new Error('Failed to generate embedding from Voyage AI');
  }

  return response.data[0].embedding;
}
