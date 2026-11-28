import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const Z = new T.Vector3(0, 1, 0);
const V = (x, y, z) => new T.Vector3(x, y, z);
const tau = Math.PI * 2;

function profile(rows, unit, straight) {
  const radius = rows.map(row => row.stitches.length * unit / tau);
  const peak = Math.max(...radius);
  const rounded = radius.length > 4 && radius.at(-1) < peak * .65;
  const sphere = rounded && radius.length > 8 && radius[0] < peak * .3 && radius.at(-1) < peak * .3;
  const wall = straight ? -1 : radius.findIndex((r,i)=>i>=3 && r===radius[i+1] &&
    radius[0]<=r*.38 && radius.slice(1,i+1).every((previous,j)=>previous>radius[j]));
  // Ease a widening base into the wall before any closing decreases are needed.
  const wallRadius=radius[wall];
  const firstAngle=wall>=0 ? Math.asin(radius[0]/wallRadius) : 0;
  const growth=wall>=0 ? radius.slice(0,wall+1).map((r,i)=>{
    const progress=(r-radius[0])/(wallRadius-radius[0]);
    const angle=T.MathUtils.lerp(firstAngle,Math.PI/2,progress);
    return {r:i===wall ? wallRadius : T.MathUtils.lerp(r,wallRadius*Math.sin(angle),.60),
      height:wallRadius*.73*(Math.cos(firstAngle)-Math.cos(angle))};
  }) : [];
  const firstPeak=radius.indexOf(peak);
  const lastPeak=radius.lastIndexOf(peak);
  const taperStart=!straight && lastPeak>0 && peak>=2*radius[0] &&
    lastPeak<radius.length-1 && radius.slice(lastPeak+1).every((r,i)=>r<=radius[lastPeak+i]) ? lastPeak : -1;
  const pole=Math.min(radius[0],unit*6/tau);
  const endAngle=taperStart>=0 ? Math.acos(pole/peak) : 0;
  const taper=taperStart>=0 ? radius.slice(taperStart).map(r=>{
    const progress=T.MathUtils.clamp((peak-r)/(peak-pole),0,1);
    const angle=progress*endAngle;
    return {r:r<pole ? r : T.MathUtils.lerp(r,peak*Math.cos(angle),.62),
      height:peak*.73*Math.sin(angle)};
  }) : [];
  const smoothWall=!straight && lastPeak-firstPeak>=2 &&
    radius.slice(firstPeak,lastPeak+1).every(r=>r===peak);
  const y = [0];
  for (let i = 1; i < rows.length; i++) {
    const change = Math.abs(radius[i] - radius[i-1]);
    const step = unit * 0.92 * (rows[i].height + rows[i-1].height) / 2;
    const travel = straight ? step : Math.sqrt(Math.max(step ** 2 - change ** 2, (step * (rounded && !growth[i] ? 0.68 : 0.16)) ** 2));
    const closingIndex=i-taperStart;
    let rise=travel;
    if (growth[i]) rise=T.MathUtils.lerp(travel,growth[i].height-growth[i-1].height,.89);
    else if (taper[closingIndex] && radius[i]<radius[i-1]) {
      rise=T.MathUtils.lerp(travel,taper[closingIndex].height-taper[closingIndex-1].height,.83);
    }
    y.push(y[i-1]+rise);
  }
  const shift = y.at(-1) / 2;
  return radius.map((r, i) => {
    const closing=taper[i-taperStart];
    if (closing) return {r:closing.r,y:shift-y[i]};
    if (smoothWall && i>firstPeak && i<lastPeak) {
      const progress=(i-firstPeak)/(lastPeak-firstPeak);
      return {r:r*(1+.055*Math.sin(Math.PI*progress)),y:shift-y[i]};
    }
    if (growth[i]) return {r:growth[i].r,y:shift-y[i]};
    if (!sphere || straight || growth.length || taper.length) return {r,y:shift-y[i]};
    const angle = Math.PI * (i + .4) / (radius.length - .2);
    return {
      r: T.MathUtils.lerp(r, peak * Math.sin(angle), .64),
      y: T.MathUtils.lerp(shift - y[i], Math.max(shift, peak * .95) * Math.cos(angle), .68)
    };
  });
}

