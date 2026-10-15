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
