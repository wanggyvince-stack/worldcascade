import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * WO-S4-07: Causal Chain Engine Tests
 * Validates the auto-generated causal chains and engine output.
 */

const DATA_PATH = path.resolve(__dirname, '../public/data/predictions.json');
const AUTO_PATH = path.resolve(__dirname, '../public/data/causal_chains_auto.json');

interface Prediction {
  id: string;
  domain: string;
  verificationDate: string;
  causalChainNodes: Array<{ step: string; evidence_strength: string }>;
  causalChainIds: string[];
}

interface CausalChain {
  id: string;
  title: string;
  type: string;
  domains: string[];
  linkedPredictions: string[];
  nodes: Array<{ step: string; evidence_strength: string }>;
  strength?: number;
  source?: string;
}

interface DataFile {
  metadata: Record<string, unknown>;
  predictions: Prediction[];
  causalChains: CausalChain[];
}

test.describe('Causal Chain Engine', () => {
  let data: DataFile;
  let autoChains: CausalChain[];

  test.beforeAll(() => {
    data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    autoChains = JSON.parse(fs.readFileSync(AUTO_PATH, 'utf-8')).causalChains;
  });

  test('auto-generated chains exist and are non-empty', () => {
    expect(autoChains.length).toBeGreaterThanOrEqual(10);
    expect(autoChains.length).toBeLessThanOrEqual(30);
  });

  test('all chains have required fields', () => {
    for (const chain of autoChains) {
      expect(chain.id).toBeTruthy();
      expect(chain.id).toMatch(/^CC-[A-Z]+-\d{3}$/);
      expect(chain.title).toBeTruthy();
      expect(chain.domains).toBeInstanceOf(Array);
      expect(chain.domains.length).toBeGreaterThan(0);
      expect(chain.linkedPredictions).toBeInstanceOf(Array);
      expect(chain.linkedPredictions.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('V1: time monotonicity — all chains have dates in order', () => {
    const predMap = new Map(data.predictions.map(p => [p.id, p]));

    for (const chain of autoChains) {
      const dates = chain.linkedPredictions
        .map(id => predMap.get(id)?.verificationDate)
        .filter(Boolean) as string[];

      for (let i = 0; i < dates.length - 1; i++) {
        expect(new Date(dates[i]).getTime()).toBeLessThanOrEqual(
          new Date(dates[i + 1]).getTime()
        );
      }
    }
  });

  test('V2: domain coherence — max 3 domain transitions per chain', () => {
    const predMap = new Map(data.predictions.map(p => [p.id, p]));

    for (const chain of autoChains) {
      const domains = chain.linkedPredictions
        .map(id => predMap.get(id)?.domain)
        .filter(Boolean) as string[];

      let transitions = 0;
      for (let i = 0; i < domains.length - 1; i++) {
        if (domains[i] !== domains[i + 1]) transitions++;
      }
      expect(transitions).toBeLessThanOrEqual(3);
    }
  });

  test('V3: evidence strength ≥ 50 average', () => {
    const strengthMap: Record<string, number> = { HIGH: 100, MEDIUM: 60, LOW: 30 };

    for (const chain of autoChains) {
      const strengths: number[] = [];
      for (const fpId of chain.linkedPredictions) {
        const pred = data.predictions.find(p => p.id === fpId);
        if (pred?.causalChainNodes) {
          for (const node of pred.causalChainNodes) {
            strengths.push(strengthMap[node.evidence_strength] || 30);
          }
        }
      }
      if (strengths.length > 0) {
        const avg = strengths.reduce((a, b) => a + b, 0) / strengths.length;
        expect(avg).toBeGreaterThanOrEqual(50);
      }
    }
  });

  test('all linkedPredictions reference valid FP IDs', () => {
    const validIds = new Set(data.predictions.map(p => p.id));

    for (const chain of autoChains) {
      for (const fpId of chain.linkedPredictions) {
        expect(validIds.has(fpId)).toBeTruthy();
      }
    }
  });

  test('chain IDs are unique', () => {
    const ids = autoChains.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('merged predictions.json has both detailed and auto chains', () => {
    const chains = data.causalChains;
    const detailedCount = chains.filter(c => c.id.startsWith('CC-CROSS-00')).length;
    const autoCount = chains.filter(c => c.source === 'auto').length;

    expect(detailedCount).toBeGreaterThanOrEqual(3);
    expect(autoCount).toBeGreaterThanOrEqual(10);
  });

  test('predictions causalChainIds reference existing chains', () => {
    const chainIds = new Set(data.causalChains.map(c => c.id));

    for (const pred of data.predictions) {
      for (const ccId of pred.causalChainIds || []) {
        expect(chainIds.has(ccId)).toBeTruthy();
      }
    }
  });
});

test.describe('Visual & Rendering Validation', () => {
  let data: DataFile;

  test.beforeAll(() => {
    data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
  });

  test('all chain endpoints are valid FP events', () => {
    const validIds = new Set(data.predictions.map(p => p.id));
    
    for (const chain of data.causalChains) {
      const linked = chain.linkedPredictions;
      expect(linked.length).toBeGreaterThanOrEqual(2);
      // First and last must be valid FP IDs
      expect(validIds.has(linked[0])).toBeTruthy();
      expect(validIds.has(linked[linked.length - 1])).toBeTruthy();
    }
  });

  test('time monotonicity across ALL chains (not just auto)', () => {
    const predMap = new Map(data.predictions.map(p => [p.id, p]));
    
    for (const chain of data.causalChains) {
      const dates = chain.linkedPredictions
        .map(id => predMap.get(id)?.verificationDate)
        .filter(Boolean) as string[];
      
      for (let i = 0; i < dates.length - 1; i++) {
        const curr = new Date(dates[i]).getTime();
        const next = new Date(dates[i + 1]).getTime();
        expect(curr).toBeLessThanOrEqual(next);
      }
    }
  });

  test('every domain with predictions has at least 1 chain passing through', () => {
    const predMap = new Map(data.predictions.map(p => [p.id, p]));
    const allDomains = new Set(data.predictions.map(p => p.domain));
    const domainsWithChains = new Set<string>();
    
    for (const chain of data.causalChains) {
      for (const fpId of chain.linkedPredictions) {
        const pred = predMap.get(fpId);
        if (pred) domainsWithChains.add(pred.domain);
      }
    }
    
    // Every domain that has predictions should have at least 1 chain
    for (const domain of allDomains) {
      expect(domainsWithChains.has(domain)).toBeTruthy();
    }
  });

  test('chain strength values are not all identical', () => {
    const strengths = data.causalChains
      .map(c => c.strength)
      .filter((s): s is number => s !== undefined);
    
    expect(strengths.length).toBeGreaterThan(0);
    const uniqueStrengths = new Set(strengths);
    // Should have at least 3 distinct strength values
    expect(uniqueStrengths.size).toBeGreaterThanOrEqual(3);
  });

  test('no duplicate chain IDs across all chains', () => {
    const ids = data.causalChains.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('all chains have non-empty linkedPredictions with valid references', () => {
    const validIds = new Set(data.predictions.map(p => p.id));
    
    for (const chain of data.causalChains) {
      expect(chain.linkedPredictions).toBeInstanceOf(Array);
      expect(chain.linkedPredictions.length).toBeGreaterThanOrEqual(2);
      
      for (const fpId of chain.linkedPredictions) {
        expect(validIds.has(fpId)).toBeTruthy();
      }
    }
  });

  test('hand-crafted chains have strength field', () => {
    const handCrafted = data.causalChains.filter(c => c.id.startsWith('CC-CROSS-00'));
    
    for (const chain of handCrafted) {
      expect(chain.strength).toBeDefined();
      expect(typeof chain.strength).toBe('number');
      expect(chain.strength).toBeGreaterThanOrEqual(50);
    }
  });

  test('chain titles do not truncate at bad positions', () => {
    for (const chain of data.causalChains) {
      const title = chain.title;
      expect(title).toBeTruthy();
      // Should not end with very short partial word like "c..." (1 char before ...)
      // Allow complete words before "..." like "most...", "by...", "it..."
      if (title.endsWith('...')) {
        const beforeEllipsis = title.slice(0, -3);
        const lastWord = beforeEllipsis.split(/\s+/).pop() || '';
        // Last word before "..." should be at least 2 chars (not a single-char mid-word break)
        expect(lastWord.length).toBeGreaterThanOrEqual(2);
      }
      // Should not end with "1/1→" pattern
      expect(title).not.toMatch(/→$/);
    }
  });
});
