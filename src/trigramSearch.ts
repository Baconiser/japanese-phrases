export type SearchResult<T> = {
    score: number;
    item: T;
};

type IndexedDoc<T> = {
    item: T;
    text: string;
    trigrams: Set<string>;
};

export type SearchOptions = {
    limit?: number;
    minScore?: number;
};

export class TrigramSearchIndex<T = unknown> {
    private docs: IndexedDoc<T>[] = [];
    private gramToDocIds: Map<string, Set<number>> = new Map();

    add(text: string, item: T): number {
        const normalized = normalizeText(text);
        const trigrams = buildTrigramSet(normalized);

        const id = this.docs.length;
        this.docs.push({ item, text: normalized, trigrams });

        for (const g of trigrams) {
            let bucket = this.gramToDocIds.get(g);
            if (!bucket) {
                bucket = new Set<number>();
                this.gramToDocIds.set(g, bucket);
            }
            bucket.add(id);
        }
        return id;
    }

    addAll(getText: (item: T) => string, items: T[]): void {
        for (const item of items) this.add(getText(item), item);
    }

    search(query: string, opts: SearchOptions = {}): SearchResult<T>[] {
        const limit = opts.limit ?? 10;
        const minScore = opts.minScore ?? 0.15;

        const qNorm = normalizeText(query);
        if (!qNorm) return [];

        const qTris = buildTrigramSet(qNorm);

        const candidateIds: Set<number> = new Set();
        for (const g of qTris) {
            const bucket = this.gramToDocIds.get(g);
            if (bucket) for (const id of bucket) candidateIds.add(id);
        }

        if (candidateIds.size === 0 && qTris.size === 0) {
            for (let i = 0; i < this.docs.length; i++) candidateIds.add(i);
        }

        const results: SearchResult<T>[] = [];
        for (const id of candidateIds) {
            const doc = this.docs[id];

            let score = 0;
            if (qTris.size === 0) {
                if (doc.text.includes(qNorm)) score = 1;
                else continue;
            } else {
                const intersectSize = intersectionSize(qTris, doc.trigrams);
                if (intersectSize === 0) {
                    if (doc.text.includes(qNorm)) score = 0.2;
                    else continue;
                } else {
                    const unionSize = qTris.size + doc.trigrams.size - intersectSize;
                    score = unionSize ? intersectSize / unionSize : 0;
                }
            }

            if (score >= minScore) results.push({ score, item: doc.item });
        }

        results.sort((a, b) => b.score - a.score);
        return results.slice(0, limit);
    }
}

function normalizeText(input: string): string {
    return input
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildTrigramSet(text: string): Set<string> {
    const grams = new Set<string>();
    if (!text) return grams;

    for (const token of text.split(' ')) {
        if (!token) continue;
        const padded = `  ${token}  `;
        for (let i = 0; i <= padded.length - 3; i++) {
            grams.add(padded.slice(i, i + 3));
        }
    }
    return grams;
}

function intersectionSize<T>(a: Set<T>, b: Set<T>): number {
    let n = 0;
    for (const v of a) if (b.has(v)) n++;
    return n;
}

