import assert from 'node:assert/strict';
import {parsePattern,formatPatternCounts} from '../src/pattern.mjs';
import {buildPart} from '../src/model.mjs';
const initial='R1: 8 sc, 3 sc in next stitch, 8sc, 2 sc in last stitch';
const second='R2: 8 sc, 3 inc, 8 sc, 2 inc';
const part={id:'demo',mode:'oval',stitch:'X',yarn:5,hook:4,color:'#cc9fd3'};
function oval(line) {
  const parsed=parsePattern(initial+'\n'+second+'\n'+line,'oval');
  assert.equal(parsed.error,'');
  assert.deepEqual(parsed.counts,[21,26,24]);
  return buildPart(part,parsed).shape;
}
const sequence='22 sc, 2 dec';
const flat=oval('R3: '+sequence);
const outward=oval('R3: BLO '+sequence);
const inward=oval('R3: ('+sequence+') in front loop only');
assert(flat.every(row=>row.y===0));
assert(flat[2].r>flat[1].r);
assert(outward[2].y>0 && outward[2].r>outward[1].r);
assert(inward[2].y>0 && inward[2].r<inward[1].r);
const pattern='ch 8 (99) # base\nr1: 7 sc\nR2–3: 3 sc, inc, dec, sc';
const parsed=parsePattern(pattern,'rows',{calculateCounts:true});
assert.deepEqual(parsed.counts,[8,7,7]);
assert.equal(formatPatternCounts(pattern,parsed.counts),'ch 8 (8) # base\nr1: 7 sc (7)\nR2–3: 3 sc, inc, dec, sc (7)');

for (const stitch of ['X', 'V']) {
  for (const loop of ['', 'BLO ', 'FLO ']) {
    const pattern = [initial, second, 'R3: ' + loop + sequence].join('\n');
    const parsed = parsePattern(pattern, 'oval');
    const model = buildPart({...part, stitch}, parsed);
    const {threads, thickness} = model.group.userData;
    const preceding = threads.slice(21, 47);
    const last = threads.slice(47, 71);

    last.forEach((thread, index) => {
      const source = parsed.rows[2].sources[index];
      const closest = Math.min(...thread.flatMap(point =>
        preceding[source].map(other => point.distanceTo(other))));
      assert(closest < thickness, stitch + ' ' + loop + 'stitch ' + (index + 1));
    });
  }
}
