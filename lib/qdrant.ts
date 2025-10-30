import { QdrantClient } from '@qdrant/js-client-rest';

if (!process.env.QDRANT_URL) {
  throw new Error('QDRANT_URL is not defined');
}

if (!process.env.QDRANT_API_KEY) {
  throw new Error('QDRANT_API_KEY is not defined');
}

if (!process.env.QDRANT_COLLECTION) {
  throw new Error('QDRANT_COLLECTION is not defined');
}

export const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

export const COLLECTION_NAME = process.env.QDRANT_COLLECTION;
