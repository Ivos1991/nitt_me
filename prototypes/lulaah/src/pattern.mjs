const aliases = {
  'magic ring': 'mr', 'טבעת קסם': 'mr', 'חצי עמוד': 'sc', 'עין שרשרת': 'ch',
  'הגדלה': 'inc', 'הרחבה': 'inc', 'צמצום': 'dec', 'הפחתה': 'dec',
  'עמוד קצר': 'hdc', 'עמוד כפול': 'tr', 'עמוד': 'dc', 'עין שטוחה': 'slst',
  'סיבוב': 'r', 'שורה': 'r', 'round': 'r', 'row': 'r', 'rnd': 'r',
  'sl st': 'slst', 'sc2tog': 'dec', 'invdec': 'dec', '×': 'x', '–': '-', '→': ':'
};
const measure = { sc: 1, inc: 1, dec: 1, ch: 0.65, hdc: 1.22, dc: 1.56, tr: 1.9, slst: 0.55, mr: 1 };
export function capitalizePattern(input) {
  return input.replace(/(^|\n)([^\S\r\n]*)([a-z])/g, (_, line, indent, first) =>
    line + indent + first.toUpperCase());
}

// One trip around the foundation: first side, far turn, return side, near turn.
function foundationSections(groups, total) {
  const turns = groups.filter(group => group.count > 1 && ['next','last','same'].includes(group.at));
  const far = turns.find(group => group.start > 0 && group.start + group.count < total);
  const near = turns.find(group => group !== far && group.start + group.count === total);
  if (!far || !near || near.start <= far.start + far.count) return null;
  return [far.start,far.count,near.start-far.start-far.count,near.count];
}

function advanceOval(sections, sources) {
  const firstEnd = sections[0];
  const farEnd = firstEnd + sections[1];
  const returnEnd = farEnd + sections[2];
  const next = [0,0,0,0];
  for (const source of sources) {
    const section = source < firstEnd ? 0 : source < farEnd ? 1 : source < returnEnd ? 2 : 3;
    next[section]++;
  }
  return next;
}

const countSuffix = /\s*(?:\[(\d+)\]|\((\d+)\)|=\s*(\d+))\s*$/;

