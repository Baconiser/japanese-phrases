export class TrigramSearchIndex {
  constructor(){ this.docs = []; this.gramToDocIds = new Map(); }
  add(text, item){
    const normalized = normalizeText(text);
    const trigrams = buildTrigramSet(normalized);
    const id = this.docs.length;
    this.docs.push({ item, text: normalized, trigrams });
    for (const g of trigrams) {
      let bucket = this.gramToDocIds.get(g);
      if (!bucket) { bucket = new Set(); this.gramToDocIds.set(g, bucket); }
      bucket.add(id);
    }
    return id;
  }
  addAll(getText, items){ for (const item of items) this.add(getText(item), item); }
  search(query, opts = {}){
    const limit = opts.limit ?? 10;
    const minScore = opts.minScore ?? 0.15;
    const qNorm = normalizeText(query);
    if (!qNorm) return [];
    const qTris = buildTrigramSet(qNorm);
    const candidateIds = new Set();
    for (const g of qTris) { const b = this.gramToDocIds.get(g); if (b) for (const id of b) candidateIds.add(id); }
    if (candidateIds.size === 0 && qTris.size === 0) { for (let i = 0; i < this.docs.length; i++) candidateIds.add(i); }
    const results = [];
    for (const id of candidateIds) {
      const doc = this.docs[id];
      let score = 0;
      if (qTris.size === 0) { if (doc.text.includes(qNorm)) score = 1; else continue; }
      else {
        const intersectSize = intersectionSize(qTris, doc.trigrams);
        if (intersectSize === 0) { if (doc.text.includes(qNorm)) score = 0.2; else continue; }
        else { const unionSize = qTris.size + doc.trigrams.size - intersectSize; score = unionSize ? intersectSize / unionSize : 0; }
      }
      if (score >= minScore) results.push({ score, item: doc.item });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }
}

function normalizeText(input){
  return input.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
}
function buildTrigramSet(text){
  const grams = new Set(); if (!text) return grams;
  for (const token of text.split(' ')) { if (!token) continue; const padded = '  ' + token + '  '; for (let i=0; i<=padded.length-3; i++) grams.add(padded.slice(i,i+3)); }
  return grams;
}
function intersectionSize(a,b){ let n=0; for (const v of a) if (b.has(v)) n++; return n; }

