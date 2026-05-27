// ── KW ────────────────────────────────────────────────────────────────────────
const now = new Date();
const jan1 = new Date(now.getFullYear(),0,1);
const kw = Math.ceil(((now-jan1)/86400000+jan1.getDay()+1)/7);
document.getElementById('kwBadge').textContent='KW '+kw;

// ── TABS ──────────────────────────────────────────────────────────────────────
function showTab(id, btn) {
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
  btn.classList.add('active');
}

// ── SCORING (POSITIV & INTEGRATIV - KEINE 0 PUNKTE) ───────────────────────────
const SCORE = {
  commute: {
    'fahrrad': 20, 
    'zu fuß': 20, 
    'zu fuss': 20, 
    'öpvn': 15, 
    'öpnv': 15, 
    'fahrgemeinschaft': 10, 
    'auto allein': 5 
  },
 // Dienstreisen (NUR Punkte, wenn man wirklich gereist ist!)
  travel: {
    'keine': 0,        
    'bahn': 15,       
    'öpvn': 12, 
    'öpnv': 12, 
    'fahrgemeinschaft': 8, 
    'auto allein': 5, 
    'flugzeug': 5 
  },
  print: {
    '0 seiten': 10, 
    '1-10': 8, 
    '1–10': 8, 
    '11-30': 5, 
    '30+': 3, 
    '+30': 3
  },
  homeofficePts: [5, 10, 15, 20, 25, 30],
  socialDay: 50 
};
const CO2_PER_PT = 0.12;
let deptChartObj = null, weekChartObj = null, weeklyData = {};

function matchScore(map, val) {
  const v = (val || '').toLowerCase().trim();
  for (const [k, p] of Object.entries(map)) if (v.includes(k)) return p;
  return null;
}

function scoreRow(row) {
  const cols = Object.keys(row); let pts = 0;
  
  const commuteCol = cols.find(c => c.toLowerCase().includes('verkehrsmittel') && c.toLowerCase().includes('arbeit'));
  if (commuteCol) { const s = matchScore(SCORE.commute, row[commuteCol]); if (s !== null) pts += s; }
  
  const travelCol = cols.find(c => c.toLowerCase().includes('dienstreise'));
  if (travelCol) { const s = matchScore(SCORE.travel, row[travelCol]); if (s !== null) pts += s; }
  
  const homeCol = cols.find(c => c.toLowerCase().includes('homeoffice'));
  if (homeCol) { const d = Math.min(5, Math.max(0, parseInt(row[homeCol]) || 0)); pts += SCORE.homeofficePts[d]; }
  
  const printCol = cols.find(c => c.toLowerCase().includes('seiten') || c.toLowerCase().includes('gedruckt'));
  if (printCol) { const s = matchScore(SCORE.print, row[printCol]); if (s !== null) pts += s; }
  
  const socialCol = cols.find(c => c.toLowerCase().includes('social'));
  if (socialCol) { const v = (row[socialCol] || '').toLowerCase(); if (v.includes('ja') || v === 'true' || v === '1') pts += SCORE.socialDay; }
  
  return pts;
}

function getAbteilung(row){const col=Object.keys(row).find(c=>c.toLowerCase().includes('abteilung'));return col?(row[col]||'').trim():null;}
function getEmail(row){const col=Object.keys(row).find(c=>c.toLowerCase().includes('mail'));return col?(row[col]||'').trim():'';}
function getName(row){const col=Object.keys(row).find(c=>c.toLowerCase()==='name');return col?(row[col]||'').trim():'';}

function getWeek(row){
  const col=Object.keys(row).find(c=>c.toLowerCase().includes('startzeit')||c.toLowerCase().includes('start'));
  if(!col||!row[col])return'KW ?';
  let d;const val=row[col];
  if(typeof val==='number')d=new Date(Math.round((val-25569)*86400*1000));
  else d=new Date(val);
  if(isNaN(d))return'KW ?';
  const j1=new Date(d.getFullYear(),0,1);
  return'KW '+Math.ceil(((d-j1)/86400000+j1.getDay()+1)/7);
}