export function formatPatternCounts(input, counts, activeLine = -1) {
  return input.split('\n').map((line, index)=>{
    if (index===activeLine || counts[index]===undefined) return line;
    const commentAt=line.search(/[;#]/);
    const instructions=commentAt<0 ? line : line.slice(0,commentAt);
    const comment=commentAt<0 ? '' : ' '+line.slice(commentAt);
    return instructions.replace(countSuffix,'').trimEnd()+' ('+counts[index]+')'+comment;
  }).join('\n');
}

const rowLabel = /^(?:r\s*)?(\d+)(?:\s*-\s*(?:r\s*)?(\d+))?\s*[:.)]\s*/;

const prefixedRowLabel = /^r\s*(\d+)(?:\s*-\s*(?:r\s*)?(\d+))?(?:\s+|$)/;

export function nextPatternRow(input, mode) {
  const last = input.trimEnd().split(/\r?\n/).at(-1)?.split(/[;#]/)[0].trim()
    .toLowerCase().replace(/(?:round|row|rnd|שורה|סיבוב)\s*/g,'r').replace(/[–—]/g,'-');
  const label = last?.match(rowLabel) ?? last?.match(prefixedRowLabel);
  if (label) return Number(label[2] ?? label[1]) + 1;
  const {rows} = parsePattern(input, mode, {calculateCounts:true});
  const numbered = rows.length === 1 && rows[0].stitches.every(kind=>kind==='ch') ? [] : rows;
  return (numbered.at(-1)?.number ?? 0) + 1;
}

export function parsePattern(input, mode, {calculateCounts=false}={}) {
  const rows = [];
  const counts = [];
  let foundation = 0;
  const lines = input.split(/\r?\n/);
  for (const [index, original] of lines.entries()) {
    try {
      let line = original.split(/[;#]/)[0].trim().toLowerCase();
      if (!line) continue;
      line = line.replace(/(?:בעין|לתוך העין|בתוך העין)\s+(?:האחרונה|הראשונה|הבאה|הזו)/g,
        phrase => ' in the ' + (phrase.endsWith('האחרונה') ? 'last' : phrase.endsWith('הראשונה') ? 'first' : phrase.endsWith('הבאה') ? 'next' : 'same') + ' stitch');
      line = line.replace(/\b(?:work|make)\s+(?=\d*\s*(?:sc|inc|dec|ch|hdc|dc|tr|slst)\b)/g, '');
      for (const [word, alias] of Object.entries(aliases)) line = line.replaceAll(word, alias);
      line=line.replace(/—/g,'-');
      const label = line.match(rowLabel) ?? line.match(prefixedRowLabel);
      if (label) line = line.slice(label[0].length);
      const expected = line.match(countSuffix);
      if (expected) line = line.slice(0, expected.index);
      line = line.replace(/\bback[ -]+loops?[ -]+only\b/g,'blo')
        .replace(/\bfront[ -]+loops?[ -]+only\b/g,'flo')
        .replace(/\b(?:both|two)\s+loops\b/g,'both')
        .replace(/\(\s*(blo|flo|both)\s*\)/g,' in $1');
      const repeats = label?.[2] ? +label[2] - +label[1] + 1 : 1;
      if (repeats < 1 || rows.length + repeats > 180) throw Error('טווח שורות לא תקין או ארוך מדי');
      const pattern = /\s*(?:(\d+)\s*(sc|inc|dec|ch|hdc|dc|tr|slst|mr)\b|(sc|inc|dec|ch|hdc|dc|tr|slst|mr)\b(?:\s*(?:[x*]\s*)?(\d+)(?!\d|\s*(?:sc|inc|dec|ch|hdc|dc|tr|slst|mr)\b))?|([([])|([)\]])(?:\s*(?:x|\*)?\s*(\d+))?|[,.:|]|(in\s+mr\b|into\s+mr\b|turn\b|להפוך|continue\s+on\s+the\s+other\s+side|continue\s+on\s+the\s+opposite\s+side)(?=\s|$|[,.:])|(in(?:to)?\s+(?:the\s+)?(first|last|next|same)\s+(?:stitch|st)\b))/y;
      const loopToken = /\s*(?:(in|through)\s+(?:the\s+)?)?(blo|flo|both)\b/y;
      const stack = [{ stitches: [], opening: '', loop:'both', lastStart:0 }];
      let cursor = 0;
      while (cursor < line.trimEnd().length) {
        loopToken.lastIndex = cursor;
        const modifier=loopToken.exec(line);
        if (modifier) {
          const scope=stack.at(-1);
          const previous=line.slice(0,cursor).trimEnd().at(-1);
          const suffix=scope.stitches.length && (modifier[1] || ![',',':','|'].includes(previous) &&
            !/^\s*[:(\[]/.test(line.slice(loopToken.lastIndex)));
          if (suffix) {
            for (let i=scope.lastStart;i<scope.stitches.length;i++) {
              scope.stitches[i]={...scope.stitches[i],loop:modifier[2]};
            }
          } else {
            scope.loop=modifier[2];
          }
          cursor=loopToken.lastIndex;
          continue;
        }
        pattern.lastIndex = cursor;
        const token = pattern.exec(line);
        if (!token) throw Error('הוראה לא מזוהה ליד ״' + line.slice(cursor).trim().slice(0, 24) + '״');
        cursor = pattern.lastIndex;
        let scope = stack.at(-1);
        let current = scope.stitches;
        if (token[5]) { stack.push({ stitches: [], opening: token[5], loop:scope.loop, lastStart:0 }); continue; }
        if (token[6]) {
          const group = stack.pop();
          if (!stack.length || (token[6] === ')' ? '(' : '[') !== group.opening) throw Error('סוגריים לא תואמים');
          const count = Number(token[7] ?? 1);
          scope=stack.at(-1);
          current=scope.stitches;
          scope.lastStart=current.length;
          if (count < 1 || current.length + group.stitches.length * count > 320 || !group.stitches.length) throw Error('חזרה לא תקינה או ארוכה מדי');
          for (let i = 0; i < count; i++) current.push(...group.stitches);
        }
        if (token[10]) {
          if (mode === 'mr') throw Error('מיקום בעין נתמך בסריגה אובלית או בשורות');
          const operation = current.at(-1);
          if (!operation || operation.at || operation.kind === 'ch') throw Error('חסרה פעולה לפני ציון העין');
          current[current.length - 1] = {...operation, at: token[10]};
          continue;
        }
        const kind = token[2] || token[3];
        if (kind) {
          const count = Number(token[1] ?? token[4] ?? (kind === 'mr' ? 0 : 1));
          if (count === 0 && kind === 'mr') continue;
          if (count < 1 || current.length + count > 320) throw Error('מספר העיניים מחוץ לטווח');
          scope.lastStart=current.length;
          current.push({kind: kind === 'mr' ? 'sc' : kind, count, loop:scope.loop});
        }
      }
      if (stack.length !== 1) throw Error('חסרים סוגריים סוגרים');
      const operations = stack[0].stitches;
      if (operations.reduce((sum, op) => sum + op.count * (op.kind === 'inc' ? 2 : 1), 0) > 320)
        throw Error('יותר מ־320 עיניים בשורה');
      let used = 0;
      const positions = {};
      const groups = [];
      const sources = [];
      const loops = [];
      let produced = 0;
      const stitches = operations.flatMap(({kind,count,at,loop}) => {
        const expanded = Array(count).fill(kind === 'dec' || kind === 'inc' ? 'sc' : kind);
        if (kind === 'inc') expanded.push(...expanded);
        const location = {at,start:produced,count:expanded.length,input:used};
        if (at) {
          groups.push(location);
          positions[at] ??= location;
        }
        for (let j=0;j<expanded.length;j++) {
          const inputOffset = at || kind === 'ch' ? 0 : kind === 'inc' ? Math.floor(j/2) : kind === 'dec' ? j*2 : j;
          loops.push(loop);
          sources.push(Math.max(0,used + inputOffset - (at === 'same' ? 1 : 0)));
        }
        produced += expanded.length;
        if (at === 'same' && !used) throw Error('אין עין קודמת שאפשר לסרוג לתוכה');
        if (kind !== 'ch' && at !== 'same') used += (at ? 1 : count) * (kind === 'dec' ? 2 : 1);
        if (kind === 'dec' && at && count > 1) throw Error('צמצום חוזר דורש זוג עיניים לכל צמצום');
        return expanded;
      });
      if (!stitches.length) {
        if (/^mr\s*$/.test(line) && !rows.length) continue;
        throw Error('חסרות עיניים');
      }
      if (!rows.length && !foundation && stitches.every(s => s === 'ch') && mode !== 'mr') {
        if (mode === 'oval' && stitches.length < 3) throw Error('בסיס אובלי דורש לפחות 3 עיני שרשרת');
        if (!calculateCounts && expected && Number(expected[1] ?? expected[2] ?? expected[3]) !== stitches.length)
          throw Error('מספר עיני השרשרת שונה מהמספר המצוין');
        foundation = stitches.length;
        if (mode === 'oval') { counts[index]=stitches.length; continue; }
      }
      const output = stitches;
      if (output.length > 320) throw Error('יותר מ־320 עיניים בשורה');
      const total = Number(expected?.[1] ?? expected?.[2] ?? expected?.[3] ?? output.length);
      if (!calculateCounts && total !== output.length) throw Error('ההוראה יוצרת ' + output.length + ' עיניים. המספר המצוין הוא ' + total);
      for (let i = 0; i < repeats; i++) {
        const prior = rows.at(-1);
        if (positions.first?.input > 0) throw Error('הפעולה בעין הראשונה צריכה להופיע בתחילת השורה');
        if (positions.last && (mode === 'rows' || prior)) {
          const available = prior?.stitches.length;
          const fromChain = mode === 'rows' && prior?.stitches.every(kind => kind === 'ch');
          if (available && positions.last.input + 1 !== available && !(fromChain && positions.last.input + 2 === available))
            throw Error('הפעולה בעין האחרונה אינה מגיעה לעין האחרונה של השורה הקודמת');
        }
        if (mode !== 'rows' && prior && used !== prior.stitches.length) {
          throw Error('ההוראה משתמשת ב־' + used + ' עיניים, ובסיבוב הקודם יש ' + prior.stitches.length);
        }
        if (rows.length >= 180 || rows.reduce((n, row) => n + row.stitches.length, 0) + output.length > 4800)
          throw Error('החלק חורג ממגבלת התצוגה');
        const ovalSections = mode !== 'oval' ? null : prior?.ovalSections ?
          advanceOval(prior.ovalSections,sources) : !prior ? foundationSections(groups,output.length) : null;
        if (!prior && ovalSections && !foundation) foundation = Math.max(ovalSections[0],ovalSections[2]) + 2;
        rows.push({ ovalSections, number: label ? +label[1] + i : (prior?.number ?? 0) + 1, stitches: output, positions, loops, sources,
          height: output.reduce((n, s) => n + measure[s], 0) / output.length });
      }
      counts[index]=output.length;
    } catch (error) { return { rows, foundation, counts, error: 'שורה ' + (index + 1) + ' · ' + error.message }; }
  }
  return { rows, foundation, counts, error: mode === 'oval' && !foundation && rows.length ? 'יש לפתוח בסיס אובלי עם הוראת שרשרת, למשל ch 8' : '' };
}