function ovalProfile(rows, pitch, span, thickness) {
  const perimeterOffset=2*span/Math.PI;
  const minimum=perimeterOffset+thickness*.42;
  let r=Math.max(minimum, (rows[0]?.stitches.length ?? 0)*pitch/tau);
  let y=0;
  let direction=0;
  return rows.map((row,i)=>{
    if (i) {
      const {blo=0,flo=0}= (row.loops ?? []).reduce((counts,loop)=>{
        counts[loop]=(counts[loop] ?? 0)+1;
        return counts;
      },{});
      const modified=blo+flo;
      if (modified) {
        const target=(blo*.92+flo*2.23)/modified;
        direction=T.MathUtils.lerp(direction,target,modified/row.stitches.length);
      }
      const previous=rows[i-1];
      const nominal=pitch*(row.height+previous.height)/2;
      const increase=(row.stitches.length-previous.stitches.length)*pitch/tau;
      const step=Math.max(nominal*.68,Math.min(nominal*1.5,increase));
      r=Math.max(minimum,r+Math.cos(direction)*step);
      y+=Math.sin(direction)*step;
    }
    return {r,y,direction};
  });
}

function frameAt(row, angle, layout, span) {
  if (layout === 'rows') return { p: V(angle, row.y, 0), tangent: V(1,0,0), normal: V(0,0,1), up: Z };
  if (!span) return {
    p: V(row.r * Math.sin(angle), row.y, row.r * Math.cos(angle)),
    tangent: V(Math.cos(angle),0,-Math.sin(angle)), normal: V(Math.sin(angle),0,Math.cos(angle)), up: Z
  };
  const arc = Math.PI * row.r;
  let length = (angle / tau) * (2 * arc + 4 * span);
  length = ((length % (2 * arc + 4 * span)) + 2 * arc + 4 * span) % (2 * arc + 4 * span);
  if (length < 2 * span) return {p: V(length-span,row.y,row.r), normal: V(0,0,1), tangent: V(1,0,0), up: Z};
  length -= 2 * span;
  if (length < arc) {
    const a = length / row.r;
    return {p: V(span+row.r*Math.sin(a),row.y,row.r*Math.cos(a)), normal: V(Math.sin(a),0,Math.cos(a)), tangent: V(Math.cos(a),0,-Math.sin(a)), up: Z};
  }
  length -= arc;
  if (length < 2 * span) return {p: V(span-length,row.y,-row.r), normal: V(0,0,-1), tangent: V(-1,0,0), up: Z};
  const a = (length-2*span) / row.r;
  return {p: V(-span-row.r*Math.sin(a),row.y,-row.r*Math.cos(a)), normal: V(-Math.sin(a),0,-Math.cos(a)), tangent: V(-Math.cos(a),0,Math.sin(a)), up: Z};
}

function thread(curve, thickness, ply = 0) {
  const steps = 24;
  const sides = 12;
  const tube = new T.TubeGeometry(curve, steps, thickness, sides, false);
  const colors = [];
  const positions = tube.attributes.position;
  const normals = tube.attributes.normal;
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= sides; j++) {
      const angle = j / sides * tau;
      const twist = angle * 3 + i * 1.23 + ply;
      const ridge = Math.cos(twist);
      const offset = thickness * (.086 * ridge + .026 * Math.sin(angle*5 + i*2.65));
      const k = i * (sides+1) + j;
      const shade = .91 + .047 * ridge + .021 * Math.sin(i*1.51 + angle*7 + ply);
      positions.setXYZ(k, positions.getX(k) + normals.getX(k) * offset,
        positions.getY(k) + normals.getY(k) * offset, positions.getZ(k) + normals.getZ(k) * offset);
      colors.push(shade, shade, shade);
    }
  }
  tube.computeVertexNormals();
  for (let i=0;i<=steps;i++) {
    const first=i*(sides+1);
    const last=first+sides;
    const normal=V(0,0,0).fromBufferAttribute(normals,first)
      .add(V(0,0,0).fromBufferAttribute(normals,last)).normalize();
    normals.setXYZ(first,normal.x,normal.y,normal.z);
    normals.setXYZ(last,normal.x,normal.y,normal.z);
  }
  tube.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  return tube;
}

function ovalFraction(phase, sections, radius, span) {
  const count=sections.reduce((sum,value)=>sum+value,0);
  const lengths=[2*span,Math.PI*radius,2*span,Math.PI*radius];
  const perimeter=4*span+2*Math.PI*radius;
  const cycles=Math.floor(phase/count);
  let stitch=phase-cycles*count;
  let length=0;
  for (const [i,section] of sections.entries()) {
    if (stitch<section) return cycles+(length+lengths[i]*stitch/section)/perimeter;
    stitch-=section;
    length+=lengths[i];
  }
  return cycles+1;
}