function processData(rows){
  const seen={};
  for(const row of rows){const key=getEmail(row)||getName(row);if(key)seen[key]=row;}
  const deduped=Object.values(seen).filter(r=>getAbteilung(r));
  const deptMap={};
  for(const row of deduped){
    const dept=getAbteilung(row);if(!dept)continue;
    if(!deptMap[dept])deptMap[dept]={points:0,count:0};
    deptMap[dept].points+=scoreRow(row);deptMap[dept].count++;
  }
  const depts=Object.entries(deptMap).map(([name,d])=>({name,total:d.points,avg:Math.round(d.points/d.count),count:d.count})).sort((a,b)=>b.avg-a.avg);
  weeklyData={};
  for(const row of rows.filter(r=>getAbteilung(r))){
    const w=getWeek(row),dept=getAbteilung(row);
    if(!weeklyData[w])weeklyData[w]={};
    if(!weeklyData[w][dept])weeklyData[w][dept]={points:0,count:0};
    weeklyData[w][dept].points+=scoreRow(row);weeklyData[w][dept].count++;
  }
  const totalPts=depts.reduce((s,d)=>s+d.total,0);
  document.getElementById('mTotal').textContent=totalPts;
  document.getElementById('mTotalSub').textContent=depts.length+' Abteilungen';
  document.getElementById('mPeople').textContent=deduped.length;
  document.getElementById('mCO2').innerHTML=Math.round(totalPts*CO2_PER_PT)+'<span>kg</span>';
  if(depts.length){document.getElementById('mLeader').textContent=depts[0].name;document.getElementById('mLeaderSub').textContent=depts[0].avg+' Pkt./Person';}
  document.getElementById('rankBadge').textContent=depts.length+' Abteilungen';
  renderLeaderboard(depts);renderDeptChart(depts);renderWeekTabs(depts);
}

function renderLeaderboard(depts){
  const lb=document.getElementById('leaderboard');
  if(!depts.length){lb.innerHTML='<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">Keine Daten mit Abteilungszuordnung</div></div>';return;}
  const max=depts[0].avg||1;const medals=['🥇','🥈','🥉'];
  lb.innerHTML=depts.map((d,i)=>{
    const rank=i+1,cls=rank<=3?`rank-${rank}`:'rank-other',pct=Math.round((d.avg/max)*100);
    return`<div class="dept-row ${cls}"><div class="rank-num">${rank}</div><div class="dept-name-wrap"><div class="dept-name">${d.name} ${medals[i]||''}</div><div class="dept-count">${d.count} Teilnehmende</div></div><div class="bar-wrap"><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></div><div class="dept-score"><div class="score-num">${d.avg}</div><div class="score-label">Pkt./Person</div></div></div>`;
  }).join('');
}

const palette=['#c8a84b','#2d8c34','#a0674a','#5ec466','#1a4d1e'];

function renderDeptChart(depts){
  const ctx=document.getElementById('deptChart');
  if(deptChartObj)deptChartObj.destroy();if(!depts.length)return;
  deptChartObj=new Chart(ctx,{type:'bar',data:{labels:depts.map(d=>d.name),datasets:[{data:depts.map(d=>d.avg),backgroundColor:depts.map((_,i)=>palette[i%palette.length]),borderRadius:6,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.parsed.y+' Pkt./Person'}}},scales:{x:{grid:{display:false},ticks:{color:'#7a9b7d',font:{family:'DM Sans'}}},y:{grid:{color:'rgba(45,140,52,0.08)'},ticks:{color:'#7a9b7d',font:{family:'DM Mono'}},beginAtZero:true}}}});
}

