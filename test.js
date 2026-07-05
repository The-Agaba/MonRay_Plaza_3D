
function freshId(prefix){ return prefix + '_' + Math.random().toString(36).slice(2,9); }
function buildInitialState(){

  const depth = 10, canopyDepth = 6, wallT = 0.45, height = 9, canopyHeight = 8.2;

  const defs = [
    {name:'Duka 1',      type:'shop',    w:12},
    {name:'Duka 2',      type:'shop',    w:12},
    {name:'Duka 3',      type:'shop',    w:10},
    {name:'Large Duka',  type:'shop',    w:13.5, toilet:{w:3.5,d:6,side:'right', public:true}},
    {name:'Living Room', type:'living',  w:10,  house:'H1', entry:true},
    {name:'Bedroom',     type:'bedroom', w:12,  house:'H1', toilet:{w:3.5,d:6,side:'right'}},
    {name:'Bed Room',    type:'bedroom', w:12,  house:'H2', toilet:{w:3.5,d:6,side:'left'}},
    {name:'Living Room', type:'living',  w:10,  house:'H2', entry:true},
  ];

  const rooms=[], walls=[], doors=[], windows=[];
  let cx = 0;
  const total = defs.reduce((a,r)=>a+r.w,0);

  function addWall(x1,z1,x2,z2,type,thickness,h){
    const w = {id:freshId('w'), x1,z1,x2,z2, thickness:thickness||wallT, height:h||height, type:type||'interior'};
    walls.push(w); return w;
  }

  const rearWall = addWall(0,0,total,0,'exterior',0.55); // rear (back) exterior wall — away from the canopy/road
  addWall(0,0,0,depth,'exterior',0.55);
  const eastEndWall = addWall(total,0,total,depth,'exterior',0.55); // House 2's side end wall

  const southWalls = [];   // per-room south (front/canopy-facing) wall
  const partitions = [];   // wall between room i and i+1

  defs.forEach((r,i)=>{
    const x0=cx, x1=cx+r.w;
    rooms.push({id:'room_'+i, name:r.name, type:r.type, x:x0, z:0, w:r.w, d:depth, height, house:r.house||null});
    const sw = addWall(x0,depth,x1,depth,'south',0.5);
    southWalls.push(sw);
    if(i < defs.length-1){
      partitions.push(addWall(x1,0,x1,depth,'interior',0.35));
    } else {
      partitions.push(null);
    }
    cx = x1;
  });

    // Exterior doors / windows / roll-up gates on each room's south wall,
    // and toilet alcoves carved from the front corner (matches vent-dot placement in the map).
    defs.forEach((r,i)=>{
      const x0 = rooms[i].x, x1 = x0+r.w, sw = southWalls[i];
      let toiletXRange = null;

      if(r.toilet){
        // Toilet/bath alcoves sit at the REAR of the plot (z near 0).
        const tW = r.toilet.w, tD = r.toilet.d, isPublic = !!r.toilet.public;
        let innerX;
        if(r.toilet.side==='right'){
          innerX = x1 - tW;
          addWall(innerX, tD, x1, tD, 'interior', 0.28);
          const sideWall = addWall(innerX, 0, innerX, tD, 'interior', 0.28);
          const frontWall = walls[walls.length-2]; // The front wall we just added
          doors.push({id:freshId('d'), wallId:frontWall.id, t:0.5, width:2.8, height:6.8, kind:'single', open:false});
          toiletXRange = [innerX, x1];
        } else {
          innerX = x0 + tW;
          addWall(x0, tD, innerX, tD, 'interior', 0.28);
          const sideWall = addWall(innerX, 0, innerX, tD, 'interior', 0.28);
          const frontWall = walls[walls.length-2];
          doors.push({id:freshId('d'), wallId:frontWall.id, t:0.5, width:2.8, height:6.8, kind:'single', open:false});
          toiletXRange = [x0, innerX];
        }
        rooms.push({id:'wc_'+i, name:isPublic?'Public Toilet':'Toilet / Bath', type:'bathroom', x:toiletXRange[0], z:0, w:tW, d:tD, height, parent:r.name, public:isPublic, side:r.toilet.side});

        // Rear-wall high vent (small, up near ceiling — clean & consistent).
        // Public toilet ALSO gets a proper rear entrance door so it's reachable
        // from behind the building without going through the Large Duka.
        const nookLen = toiletXRange[1]-toiletXRange[0];
        const ventW = 1.0, ventH = 1.0, ventSill = 6.4;
        if(isPublic){
          const doorW = 2.4;
          // Place door and vent side-by-side cleanly within the nook
          const doorCx = toiletXRange[0] + nookLen*0.35;
          const ventCx = toiletXRange[0] + nookLen*0.8;
          doors.push({id:freshId('d'), wallId:rearWall.id, t:doorCx/total, width:doorW, height:6.8, kind:'single', open:false});
          windows.push({id:freshId('wn'), wallId:rearWall.id, t:ventCx/total, width:ventW, height:ventH, sill:ventSill, kind:'vent'});
        } else {
          const ventCx = (toiletXRange[0]+toiletXRange[1])/2;
          windows.push({id:freshId('wn'), wallId:rearWall.id, t:ventCx/total, width:ventW, height:ventH, sill:ventSill, kind:'vent'});
        }
      }

      if(r.name.startsWith('Duka') && r.type==='shop'){
        doors.push({id:freshId('d'), wallId:sw.id, t:0.5, width:Math.min(7,r.w-2.2), height:7.2, kind:'roll-up', open:false});
      } else if(r.name==='Large Duka'){
        doors.push({id:freshId('d'), wallId:sw.id, t:0.5, width:Math.min(7,r.w-2.2), height:7.2, kind:'roll-up', open:false});
      } else if(r.entry){
        doors.push({id:freshId('d'), wallId:sw.id, t:0.26, width:3.2, height:6.9, kind:'single', open:false});
        windows.push({id:freshId('wn'), wallId:sw.id, t:0.62, width:2.8, height:3.2, sill:2.7});
      } else if(r.type==='bedroom'){
        const wt = r.toilet && r.toilet.side==='right' ? 0.28 : 0.72;
        windows.push({id:freshId('wn'), wallId:sw.id, t:wt, width:2.8, height:3.2, sill:2.7});
      }

      // Rear window for living rooms and bedrooms — placed in clear wall segments only.
      if(r.entry){
        const cx = (x0+x1)/2;
        windows.push({id:freshId('wn'), wallId:rearWall.id, t:cx/total, width:2.8, height:3.2, sill:2.7});
      } else if(r.type==='bedroom'){
        let segX0=x0, segX1=x1;
        if(toiletXRange){
          segX0 = (r.toilet.side==='right') ? x0 : toiletXRange[1];
          segX1 = (r.toilet.side==='right') ? toiletXRange[0] : x1;
        }
        const cx = (segX0+segX1)/2;
        windows.push({id:freshId('wn'), wallId:rearWall.id, t:cx/total, width:2.4, height:3.0, sill:2.7});
      }
    });

    // House 2 side (gable) window — realistic size for the 10ft deep wall.
    windows.push({id:freshId('wn'), wallId:eastEndWall.id, t:0.5, width:2.2, height:2.6, sill:2.9});

  // Interior connecting doors so each house is single-entry / self-contained:
  // House 1: Living Room <-> Bedroom
  const h1PartitionIdx = defs.findIndex(r=>r.name==='Living Room' && r.house==='H1');
  const h1Partition = partitions[h1PartitionIdx];
  doors.push({id:freshId('d'), wallId:h1Partition.id, t:0.5, width:3, height:6.8, kind:'single', open:false});

  // House 2: Bed Room <-> Living Room
  const h2PartitionIdx = defs.findIndex(r=>r.name==='Bed Room' && r.house==='H2');
  const h2Partition = partitions[h2PartitionIdx];
  doors.push({id:freshId('d'), wallId:h2Partition.id, t:0.5, width:3, height:6.8, kind:'single', open:false});

  // Canopy privacy dividers: full-depth (canopy) walls, independently toggleable, default CLOSED
  // (matches the solid vertical lines drawn in the map). Everywhere else the canopy is open.
  const dividerDefs = [
    {afterIdx: defs.findIndex(r=>r.name==='Large Duka'), label:'Shops / House 1 privacy wall'},
    {afterIdx: defs.findIndex(r=>r.name==='Bedroom' && r.house==='H1'), label:'House 1 / House 2 privacy wall'},
  ];
  dividerDefs.forEach(dd=>{
    const x = rooms[dd.afterIdx].x + rooms[dd.afterIdx].w;
    const dw = {id:freshId('div'), x1:x, z1:depth, x2:x, z2:depth+canopyDepth, thickness:0.35, height:canopyHeight, type:'divider', open:false, label:dd.label};
    walls.push(dw);
  });

  return {
    depth, canopyDepth, total, height, canopyHeight,
    rooms, walls, doors, windows, furniture:[],
  };
}

/* ---------------- HISTORY ---------------- */

const state = buildInitialState();
const fs = require('fs');
fs.writeFileSync('state_dump.json', JSON.stringify({
  walls: state.walls.map(w => ({id: w.id, x1: w.x1, z1: w.z1, x2: w.x2, z2: w.z2, type: w.type})),
  doors: state.doors.map(d => ({id: d.id, wallId: d.wallId, t: d.t, w: d.width})),
  windows: state.windows.map(w => ({id: w.id, wallId: w.wallId, t: w.t, w: w.width}))
}, null, 2));
