import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {capitalizePattern,formatPatternCounts,nextPatternRow,parsePattern} from './pattern.mjs';
import {buildPart, anchorAt, seatPart} from './model.mjs';

const el = id => document.getElementById(id);
const key = 'lulaha.projects.v1';
const id = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const newPart = (name, color = '#a270b8', pattern = '') => ({
  id:id(), name, mode:'mr', yarn:5, hook:4, color, stitch:'X', pattern, connection:null
});
const ball = `R1: 6 sc in MR (6)
R2: 6 inc (12)
R3: (sc, inc) x 6 (18)
R4: (2 sc, inc) x 6 (24)
R5: (3 sc, inc) x 6 (30)
R6: (4 sc, inc) x 6 (36)
R7: (5 sc, inc) x 6 (42)
R8–11: 42 sc
R12: (5 sc, dec) x 6 (36)
R13: (4 sc, dec) x 6 (30)
R14: (3 sc, dec) x 6 (24)
R15: (2 sc, dec) x 6 (18)
R16: (sc, dec) x 6 (12)
R17: 6 dec (6)`;
const limb = `R1: 6 sc in MR (6)
R2: 6 inc (12)
R3–5: 12 sc
R6: (sc, dec) x 4 (8)
R7–9: 8 sc`;
function sample() {
  const body = newPart('גוף', '#9970ad', ball.replace('R8–11: 42 sc', 'R8–13: 42 sc')
    .replace(/R(1[2-7]):/g, (_, n) => 'R' + (+n + 2) + ':'));
  const head = newPart('ראש', '#cc9fd3', ball);
  const one = newPart('יד ימין', '#cc9fd3', limb);
  const two = newPart('יד שמאל', '#cc9fd3', limb);
  head.connection = {target:body.id,row:1,start:1,end:6,offset:[0,0,0]};
  one.connection = {target:body.id,row:10,start:8,end:12,offset:[0,0,0]};
  two.connection = {target:body.id,row:10,start:31,end:35,offset:[0,0,0]};
  return {id:id(),name:'בובת לבנדר',kind:'אמיגורומי',parts:[head,body,one,two],active:head.id};
}
function load() {
  try { const data=JSON.parse(localStorage.getItem(key)); if (data?.projects?.length) return data; }
  catch {}
  const project=sample();
  return {projects:[project],current:project.id};
}
const data=load();
const project = () => data.projects.find(p => p.id === data.current) ?? data.projects[0];
const part = () => project().parts.find(p => p.id === project().active) ?? project().parts[0];
const byId = value => project().parts.find(p => p.id === value);
const parsePart = item => parsePattern(item.pattern,item.mode,{calculateCounts:true});
function refreshPattern(showAll) {
  const input=el('pattern');
  const item=part();
  const text=capitalizePattern(input.value);
  const start=text.slice(0,input.selectionStart).split('\n');
  const end=text.slice(0,input.selectionEnd).split('\n');
  const active=showAll ? -1 : end.length-1;
  const counts=parsePattern(text,item.mode,{calculateCounts:true}).counts;
  const next=formatPatternCounts(text,counts,active);
  if (next!==input.value) {
    const lines=next.split('\n');
    const offset=prefix=>lines.slice(0,prefix.length-1).reduce((n,line)=>n+line.length+1,0)
      +Math.min(prefix.at(-1).length,lines[prefix.length-1]?.length ?? 0);
    const direction=input.selectionDirection;
    input.value=next;
    input.setSelectionRange(offset(start),offset(end),direction);
  }
  item.pattern=next;
}
function save() {
  try {localStorage.setItem(key,JSON.stringify(data)); return true;}
  catch {return false;}
}
let assembly=false, free=false, pending, dialogAction, stage, changeFrame, models=new Map();
const view=el('viewport');
const camera=new T.PerspectiveCamera(34,1,.01,3000);
const scene=new T.Scene();
scene.add(new T.HemisphereLight('#fff4fc','#796483',2.1));
const keyLight=new T.DirectionalLight('#fff5ea',2.65);
keyLight.position.set(3,7,8);
scene.add(keyLight);
const rim=new T.DirectionalLight('#ead7fa',1.7);
rim.position.set(-6,2,-5);
scene.add(rim);
let renderer, controls;
try {
  const canvas=document.createElement('canvas');
  const context=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'high-performance'});
  if (!context) throw Error('WebGL2');
  renderer=new T.WebGLRenderer({canvas,context,alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.7));
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1;
 } catch {
  const canvas=document.createElement('canvas');
  const context=canvas.getContext('2d');
  if (context) renderer={
    domElement:canvas,
    setSize(w,h) {
      const ratio=Math.min(window.devicePixelRatio,1.5);
      canvas.width=w*ratio;
      canvas.height=h*ratio;
    },
    render(scene,camera) {
      const w=canvas.width, h=canvas.height;
      context.clearRect(0,0,w,h);
      scene.updateMatrixWorld(true);
      camera.updateMatrixWorld();
      const lines=[];
      const point=new T.Vector3();
      const world=new T.Vector3();
      function projectPoint(worldPoint) {
        point.copy(worldPoint).project(camera);
        return [(point.x+1)*w/2,(1-point.y)*h/2];
      }
      const normal = new T.Vector3();
      const firstEdge = new T.Vector3();
      const secondEdge = new T.Vector3();
      stage?.children.forEach(group=>{
        const color=new T.Color(group.userData.color);
        const threadSize=group.userData.thickness;
        const core=group.userData.core;
        if (core) {
          const position=core.geometry.attributes.position;
          const index=core.geometry.index;
          const vertices=Array.from({length:position.count},(_,i)=>{
            const v=new T.Vector3().fromBufferAttribute(position,i).applyMatrix4(group.matrixWorld);
            return {world:v, depth:-point.copy(v).applyMatrix4(camera.matrixWorldInverse).z, xy:projectPoint(v)};
          });
          for (let i=0;i<index.count;i+=3) {
            const a=vertices[index.getX(i)], b=vertices[index.getX(i+1)], c=vertices[index.getX(i+2)];
            if (Math.min(a.depth,b.depth,c.depth)<camera.near) continue;
            normal.crossVectors(firstEdge.subVectors(b.world,a.world),secondEdge.subVectors(c.world,a.world)).normalize();
            const light=.49+.25*Math.abs(normal.x*.38+normal.y*.60+normal.z*.70);
            lines.push({depth:(a.depth+b.depth+c.depth)/3, coords:[a.xy,b.xy,c.xy], color, light, fill:true});
          }
        }
        for (const thread of group.userData.threads) {
          const middle=thread[Math.floor(thread.length/2)];
          world.copy(middle).applyMatrix4(group.matrixWorld);
          point.copy(world).applyMatrix4(camera.matrixWorldInverse);
          const depth=-point.z;
          if (depth<camera.near) continue;
          const light=.72+.26*Math.max(0,Math.min(1,.5+world.y*.035+world.z*.035));
          const width=Math.max(.75,threadSize*h/(depth*Math.tan(T.MathUtils.degToRad(camera.fov/2))));
          const coords=thread.map(position=>{
            point.copy(position).applyMatrix4(group.matrixWorld).project(camera);
            return [(point.x+1)*w/2,(1-point.y)*h/2];
          });
          lines.push({depth,width,coords,color,light});
        }
      });
      lines.sort((a,b)=>b.depth-a.depth);
      context.lineCap='round';
      context.lineJoin='round';
      for (const {width,coords,color,light,fill} of lines) {
        context.beginPath();
        context.moveTo(...coords[0]);
        for (const xy of coords.slice(1)) context.lineTo(...xy);
        if (fill) {
          context.closePath();
          context.fillStyle=color.clone().multiplyScalar(light).getStyle();
          context.fill();
          continue;
        }
        context.lineWidth=width;
        context.strokeStyle=color.clone().multiplyScalar(light*.72).getStyle();
        context.stroke();
        context.lineWidth=width*.73;
        context.strokeStyle=color.clone().multiplyScalar(light*1.1).getStyle();
        context.stroke();
      }
    }
  };
}
if (renderer) {
  view.prepend(renderer.domElement);
  controls=new OrbitControls(camera,renderer.domElement);
  controls.minDistance=.1;
  controls.maxDistance=2600;
  controls.addEventListener('change',paint);
  new ResizeObserver(() => { resize(); paint(); }).observe(view);
}

