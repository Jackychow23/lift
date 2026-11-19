import { STATION_LABEL, sharedStation } from '../lib/planner';
import type { BlockKind } from '../lib/types';

export interface BlockView {
  title: string;
  /** e.g. "One set of each, back and forth · Dumbbells" */
  how: string;
  alternate: boolean;
  /** Per exercise: "1a", "1b", "2", … */
  tags: string[];
}

/** Display names for workout blocks: Pair 1, Pair 2, Posture finisher… plus what to do and where. */
export function describeBlocks(blocks: { kind: BlockKind; ids: string[] }[]): BlockView[] {
  let n = 0;
  return blocks.map((b) => {
    const st = sharedStation(b.ids);
    const many = b.ids.length > 1;
    const alternate = many && st !== null;
    const where = st && st !== 'anywhere' ? ` · ${STATION_LABEL[st]}` : '';
    const how = alternate ? `One set of each, back and forth${where}` : many ? 'Finish one, then the other' : where.replace(' · ', '');
    if (b.kind === 'finisher') {
      return { title: 'Posture finisher', how, alternate, tags: b.ids.map((_, k) => (many ? `P${String.fromCharCode(97 + k)}` : 'P')) };
    }
    n += 1;
    return {
      title: alternate ? `Pair ${n}` : many ? `Block ${n}` : `Exercise ${n}`,
      how,
      alternate,
      tags: b.ids.map((_, k) => (many ? `${n}${String.fromCharCode(97 + k)}` : `${n}`))
    };
  });
}
