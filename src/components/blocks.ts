import { STATION_LABEL, sharedStation, type Station } from '../lib/planner';
import type { BlockKind } from '../lib/types';

export interface BlockView {
  /** Number shown on the exercise(s): "1", or "3a"/"3b" for an old-style pair. */
  tags: string[];
  /** Where it happens; null for no-equipment moves (they stay with the group before them). */
  station: Station;
  /** True when this block starts a new equipment group, so a header is shown above it. */
  newGroup: boolean;
  /** Only for old-style pairs still in a workout: how to do them. */
  how: string | null;
  posture: boolean;
}

export const GROUP_LABEL: Record<Station, string> = { dumbbells: 'Dumbbells & bench', machine: 'Pulldown/row machine', cable: 'Cable machine', anywhere: 'No equipment' };

/** Numbering and equipment groups for a workout: 1, 2 at the dumbbells; 3, 4, 5 at the cable machine… */
export function describeBlocks(blocks: { kind: BlockKind; ids: string[] }[]): BlockView[] {
  let n = 0;
  let prev: Station | null = null;
  return blocks.map((b) => {
    const st = sharedStation(b.ids);
    const many = b.ids.length > 1;
    const eff: Station = st === null ? 'cable' : st === 'anywhere' ? prev ?? 'anywhere' : st;
    const newGroup = eff !== prev;
    prev = eff;
    n += 1;
    const how = many ? (st !== null ? `One set of each, back and forth${st !== 'anywhere' ? ` · ${STATION_LABEL[st]}` : ''}` : 'Finish one, then the other') : null;
    return {
      tags: b.ids.map((_, k) => (many ? `${n}${String.fromCharCode(97 + k)}` : `${n}`)),
      station: eff,
      newGroup,
      how,
      posture: b.kind === 'finisher'
    };
  });
}

export const restText = (secs: number) => (secs >= 60 ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} rest` : `${secs} s rest`);