const paths = {
  X: [[-.50,.20,-.10],[-.30,.38,-.01],[-.08,.25,.09],[.16,-.10,.10],[.20,-.37,.03],[.02,-.42,-.07],[-.24,-.28,.00],[-.15,-.01,.20],[.08,.27,.23],[.31,.35,.10],[.50,.20,-.10]],
  V: [[-.50,.20,-.10],[-.31,.35,.02],[-.25,.12,.18],[-.13,-.20,.18],[.00,-.38,.07],[.17,-.20,.17],[.27,.08,.19],[.33,.33,.08],[.50,.20,-.10]],
  ch: [[-.5,0,-.08],[-.3,.27,.1],[.11,.30,.14],[.33,0,.15],[.12,-.27,.18],[-.16,-.25,.15],[-.23,0,.29],[.12,.04,.24],[.5,0,-.08]]
};

function pullLoop(points, index, contact) {
  const shift=contact.clone().sub(points[index]);
  points[index].copy(contact);
  points[index-1]?.addScaledVector(shift,index===1 ? 0 : .36);
  points[index+1]?.addScaledVector(shift,.40);
}

function fabric(rows, shape, part, pitch, thickness, span, centers, openRound, closedRound) {
  if (!rows.length) return null;
  const rings = [];
  const flat = part.mode === 'rows';
  const segments = flat ? 4 : 48;
  const recess = thickness * .41;
  if (flat) {
    rows.forEach((row, index)=>{
      const half = row.stitches.length * pitch / 2 - thickness * .2;
      const {y} = shape[index];
      rings.push([V(-half + centers[index], y, -recess), V(half + centers[index], y, -recess),
        V(half + centers[index], y, recess), V(-half + centers[index], y, recess)]);
    });
    const edges = [rings[0], rings.at(-1)];
    rings.unshift(edges[0].map(p=>p.clone().add(V(0,pitch*.25,0))));
    rings.push(edges[1].map(p=>p.clone().add(V(0,-pitch*.25,0))));
  } else if (part.mode==='oval') {
    function fabricRing(row, depth, edge=0) {
      const angle=row.direction;
      const r=Math.max(thickness*.10,row.r-2*span/Math.PI+Math.sin(angle)*depth+Math.cos(angle)*edge);
      const y=row.y-Math.cos(angle)*depth+Math.sin(angle)*edge;
      return Array.from({length:segments},(_,j)=>frameAt({r,y},j/segments*tau,part.mode,span).p);
    }
    const first=shape[0];
    const last=shape.at(-1);
    rings.push(fabricRing(first,recess*.5,-thickness*.55));
    for (const row of shape) rings.push(fabricRing(row,recess*.5));
    rings.push(fabricRing(last,recess,thickness*.62));
    for (const row of [...shape].reverse()) rings.push(fabricRing(row,thickness*.91));
    rings.push(fabricRing(first,thickness*.91,-thickness*.55));
  } else {
    shape.forEach(row=>{
      const r = Math.max(thickness * .22, row.r - 2 * span / Math.PI - recess);
      rings.push(Array.from({length:segments},(_,j)=>frameAt({...row,r},j/segments*tau,part.mode,span).p));
    });
    if (rings.length === 1) rings.push(rings[0].map(p=>p.clone().add(V(0,-thickness*.7,0))));
    if (openRound) {
      const inner = [...shape].reverse().map(row=>{
        const r=Math.max(thickness*.14,row.r-recess-thickness*.47);
        return Array.from({length:segments},(_,j)=>frameAt({r,y:row.y},j/segments*tau,part.mode,0).p);
      });
      rings.push(...inner);
    } else if (closedRound) {
      const end=shape.at(-1);
      const r=Math.max(thickness*.10,(end.r-recess)*.58);
      const y=end.y-thickness*.33;
      rings.push(Array.from({length:segments},(_,j)=>frameAt({r,y},j/segments*tau,part.mode,0).p));
    }
  }
  const vertices = rings.flat();
  const indices = [];
  for (let i=0;i<rings.length-1;i++) {
    for (let j=0;j<segments;j++) {
      const a=i*segments+j;
      const b=i*segments+(j+1)%segments;
      indices.push(a,a+segments,b,b,a+segments,b+segments);
    }
  }
  const capOffsets = [[0,thickness*.12],[rings.length-1,openRound ? -thickness*.15 : -thickness*.12]];
  for (const [ring,yOffset] of capOffsets) {
    const midpoint = vertices.length;
    vertices.push(rings[ring].reduce((center,p)=>center.add(p),V(0,0,0)).multiplyScalar(1/segments).add(V(0,yOffset,0)));
    for (let j=0;j<segments;j++) {
      const a=ring*segments+j;
      const b=ring*segments+(j+1)%segments;
      indices.push(...(ring ? [midpoint,b,a] : [midpoint,a,b]));
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(vertices.flatMap(p=>p.toArray()),3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const color = new T.Color(part.color).multiplyScalar(.72);
  const material = new T.MeshStandardMaterial({color, roughness:1, side:T.DoubleSide});
  return new T.Mesh(geometry,material);
}

export function buildPart(part, parsed) {
  const group = new T.Group();
  group.userData.part = part.id;
  const rows = parsed.rows;
  const pitch = (+part.yarn * 1.18 + +part.hook * .67) / 5.2;
  const thickness = Math.max(pitch*.235, +part.yarn / 13);
  Object.assign(group.userData, {thickness, color:part.color});
  const baseSections = rows[0]?.ovalSections;
  const straightStitches = baseSections ? (baseSections[0]+baseSections[2])/2 : (parsed.foundation-2)*.86;
  const span = part.mode === 'oval' ? Math.max(0,straightStitches*pitch/2) : 0;
  const shape = part.mode === 'oval' ? ovalProfile(rows,pitch,span,thickness) : profile(rows,pitch,part.mode === 'rows');
  const geos = [];
  const threads = [];
  group.userData.threads = threads;
  const frames = [];
  const centers = [];
  rows.forEach((row, i)=>{
    const {first,last}=row.positions ?? {};
    const direction = i % 2 ? -1 : 1;
    centers.push((centers[i-1] ?? 0) + (part.mode === 'rows' ?
      direction * ((last?.count ?? 1) - (first?.count ?? 1)) * pitch / 2 : 0));
  });
  const lastCount=rows.at(-1)?.stitches.length ?? 0;
  const maxCount=Math.max(0,...rows.map(row=>row.stitches.length));
  const closedRound=part.mode==='mr' && rows.length>=3 && maxCount>=8 && lastCount<=6 &&
    lastCount<=maxCount*.5 && lastCount<(rows.at(-2)?.stitches.length ?? 0);
  const openRound=part.mode==='mr' && rows.length>=2 && !closedRound;
  const core=fabric(rows,shape,part,pitch,thickness,span,centers,openRound,closedRound);
  if (core) {
    group.userData.core=core;
    group.add(core);
  }
  const surface = (i, phase) => {
    const row = shape[i];
    const n = rows[i].stitches.length;
    if (part.mode === 'rows') {
      const direction = i % 2 ? -1 : 1;
      return frameAt(row, centers[i] + direction * (phase - n/2) * pitch, part.mode, 0);
    }
    const current = {...row, r: Math.max(thickness * .42, row.r - 2 * span / Math.PI)};
    let fraction = phase / n;
    const sections = rows[i].ovalSections;
    const end = i === 0 && rows[i].positions?.last;
    if (span && sections?.every(Boolean)) {
      fraction = ovalFraction(phase,sections,current.r,span);
    } else if (span && end) {
      const turn = (end.start + end.count / 2) / n;
      if (turn > 0 && turn < 1) fraction = fraction < turn ?
        fraction * .5 / turn : .5 + (fraction-turn) * .5 / (1-turn);
      fraction -= .25;
    }
    const frame = frameAt(current, fraction * tau, part.mode, span);
    if (part.mode==='oval') {
      const outward=frame.normal.clone();
      frame.up=outward.clone().multiplyScalar(-Math.cos(row.direction))
        .addScaledVector(Z,-Math.sin(row.direction));
      frame.normal=Z.clone().multiplyScalar(Math.cos(row.direction))
        .addScaledVector(outward,-Math.sin(row.direction));
      return frame;
    }
    const above = shape[i-1] ?? row;
    const below = shape[i+1] ?? row;
    if (above !== below) {
      const slope = (above.r - below.r) / Math.max(above.y-below.y, .01);
      frame.up = Z.clone().addScaledVector(frame.normal,slope).normalize();
      frame.normal = frame.tangent.clone().cross(frame.up).normalize();
      if (i === 0 && n <= 8 && rows[i+1]?.stitches.length > n) {
        frame.up = V(frame.normal.x,0,frame.normal.z).normalize().negate();
        frame.normal = Z.clone();
      }
      if (i === rows.length-1 && n <= 8 && rows[i-1]?.stitches.length > n) {
        frame.up = V(frame.normal.x,0,frame.normal.z).normalize();
        frame.normal = Z.clone().negate();
      }
    }
    return frame;
  };
  // Each oval stitch reaches the same seam point as the stitch it was worked into.
  const seams=part.mode==='oval' ? rows.slice(0,-1).map((row,i)=>{
    const from=shape[i];
    const to=shape[i+1];
    const radialDistance=(to.r-from.r)*.5;
    const rise=(to.y-from.y)*.5;
    return row.stitches.map((_,j)=>{
      const base=surface(i,j+.5);
      const outward=base.tangent.clone().cross(Z).normalize();
      return {
        point:base.p.clone().addScaledVector(outward,radialDistance)
          .addScaledVector(Z,rise).addScaledVector(base.normal,thickness*.16),
        tangent:base.tangent
      };
    });
  }) : [];
  rows.forEach((row, i) => {
    const n = row.stitches.length;
    const gauges = { ch:.72, slst:.53, sc:1, hdc:1.23, dc:1.55, tr:1.9 };
    const stitches = row.stitches.map((kind,j) => {
      const frame = surface(i,j+.5);
      const loop=part.mode==='oval' ? row.loops?.[j] : 'both';
      const loopShift=loop==='blo' ? -.10 : loop==='flo' ? .10 : 0;
      const points = (kind === 'ch' ? paths.ch : paths[part.stitch]).map(([x,y,z],k,all) => {
        const at = surface(i,j+.5+x);
        return at.p.addScaledVector(at.up, (y+loopShift) * pitch * 1.04 * (k === 0 || k === all.length-1 ? row.height : gauges[kind]))
          .addScaledVector(at.normal,z*pitch*.78);
      });
      const next=seams[i]?.[j];
      const previous=seams[i-1];
      if (next) {
        const outerTip=kind==='ch' || part.stitch==='X' ? 5 : 4;
        pullLoop(points,outerTip,next.point.clone().addScaledVector(next.tangent,-thickness*.18));
      }
      if (previous) {
        const source=Math.min(row.sources[j],previous.length-1);
        const parent=previous[source];
        const contact=parent.point.clone().addScaledVector(parent.tangent,thickness*.18);
        pullLoop(points,1,contact);
      }
      const curve = new T.CatmullRomCurve3(points);
      geos.push(thread(curve, thickness, (j*2.4+i*.98)%tau));
      threads.push(curve.getPoints(20));
      return frame;
    });
    frames.push({number:row.number, stitches});
  });
  if (span && rows.length) {
    for (let j=0; j<parsed.foundation; j++) {
      const x = (j + .5 - parsed.foundation / 2) * (2 * span / parsed.foundation);
      const points = paths.ch.map(([dx,dy,dz]) => V(x + dx * 2*span/parsed.foundation,shape[0].y + thickness*.32,dy*pitch+dz*pitch));
      const curve = new T.CatmullRomCurve3(points);
      geos.push(thread(curve, thickness*.8));
      threads.push(curve.getPoints(20));
    }
  }
  if (geos.length) {
    const geometry = mergeGeometries(geos);
    geos.forEach(g => g.dispose());
    const material = new T.MeshStandardMaterial({color: part.color, vertexColors:true, roughness:.94});
    group.add(new T.Mesh(geometry,material));
  }
  return {group, frames, shape, openRound};
}

export function anchorAt(model, rowNumber, start, end) {
  const row = model.frames.find(r => r.number === +rowNumber);
  const frames = row?.stitches;
  if (!frames || start < 1 || start > frames.length || end < 1 || end > frames.length) return null;
  const offset = (+end - +start + frames.length) % frames.length;
  const middle = (+start - 1 + offset / 2) % frames.length;
  const a = frames[Math.floor(middle)];
  const b = frames[Math.ceil(middle) % frames.length];
  return {p:a.p.clone().lerp(b.p,middle%1), normal:a.normal.clone().lerp(b.normal,middle%1).normalize()};
}

export function seatPart(child, target, anchor) {
  target.group.updateWorldMatrix(true,false);
  const pos = target.group.localToWorld(anchor.p.clone());
  const normal = anchor.normal.clone().transformDirection(target.group.matrixWorld);
  const bottom = child.shape.at(-1)?.y ?? 0;
  child.group.quaternion.setFromUnitVectors(Z, normal);
  child.group.position.copy(pos).addScaledVector(normal, -bottom - 0.16);
}
