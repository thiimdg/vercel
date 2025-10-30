'use client';

import { useState } from 'react';

interface SearchResult {
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
  };
}

// Função para agrupar chunks pelo documento
function groupByDocument(results: SearchResult[]): SearchResult[] {
  const grouped = new Map<string, SearchResult[]>();

  // Agrupar por doc_id
  results.forEach(result => {
    const docId = result.payload.doc_id;
    if (!grouped.has(docId)) {
      grouped.set(docId, []);
    }
    grouped.get(docId)!.push(result);
  });

  // Retornar array de documentos com chunks agrupados e ordenados
  return Array.from(grouped.values()).map(chunks => {
    // Ordenar chunks pelo índice
    chunks.sort((a, b) => a.payload.chunk_index - b.payload.chunk_index);

    // Juntar todos os chunks do documento
    const fullText = chunks.map(c => c.payload.chunk_text).join(' ');

    // Retornar documento completo usando o primeiro chunk como base
    return {
      ...chunks[0],
      payload: {
        ...chunks[0].payload,
        chunk_text: fullText, // Texto completo (todos os chunks juntos)
      },
      score: Math.max(...chunks.map(c => c.score)), // Melhor score entre os chunks
    };
  });
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [selectedDimension, setSelectedDimension] = useState<'512' | '1024'>('512');
  const [compareMode, setCompareMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estado para modo normal
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchTime, setSearchTime] = useState<number | null>(null);

  // Estado para modo comparação
  const [resultsComparison, setResultsComparison] = useState<{
    voyage512?: SearchResult[];
    voyage1024?: SearchResult[];
  } | null>(null);
  const [searchTimes, setSearchTimes] = useState<{
    voyage512?: number;
    voyage1024?: number;
  } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      setError('Por favor, digite uma consulta');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setResultsComparison(null);
    setSearchTime(null);
    setSearchTimes(null);

    try {
      const response = await fetch('/api/search-hybrid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          limit: 30,
          collection: compareMode ? null : `tjsc-voyage-${selectedDimension}-chunks`,
          compareMode,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao realizar busca');
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro desconhecido');
      }

      // Modo comparação
      if (compareMode && data.resultsComparison) {
        const grouped512 = groupByDocument(data.resultsComparison.voyage512 || []);
        const grouped1024 = groupByDocument(data.resultsComparison.voyage1024 || []);

        setResultsComparison({
          voyage512: grouped512,
          voyage1024: grouped1024,
        });
        setSearchTimes(data.searchTimes);
      } else {
        // Modo normal
        const groupedResults = groupByDocument(data.results || []);
        setResults(groupedResults);
        setSearchTime(data.searchTime);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar busca');
      console.error('Erro na busca:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Busca Jurídica - TJSC
          </h1>
          <p className="text-gray-600">
            Tribunal de Justiça de Santa Catarina • Busca Híbrida (Voyage AI + BM25 + RRF)
          </p>
        </header>

        {/* Controles de Busca */}
        <div className="mb-6 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="mb-4">
            <h3 className="font-semibold mb-3 text-gray-900">Modelo de Embeddings:</h3>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="512"
                  checked={selectedDimension === '512'}
                  onChange={() => setSelectedDimension('512')}
                  disabled={loading || compareMode}
                  className="w-4 h-4"
                />
                <span className={selectedDimension === '512' ? 'font-semibold text-gray-900' : 'text-gray-900'}>
                  Voyage AI 512d
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="1024"
                  checked={selectedDimension === '1024'}
                  onChange={() => setSelectedDimension('1024')}
                  disabled={loading || compareMode}
                  className="w-4 h-4"
                />
                <span className={selectedDimension === '1024' ? 'font-semibold text-gray-900' : 'text-gray-900'}>
                  Voyage AI 1024d
                </span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={compareMode}
                onChange={(e) => setCompareMode(e.target.checked)}
                disabled={loading}
                className="w-4 h-4"
              />
              <span className="font-medium text-gray-900">
                🔍 Comparar 512d vs 1024d lado a lado
              </span>
            </label>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite sua consulta (ex: dano moral por acidente de trabalho)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            <strong>Erro:</strong> {error}
          </div>
        )}

        {/* Stats - Modo Normal */}
        {!compareMode && results.length > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>{results.length} documentos encontrados</strong>
              {searchTime && <span> • Tempo de busca: {searchTime}ms</span>}
              <span> • Modelo: Voyage {selectedDimension}d (Híbrido: Dense + BM25 + RRF)</span>
            </p>
          </div>
        )}

        {/* Results - Modo Comparação */}
        {compareMode && resultsComparison && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coluna 512d */}
            <div className="space-y-3">
              <div className="sticky top-0 z-10 bg-blue-50 border-2 border-blue-300 p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-bold text-blue-900">
                  🔵 Voyage AI 512d (Híbrido)
                </h3>
                <div className="flex gap-4 text-sm text-blue-700 mt-1">
                  <span>Top 30 resultados</span>
                  <span>•</span>
                  <span>{searchTimes?.voyage512}ms</span>
                </div>
              </div>

              {resultsComparison.voyage512?.map((result, index) => (
                <div
                  key={result.id}
                  className="bg-white p-4 rounded-lg shadow-sm border border-blue-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {result.payload.processNumber && (
                          <span className="text-xs text-gray-500 font-mono">
                            {result.payload.processNumber}
                          </span>
                        )}
                        {result.payload.dateEvent && (
                          <span className="text-xs text-gray-400">
                            {new Date(result.payload.dateEvent).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed line-clamp-6">
                        {result.payload.chunk_text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Coluna 1024d */}
            <div className="space-y-3">
              <div className="sticky top-0 z-10 bg-purple-50 border-2 border-purple-300 p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-bold text-purple-900">
                  🟣 Voyage AI 1024d (Híbrido)
                </h3>
                <div className="flex gap-4 text-sm text-purple-700 mt-1">
                  <span>Top 30 resultados</span>
                  <span>•</span>
                  <span>{searchTimes?.voyage1024}ms</span>
                </div>
              </div>

              {resultsComparison.voyage1024?.map((result, index) => (
                <div
                  key={result.id}
                  className="bg-white p-4 rounded-lg shadow-sm border border-purple-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {result.payload.processNumber && (
                          <span className="text-xs text-gray-500 font-mono">
                            {result.payload.processNumber}
                          </span>
                        )}
                        {result.payload.dateEvent && (
                          <span className="text-xs text-gray-400">
                            {new Date(result.payload.dateEvent).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed line-clamp-6">
                        {result.payload.chunk_text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results - Modo Normal */}
        {!compareMode && results.length > 0 && (
          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={result.id}
                className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      {result.payload.processNumber && (
                        <span className="text-sm text-gray-600 font-mono">
                          Processo: {result.payload.processNumber}
                        </span>
                      )}
                      {result.payload.dateEvent && (
                        <span className="text-sm text-gray-500">
                          Data: {new Date(result.payload.dateEvent).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                    <div className="text-gray-800 leading-relaxed">
                      {result.payload.chunk_text}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && !compareMode && results.length === 0 && query && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Nenhum resultado encontrado</p>
            <p className="text-sm mt-2">Tente usar palavras-chave diferentes</p>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>
            Busca Híbrida: Voyage AI 3.5 Lite + BM25 + RRF Fusion
          </p>
          <p className="mt-1">
            Comparação 512d vs 1024d • 30 resultados • {new Date().getFullYear()}
          </p>
        </footer>
      </div>
    </div>
  );
}