function renderWeekTabs(depts){
  const weeks=Object.keys(weeklyData).sort(),tabsEl=document.getElementById('weekTabs');
  if(!weeks.length){tabsEl.innerHTML='';return;}
  tabsEl.innerHTML=weeks.map((w,i)=>`<button class="week-tab ${i===weeks.length-1?'active':''}" onclick="selectWeek('${w}',this)">${w}</button>`).join('');
  renderWeekChart(weeks[weeks.length-1],depts);
}

function selectWeek(w,btn){
  document.querySelectorAll('.week-tab').forEach(t=>t.classList.remove('active'));btn.classList.add('active');
  const names=[...new Set(Object.values(weeklyData).flatMap(d=>Object.keys(d)))];
  renderWeekChart(w,names.map(name=>({name})));
}

function renderWeekChart(sel,depts){
  const ctx=document.getElementById('weekChart');
  if(weekChartObj)weekChartObj.destroy();
  const weeks=Object.keys(weeklyData).sort();if(!weeks.length||!depts.length)return;
  const datasets=depts.slice(0,5).map((d,i)=>({label:d.name,data:weeks.map(w=>{const x=weeklyData[w]?.[d.name];return x?Math.round(x.points/x.count):null;}),borderColor:palette[i%palette.length],backgroundColor:palette[i%palette.length]+'22',tension:0.4,fill:false,pointRadius:4,spanGaps:true}));
  weekChartObj=new Chart(ctx,{type:'line',data:{labels:weeks,datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:depts.length>1,position:'bottom',labels:{color:'#4a6b4d',font:{family:'DM Sans',size:11},boxWidth:10,padding:12}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.parsed.y+' Pkt./Person'}}},scales:{x:{grid:{display:false},ticks:{color:'#7a9b7d',font:{family:'DM Sans'}}},y:{grid:{color:'rgba(45,140,52,0.08)'},ticks:{color:'#7a9b7d',font:{family:'DM Mono'}},beginAtZero:true}}}});
}

function handleFile(event){
  const file=event.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const data=new Uint8Array(e.target.result),wb=XLSX.read(data,{type:'array',cellDates:true});
      const ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{defval:''});
      processData(rows);
      document.getElementById('fileStatus').innerHTML=`<div class="file-loaded">✅ <strong>${file.name}</strong> erfolgreich geladen · ${rows.length} Einträge</div>`;
    }catch(err){document.getElementById('fileStatus').innerHTML=`<div class="file-error">❌ Fehler: ${err.message}</div>`;}
  };
  reader.readAsArrayBuffer(file);
}

