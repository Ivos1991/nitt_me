import assert from 'node:assert/strict';
import {Vector3, Raycaster} from 'three';
import {parsePattern,formatPatternCounts,nextPatternRow} from '../src/pattern.mjs';
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

assert.equal(nextPatternRow('R8-R14: 42 sc (42)', 'mr'), 15);
assert.equal(nextPatternRow('r8–r14 42 sc', 'mr'), 15);
assert.equal(nextPatternRow('Ch 10 (10)', 'oval'), 1);
assert.equal(nextPatternRow('MR', 'mr'), 1);

const headBase = 'R1: 6sc\nR2: 6 inc\nR3: (sc, inc) x 6\nR4–R8: 18 sc';
const headClose = headBase + '\nR9: (sc, dec) x 6\nR10: 6dec';
for (const [pattern, expectedOpen] of [[headBase,true],[headClose,false]]) {
  const parsed = parsePattern(pattern,'mr');
  assert.equal(parsed.error,'');
  const model = buildPart({...part,mode:'mr'},parsed);
  assert.equal(model.openRound,expectedOpen);
  const core = model.group.userData.core;
  const opening = model.shape.at(-1).y;
  const ray = new Raycaster(new Vector3(.016,opening-4,.021),new Vector3(0,1,0));
  const [hit] = ray.intersectObject(core);
  assert(hit, 'the ray should meet the fabric inside the head');
  if (expectedOpen) assert(hit.point.y > opening+1, 'the opening exposes the interior');
  else assert(hit.point.y < opening, 'the closure meets the ray at the rim');
}

const curvedHead = [
  'R1: 6 sc', 'R2: 6 inc', 'R3: (sc, inc) x 6', 'R4: (2 sc, inc) x 6',
  'R5: (3 sc, inc) x 6', 'R6: (4 sc, inc) x 6', 'R7: (5 sc, inc) x 6',
  'R8-R11: 42 sc', 'R12: (5 sc, dec) x 6', 'R13: (4 sc, dec) x 6',
  'R14: (3 sc, dec) x 6', 'R15: (2 sc, dec) x 6', 'R16: (sc, dec) x 6', 'R17: 6 dec',
];
const roundPart = {...part, mode: 'mr'};
const openHead = buildPart(roundPart, parsePattern(curvedHead.slice(0, 10).join('\n'), 'mr'));
const {shape: profile, openRound} = buildPart(roundPart, parsePattern(curvedHead.join('\n'), 'mr'));
const radialChange = (row) => Math.abs(profile[row].r - profile[row - 1].r);
const verticalChange = (row) => Math.abs(profile[row].y - profile[row - 1].y);
assert.equal(openHead.openRound, true);
assert.equal(openRound, false);
assert(radialChange(6) < radialChange(1), 'the widening base eases into the wall');
assert(profile[8].r > profile[6].r && profile[8].r > profile[10].r, 'the wall curves outward slightly');
assert(radialChange(11) < radialChange(15), 'the first decrease eases into the closing curve');
assert(verticalChange(11) > verticalChange(16), 'the final decreases flatten toward the closure');
assert.equal(openHead.shape[11].r, profile[11].r, 'closing later rounds preserves the earlier taper');
