export function dcgAtK(relevances: readonly number[], k: number): number {
  return relevances.slice(0, k).reduce((total, relevance, index) => total + (2 ** relevance - 1) / Math.log2(index + 2), 0);
}

export function ndcgAtK(relevances: readonly number[], k: number): number {
  const ideal = [...relevances].sort((left, right) => right - left);
  const idealDcg = dcgAtK(ideal, k);
  return idealDcg === 0 ? 0 : dcgAtK(relevances, k) / idealDcg;
}

export function successAtK(relevances: readonly number[], k: number): 0 | 1 {
  return relevances.slice(0, k).some((relevance) => relevance >= 1) ? 1 : 0;
}