// ── TIPS ──────────────────────────────────────────────────────────────────────
const catLabels={papier:'🗒️ Papier',energie:'⚡ Energie',mobilitaet:'🚗 Mobilität',allgemein:'🌿 Allgemein'};
let tips=[
  {id:1,cat:'papier',icon:'📄',title:'Beidseitig drucken',desc:'Stellt den Drucker standardmäßig auf Duplexdruck um – das halbiert den Papierverbrauch sofort.'},
  {id:2,cat:'papier',icon:'📋',title:'Digitale Notizen',desc:'Nutzt OneNote oder Teams-Notizen statt Notizblöcken. Alles bleibt durchsuchbar und synchron.'},
  {id:3,cat:'papier',icon:'✉️',title:'E-Mail vor dem Drucken',desc:'Fragt euch vor jedem Ausdruck: Würde eine E-Mail oder ein PDF denselben Zweck erfüllen?'},
  {id:4,cat:'energie',icon:'🖥️',title:'Bildschirm abschalten',desc:'Schaltet Monitore beim Verlassen des Arbeitsplatzes aus – im Standby verbrauchen sie bis zu 80% der normalen Energie.'},
  {id:5,cat:'energie',icon:'🌡️',title:'Raumtemperatur optimieren',desc:'Jedes Grad weniger Heizung spart ca. 6% Energie. Lüftet kurz und kräftig statt dauerhaft gekippt.'},
  {id:6,cat:'energie',icon:'🔌',title:'Ladekabel ziehen',desc:'Steckernetzteile und Ladekabel verbrauchen auch ohne angeschlossenes Gerät Strom – einfach rausziehen.'},
  {id:7,cat:'mobilitaet',icon:'🚂',title:'Bahn statt Auto',desc:'Die Bahn emittiert pro Kilometer ca. 10x weniger CO₂ als ein Pkw. Für Dienstreisen immer erste Wahl.'},
  {id:8,cat:'mobilitaet',icon:'🤝',title:'Fahrgemeinschaft bilden',desc:'Sprecht Kollegen an die eine ähnliche Pendelstrecke haben – gemeinsam fahren spart Geld und CO₂.'},
  {id:9,cat:'mobilitaet',icon:'📹',title:'Video statt Reise',desc:'Viele Meetings lassen sich problemlos per Teams oder Zoom abhalten – fragt euch ob eine Reise wirklich nötig ist.'},
  {id:10,cat:'allgemein',icon:'♻️',title:'Richtig trennen',desc:'Achtet auf korrekte Mülltrennung im Büro – Papier, Plastik und Restmüll getrennt entsorgen.'},
  {id:11,cat:'allgemein',icon:'🌱',title:'Grünpflanzen im Büro',desc:'Zimmerpflanzen verbessern die Luftqualität und das Wohlbefinden – fragt nach Pflanzen für euren Bereich.'},
  {id:12,cat:'allgemein',icon:'💧',title:'Wasserhahn schließen',desc:'Dreht den Wasserhahn beim Händewaschen und in der Teeküche konsequent zu – jeder Tropfen zählt.'},
];
let nextId=13,currentFilter='alle';

function renderTips(){
  const grid=document.getElementById('tipsGrid');
  const filtered=currentFilter==='alle'?tips:tips.filter(t=>t.cat===currentFilter);
  if(!filtered.length){grid.innerHTML='<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">💡</div><div class="empty-state-text">Noch keine Tipps in dieser Kategorie</div></div>';return;}
  grid.innerHTML=filtered.map(t=>`
    <div class="tip-card cat-${t.cat}">
      <button class="tip-delete" onclick="deleteTip(${t.id})" title="Tipp löschen">✕</button>
      <span class="tip-cat-badge">${catLabels[t.cat]}</span>
      <div class="tip-icon">${t.icon}</div>
      <div class="tip-title">${t.title}</div>
      <div class="tip-desc">${t.desc}</div>
    </div>`).join('');
}

function filterTips(cat,btn){
  currentFilter=cat;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderTips();
}

function deleteTip(id){
  tips=tips.filter(t=>t.id!==id);
  renderTips();
}

function openModal(){document.getElementById('modalOverlay').classList.add('open');}
function closeModal(){
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('tipTitle').value='';
  document.getElementById('tipDesc').value='';
  document.getElementById('tipIcon').value='';
}

function saveTip(){
  const title=document.getElementById('tipTitle').value.trim();
  const desc=document.getElementById('tipDesc').value.trim();
  const icon=document.getElementById('tipIcon').value.trim()||'💡';
  const cat=document.getElementById('tipCat').value;
  if(!title||!desc){alert('Bitte Titel und Beschreibung ausfüllen.');return;}
  tips.push({id:nextId++,cat,icon,title,desc});
  closeModal();renderTips();
  currentFilter='alle';
  document.querySelectorAll('.filter-btn').forEach((b,i)=>{if(i===0)b.classList.add('active');else b.classList.remove('active');});
}

document.getElementById('modalOverlay').addEventListener('click',function(e){if(e.target===this)closeModal();});