function resize() {
  if (!renderer) return;
  const {clientWidth:w,clientHeight:h}=view;
  if (w && h) { camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h,false); }
}
function paint() {
  if (!renderer || changeFrame) return;
  changeFrame=requestAnimationFrame(() => {changeFrame=0;renderer.render(scene,camera);});
}
function fit() {
  if (!controls || !stage) return;
  resize();
  const box=new T.Box3().setFromObject(stage);
  const center=box.isEmpty() ? new T.Vector3() : box.getCenter(new T.Vector3());
  const bounds=box.isEmpty() ? new T.Vector3(2,2,2) : box.getSize(new T.Vector3());
  const radius=Math.min(bounds.length()/2,Math.max(bounds.x,bounds.y,bounds.z)*.67);
  let elevation=.26;
  if (!assembly && part().mode==='oval') elevation=1.55;
  else if (!assembly && models.get(part().id)?.openRound) elevation=-.9;
  const direction=new T.Vector3(.38,elevation,1).normalize();
  const vertical=T.MathUtils.degToRad(camera.fov/2);
  const half=Math.min(vertical,Math.atan(Math.tan(vertical)*camera.aspect));
  camera.position.copy(center).addScaledVector(direction,Math.max(1,radius*1.08/Math.sin(half)));
  controls.target.copy(center);
  controls.update();
  paint();
}
function release(object) {
  object?.traverse(node => {node.geometry?.dispose();node.material?.dispose();});
}
function status(id,message,warning=false) {
  el(id).textContent=message;
  el(id).classList.toggle('error',warning);
}
function rebuild(refit=false) {
  clearTimeout(pending);
  const hadOpenRound=models.get(part().id)?.openRound;
  if (stage) {scene.remove(stage);release(stage);}
  stage=new T.Group();
  scene.add(stage);
  models=new Map();
  let total=0, rowCount=0, message='';
  (assembly ? project().parts : [part()]).forEach(item => {
    const parsed=parsePart(item);
    if (parsed.error && !message) message=(assembly ? item.name+' · ' : '')+parsed.error;
    total+=parsed.rows.reduce((sum,r)=>sum+r.stitches.length,0);
    rowCount+=parsed.rows.length;
    if (!renderer || !parsed.rows.length) return;
    const model=buildPart(item,parsed);
    stage.add(model.group);
    models.set(item.id,model);
  });
  if (assembly) {
    const placed=new Set();
    const occupied=new Set();
    let root=0;
    function layout(item) {
      const model=models.get(item?.id);
      if (!model || placed.has(item.id) || occupied.has(item.id)) return;
      occupied.add(item.id);
      const link=item.connection;
      const target=models.get(link?.target);
      const anchor=target && anchorAt(target,link.row,link.start,link.end);
      if (anchor) {
        if (!placed.has(link.target)) layout(byId(link.target));
        seatPart(model,target,anchor);

      } else {
        if (link?.target && !message) message='מיקום החיבור של '+item.name+' אינו זמין בהוראות הנוכחיות';
        const box=new T.Box3().setFromObject(model.group);
        const width=box.max.x-box.min.x;
        model.group.position.x=root+width/2;
        root+=width+1.2;
      }
      if (link?.offset) model.group.position.add(new T.Vector3(...link.offset));
      model.group.updateWorldMatrix(true,false);
      placed.add(item.id);
    }
    project().parts.forEach(layout);
  }
  el('empty').hidden=Boolean(renderer && models.size);
  el('empty').firstElementChild.textContent=renderer ? 'המודל יופיע כאן לאחר הזנת הוראות תקינות' : 'התצוגה דורשת תמיכה ב־WebGL 2 במכשיר';
  el('previewMeta').textContent=assembly ? models.size+' חלקים בתצוגה' : total+' עיניים · '+rowCount+' שורות';
  if (assembly) status('assemblyStatus',message || (free ? 'גררי את החלק הנבחר על פני המסך' : 'סמני מקום במודל או הזיני נקודת חיבור'),Boolean(message));
  else status('status', message || (total ? 'התצוגה מעודכנת' : 'הזיני את הוראות הסריגה לחלק'),Boolean(message));
  const openRound=models.get(part().id)?.openRound;
  if (refit || (!assembly && openRound && !hadOpenRound) || controls?.target.lengthSq() === 0 && camera.position.lengthSq() === 0) fit();
  else paint();
}
function partTabs() {
  el('parts').replaceChildren();
  for (const item of project().parts) {
    const b=document.createElement('button');
    const dot=document.createElement('span');
    dot.className='dot';
    dot.style.background=item.color;
    b.append(dot,document.createTextNode(item.name));
    b.type='button';
    b.classList.toggle('active',item.id===part().id);
    b.onclick=()=>{project().active=item.id;refresh();};
    el('parts').append(b);
  }
  const b=document.createElement('button');
  b.textContent='＋ חלק';
  b.onclick=()=>openDialog('part');
  el('parts').append(b);
}
function selectOptions(field,items,active) {
  const select=el(field);
  select.replaceChildren(...items.map(item=>new Option(item.name,item.id,false,item.id===active)));
}
function assemblyFields() {
  const selected=part();
  const link=selected.connection;
  const previous=el('target').value;
  selectOptions('child',project().parts,selected.id);
  const candidates=project().parts.filter(p=>p.id!==selected.id);
  selectOptions('target',candidates,link?.target ?? previous);
  el('anchorRow').value=link?.row ?? 1;
  el('anchorStart').value=link?.start ?? 1;
  el('anchorEnd').value=link?.end ?? 1;
  el('attach').disabled=!candidates.length;
  el('detach').disabled=!link;
  el('links').replaceChildren(...project().parts.filter(p=>p.connection).map(item=>{
    const b=document.createElement('button');
    const c=item.connection;
    b.textContent=item.name+' · '+(c.target ? (byId(c.target)?.name ?? 'חלק חסר')+', שורה '+c.row+', עיניים '+c.start+'–'+c.end : 'מיקום ידני');
    b.onclick=()=>{project().active=item.id;refresh(false);};
    return b;
  }));
}
function refresh(refit=true) {
  save();
  const current=project();
  el('projectName').textContent=current.name;
  el('projectInfo').textContent=current.kind+' · '+current.parts.length+' חלקים · שמירה מקומית';
  el('editor').hidden=assembly;
  el('assembly').hidden=!assembly;
  el('editMode').classList.toggle('active',!assembly);
  el('assemblyMode').classList.toggle('active',assembly);
  el('previewTitle').textContent=assembly ? 'הפרויקט המורכב' : part().name+' בתלת־ממד';
  el('free').classList.toggle('active',free);
  el('free').setAttribute('aria-pressed',free);
  el('viewHelp').textContent=assembly && free ? 'גררי את החלק הנבחר כדי להזיז אותו · צבטי לזום' : 'גררי לסיבוב · צבטי או גללי לזום';
  for (const field of ['partName','mode','yarn','hook','color','stitch','pattern']) el(field).value=field==='pattern' ? formatPatternCounts(capitalizePattern(part().pattern),parsePart(part()).counts) : part()[field==='partName'?'name':field];
  el('deletePart').disabled=current.parts.length===1;
  partTabs();
  assemblyFields();
  rebuild(refit);
}
for (const field of ['partName','mode','yarn','hook','color','stitch','pattern']) {
  el(field).addEventListener('input',event=>{
    const input=el(field);
    if (field==='pattern' && event.isComposing) return;
    if (field==='pattern') refreshPattern(false);
    const item=part();
    const value=input.value;
    if ((field==='yarn'||field==='hook') && (!value || +value<+el(field).min || +value>+el(field).max)) return;
    if (field==='partName') {
      item.name=value.trim() || 'חלק';
      partTabs();
      el('previewTitle').textContent=item.name+' בתלת־ממד';
    } else item[field]=value;
    if (field==='mode') refreshPattern(true);
    const stored=save();
    if (!stored) el('projectInfo').textContent='שמירה מקומית לא זמינה';
    clearTimeout(pending);
    pending=setTimeout(()=>rebuild(field==='mode' || field==='hook' || field==='yarn' || models.size===0),165);
    if (field==='color') partTabs();
  });
}
el('pattern').addEventListener('beforeinput',event=>{
  const input=event.currentTarget;
  if (event.isComposing || input.selectionStart!==input.selectionEnd) return;
  const newline=event.inputType==='insertLineBreak' || event.inputType==='insertParagraph';
  if (!newline && !event.inputType.startsWith('insert')) return;
  const caret=input.selectionStart;
  const start=caret===0 ? 0 : input.value.lastIndexOf('\n',caret-1)+1;
  const nextBreak=input.value.indexOf('\n',caret);
  const end=nextBreak<0 ? input.value.length : nextBreak;
  const line=input.value.slice(start,end);
  const match=line.match(/\s+\(\d+\)(?=\s*(?:[;#]|$))/);
  const countStart=match ? start+match.index : end;
  const countEnd=match ? countStart+match[0].length : end;
  if (newline && event.cancelable && caret>=countStart && line.trim() && !/^\s*r\d+\s*:\s*$/i.test(line)) {
    const number=nextPatternRow(input.value.slice(0,end),part().mode);
    const prefix=input.value.slice(end+1).match(/^\s*(?:r\s*)?\d+(?:\s*[-–—]\s*(?:r\s*)?\d+)?\s*[:.)]/i) ? '' : 'R'+number+': ';
    event.preventDefault();
    input.setRangeText('\n'+prefix,end,end,'end');
    input.dispatchEvent(new Event('input',{bubbles:true}));
  } else if (!newline && caret>countStart && caret<=countEnd) {
    input.setSelectionRange(countStart,countStart);
  }
});
el('pattern').addEventListener('blur',()=>{refreshPattern(true);save();});
el('pattern').addEventListener('compositionend',event=>event.currentTarget.dispatchEvent(new Event('input')));
function openDialog(action) {
  dialogAction=action;
  const listing=action==='list';
  el('dialogTitle').textContent=listing?'הפרויקטים שלי':action==='part'?'חלק חדש':'פרויקט חדש';
  el('nameField').hidden=listing;
  el('dialogName').required=!listing;
  el('dialogName').value='';
  el('kindField').hidden=action!=='project';
  el('confirm').hidden=listing;
  el('projectList').hidden=!listing;
  el('projectList').replaceChildren(...(listing?data.projects.map(p=>{
    const b=document.createElement('button');
    b.type='button';b.textContent=p.name+' · '+p.kind;
    b.onclick=()=>{data.current=p.id;assembly=false;free=false;el('dialog').close();refresh();};
    return b;
  }):[]));
  el('dialog').showModal();
}
el('dialogForm').onsubmit=e=>{
  e.preventDefault();
  const name=el('dialogName').value.trim();
  if (!name) return;
  const first=newPart(dialogAction==='project'?'חלק ראשון':name);
  if (dialogAction==='project') {
    const current={id:id(),name,kind:el('projectKind').value,parts:[first],active:first.id};
    data.projects.push(current);
    data.current=current.id;
  } else {
    project().parts.push(first);
    project().active=first.id;
  }
  assembly=false;free=false;
  el('dialog').close();
  refresh();
};
el('cancel').onclick=()=>el('dialog').close();
el('projects').onclick=()=>openDialog('list');
el('newProject').onclick=()=>openDialog('project');
el('editMode').onclick=()=>{assembly=false;free=false;refresh();};
el('assemblyMode').onclick=()=>{assembly=true;free=false;refresh();};
el('free').onclick=()=>{free=!free;refresh(false);};
el('child').onchange=()=>{project().active=el('child').value;refresh(false);};
el('detach').onclick=()=>{part().connection=null;refresh();};
el('deletePart').onclick=()=>{
  const current=project();
  const selected=part();
  if (current.parts.length<2 || !confirm('למחוק את החלק ״'+selected.name+'״?')) return;
  current.parts=current.parts.filter(item=>item!==selected);
  current.parts.forEach(item=>{if(item.connection?.target===selected.id)item.connection=null;});
  current.active=current.parts[0].id;
  refresh();
};
function connect(target,row,start,end) {
  const selected=part();
  if (!models.has(selected.id)) {status('assemblyStatus','יש להזין הוראות לחלק שברצונך לחבר',true);return;}
  for (let ancestor=byId(target); ancestor; ancestor=byId(ancestor.connection?.target)) {
    if (ancestor.id===selected.id) {status('assemblyStatus','החיבור הזה ייצור מעגל בין החלקים',true);return;}
  }
  if (![row,start,end].every(Number.isSafeInteger) || !models.has(target) || !anchorAt(models.get(target),row,start,end)) {
    status('assemblyStatus','בדקי שמספר השורה והעיניים קיימים בחלק היעד',true);return;
  }
  selected.connection={target,row,start,end,offset:[0,0,0]};
  refresh(false);
  status('assemblyStatus','החלק חובר לשורה '+row+', עיניים '+start+'–'+end);
}
el('attach').onclick=()=>connect(el('target').value,+el('anchorRow').value,+el('anchorStart').value,+el('anchorEnd').value);
el('reset').onclick=fit;
function zoom(multiplier) {
  if (!controls) return;
  const distance=camera.position.distanceTo(controls.target);
  const next=T.MathUtils.clamp(distance*multiplier,.1,2600);
  camera.position.sub(controls.target).multiplyScalar(next/distance).add(controls.target);
  controls.update();paint();
}
el('zoomOut').onclick=()=>zoom(1.23);
el('zoomIn').onclick=()=>zoom(.81);
if (renderer) {
  const canvas=renderer.domElement;
  const ray=new T.Raycaster();
  let gesture;
  function aim(e) {
    const r=canvas.getBoundingClientRect();
    ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);
  }
  canvas.addEventListener('pointerdown',e=>{
    if (!assembly || gesture || e.button!==0) return;
    gesture={x:e.clientX,y:e.clientY,id:e.pointerId};
    const model=models.get(part().id);
    if (!free || !model) return;
    aim(e);
    if (!ray.intersectObject(model.group,true).length) return;
    controls.enabled=false;
    canvas.setPointerCapture(e.pointerId);
    const plane=new T.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new T.Vector3()),model.group.position);
    const origin=ray.ray.intersectPlane(plane,new T.Vector3());
    if (origin) Object.assign(gesture,{plane,origin,position:model.group.position.clone(),model});
  },true);
  canvas.addEventListener('pointermove',e=>{
    if (!gesture?.model || e.pointerId!==gesture.id) return;
    aim(e);
    const current=ray.ray.intersectPlane(gesture.plane,new T.Vector3());
    if (!current) return;
    gesture.delta=current.sub(gesture.origin);
    gesture.model.group.position.copy(gesture.position).add(gesture.delta);
    paint();
  });
  function finish(e) {
    if (!gesture || e.pointerId!==gesture.id) return;
    const previous=gesture;
    gesture=null;
    controls.enabled=true;
    if (canvas.hasPointerCapture(e.pointerId) && previous.model) canvas.releasePointerCapture(e.pointerId);
    if (previous.delta?.lengthSq()>0) {
      const selected=part();
      const link=selected.connection ?? {target:null,row:0,start:0,end:0,offset:[0,0,0]};
      link.offset=link.offset.map((value,index)=>value+previous.delta.getComponent(index));
      selected.connection=link;
      refresh(false);
      status('assemblyStatus','המיקום הידני נשמר');
      return;
    }
    if (!assembly || free || e.type!=='pointerup' || Math.hypot(e.clientX-previous.x,e.clientY-previous.y)>6) return;
    aim(e);
    const hit=ray.intersectObjects([...models].filter(([item])=>item!==part().id).map(([,m])=>m.group),true)[0];
    if (!hit) return;
    const group=hit.object.parent;
    const p=group.worldToLocal(hit.point.clone());
    let closest, min=Infinity;
    for (const row of models.get(group.userData.part).frames) {
      row.stitches.forEach((frame,index)=>{
        const distance=frame.p.distanceToSquared(p);
        if (distance<min) {closest={row:row.number,stitch:index+1};min=distance;}
      });
    }
    if (closest) connect(group.userData.part,closest.row,closest.stitch,closest.stitch);
  }
  canvas.addEventListener('pointerup',finish);
  canvas.addEventListener('pointercancel',finish);
  canvas.addEventListener('lostpointercapture',e=>{if(gesture?.id===e.pointerId && e.pointerType!=='mouse') finish(e);});
}
refresh();
