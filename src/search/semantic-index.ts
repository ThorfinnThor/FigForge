export type SearchProfileId = "compact-minilm" | "quality-e5";

export interface QueryEmbedding {
  profileId: SearchProfileId;
  values: Float32Array;
}

export interface SemanticIndex {
  profileId: SearchProfileId;
  dimension: number;
  orderedComponentIds: string[];
  values: Float32Array;
}

export interface SemanticHit {
  componentId: string;
  score: number;
}

export function rankSemanticIndex(index: SemanticIndex, query: QueryEmbedding, limit = 10): SemanticHit[] {
  if (index.profileId !== query.profileId) {
    throw new Error(`Model/index mismatch: query=${query.profileId}, index=${index.profileId}`);
  }
  if (query.values.length !== index.dimension) {
    throw new Error(`Query dimension ${query.values.length} does not match index dimension ${index.dimension}`);
  }
  if (index.values.length !== index.orderedComponentIds.length * index.dimension) {
    throw new Error("Semantic index length does not match component count and dimension");
  }
  const hits = index.orderedComponentIds.map((componentId, documentIndex) => {
    let score = 0;
    const offset = documentIndex * index.dimension;
    for (let dimensionIndex = 0; dimensionIndex < index.dimension; dimensionIndex += 1) {
      score += (index.values[offset + dimensionIndex] ?? 0) * (query.values[dimensionIndex] ?? 0);
    }
    return { componentId, score };
  });
  return hits.sort((left, right) => right.score - left.score || left.componentId.localeCompare(right.componentId)).slice(0, limit);
}