// ── DEMO DATA ─────────────────────────────────────────────────────────────────
const demo=[
  {Name:'Lea Rührnschopf','E-Mail':'lea@bbbank.de',Startzeit:'28.04.2026 09:00','In welcher Abteilung arbeitest du? ':'S&N','Welches Verkehrsmittel hast du genutzt um zur Arbeit zu gelangen? ':'Fahrrad','Hattest du diese Woche eine Dienstreise? - Wenn ja, mit welchem Verkehrsmittel? ':'Keine Dienstreise','Wie viele Tage warst du diese Woche im HomeOffice? (0-5)':'2','Wie viele Seiten hast du diese Woche gedruckt? ':'0 Seiten','Haben Sie an einem Social Day teilgenommen?':'Nein'},
  {Name:'Rouven König','E-Mail':'rouven@bbbank.de',Startzeit:'28.04.2026 09:10','In welcher Abteilung arbeitest du? ':'S&N','Welches Verkehrsmittel hast du genutzt um zur Arbeit zu gelangen? ':'Zu Fuß','Hattest du diese Woche eine Dienstreise? - Wenn ja, mit welchem Verkehrsmittel? ':'Keine Dienstreise','Wie viele Tage warst du diese Woche im HomeOffice? (0-5)':'3','Wie viele Seiten hast du diese Woche gedruckt? ':'0 Seiten','Haben Sie an einem Social Day teilgenommen?':'Ja'},
  {Name:'Maxim Makarova','E-Mail':'maxim@bbbank.de',Startzeit:'28.04.2026 09:15','In welcher Abteilung arbeitest du? ':'OIT','Welches Verkehrsmittel hast du genutzt um zur Arbeit zu gelangen? ':'ÖPVN','Hattest du diese Woche eine Dienstreise? - Wenn ja, mit welchem Verkehrsmittel? ':'ÖPVN','Wie viele Tage warst du diese Woche im HomeOffice? (0-5)':'0','Wie viele Seiten hast du diese Woche gedruckt? ':'1-10 Seiten','Haben Sie an einem Social Day teilgenommen?':'Nein'},
  {Name:'Jonas Niederer','E-Mail':'jonas@bbbank.de',Startzeit:'21.04.2026 09:00','In welcher Abteilung arbeitest du? ':'DMS','Welches Verkehrsmittel hast du genutzt um zur Arbeit zu gelangen? ':'Auto Fahrgemeinschaft','Hattest du diese Woche eine Dienstreise? - Wenn ja, mit welchem Verkehrsmittel? ':'Keine Dienstreise','Wie viele Tage warst du diese Woche im HomeOffice? (0-5)':'2','Wie viele Seiten hast du diese Woche gedruckt? ':'1-10 Seiten','Haben Sie an einem Social Day teilgenommen?':'Nein'},
  {Name:'Tyron Arnold','E-Mail':'tyron@bbbank.de',Startzeit:'21.04.2026 09:05','In welcher Abteilung arbeitest du? ':'OIT','Welches Verkehrsmittel hast du genutzt um zur Arbeit zu gelangen? ':'Fahrrad','Hattest du diese Woche eine Dienstreise? - Wenn ja, mit welchem Verkehrsmittel? ':'Bahn','Wie viele Tage warst du diese Woche im HomeOffice? (0-5)':'3','Wie viele Seiten hast du diese Woche gedruckt? ':'0 Seiten','Haben Sie an einem Social Day teilgenommen?':'Nein'},
  {Name:'Christof Warsinsky','E-Mail':'christof@bbbank.de',Startzeit:'14.04.2026 09:00','In welcher Abteilung arbeitest du? ':'DMS','Welches Verkehrsmittel hast du genutzt um zur Arbeit zu gelangen? ':'ÖPVN','Hattest du diese Woche eine Dienstreise? - Wenn ja, mit welchem Verkehrsmittel? ':'Keine Dienstreise','Wie viele Tage warst du diese Woche im HomeOffice? (0-5)':'1','Wie viele Seiten hast du diese Woche gedruckt? ':'11-30 Seiten','Haben Sie an einem Social Day teilgenommen?':'Nein'},
];
processData(demo);
renderTips();
