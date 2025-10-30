import { NextRequest, NextResponse } from 'next/server';
import { qdrantClient } from '@/lib/qdrant';
import { generateVoyageEmbedding } from '@/lib/voyage';

export interface HybridSearchResult {
  id: string;
  score: number;
  payload: {
    doc_id: string;
    chunk_index: number;
    total_chunks: number;
    chunk_text: string;
    processNumber?: string;
    dateEvent?: string;
    embeddings_model?: string;
    [key: string]: any;
  };
}

/**
 * Busca Híbrida com Comparação (512d vs 1024d)
 *
 * Pipeline:
 * 1. Dense search (Voyage) - top 100
 * 2. Sparse search (BM25) - top 100
 * 3. Fusion RRF - top 30 final
 *
 * Modos:
 * - Normal: busca em 1 collection (512d OU 1024d)
 * - Comparação: busca em ambas collections lado a lado
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      limit = 30,
      collection = 'tjsc-voyage-512-chunks',
      compareMode = false
    } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query é obrigatória e deve ser uma string' },
        { status: 400 }
      );
    }

    console.log(`[Hybrid Search TJSC] Query: "${query}" | Mode: ${compareMode ? 'comparison' : 'normal'}`);

    // MODO COMPARAÇÃO: buscar em ambas collections
    if (compareMode) {
      const startTime512 = Date.now();
      const results512 = await hybridSearch(query, limit, 'tjsc-voyage-512-chunks');
      const searchTime512 = Date.now() - startTime512;

      const startTime1024 = Date.now();
      const results1024 = await hybridSearch(query, limit, 'tjsc-voyage-1024-chunks');
      const searchTime1024 = Date.now() - startTime1024;

      console.log(`[Hybrid Search TJSC] 512d: ${results512.length} results in ${searchTime512}ms`);
      console.log(`[Hybrid Search TJSC] 1024d: ${results1024.length} results in ${searchTime1024}ms`);

      return NextResponse.json({
        success: true,
        query,
        resultsComparison: {
          voyage512: results512,
          voyage1024: results1024,
        },
        searchTimes: {
          voyage512: searchTime512,
          voyage1024: searchTime1024,
        },
      });
    }

    // MODO NORMAL: buscar em 1 collection apenas
    const startTime = Date.now();
    const results = await hybridSearch(query, limit, collection);
    const searchTime = Date.now() - startTime;

    console.log(`[Hybrid Search TJSC] ${collection}: ${results.length} results in ${searchTime}ms`);

    return NextResponse.json({
      success: true,
      query,
      results,
      total: results.length,
      searchTime,
    });
  } catch (error: any) {
    console.error('[Hybrid Search TJSC] Erro:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro ao realizar busca híbrida',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Busca Híbrida: Dense (Voyage) + Sparse (BM25) + RRF Fusion
 */
async function hybridSearch(
  query: string,
  limit: number,
  collectionName: string
): Promise<HybridSearchResult[]> {
  // Verificar se coleção existe
  const collections = await qdrantClient.getCollections();
  const collectionExists = collections.collections.some(c => c.name === collectionName);

  if (!collectionExists) {
    throw new Error(`Coleção '${collectionName}' não encontrada. Execute a migração primeiro.`);
  }

  // Detectar dimensão pela collection name
  const dimension = collectionName.includes('1024') ? 1024 : 512;

  // PASSO 1: Gerar Dense Embedding (Voyage)
  console.log(`[1/4] Gerando dense embedding (Voyage ${dimension}d)...`);
  const queryEmbedding = await generateVoyageEmbedding(query, dimension);

  // PASSO 2: Gerar Sparse Embedding (BM25)
  console.log('[2/4] Gerando sparse embedding (BM25)...');
  const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:8000';

  const bm25Response = await fetch(`${EMBEDDING_SERVICE_URL}/embed/bm25`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      texts: [query],
      model: 'bm25',
    }),
  });

  if (!bm25Response.ok) {
    throw new Error(`BM25 service error: ${bm25Response.statusText}`);
  }

  const bm25Data = await bm25Response.json();
  const sparseEmbedding = bm25Data.embeddings[0]; // { indices: [...], values: [...] }

  // PASSO 3: Busca Híbrida no Qdrant (Dense + Sparse + RRF Fusion)
  console.log('[3/4] Buscando no Qdrant (híbrido com RRF)...');
  const searchResult = await qdrantClient.query(collectionName, {
    prefetch: [
      {
        query: queryEmbedding,
        using: 'dense',
        limit: 100,
      },
      {
        query: sparseEmbedding,
        using: 'sparse',
        limit: 100,
      },
    ],
    query: {
      fusion: 'rrf', // Reciprocal Rank Fusion
    },
    limit: 100, // Buscar top 100 chunks inicialmente
    with_payload: true,
  });

  const topChunks = searchResult.points || [];

  if (topChunks.length === 0) {
    return [];
  }

  // PASSO 4: Buscar TODOS os chunks dos documentos mais relevantes
  console.log('[4/4] Buscando chunks completos dos documentos...');

  // Criar mapa de scores da busca RRF (chunk_id → score)
  const scoreMap = new Map<string, number>();
  topChunks.forEach((p: any) => {
    scoreMap.set(p.id.toString(), p.score);
  });

  // Extrair doc_ids únicos dos chunks retornados
  const docIds = [...new Set(topChunks.map((p: any) => p.payload.doc_id))];

  // Limitar a top 30 documentos
  const topDocIds = docIds.slice(0, 30);

  console.log(`Buscando todos os chunks de ${topDocIds.length} documentos...`);

  // Buscar TODOS os chunks desses documentos
  const allChunksResult = await qdrantClient.scroll(collectionName, {
    filter: {
      must: [
        {
          key: 'doc_id',
          match: { any: topDocIds }
        }
      ]
    },
    limit: 400, // Suficiente para ~30 docs com média 10-13 chunks cada
    with_payload: true,
  });

  // Mapear para o formato esperado com scores corretos
  const results = (allChunksResult.points || []).map((point: any) => ({
    id: point.id.toString(),
    score: scoreMap.get(point.id.toString()) || 0, // Score RRF ou 0 para chunks adicionais
    payload: point.payload as HybridSearchResult['payload'],
  }));

  console.log(`✓ Busca híbrida concluída: ${results.length} chunks de ${topDocIds.length} documentos`);

  return results;
}

/**
 * IMPLEMENTAÇÃO ATUAL:
 *
 * ✅ Pipeline de Busca Híbrida:
 *
 * 1. Dense (Voyage AI 512d/1024d) → Busca semântica
 * 2. Sparse (BM25) → Busca por keywords
 * 3. RRF Fusion → Combina e rankeia resultados
 * 4. Retorna documentos completos (todos os chunks)
 *
 * Serviços necessários:
 * - Voyage AI API (dense embeddings 512d ou 1024d)
 * - Embedding Service (BM25 sparse embeddings)
 * - Qdrant Cloud (armazena dense + sparse vectors)
 *
 * Modos:
 * - Normal: busca em 1 collection
 * - Comparação: busca em 512d e 1024d simultaneamente
 */
