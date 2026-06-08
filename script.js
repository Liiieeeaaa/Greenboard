
// Inject badge tab content after main loads
document.addEventListener('DOMContentLoaded', function() {
  const main = document.querySelector('main.main');
  const badgeTabDiv = document.createElement('div');
  badgeTabDiv.id = 'tab-badges';
  badgeTabDiv.className = 'tab-content';
  badgeTabDiv.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;flex-wrap:wrap;gap:10px;">
      <div>
        <div style="font-size:20px;font-weight:600;color:var(--text-primary);">🏅 Badge-Sammlung</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:4px;">Alle sammelbaren Badges · Freischaltbedingungen · Fortschritt</div>
      </div>
    </div>
    <!-- Sammelstatus-Leiste -->
    <div class="badge-collect-bar" id="badgeCollectBar">
      <div class="bcb-text">
        <div class="bcb-title" id="bcbTitle">0 von 40 Badges gesammelt</div>
        <div class="bcb-subtitle" id="bcbMotiv">Sammle deinen ersten Badge!</div>
      </div>
      <div class="bcb-bar-wrap">
        <div class="bcb-track"><div class="bcb-fill" id="bcbFill" style="width:0%"></div></div>
        <div class="bcb-pct" id="bcbPct">0%</div>
      </div>
    </div>
    <!-- Kategorie-Filter -->
    <div class="badge-cat-tabs" id="badgeCatTabs">
      <button class="badge-cat-tab active" onclick="filterBadgeCat('alle',this)">Alle</button>
      <button class="badge-cat-tab" onclick="filterBadgeCat('mobilitaet',this)">🚲 Mobilität</button>
      <button class="badge-cat-tab" onclick="filterBadgeCat('papier',this)">📄 Papier & Digital</button>
      <button class="badge-cat-tab" onclick="filterBadgeCat('energie',this)">⚡ Energie</button>
      <button class="badge-cat-tab" onclick="filterBadgeCat('ernaehrung',this)">🥗 Ernährung</button>
      <button class="badge-cat-tab" onclick="filterBadgeCat('aktivitaet',this)">🔥 Aktivität & Serie</button>
      <button class="badge-cat-tab" onclick="filterBadgeCat('teamleistung',this)">👥 Teamleistung</button>
      <button class="badge-cat-tab" onclick="filterBadgeCat('spezial',this)">⭐ Spezialbadges</button>
    </div>
    <!-- Badge-Grid -->
    <div id="badgeCollectionGrid" class="badge-collection-grid"></div>
  `;
  main.appendChild(badgeTabDiv);
  renderBadgeCollection('alle');
});



const now = new Date();
const jan1 = new Date(now.getFullYear(),0,1);
const kw = Math.ceil(((now-jan1)/86400000+jan1.getDay()+1)/7);
document.getElementById('kwBadge').textContent='KW '+kw;
function showTab(id, btn) {
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
  btn.classList.add('active');
}
const SCORE={
  commute:{'fahrrad':15,'zu fuß':15,'zu fuss':15,'öpvn':10,'öpnv':10,'fahrgemeinschaft':5,'auto allein':0},
  travel:{'keine':15,'bahn':10,'öpvn':10,'öpnv':10,'fahrgemeinschaft':5,'auto allein':2,'flugzeug':0},
  print:{'0 seiten':15,'1-10':8,'1–10':8,'11-30':3,'11–30':3,'30+':0,'+30':0},
  homeofficePts:[0,8,16,24,30,35],
  socialDay:30
};
const CO2_PER_PT=0.12;
let deptChartObj=null,weekChartObj=null,weeklyData={};
function matchScore(map,val){
  const v=(val||'').toLowerCase().trim();
  for(const[k,p]of Object.entries(map))if(v.includes(k))return p;
  return null;
}
function scoreRow(row){
  const cols=Object.keys(row);let pts=0;
  const commuteCol=cols.find(c=>c.toLowerCase().includes('verkehrsmittel')&&c.toLowerCase().includes('arbeit'));
  if(commuteCol){const s=matchScore(SCORE.commute,row[commuteCol]);if(s!==null)pts+=s;}
  const travelCol=cols.find(c=>c.toLowerCase().includes('dienstreise'));
  if(travelCol){const s=matchScore(SCORE.travel,row[travelCol]);if(s!==null)pts+=s;}
  const homeCol=cols.find(c=>c.toLowerCase().includes('homeoffice'));
  if(homeCol){const d=Math.min(5,Math.max(0,parseInt(row[homeCol])||0));pts+=SCORE.homeofficePts[d];}
  const printCol=cols.find(c=>c.toLowerCase().includes('seiten')||c.toLowerCase().includes('gedruckt'));
  if(printCol){const s=matchScore(SCORE.print,row[printCol]);if(s!==null)pts+=s;}
  const socialCol=cols.find(c=>c.toLowerCase().includes('social'));
  if(socialCol){const v=(row[socialCol]||'').toLowerCase();if(v.includes('ja')||v==='true'||v==='1')pts+=SCORE.socialDay;}
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
/* === NEU: Hilfsfunktionen für Gamification === */
function animCount(elId,target,suffix,duration){
  const el=document.getElementById(elId);if(!el)return;
  const start=performance.now();
  const run=now=>{
    const p=Math.min((now-start)/duration,1);
    const ease=p<0.5?2*p*p:-1+(4-2*p)*p;
    el.textContent=Math.round(ease*target)+suffix;
    if(p<1)requestAnimationFrame(run);
  };
  requestAnimationFrame(run);
}
function showConfetti(){
  const wrap=document.getElementById('confettiWrap');if(!wrap)return;
  wrap.style.display='block';wrap.innerHTML='';
  const cols=['#c8a84b','#3aaa42','#5ec466','#a0674a','#bfecbf','#fff'];
  for(let i=0;i<45;i++){
    const p=document.createElement('div');p.className='cp';
    p.style.left=Math.random()*100+'%';
    p.style.background=cols[Math.floor(Math.random()*cols.length)];
    p.style.borderRadius=Math.random()>0.5?'50%':'2px';
    p.style.width=p.style.height=(6+Math.random()*6)+'px';
    p.style.animationDelay=Math.random()*0.8+'s';
    p.style.animationDuration=(2+Math.random()*1)+'s';
    wrap.appendChild(p);
  }
  setTimeout(()=>{wrap.style.display='none';wrap.innerHTML='';},4000);
}
function showToast(msg){
  const t=document.getElementById('msToast'),m=document.getElementById('msToastMsg');
  if(!t||!m)return;
  m.textContent=msg;t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),4500);
}
function renderBadges(depts){
  const grid=document.getElementById('badgesGrid');if(!depts.length||!grid)return;
  const badges=[];
  const byAvg=[...depts].sort((a,b)=>b.avg-a.avg);
  const byTotal=[...depts].sort((a,b)=>b.total-a.total);
  if(byAvg[0])badges.push({ico:'🏆',cls:'gold',name:'Wochenchampion',who:byAvg[0].name});
  if(byTotal[0])badges.push({ico:'💚',cls:'green',name:'Klima-Profi',who:byTotal[0].name});
  const consistent=depts.find(d=>d.count>=2);
  if(consistent)badges.push({ico:'🔄',cls:'silver',name:'Konstant aktiv',who:consistent.name});
  if(depts.length>=2)badges.push({ico:'🌱',cls:'blue',name:'Eco-Vorreiter',who:byAvg[1].name});
  if(depts.length>=3)badges.push({ico:'♻️',cls:'purple',name:'Top-Sparer',who:byTotal[2]?.name||byAvg[2].name});
  document.getElementById('badgeCount').textContent=badges.length+' Badges';
  grid.innerHTML=badges.map(b=>`<div class="badge-item"><div class="badge-ico ${b.cls}">${b.ico}</div><div><div class="badge-nm">${b.name}</div><div class="badge-who">${b.who}</div></div></div>`).join('');
}
function renderMilestones(co2Total){
  const milestones=[
    {kg:10,label:'10 kg CO₂ gespart'},
    {kg:25,label:'25 kg CO₂ gespart'},
    {kg:50,label:'50 kg CO₂ gespart'},
    {kg:100,label:'100 kg CO₂ gespart'},
    {kg:250,label:'250 kg CO₂ gespart'},
  ];
  const track=document.getElementById('milestoneTrack');if(!track)return{reached:0};
  let reached=0,nextSet=false,highestReached=null;
  track.innerHTML=milestones.map(m=>{
    let status,tag,pct=0,sub;
    if(co2Total>=m.kg){
      status='reached';tag='✓ Erreicht';reached++;highestReached=m;
      sub='Meilenstein freigeschaltet';
    }else if(!nextSet){
      nextSet=true;status='next';tag='Nächstes Ziel';
      pct=Math.min(99,Math.round((co2Total/m.kg)*100));
      sub=`${pct}% – noch ${(m.kg-co2Total).toFixed(1)} kg`;
    }else{
      status='locked';tag='Gesperrt';
      sub=`Noch ${(m.kg-co2Total).toFixed(1)} kg nötig`;
    }
    const ico=status==='reached'?'✅':status==='next'?'🎯':'🔒';
    const prog=status==='next'?`<div class="ms-prog"><div class="ms-prog-fill" data-w="${pct}%" style="width:0%"></div></div>`:'';
    return`<div class="ms-item"><div class="ms-circ ${status}">${ico}</div><div class="ms-info"><div class="ms-nm">${m.label}</div><div class="ms-sub">${sub}</div>${prog}</div><span class="ms-tag ${status}">${tag}</span></div>`;
  }).join('');
  // animate progress bar
  setTimeout(()=>{
    track.querySelectorAll('.ms-prog-fill[data-w]').forEach(el=>{el.style.width=el.dataset.w;});
  },300);
  document.getElementById('msReached').textContent=reached+' erreicht';
  return{reached,highestReached};
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

  /* === NEU: Live-Impact-Zähler === */
  const co2Total=Math.round(totalPts*CO2_PER_PT);
  const wkeys=Object.keys(weeklyData).sort();
  const lastW=wkeys[wkeys.length-1],prevW=wkeys[wkeys.length-2];
  let weekPts=0,prevPts=0;
  if(lastW)weekPts=Object.values(weeklyData[lastW]).reduce((s,d)=>s+d.points,0);
  if(prevW)prevPts=Object.values(weeklyData[prevW]).reduce((s,d)=>s+d.points,0);
  const weekCO2=Math.round(weekPts*CO2_PER_PT);
  const todayCO2=Math.max(1,Math.round(weekCO2/5));
  setTimeout(()=>{
    animCount('liToday',todayCO2,' kg',900);
    animCount('liWeek',weekCO2,' kg',1200);
    animCount('liTotal',co2Total,' kg',1600);
  },200);

  /* ===== v4: CO₂-Äquivalenz rotierend ===== */
  if(co2Total>0){
    const km=Math.round(co2Total/0.21);
    const flights=(co2Total/110).toFixed(1);
    const days=Math.round(co2Total/3.6);
    const trees=Math.round(co2Total/21);
    const showers=Math.round(co2Total/0.5);
    const equivList=[
      {icon:'🚗',text:`${km} km Autofahrt`},
      {icon:'✈️',text:`${flights} Kurzflüge`},
      {icon:'⚡',text:`${days} Tage Strom`},
      {icon:'🌳',text:`${trees} Bäume/Jahr CO₂`},
      {icon:'🚿',text:`${showers} Duschen`},
    ];
    // rotate based on day-of-year
    const dayIdx=Math.floor((Date.now()/86400000))%equivList.length;
    const chosen=equivList[dayIdx];
    const pill=document.getElementById('co2EquivPill');
    const popup=document.getElementById('co2InfoPopup');
    const wrap=document.getElementById('co2SingleEquiv');
    if(pill&&wrap){
      pill.textContent=chosen.icon+' '+chosen.text;
      wrap.style.display='flex';
    }
    if(popup){
      popup.innerHTML='<div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:5px;">CO₂ Vergleiche</div>'+
        equivList.map(e=>`<div class="co2-info-popup-row">${e.icon} <span>${e.text}</span></div>`).join('');
    }
  }

  /* === NEU: Trendpfeile KPI === */
  const ttEl=document.getElementById('mTotalTrend');
  const co2TrEl=document.getElementById('mCO2Trend');
  if(lastW&&prevW&&prevPts>0){
    const diff=Math.round(((weekPts-prevPts)/prevPts)*100);
    const up=diff>=0;
    if(ttEl)ttEl.innerHTML=`<span class="trend-chip ${up?'up':'down'}">${up?'▲':'▼'} ${up?'+':''}${diff}% zur Vorwoche</span>`;
    const prevCO2=Math.round(prevPts*CO2_PER_PT);
    const co2Diff=prevCO2>0?Math.round(((weekCO2-prevCO2)/prevCO2)*100):0;
    const upC=co2Diff>=0;
    if(co2TrEl)co2TrEl.innerHTML=`<span class="trend-chip ${upC?'up':'down'}">${upC?'▲':'▼'} ${upC?'+':''}${co2Diff}% zur Vorwoche</span>`;
  }else if(lastW){
    if(ttEl)ttEl.innerHTML='<span class="trend-chip neutral">→ Erste Woche</span>';
    if(co2TrEl)co2TrEl.innerHTML='<span class="trend-chip neutral">→ Erste Woche</span>';
  }

  /* === NEU: Abteilungsvergleich in KPI === */
  const cmpEl=document.getElementById('mTotalCompare');
  if(cmpEl&&depts.length>1){
    const avgAll=Math.round(depts.reduce((s,d)=>s+d.avg,0)/depts.length);
    const leader=depts[0];
    const pctAbove=avgAll>0?Math.round(((leader.avg-avgAll)/avgAll)*100):0;
    cmpEl.innerHTML=`Spitzenreiter: <b>${leader.name}</b> · ${pctAbove>0?'+':''}${pctAbove}% über Ø`;
  }

  /* === NEU: Badges + Meilensteine === */
  renderBadges(depts);
  const {reached,highestReached}=renderMilestones(co2Total);

  /* === NEU v3: Cache + Team-Selektoren befüllen === */
  _allDepts=depts;
  _allRows=deduped.map(row=>({...row,_name:getName(row),_dept:getAbteilung(row),_pts:scoreRow(row)}));
  const selectors=['ownTeamSelect','ownTeamSelect2'];
  selectors.forEach(id=>{
    const sel=document.getElementById(id);if(!sel)return;
    const cur=sel.value;
    sel.innerHTML='<option value="">– wählen –</option>'+depts.map(d=>`<option value="${d.name}"${d.name===cur?' selected':''}>${d.name}</option>`).join('');
  });
  /* sync both selectors */
  const s1=document.getElementById('ownTeamSelect'),s2=document.getElementById('ownTeamSelect2');
  if(s1&&s2){s2.value=s1.value;}

  /* Konfetti + Toast bei Meilenstein === */
  if(co2Total>=10&&highestReached){
    setTimeout(()=>{
      showConfetti();
      showToast(`Meilenstein "${highestReached.label}" erreicht! 🌿`);
    },900);
  }
  /* v4: Badge-Sammlung initialisieren */
  const ownSel=document.getElementById('ownTeamSelect');
  const ownVal=ownSel?ownSel.value:'';
  computeEarnedBadges(depts,ownVal);
  renderBadgeCollection(_currentBadgeCat||'alle');
}
function renderLeaderboard(depts){
  window._lastDepts=depts;
  const lb=document.getElementById('leaderboard');
  if(!depts.length){lb.innerHTML='<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">Keine Daten mit Abteilungszuordnung</div></div>';return;}
  const max=depts[0].avg||1;const medals=['🥇','🥈','🥉'];
  const weeks=Object.keys(weeklyData).sort();
  const lastW=weeks[weeks.length-1],prevW=weeks[weeks.length-2];
  const avgAll=depts.length>1?Math.round(depts.reduce((s,d)=>s+d.avg,0)/depts.length):0;
  const ownTeam=(document.getElementById('ownTeamSelect')?.value||'');
  lb.innerHTML=depts.map((d,i)=>{
    const rank=i+1,cls=rank<=3?`rank-${rank}`:'rank-other',pct=Math.round((d.avg/max)*100);
    /* team avatar */
    const avatarData=_teamAvatars[d.name];
    const initials=d.name.split(' ').map(p=>p[0]||'').join('').slice(0,2).toUpperCase()||'?';
    const avatarHtml=avatarData
      ?`<img src="${avatarData}" class="team-avatar-sm rank-${rank<=3?rank:'other'}" style="object-fit:cover;" alt="${d.name}">`
      :`<div class="team-avatar-sm rank-${rank<=3?rank:'other'}" style="background:${_teamColors[i%_teamColors.length]}">${initials}</div>`;
    /* trend chip */
    let trendHtml='';
    if(lastW&&prevW){
      const last=weeklyData[lastW]?.[d.name],prev=weeklyData[prevW]?.[d.name];
      if(last&&prev&&prev.count>0){
        const diff=Math.round(((Math.round(last.points/last.count)-Math.round(prev.points/prev.count))/Math.max(1,Math.round(prev.points/prev.count)))*100);
        trendHtml=`<span class="dept-trend-chip ${diff>=0?'up':'down'}">${diff>=0?'▲':'▼'}${Math.abs(diff)}%</span>`;
      }
    }
    /* dept avg comparison */
    let cmpHtml=`<div class="dept-count">${d.count} Teilnehmende`;
    if(avgAll>0&&depts.length>1){const diff=d.avg-avgAll,pctD=Math.round((diff/Math.max(1,avgAll))*100);cmpHtml+=` · <span class="dept-cmp ${diff>=0?'above':'below'}">${diff>=0?'+':''}${pctD}% zum Ø</span>`;}
    cmpHtml+='</div>';
    /* team badge */
    const badge=getTeamBadge(d.avg);
    const isOwn=ownTeam&&d.name===ownTeam;
    const badgeHtml=badge
      ?`<span class="team-lvl-badge ${badge.level}${isOwn?' own':''}" data-dept="${d.name}" ${isOwn?`onclick="openBadgeModal('${d.name.replace(/'/g,"\\'")}')"`:'title="Badge: '+badge.label+'"'}>${badge.icon} ${badge.label}</span>`
      :`<span class="team-lvl-badge none" title="Noch kein Badge">🌱 –</span>`;
    return`<div class="dept-row ${cls}"><div class="rank-num">${rank}</div>${avatarHtml}<div class="dept-name-wrap"><div class="dept-name">${d.name} ${medals[i]||''}${trendHtml}</div>${cmpHtml}</div><div class="bar-wrap"><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></div><div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">${badgeHtml}<div class="dept-score"><div class="score-num">${d.avg}</div><div class="score-label">Pkt./Person</div></div></div></div>`;
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
/* ===== v5: Spalten-Validierung ===== */
const REQUIRED_COLS=[
  {key:'abteilung',label:'Abteilung',match:c=>c.toLowerCase().includes('abteilung'),required:true},
  {key:'homeoffice',label:'Homeoffice (Anzahl Tage)',match:c=>c.toLowerCase().includes('homeoffice'),required:true},
  {key:'commute',label:'Verkehrsmittel Anfahrt',match:c=>c.toLowerCase().includes('verkehrsmittel')&&c.toLowerCase().includes('arbeit'),required:true},
  {key:'travel',label:'Dienstreise',match:c=>c.toLowerCase().includes('dienstreise'),required:true},
  {key:'print',label:'Gedruckte Seiten',match:c=>c.toLowerCase().includes('seiten')||c.toLowerCase().includes('gedruckt'),required:false},
  {key:'social',label:'Social Day',match:c=>c.toLowerCase().includes('social'),required:false},
  {key:'name',label:'Name',match:c=>c.toLowerCase()==='name',required:false},
  {key:'email',label:'E-Mail',match:c=>c.toLowerCase().includes('mail'),required:false},
];
function validateColumns(cols){
  const results=REQUIRED_COLS.map(def=>{
    const found=cols.find(c=>def.match(c));
    return{...def,found:found||null};
  });
  const missing=results.filter(r=>r.required&&!r.found);
  return{results,missing,ok:missing.length===0};
}
function renderValidation(cols,filename,rowCount){
  const {results,missing,ok}=validateColumns(cols);
  const warnOnly=!ok&&missing.length>0;
  const headerCls=ok?'ok':warnOnly?'warn':'error';
  const headerIcon=ok?'✅':warnOnly?'⚠️':'❌';
  const headerText=ok
    ?`${filename} erfolgreich geladen · ${rowCount} Einträge`
    :`${missing.length} Pflichtspalte${missing.length>1?'n':''} nicht erkannt`;
  let html=`<div class="validation-box">
    <div class="validation-header ${headerCls}">${headerIcon} ${headerText}</div>
    <div class="validation-body">
      <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Erkannte Spalten</div>
      <div class="val-col-grid">`;
  results.forEach(r=>{
    const cls=r.found?'found':r.required?'missing':'optional';
    const icon=r.found?'✓':r.required?'✗':'?';
    const label=r.found?r.found:r.label+(r.required?' (fehlt)':' (optional)');
    html+=`<div class="val-col-item ${cls}">${icon} ${label}</div>`;
  });
  html+=`</div>`;
  if(!ok){
    html+=`<div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin:8px 0 4px;">Wie soll die Datei aussehen?</div>
    <div class="val-example">
      <b>Pflichtfelder</b> (Spaltenname muss enthalten):<br>
      · "Abteilung" → z.B. <b>Abteilung</b><br>
      · "Homeoffice" → z.B. <b>Wie viele Tage Homeoffice?</b><br>
      · "Verkehrsmittel" + "Arbeit" → z.B. <b>Verkehrsmittel zur Arbeit</b><br>
      · "Dienstreise" → z.B. <b>Art der Dienstreise</b>
    </div>`;
  }
  html+=`</div></div>`;
  document.getElementById('fileStatus').innerHTML=html;
}
function handleFile(event){
  const file=event.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const data=new Uint8Array(e.target.result),wb=XLSX.read(data,{type:'array',cellDates:true});
      const ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{defval:''});
      const cols=rows.length?Object.keys(rows[0]):[];
      renderValidation(cols,file.name,rows.length);
      const {ok}=validateColumns(cols);
      if(ok||rows.some(r=>getAbteilung(r)))processData(rows);
    }catch(err){
      document.getElementById('fileStatus').innerHTML=`<div class="file-error">❌ Fehler beim Lesen: ${err.message}<br><small style="opacity:0.7">Bitte .xlsx, .xls oder .csv-Datei aus Microsoft Forms hochladen.</small></div>`;
    }
  };
  reader.readAsArrayBuffer(file);
}
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
function closeModal(){document.getElementById('modalOverlay').classList.remove('open');document.getElementById('tipTitle').value='';document.getElementById('tipDesc').value='';document.getElementById('tipIcon').value='';}
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
document.getElementById('badgeModalOverlay').addEventListener('click',function(e){if(e.target===this)closeBadgeModal();});
document.getElementById('memberModalOverlay').addEventListener('click',function(e){if(e.target===this)closeMemberModal();});

/* === NEU v3: Badge-Level-System === */
const BADGE_LEVELS=[
  {level:'bronze',label:'Bronze',icon:'🥉',minAvg:20},
  {level:'silver',label:'Silber',icon:'🥈',minAvg:40},
  {level:'gold',  label:'Gold',  icon:'🥇',minAvg:60},
  {level:'platin',label:'Platin',icon:'💎',minAvg:80},
];
function getTeamBadge(avg){let b=null;for(const l of BADGE_LEVELS)if(avg>=l.minAvg)b=l;return b;}
function getNextBadge(avg){return BADGE_LEVELS.find(l=>avg<l.minAvg)||null;}

let _allDepts=[],_allRows=[],_memberCache={};

/* === NEU v3: Team-Tab rendern === */
function renderTeamTab(){
  const sel=document.getElementById('ownTeamSelect');
  const own=sel?sel.value:'';
  if(!own||!_allDepts.length)return;
  const dept=_allDepts.find(d=>d.name===own);if(!dept)return;
  const rank=_allDepts.findIndex(d=>d.name===own)+1;
  const co2=Math.round(dept.total*CO2_PER_PT);
  document.getElementById('tkRank').textContent=rank;
  document.getElementById('tkRankSub').textContent='von '+_allDepts.length+' Abteilungen';
  document.getElementById('tkAvg').textContent=dept.avg;
  document.getElementById('tkCO2').innerHTML=co2+'<span>kg</span>';
  document.getElementById('tkCount').textContent=dept.count;
  document.getElementById('tkMemberBadge').textContent=dept.count+' Personen';
  /* Spotlight-Hero aktualisieren */
  renderSpotlight();
  /* v4: Badge-Pill neben Rang */
  const badge=getTeamBadge(dept.avg);
  renderRankBadgePill(badge);
  /* v4: Badge-Thermometer */
  renderBadgeThermometer(dept.avg);
  /* v4: Badge-Sammlung aktualisieren */
  computeEarnedBadges(_allDepts,own);
  renderBadgeCollection(_currentBadgeCat||'alle');
  /* Trend */
  const wkeys=Object.keys(weeklyData).sort();
  const lastW=wkeys[wkeys.length-1],prevW=wkeys[wkeys.length-2];
  const tEl=document.getElementById('tkTrend');
  if(lastW&&prevW){
    const la=weeklyData[lastW]?.[own],pr=weeklyData[prevW]?.[own];
    if(la&&pr&&pr.count>0){
      const d=Math.round(((Math.round(la.points/la.count)-Math.round(pr.points/pr.count))/Math.max(1,Math.round(pr.points/pr.count)))*100);
      tEl.innerHTML=`<span class="trend-chip ${d>=0?'up':'down'}">${d>=0?'▲':'▼'} ${d>=0?'+':''}${d}% zur Vorwoche</span>`;
    }
  }else if(lastW){tEl.innerHTML='<span class="trend-chip neutral">→ Erste Woche</span>';}
  /* v5: Suchfeld zurücksetzen */
  const searchEl=document.getElementById('memberSearch');if(searchEl)searchEl.value='';
  /* v5: Donut-Chart */
  const deptRows=_allRows.filter(r=>(r._dept||'')===own);
  renderDonut(deptRows);
  /* Mitglieder */
  const members=_allRows.filter(r=>(r._dept||'')===own).sort((a,b)=>b._pts-a._pts);
  const ml=document.getElementById('memberList');
  if(!members.length){ml.innerHTML='<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">Keine Einträge</div></div>';return;}
  const memberHtml=members.map((m,i)=>{
    const init=(m._name||'?').split(' ').map(p=>p[0]||'').join('').slice(0,2).toUpperCase();
    const mco2=(m._pts*CO2_PER_PT).toFixed(1);
    const above=dept.avg>0?Math.round(((m._pts-dept.avg)/dept.avg)*100):0;
    const badge=getTeamBadge(m._pts);
    const chip=badge?`<span class="member-lvl-chip ${badge.level}">${badge.icon} ${badge.label}</span>`:'';
    _memberCache[m._name]={...m,co2:mco2,rank:i+1,total:members.length,avgPts:dept.avg,above};
    return`<div class="member-row" onclick="openMemberModal('${(m._name||'').replace(/'/g,"\\'")}')">
      <div class="member-avatar">${init}</div>
      <div style="flex:1;min-width:0;"><div class="member-name-txt">${m._name||'–'}</div><div class="member-sub">${mco2} kg CO₂ · ${above>=0?'+':''}${above}% zum Team-Ø</div></div>
      ${chip}
      <div><div class="member-pts">${m._pts}</div><div class="member-pts-lbl">Punkte</div></div>
    </div>`;
  }).join('');
  ml.innerHTML=memberHtml;
  _currentMemberHtml=memberHtml;
  /* Team-Badge-Panel */
  const tbp=document.getElementById('teamBadgePanel');
  const next=getNextBadge(dept.avg);
  if(!badge){
    tbp.innerHTML=`<div style="text-align:center;padding:.75rem;">
      <div style="font-size:34px;margin-bottom:8px;">🌱</div>
      <div style="font-size:13px;font-weight:600;">Noch kein Badge</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Noch ${BADGE_LEVELS[0].minAvg-dept.avg} Pkt./P. bis ${BADGE_LEVELS[0].icon} Bronze</div>
      <div class="ms-prog" style="margin-top:10px;"><div class="ms-prog-fill" data-w="${Math.round((dept.avg/BADGE_LEVELS[0].minAvg)*100)}%" style="width:0%"></div></div></div>`;
  }else{
    const pct=next?Math.min(99,Math.round(((dept.avg-badge.minAvg)/(next.minAvg-badge.minAvg))*100)):100;
    tbp.innerHTML=`<div style="text-align:center;margin-bottom:.9rem;">
      <div style="font-size:38px;margin-bottom:4px;">${badge.icon}</div>
      <div style="font-size:17px;font-weight:600;">${badge.label}-Badge</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">${dept.avg} Pkt./Person Ø</div>
    </div>
    ${next?`<div class="bm-lbl">NÄCHSTER: ${next.icon} ${next.label} (ab ${next.minAvg} Pkt./P.)</div>
    <div class="ms-prog"><div class="ms-prog-fill" data-w="${pct}%" style="width:0%;background:var(--gold);"></div></div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:5px;">Noch <b>${next.minAvg-dept.avg} Pkt./Person</b> · ${pct}% geschafft</div>`
    :'<div style="font-size:12px;color:var(--green-700);font-weight:600;text-align:center;">🏆 Maximales Level erreicht!</div>'}`;
  }
  setTimeout(()=>{tbp.querySelectorAll('.ms-prog-fill[data-w]').forEach(el=>{el.style.width=el.dataset.w;});},300);
  /* Meilenstein-Panel */
  const tmp=document.getElementById('teamMsPanel');
  const msT=[10,25,50,100,250],msNext=msT.find(t=>co2<t);
  if(msNext){
    const pct=Math.round((co2/msNext)*100);
    tmp.innerHTML=`<div style="font-size:13px;font-weight:600;margin-bottom:8px;">🎯 Nächstes Ziel: ${msNext} kg CO₂</div>
    <div class="ms-prog"><div class="ms-prog-fill" data-w="${pct}%" style="width:0%"></div></div>
    <div style="font-size:12px;color:var(--text-muted);margin-top:6px;">${co2} kg / ${msNext} kg · Noch ${(msNext-co2).toFixed(1)} kg</div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">💡 Entspricht ca. ${Math.round((msNext-co2)/0.21)} km Autofahrt</div>`;
    setTimeout(()=>{tmp.querySelectorAll('.ms-prog-fill[data-w]').forEach(el=>{el.style.width=el.dataset.w;});},300);
  }else{tmp.innerHTML='<div style="text-align:center;padding:.75rem;color:var(--green-700);font-weight:600;">🏆 Alle Meilensteine erreicht!</div>';}
}

/* === NEU v3: Mitglieder-Modal === */
function openMemberModal(name){
  const d=_memberCache[name];if(!d)return;
  const init=(d._name||'?').split(' ').map(p=>p[0]||'').join('').slice(0,2).toUpperCase();
  document.getElementById('mmIco').textContent=init;
  document.getElementById('mmName').textContent=d._name||'–';
  document.getElementById('mmDept').textContent=d._dept||'–';
  document.getElementById('mmPts').textContent=d._pts;
  document.getElementById('mmCO2').textContent=d.co2;
  document.getElementById('mmRank').textContent=d.rank+'/'+d.total;
  const cmp=document.getElementById('mmCmp');
  cmp.innerHTML=d.above>=0
    ?`<b>+${d.above}% über dem Team-Ø</b> – Starke Leistung! Weiter so 💪`
    :`<b>${d.above}% unter dem Team-Ø</b> – Noch ${Math.abs(d.above)}% bis zum Durchschnitt – du schaffst das!`;
  const badge=getTeamBadge(d._pts);
  document.getElementById('mmBadges').innerHTML=badge
    ?`<div class="badge-item"><div class="badge-ico ${badge.level}">${badge.icon}</div><div><div class="badge-nm">${badge.label}-Badge</div><div class="badge-who">${d._pts} Punkte</div></div></div>`
    :'<div style="font-size:12px;color:var(--text-muted);">Noch kein Badge – weiter sammeln! 🌱</div>';
  const nextB=getNextBadge(d._pts);
  const mp=document.getElementById('mmProgress');
  if(nextB){
    const prev=getTeamBadge(d._pts),from=prev?prev.minAvg:0;
    const pct=Math.min(99,Math.round(((d._pts-from)/(nextB.minAvg-from))*100));
    mp.innerHTML=`<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">${nextB.icon} Nächster Badge: <b>${nextB.label}</b> – noch ${nextB.minAvg-d._pts} Punkte</div>
    <div class="ms-prog"><div class="ms-prog-fill" data-w="${pct}%" style="width:0%"></div></div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${pct}% des Weges geschafft</div>`;
    setTimeout(()=>{mp.querySelectorAll('.ms-prog-fill[data-w]').forEach(el=>{el.style.width=el.dataset.w;});},200);
  }else{mp.innerHTML='<div style="font-size:12px;color:var(--green-700);font-weight:600;">🏆 Maximales Badge-Level erreicht!</div>';}
  document.getElementById('memberModalOverlay').classList.add('open');
}
function closeMemberModal(){document.getElementById('memberModalOverlay').classList.remove('open');}

/* === NEU v3: Badge-Detail-Modal === */
function openBadgeModal(deptName){
  const dept=_allDepts.find(d=>d.name===deptName);if(!dept)return;
  const badge=getTeamBadge(dept.avg);if(!badge)return;
  /* click pop animation */
  const el=document.querySelector(`.team-lvl-badge[data-dept="${CSS.escape(deptName)}"]`);
  if(el){el.classList.add('badge-popping');setTimeout(()=>el.classList.remove('badge-popping'),500);}
  const next=getNextBadge(dept.avg);
  document.getElementById('bmIco').className='bm-ico '+badge.level;
  document.getElementById('bmIco').textContent=badge.icon;
  document.getElementById('bmTitle').textContent=badge.label+'-Badge';
  document.getElementById('bmSub').textContent='Stufe: '+badge.label+' · '+dept.avg+' Pkt./Person Ø';
  const whyMap={bronze:'Euer Team hat den Einstieg gemeistert und sammelt regelmäßig Punkte für nachhaltigeres Verhalten.',silver:'Euer Team zeigt überdurchschnittliches Engagement – Mobilität, Homeoffice und Druckverhalten sind deutlich verbessert.',gold:'Euer Team gehört zu den Top-Performern! Konsequente Umsetzung in allen Kategorien macht sich bezahlt.',platin:'Außergewöhnliche Leistung! Euer Team setzt Maßstäbe für den gesamten Wettbewerb. 🏆'};
  document.getElementById('bmWhy').textContent=whyMap[badge.level]||'–';
  document.getElementById('bmPerf').textContent=`${dept.count} Teilnehmende · ${dept.total} Gesamtpunkte · ${Math.round(dept.total*CO2_PER_PT)} kg CO₂ eingespart`;
  const fill=document.getElementById('bnFill');fill.style.width='0%';fill.className='bm-next-fill '+badge.level;
  if(next){
    const pct=Math.min(99,Math.round(((dept.avg-badge.minAvg)/(next.minAvg-badge.minAvg))*100));
    document.getElementById('bnIco').textContent=next.icon;
    document.getElementById('bnTitle').textContent='Nächster Badge: '+next.label;
    document.getElementById('bnSub').textContent='Noch '+(next.minAvg-dept.avg)+' Pkt./Person · '+pct+'% geschafft';
    setTimeout(()=>{fill.style.width=pct+'%';},200);
  }else{
    document.getElementById('bnIco').textContent='🏆';
    document.getElementById('bnTitle').textContent='Maximales Level erreicht!';
    document.getElementById('bnSub').textContent='Platin ist das höchste Badge – Glückwunsch!';
    setTimeout(()=>{fill.style.width='100%';},200);
  }
  document.getElementById('bmLocked').innerHTML=BADGE_LEVELS.filter(l=>dept.avg<l.minAvg).map(l=>
    `<div class="locked-badge-item"><span style="font-size:18px;filter:grayscale(1);">${l.icon}</span><div><span>🔒 ${l.label}</span><br><small>ab ${l.minAvg} Pkt./Person</small></div></div>`
  ).join('');
  document.getElementById('badgeModalOverlay').classList.add('open');
}
function closeBadgeModal(){document.getElementById('badgeModalOverlay').classList.remove('open');}
const demo=[
  {Name:'Lea Rührnschopf','E-Mail':'lea@bbbank.de',Startzeit:'28.04.2026 09:00','In welcher Abteilung arbeitest du? ':'S&N','Welches Verkehrsmittel hast du genutzt um zur Arbeit zu gelangen? ':'Fahrrad','Hattest du diese Woche eine Dienstreise? - Wenn ja, mit welchem Verkehrsmittel? ':'Keine Dienstreise','Wie viele Tage warst du diese Woche im HomeOffice? (0-5)':'2','Wie viele Seiten hast du diese Woche gedruckt? ':'0 Seiten','Haben Sie an einem Social Day teilgenommen?':'Nein'},
  {Name:'Rouven König','E-Mail':'rouven@bbbank.de',Startzeit:'28.04.2026 09:10','In welcher Abteilung arbeitest du? ':'S&N','Welches Verkehrsmittel hast du genutzt um zur Arbeit zu gelangen? ':'Zu Fuß','Hattest du diese Woche eine Dienstreise? - Wenn ja, mit welchem Verkehrsmittel? ':'Keine Dienstreise','Wie viele Tage warst du diese Woche im HomeOffice? (0-5)':'3','Wie viele Seiten hast du diese Woche gedruckt? ':'0 Seiten','Haben Sie an einem Social Day teilgenommen?':'Ja'},
  {Name:'Maxim Makarova','E-Mail':'maxim@bbbank.de',Startzeit:'28.04.2026 09:15','In welcher Abteilung arbeitest du? ':'OIT','Welches Verkehrsmittel hast du genutzt um zur Arbeit zu gelangen? ':'ÖPVN','Hattest du diese Woche eine Dienstreise? - Wenn ja, mit welchem Verkehrsmittel? ':'ÖPVN','Wie viele Tage warst du diese Woche im HomeOffice? (0-5)':'0','Wie viele Seiten hast du diese Woche gedruckt? ':'1-10 Seiten','Haben Sie an einem Social Day teilgenommen?':'Nein'},
  {Name:'Jonas Niederer','E-Mail':'jonas@bbbank.de',Startzeit:'21.04.2026 09:00','In welcher Abteilung arbeitest du? ':'DMS','Welches Verkehrsmittel hast du genutzt um zur Arbeit zu gelangen? ':'Auto Fahrgemeinschaft','Hattest du diese Woche eine Dienstreise? - Wenn ja, mit welchem Verkehrsmittel? ':'Keine Dienstreise','Wie viele Tage warst du diese Woche im HomeOffice? (0-5)':'2','Wie viele Seiten hast du diese Woche gedruckt? ':'1-10 Seiten','Haben Sie an einem Social Day teilgenommen?':'Nein'},
  {Name:'Tyron Arnold','E-Mail':'tyron@bbbank.de',Startzeit:'21.04.2026 09:05','In welcher Abteilung arbeitest du? ':'OIT','Welches Verkehrsmittel hast du genutzt um zur Arbeit zu gelangen? ':'Fahrrad','Hattest du diese Woche eine Dienstreise? - Wenn ja, mit welchem Verkehrsmittel? ':'Bahn','Wie viele Tage warst du diese Woche im HomeOffice? (0-5)':'3','Wie viele Seiten hast du diese Woche gedruckt? ':'0 Seiten','Haben Sie an einem Social Day teilgenommen?':'Nein'},
  {Name:'Christof Warsinsky','E-Mail':'christof@bbbank.de',Startzeit:'14.04.2026 09:00','In welcher Abteilung arbeitest du? ':'DMS','Welches Verkehrsmittel hast du genutzt um zur Arbeit zu gelangen? ':'ÖPVN','Hattest du diese Woche eine Dienstreise? - Wenn ja, mit welchem Verkehrsmittel? ':'Keine Dienstreise','Wie viele Tage warst du diese Woche im HomeOffice? (0-5)':'1','Wie viele Seiten hast du diese Woche gedruckt? ':'11-30 Seiten','Haben Sie an einem Social Day teilgenommen?':'Nein'},
];
/* ===== v4: Team-Avatar + Motto Storage ===== */
let _teamAvatars={};
const _teamColors=['#1f6b24','#2d8c34','#a0674a','#8a8fa8','#c8a84b','#5ec466'];
function handleTeamAvatar(event){
  const file=event.target.files[0];if(!file)return;
  const sel=document.getElementById('ownTeamSelect');
  const own=sel?sel.value:'';if(!own)return;
  const reader=new FileReader();
  reader.onload=function(e){
    _teamAvatars[own]=e.target.result;
    updateTeamAvatarDisplay(own);
    renderLeaderboard(window._lastDepts||[]);
  };
  reader.readAsDataURL(file);
}
function updateTeamAvatarDisplay(own){
  const el=document.getElementById('teamAvatarLarge');if(!el)return;
  const data=_teamAvatars[own];
  if(data){el.innerHTML='';el.style.backgroundImage=`url(${data})`;el.style.backgroundSize='cover';el.style.backgroundPosition='center';el.style.fontSize='0';}
  else{el.style.backgroundImage='';el.style.fontSize='26px';const d=_allDepts.find(x=>x.name===own);el.textContent=d?(d.name.split(' ').map(p=>p[0]||'').join('').slice(0,2).toUpperCase()||'?'):'?';}
}
function saveTeamMotto(val){
  const sel=document.getElementById('ownTeamSelect');
  if(!sel||!sel.value)return;
  _teamMottos=_teamMottos||{};
  _teamMottos[sel.value]=val;
}
let _teamMottos={};

/* ===== v4: CO₂-Info Popup Toggle ===== */
function toggleCO2Info(e){
  e.stopPropagation();
  const popup=document.getElementById('co2InfoPopup');
  if(popup)popup.classList.toggle('open');
}
document.addEventListener('click',function(){
  const popup=document.getElementById('co2InfoPopup');
  if(popup)popup.classList.remove('open');
});

/* ===== v4: Badge-Thermometer rendern ===== */
function renderBadgeThermometer(avg){
  const panel=document.getElementById('badgeThermometerPanel');if(!panel)return;
  const badge=getTeamBadge(avg);
  const segs=BADGE_LEVELS.map(l=>{
    const isActive=badge&&l.level===badge.level;
    const isPassed=badge&&BADGE_LEVELS.indexOf(l)<=BADGE_LEVELS.indexOf(badge);
    return`<div class="thermo-seg ${l.level}-seg ${isPassed?'active':''}" title="${l.label}: ab ${l.minAvg} Pkt./P.">${l.icon} ${l.label}</div>`;
  }).join('');
  const labels=BADGE_LEVELS.map(l=>`<div class="thermo-lbl">${l.minAvg}+</div>`).join('');
  panel.innerHTML=`
    <div class="thermo-track">${segs}</div>
    <div class="thermo-labels">${labels}</div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:18px;">
      ${badge
        ?`Aktuelles Level: <b style="color:var(--text-primary)">${badge.icon} ${badge.label}</b> · ${avg} Pkt./Person Ø`
        :`<b>Noch kein Badge</b> · ${BADGE_LEVELS[0].minAvg-avg} Pkt./P. bis Bronze`}
    </div>`;
}

/* ===== v4: Platin-Badge bei Rang (Team-Tab KPI) ===== */
function renderRankBadgePill(badge){
  const el=document.getElementById('tkRankBadgePill');if(!el)return;
  if(!badge){el.innerHTML='';return;}
  el.innerHTML=`<span class="rank-badge-pill ${badge.level}">${badge.icon} ${badge.label}-Badge</span>`;
}

/* ===== v4: Team-Profil-Karte aktualisieren ===== */
function updateTeamProfileCard(own,dept,rank){
  const card=document.getElementById('teamProfileCard');if(!card)return;
  card.style.display='flex';
  document.getElementById('tpName').textContent=own;
  const mottoEl=document.getElementById('tpMotto');
  if(mottoEl)mottoEl.value=(_teamMottos&&_teamMottos[own])||'';
  document.getElementById('tpRankPill').textContent=`Platz ${rank} von ${_allDepts.length}`;
  const badge=getTeamBadge(dept.avg);
  const tpBadge=document.getElementById('tpBadgePill');
  if(tpBadge)tpBadge.textContent=badge?`${badge.icon} ${badge.label}`:'🌱 Kein Badge';
  document.getElementById('tpMembersPill').textContent=`${dept.count} Mitglieder`;
  updateTeamAvatarDisplay(own);
  /* Pinned badge */
  const pinnedKey='pinnedBadge_'+own;
  const pinned=_teamMottos&&_teamMottos[pinnedKey];
  const pinnedDiv=document.getElementById('tpPinnedBadge');
  const pinnedTxt=document.getElementById('tpPinnedText');
  if(pinnedDiv&&pinnedTxt&&pinned){pinnedDiv.style.display='flex';pinnedTxt.textContent=pinned;}
  else if(pinnedDiv)pinnedDiv.style.display='none';
}

/* ===== v4: Badge-Sammlung Daten ===== */
const ALL_BADGES=[
  // Mobilität
  {id:'bike_hero',cat:'mobilitaet',icon:'🚲',name:'Bike Hero',cond:'5× mit dem Fahrrad zur Arbeit',rarity:'selten',points:0,progress:0},
  {id:'opnv_profi',cat:'mobilitaet',icon:'🚌',name:'ÖPNV-Profi',cond:'3× öffentliche Verkehrsmittel genutzt',rarity:'gewoehnlich',points:0,progress:0},
  {id:'fahrgemeinschaft',cat:'mobilitaet',icon:'🤝',name:'Fahrgemeinschaftsfreund',cond:'2× Fahrgemeinschaft gebildet',rarity:'gewoehnlich',points:0,progress:0},
  {id:'pendel_champ',cat:'mobilitaet',icon:'🏅',name:'Pendel-Champion',cond:'4 Wochen nachhaltig gependelt',rarity:'selten',points:0,progress:0},
  {id:'autofrei_serie',cat:'mobilitaet',icon:'🚫🚗',name:'Autofrei-Serie',cond:'3 Wochen kein Auto genutzt',rarity:'episch',points:0,progress:0},
  // Papier & Digital
  {id:'druckfrei',cat:'papier',icon:'🖨️',name:'Druckfrei',cond:'1 Woche 0 Seiten gedruckt',rarity:'gewoehnlich',points:0,progress:0},
  {id:'digital_first',cat:'papier',icon:'💻',name:'Digital First',cond:'2 Wochen nur digitale Unterlagen',rarity:'selten',points:0,progress:0},
  {id:'postfach_cleaner',cat:'papier',icon:'📧',name:'Postfach-Cleaner',cond:'Postfach um 50% reduziert',rarity:'gewoehnlich',points:0,progress:0},
  {id:'papierretter',cat:'papier',icon:'📄',name:'Papierretter',cond:'Unter 5 Seiten/Woche gedruckt',rarity:'selten',points:0,progress:0},
  {id:'meeting_ohne',cat:'papier',icon:'📋',name:'Meeting ohne Ausdruck',cond:'5 papierlose Meetings',rarity:'episch',points:0,progress:0},
  // Energie
  {id:'lichtwacht',cat:'energie',icon:'💡',name:'Lichtwächter',cond:'Licht beim Verlassen ausgemacht',rarity:'gewoehnlich',points:0,progress:0},
  {id:'energiescout',cat:'energie',icon:'🔍',name:'Energiescout',cond:'3 Energiesparpotenziale gemeldet',rarity:'selten',points:0,progress:0},
  {id:'feierabend',cat:'energie',icon:'🌙',name:'Feierabend-Check',cond:'2 Wochen Geräte konsequent aus',rarity:'gewoehnlich',points:0,progress:0},
  {id:'standby_killer',cat:'energie',icon:'⚡',name:'Standby-Killer',cond:'Alle Standby-Verbraucher getrennt',rarity:'selten',points:0,progress:0},
  {id:'stromspar',cat:'energie',icon:'🔋',name:'Stromspar-Team',cond:'Team spart 50 kWh in einer Woche',rarity:'episch',points:0,progress:0},
  // Ernährung
  {id:'green_lunch',cat:'ernaehrung',icon:'🥗',name:'Green Lunch Starter',cond:'3× veganes/vegetarisches Mittagessen',rarity:'gewoehnlich',points:0,progress:0},
  {id:'veggie_woche',cat:'ernaehrung',icon:'🥦',name:'Veggie-Woche',cond:'1 Woche fleischlos',rarity:'selten',points:0,progress:0},
  {id:'mehrweg',cat:'ernaehrung',icon:'♻️',name:'Mehrweg-Profi',cond:'Immer eigenen Becher mitgebracht',rarity:'gewoehnlich',points:0,progress:0},
  {id:'muelltrennung',cat:'ernaehrung',icon:'🗑️',name:'Mülltrennungs-Scout',cond:'Mülltrennung im Team verbessert',rarity:'selten',points:0,progress:0},
  {id:'kitchen_hero',cat:'ernaehrung',icon:'👨‍🍳',name:'Kitchen Hero',cond:'Teeküche nachhaltig gestaltet',rarity:'episch',points:0,progress:0},
  // Aktivität & Serie
  {id:'serie_1',cat:'aktivitaet',icon:'🔥',name:'1 Woche aktiv',cond:'1 Woche durchgehend teilgenommen',rarity:'gewoehnlich',points:0,progress:0},
  {id:'serie_3',cat:'aktivitaet',icon:'🔥🔥',name:'3 Wochen aktiv',cond:'3 Wochen ohne Unterbrechung',rarity:'selten',points:0,progress:0},
  {id:'serie_5',cat:'aktivitaet',icon:'🔥🔥🔥',name:'5 Wochen aktiv',cond:'5 Wochen ohne Unterbrechung',rarity:'episch',points:0,progress:0},
  {id:'ohne_pause',cat:'aktivitaet',icon:'⚡',name:'Ohne Pause dabei',cond:'Alle Wochen des Wettbewerbs aktiv',rarity:'legendaer',points:0,progress:0},
  {id:'comeback',cat:'aktivitaet',icon:'🔄',name:'Comeback-Badge',cond:'Nach Pause wieder aktiv',rarity:'selten',points:0,progress:0},
  // Teamleistung
  {id:'bronze_team',cat:'teamleistung',icon:'🥉',name:'Bronze-Team',cond:'Team-Ø ≥ 20 Punkte/Person',rarity:'gewoehnlich',points:0,progress:0},
  {id:'silver_team',cat:'teamleistung',icon:'🥈',name:'Silber-Team',cond:'Team-Ø ≥ 40 Punkte/Person',rarity:'selten',points:0,progress:0},
  {id:'gold_team',cat:'teamleistung',icon:'🥇',name:'Gold-Team',cond:'Team-Ø ≥ 60 Punkte/Person',rarity:'episch',points:0,progress:0},
  {id:'platin_team',cat:'teamleistung',icon:'💎',name:'Platin-Team',cond:'Team-Ø ≥ 80 Punkte/Person',rarity:'legendaer',points:0,progress:0},
  {id:'team_nr1',cat:'teamleistung',icon:'🏆',name:'Team Nr. 1',cond:'Platz 1 in der Rangliste',rarity:'legendaer',points:0,progress:0},
  // Spezialbadges
  {id:'ueberraschung',cat:'spezial',icon:'🎁',name:'Überraschungsbadge',cond:'Geheimbedingung – wird enthüllt',rarity:'legendaer',points:0,progress:0},
  {id:'challenge_master',cat:'spezial',icon:'⚡',name:'Challenge Master',cond:'5 Challenges abgeschlossen',rarity:'episch',points:0,progress:0},
  {id:'social_hero',cat:'spezial',icon:'🤲',name:'Social Day Hero',cond:'An einem Social Day teilgenommen',rarity:'selten',points:0,progress:0},
  {id:'klima_botschafter',cat:'spezial',icon:'🌍',name:'Klima-Botschafter',cond:'Kollegen zum Mitmachen motiviert',rarity:'episch',points:0,progress:0},
  {id:'hidden',cat:'spezial',icon:'❓',name:'Hidden Badge',cond:'Geheimnis – entdecke es selbst',rarity:'legendaer',points:0,progress:0},
];

const RARITY_LABELS={gewoehnlich:'Gewöhnlich',selten:'Selten',episch:'Episch',legendaer:'Legendär'};
let _currentBadgeCat='alle';
let _earnedBadges=new Set();

function computeEarnedBadges(depts,own){
  _earnedBadges=new Set();
  if(!depts.length)return;
  const myDept=depts.find(d=>d.name===own);
  const rank=depts.findIndex(d=>d.name===own)+1;
  // Teamleistungs-Badges
  if(myDept){
    if(myDept.avg>=20)_earnedBadges.add('bronze_team');
    if(myDept.avg>=40)_earnedBadges.add('silver_team');
    if(myDept.avg>=60)_earnedBadges.add('gold_team');
    if(myDept.avg>=80)_earnedBadges.add('platin_team');
    if(rank===1)_earnedBadges.add('team_nr1');
    if(myDept.count>=2)_earnedBadges.add('serie_1');
    if(myDept.count>=3)_earnedBadges.add('social_hero');
  }
  // Badges basierend auf verfügbaren Daten
  const allRows=_allRows||[];
  const ownRows=own?allRows.filter(r=>(r._dept||'')===own):allRows;
  if(ownRows.some(r=>(r['Welches Verkehrsmittel hast du genutzt um zur Arbeit zu gelangen? ']||'').toLowerCase().includes('fahrrad')))_earnedBadges.add('bike_hero');
  if(ownRows.some(r=>(r['Welches Verkehrsmittel hast du genutzt um zur Arbeit zu gelangen? ']||'').toLowerCase().includes('öpv')))_earnedBadges.add('opnv_profi');
  if(ownRows.some(r=>(r['Welches Verkehrsmittel hast du genutzt um zur Arbeit zu gelangen? ']||'').toLowerCase().includes('fahrgemeinschaft')))_earnedBadges.add('fahrgemeinschaft');
  if(ownRows.some(r=>(r['Wie viele Seiten hast du diese Woche gedruckt? ']||'').toLowerCase().includes('0 seiten')))_earnedBadges.add('druckfrei');
  if(ownRows.some(r=>(r['Haben Sie an einem Social Day teilgenommen?']||'').toLowerCase().includes('ja')))_earnedBadges.add('social_hero');
  // Aktivität-Serie basierend auf Wochen
  const wkeys=Object.keys(weeklyData||{}).sort();
  if(wkeys.length>=3)_earnedBadges.add('serie_3');
  if(wkeys.length>=5)_earnedBadges.add('serie_5');
  if(wkeys.length>=1)_earnedBadges.add('serie_1');
}

function renderBadgeCollection(cat){
  _currentBadgeCat=cat;
  const grid=document.getElementById('badgeCollectionGrid');if(!grid)return;
  const filtered=cat==='alle'?ALL_BADGES:ALL_BADGES.filter(b=>b.cat===cat);
  const earned=filtered.filter(b=>_earnedBadges.has(b.id));
  const locked=filtered.filter(b=>!_earnedBadges.has(b.id));
  let html='';
  if(earned.length){
    html+=`<div class="badge-section-header" style="grid-column:1/-1">✅ Freigeschaltet (${earned.length})</div>`;
    html+=earned.map(b=>badgeCardHtml(b,true)).join('');
  }
  if(locked.length){
    html+=`<div class="badge-section-header" style="grid-column:1/-1">🔒 Noch gesperrt (${locked.length})</div>`;
    html+=locked.map(b=>badgeCardHtml(b,false)).join('');
  }
  grid.innerHTML=html||'<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-muted);">Keine Badges in dieser Kategorie</div>';
  // Sammelstatus
  const totalEarned=_earnedBadges.size;
  const total=ALL_BADGES.length;
  const pct=Math.round((totalEarned/total)*100);
  const bcbTitle=document.getElementById('bcbTitle');
  const bcbFill=document.getElementById('bcbFill');
  const bcbPct=document.getElementById('bcbPct');
  const bcbMotiv=document.getElementById('bcbMotiv');
  if(bcbTitle)bcbTitle.textContent=`${totalEarned} von ${total} Badges gesammelt`;
  if(bcbFill)bcbFill.style.width=pct+'%';
  if(bcbPct)bcbPct.textContent=pct+'%';
  if(bcbMotiv){
    const next=ALL_BADGES.find(b=>!_earnedBadges.has(b.id));
    bcbMotiv.textContent=next?`Nächster: "${next.name}" – ${next.cond}`:'🏆 Alle Badges gesammelt!';
  }
}

function badgeCardHtml(b,earned){
  const tooltip=`<div class="bc-tooltip"><b>${b.name}</b><br>${b.cond}<br><span style="opacity:0.7">${RARITY_LABELS[b.rarity]}</span></div>`;
  return`<div class="bc-card ${earned?'':'locked'}" onclick="pinBadge('${b.id}','${b.name} ${b.icon}')">
    ${tooltip}
    <span class="bc-status-chip ${earned?'earned':'locked'}">${earned?'✓ Verdient':'🔒'}</span>
    <span class="bc-icon">${b.icon}</span>
    <div class="bc-name">${b.name}</div>
    <div class="bc-cond">${b.cond}</div>
    <span class="bc-rarity ${b.rarity}">${RARITY_LABELS[b.rarity]}</span>
    ${earned?'':'<div class="bc-prog-bar"><div class="bc-prog-fill" style="width:20%"></div></div>'}
  </div>`;
}

function filterBadgeCat(cat,btn){
  document.querySelectorAll('.badge-cat-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderBadgeCollection(cat);
}

function pinBadge(id,label){
  const sel=document.getElementById('ownTeamSelect');
  if(!sel||!sel.value)return;
  if(!_earnedBadges.has(id))return;
  const key='pinnedBadge_'+sel.value;
  _teamMottos=_teamMottos||{};
  _teamMottos[key]=label;
  const pinnedDiv=document.getElementById('tpPinnedBadge');
  const pinnedTxt=document.getElementById('tpPinnedText');
  if(pinnedDiv&&pinnedTxt){pinnedDiv.style.display='flex';pinnedTxt.textContent=label;}
  showToast('📌 "'+label+'" als Lieblings-Badge gepinnt!');
}

/* ===== v5: Aktionen-Breakdown Donut-Chart ===== */
let _donutChartObj=null;
const DONUT_CATS=[
  {key:'homeoffice',label:'Homeoffice',color:'#3aaa42'},
  {key:'commute',label:'Mobilität',color:'#c8a84b'},
  {key:'travel',label:'Dienstreise',color:'#1a4d1e'},
  {key:'print',label:'Drucken',color:'#5ec466'},
  {key:'social',label:'Social Day',color:'#a0674a'},
];
function calcBreakdown(rows){
  const totals={homeoffice:0,commute:0,travel:0,print:0,social:0};
  for(const row of rows){
    const cols=Object.keys(row);
    const homeCol=cols.find(c=>c.toLowerCase().includes('homeoffice'));
    if(homeCol){const d=Math.min(5,Math.max(0,parseInt(row[homeCol])||0));totals.homeoffice+=SCORE.homeofficePts[d];}
    const commuteCol=cols.find(c=>c.toLowerCase().includes('verkehrsmittel')&&c.toLowerCase().includes('arbeit'));
    if(commuteCol){const s=matchScore(SCORE.commute,row[commuteCol]);if(s!==null)totals.commute+=s;}
    const travelCol=cols.find(c=>c.toLowerCase().includes('dienstreise'));
    if(travelCol){const s=matchScore(SCORE.travel,row[travelCol]);if(s!==null)totals.travel+=s;}
    const printCol=cols.find(c=>c.toLowerCase().includes('seiten')||c.toLowerCase().includes('gedruckt'));
    if(printCol){const s=matchScore(SCORE.print,row[printCol]);if(s!==null)totals.print+=s;}
    const socialCol=cols.find(c=>c.toLowerCase().includes('social'));
    if(socialCol){const v=(row[socialCol]||'').toLowerCase();if(v.includes('ja')||v==='true'||v==='1')totals.social+=SCORE.socialDay;}
  }
  return totals;
}
function renderDonut(rows){
  const panel=document.getElementById('donutPanel');if(!panel)return;
  if(!rows||!rows.length){panel.innerHTML='<div class="empty-state"><div class="empty-state-icon">🥧</div><div class="empty-state-text">Keine Daten</div></div>';return;}
  const totals=calcBreakdown(rows);
  const totalPts=Object.values(totals).reduce((a,b)=>a+b,0)||1;
  panel.innerHTML=`<div class="donut-chart-wrap"><canvas id="donutCanvas" width="160" height="160"></canvas></div><div class="donut-legend" id="donutLegend"></div>`;
  const ctx=document.getElementById('donutCanvas');
  if(_donutChartObj)_donutChartObj.destroy();
  _donutChartObj=new Chart(ctx,{
    type:'doughnut',
    data:{
      labels:DONUT_CATS.map(c=>c.label),
      datasets:[{data:DONUT_CATS.map(c=>totals[c.key]),backgroundColor:DONUT_CATS.map(c=>c.color),borderWidth:2,borderColor:'#fff'}]
    },
    options:{responsive:false,cutout:'62%',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.label}: ${c.parsed} Pkt. (${Math.round((c.parsed/totalPts)*100)}%)`}}}}
  });
  document.getElementById('donutLegend').innerHTML=DONUT_CATS.map(c=>{
    const pct=Math.round((totals[c.key]/totalPts)*100);
    return`<div class="donut-legend-row"><div class="donut-legend-dot" style="background:${c.color}"></div><span class="donut-legend-lbl">${c.label}</span><span class="donut-legend-val">${pct}% · ${totals[c.key]}P</span></div>`;
  }).join('');
}

/* ===== v5: Mitglieder-Suche ===== */
let _currentMemberHtml='';
function filterMembers(query){
  const ml=document.getElementById('memberList');if(!ml)return;
  const q=query.toLowerCase().trim();
  if(!q){ml.innerHTML=_currentMemberHtml;return;}
  const rows=ml.querySelectorAll?null:null;
  // Re-render filtered from cache
  const matches=Object.values(_memberCache).filter(m=>(m._name||'').toLowerCase().includes(q));
  if(!matches.length){
    ml.innerHTML='<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-text">Kein Treffer für „'+query+'"</div></div>';
    return;
  }
  const own=document.getElementById('ownTeamSelect')?.value||'';
  const dept=_allDepts.find(d=>d.name===own);
  ml.innerHTML=matches.sort((a,b)=>b._pts-a._pts).map(m=>{
    const init=(m._name||'?').split(' ').map(p=>p[0]||'').join('').slice(0,2).toUpperCase();
    const above=dept&&dept.avg>0?Math.round(((m._pts-dept.avg)/dept.avg)*100):0;
    const badge=getTeamBadge(m._pts);
    const chip=badge?`<span class="member-lvl-chip ${badge.level}">${badge.icon} ${badge.label}</span>`:'';
    return`<div class="member-row" onclick="openMemberModal('${(m._name||'').replace(/'/g,"\\'")}')">
      <div class="member-avatar">${init}</div>
      <div style="flex:1;min-width:0;"><div class="member-name-txt">${m._name||'–'}</div><div class="member-sub">${m.co2} kg CO₂ · ${above>=0?'+':''}${above}% zum Team-Ø</div></div>
      ${chip}
      <div><div class="member-pts">${m._pts}</div><div class="member-pts-lbl">Punkte</div></div>
    </div>`;
  }).join('');
}

/* ===== v5: PDF-Export ===== */
function exportPDF(){
  // Update print header with current date + active tab name
  const tabs=['Rangliste','Dein Team','Challenges','Tipps & Tricks','Punktesystem','Badge-Sammlung'];
  const activeTab=document.querySelector('.nav-tab.active');
  const tabName=activeTab?activeTab.textContent.trim():'Dashboard';
  const now=new Date();
  const dateStr=now.toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric'});
  document.getElementById('printHeaderSub').textContent=`Exportiert am ${dateStr} · Ansicht: ${tabName}`;
  window.print();
}

processData(demo);
renderTips();

/* ============================================================
   v7 PREMIUM JS: ESG Impact Center + Team Spotlight
   ============================================================ */
let _esgTrendChart = null;

function calcESGScore(depts, co2Total, deduped){
  if(!depts.length) return {score:0,e:0,s:0,g:0};
  const avgAll = Math.round(depts.reduce((s,d)=>s+d.avg,0)/depts.length);
  const maxPossible = 110; // max pts per person
  const eScore = Math.min(100, Math.round((avgAll/maxPossible)*100));
  const participationRate = Math.min(100, Math.round((deduped.length/Math.max(1,deduped.length))*100));
  const sScore = Math.min(100, 70 + (depts.length>3?15:0) + (participationRate>80?15:0));
  const weeks = Object.keys(weeklyData).length;
  const gScore = Math.min(100, 50 + weeks*10);
  const overall = Math.round((eScore*0.5 + sScore*0.3 + gScore*0.2));
  return {score:Math.min(98,overall), e:eScore, s:sScore, g:gScore};
}

function scoreToGrade(s){
  if(s>=80)return'A';if(s>=60)return'B';if(s>=40)return'C';return'D';
}

function drawESGRing(canvas, score){
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, cx=W/2, cy=H/2, r=62;
  ctx.clearRect(0,0,W,H);
  // Track
  ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,Math.PI*1.5);
  ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=10;ctx.lineCap='round';ctx.stroke();
  // Fill
  const pct = score/100;
  ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+Math.PI*2*pct);
  const grad=ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0,'#8dd893');grad.addColorStop(1,'#fff');
  ctx.strokeStyle=grad;ctx.lineWidth=10;ctx.lineCap='round';ctx.stroke();
}

function animESGRing(canvas, target){
  let cur=0;
  const step=()=>{
    cur=Math.min(cur+1,target);
    drawESGRing(canvas,cur);
    document.getElementById('esgScoreNum').textContent=cur;
    if(cur<target) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function renderESGImpact(depts, co2Total, deduped){
  if(!depts.length) return;
  const totalPts = depts.reduce((s,d)=>s+d.total,0);

  // Derived impact estimates
  const energyKWh = Math.round(deduped.length * 3.2); // ~3.2 kWh per HO day saved commute
  const paperSaved = Math.round(totalPts * 0.8); // rough estimate from print scores
  const mobilityKm = Math.round(totalPts * 1.2); // eco commute km
  const waterL = Math.round(deduped.length * 55); // per person estimate

  // ESG Score
  const {score,e,s,g} = calcESGScore(depts,co2Total,deduped);
  setTimeout(()=>{
    const canvas=document.getElementById('esgScoreCanvas');
    if(canvas) animESGRing(canvas,score);
  },300);

  // Rating boxes
  const gradeMap={A:'A',B:'B',C:'C',D:'C'};
  const setGrade=(id,val,subId,sub)=>{
    const el=document.getElementById(id); if(!el)return;
    const g=scoreToGrade(val);
    el.textContent=g; el.className='esg-rating-grade '+g;
    const se=document.getElementById(subId); if(se)se.textContent=sub+' · Score '+val;
  };
  setGrade('esgGradeE',e,'esgGradeESub','Mobilität & CO₂');
  setGrade('esgGradeS',s,'esgGradeSSub','Teilnahme & Team');
  setGrade('esgGradeG',g,'esgGradeGSub','Kontinuität');

  // Stream chips
  const stream=document.getElementById('esgStream');
  if(stream){
    const weeks=Object.keys(weeklyData).length;
    stream.innerHTML=[
      `<span class="esg-stream-chip pulse">🌱 ${deduped.length} Teilnehmende</span>`,
      `<span class="esg-stream-chip">🏢 ${depts.length} Abteilungen</span>`,
      `<span class="esg-stream-chip">📅 ${weeks} Wochen aktiv</span>`,
      `<span class="esg-stream-chip pulse">🌍 ${co2Total} kg CO₂</span>`,
      `<span class="esg-stream-chip">⚡ ${energyKWh} kWh gespart</span>`,
      `<span class="esg-stream-chip">🌳 ${Math.round(co2Total/21)} Bäume äquiv.</span>`,
    ].join('');
  }

  // Impact cards
  const impactData=[
    {id:'esgImpCO2',barId:'esgBarCO2',equivId:'esgEquivCO2',val:co2Total,max:250,equiv:`≈ ${Math.round(co2Total/21)} Bäume/Jahr`},
    {id:'esgImpEnergy',barId:'esgBarEnergy',equivId:'esgEquivEnergy',val:energyKWh,max:5000,equiv:`≈ ${Math.round(energyKWh/2.4)} Haushaltsstunden`},
    {id:'esgImpPaper',barId:'esgBarPaper',equivId:'esgEquivPaper',val:paperSaved,max:10000,equiv:`≈ ${Math.round(paperSaved/8333)} Bäume geschont`},
    {id:'esgImpMobility',barId:'esgBarMobility',equivId:'esgEquivMobility',val:mobilityKm,max:5000,equiv:`fossil-freie Wege`},
    {id:'esgImpWater',barId:'esgBarWater',equivId:'esgEquivWater',val:waterL,max:50000,equiv:`≈ ${Math.round(waterL/70)} Duschgänge gespart`},
  ];
  impactData.forEach(d=>{
    const el=document.getElementById(d.id); if(el) el.textContent=d.val.toLocaleString('de-DE');
    const bar=document.getElementById(d.barId);
    const eq=document.getElementById(d.equivId); if(eq) eq.textContent=d.equiv;
    if(bar){
      setTimeout(()=>{bar.style.width=Math.min(100,Math.round((d.val/d.max)*100))+'%';},400);
    }
  });

  // Trend badge
  const wkeys=Object.keys(weeklyData).sort();
  const lastW=wkeys[wkeys.length-1],prevW=wkeys[wkeys.length-2];
  const tb=document.getElementById('esgTrendBadge');
  if(tb&&lastW&&prevW){
    const lp=Object.values(weeklyData[lastW]).reduce((s,d)=>s+d.points,0);
    const pp=Object.values(weeklyData[prevW]).reduce((s,d)=>s+d.points,0);
    const diff=pp>0?Math.round(((lp-pp)/pp)*100):0;
    tb.textContent=(diff>=0?'↑ +':'↓ ')+diff+'% zum Vormonat';
    tb.style.background=diff>=0?'var(--green-100)':'#fee2e2';
    tb.style.color=diff>=0?'var(--green-700)':'#9b1c1c';
  }

  // Trend chart
  const ctx=document.getElementById('esgTrendChart');
  if(ctx){
    if(_esgTrendChart)_esgTrendChart.destroy();
    const weeks=wkeys;
    const co2PerWeek=weeks.map(w=>{
      const pts=Object.values(weeklyData[w]).reduce((s,d)=>s+d.points,0);
      return Math.round(pts*0.12);
    });
    _esgTrendChart=new Chart(ctx,{
      type:'line',
      data:{labels:weeks,datasets:[{
        label:'kg CO₂ gespart',data:co2PerWeek,
        borderColor:'#3aaa42',backgroundColor:'rgba(58,170,66,0.12)',
        tension:0.4,fill:true,pointRadius:5,pointBackgroundColor:'#3aaa42',
        borderWidth:2.5
      }]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.parsed.y+' kg CO₂'}}},
        scales:{x:{grid:{display:false},ticks:{color:'#7a9b7d',font:{family:'DM Sans'}}},
          y:{grid:{color:'rgba(45,140,52,0.08)'},ticks:{color:'#7a9b7d',font:{family:'DM Mono'}},beginAtZero:true}}}
    });
  }

  // Category rows
  const catEl=document.getElementById('esgCatRows');
  if(catEl){
    const cats=[
      {ico:'🏠',name:'Homeoffice',pts:Math.round(totalPts*0.35)},
      {ico:'🚲',name:'Mobilität',pts:Math.round(totalPts*0.20)},
      {ico:'✈️',name:'Dienstreise',pts:Math.round(totalPts*0.18)},
      {ico:'🖨️',name:'Drucken',pts:Math.round(totalPts*0.15)},
      {ico:'🤝',name:'Social Day',pts:Math.round(totalPts*0.12)},
    ];
    const maxPts=Math.max(...cats.map(c=>c.pts))||1;
    catEl.innerHTML=cats.map(c=>`<div class="esg-cat-row">
      <div class="esg-cat-icon">${c.ico}</div>
      <div class="esg-cat-info">
        <div class="esg-cat-name">${c.name}</div>
        <div class="esg-cat-bar-track"><div class="esg-cat-bar-fill" data-w="${Math.round((c.pts/maxPts)*100)}%" style="width:0%"></div></div>
      </div>
      <div class="esg-cat-pts">${c.pts}</div>
    </div>`).join('');
    setTimeout(()=>{
      catEl.querySelectorAll('.esg-cat-bar-fill[data-w]').forEach(el=>{el.style.width=el.dataset.w;});
    },400);
  }

  // Last update
  const lu=document.getElementById('esgLastUpdate');
  if(lu){
    lu.innerHTML=`<span style="font-size:11px;color:var(--text-muted);">🕐 Letzte Aktualisierung: ${new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}</span>`;
  }
}

/* ── Team Spotlight ─────────────────────────────────────── */
const SPOTLIGHT_MOTTOS = [
  '„Gemeinsam für eine grünere BBBank."',
  '„Klimaschutz fängt im Büro an."',
  '„Jede Aktion zählt – auch kleine."',
  '„Nachhaltigkeit ist unsere Stärke."',
];

function renderSpotlight(){
  const own=document.getElementById('ownTeamSelect')?.value;
  const heroEl=document.getElementById('teamSpotlightOuter');
  if(!own||!_allDepts.length){if(heroEl)heroEl.style.display='none';return;}
  if(heroEl)heroEl.style.display='block';

  const dept=_allDepts.find(d=>d.name===own); if(!dept) return;
  const rank=_allDepts.findIndex(d=>d.name===own)+1;
  const co2=Math.round(dept.total*0.12);
  const badge=getTeamBadge?getTeamBadge(dept.avg):null;
  const nextBadge=getNextBadge?getNextBadge(dept.avg):null;
  const BADGE_LEVELS_LOCAL=[{level:'bronze',minAvg:20},{level:'silver',minAvg:40},{level:'gold',minAvg:60},{level:'platin',minAvg:80}];

  // Team name
  const tn=document.getElementById('spTeamName'); if(tn)tn.textContent=own;
  const motto=SPOTLIGHT_MOTTOS[Math.abs(own.split('').reduce((a,c)=>a+c.charCodeAt(0),0))%SPOTLIGHT_MOTTOS.length];
  const mt=document.getElementById('spMotto'); if(mt)mt.textContent=motto;

  // Level badge chip
  const lb=document.getElementById('spLevelBadge');
  if(lb){lb.textContent=badge?badge.icon+' '+badge.label+'-Level':'🌱 Bronze anstreben';}

  // Activity
  const al=document.getElementById('spActivityLabel');
  if(al)al.textContent=dept.count+' Mitglieder aktiv';

  // Avatare
  const members=_allRows.filter(r=>r._dept===own).sort((a,b)=>b._pts-a._pts);
  const avEl=document.getElementById('spAvatars');
  const colors=['#1f6b24','#2d8c34','#a0674a','#8a8fa8','#c8a84b'];
  if(avEl){
    const shown=members.slice(0,6);
    avEl.innerHTML=shown.map((m,i)=>{
      const init=(m._name||'?').split(' ').map(p=>p[0]||'').join('').slice(0,2).toUpperCase();
      return`<div class="sp-avatar" style="background:${colors[i%colors.length]}">${init}</div>`;
    }).join('')+(members.length>6?`<div class="sp-avatar sp-avatar-more">+${members.length-6}</div>`:'');
  }

  // Stats
  const stEl=document.getElementById('spStats');
  if(stEl){stEl.innerHTML=[
    {val:dept.avg,lbl:'Pkt./Person'},
    {val:co2+' kg',lbl:'CO₂'},
    {val:'#'+rank,lbl:'Rang'},
  ].map(s=>`<div class="sp-stat"><div class="sp-stat-val">${s.val}</div><div class="sp-stat-lbl">${s.lbl}</div></div>`).join('');}

  // Level progress
  const lio=document.getElementById('spLevelIco'),lln=document.getElementById('spLevelName');
  const spf=document.getElementById('spProgFill'),spl=document.getElementById('spProgLabel');
  if(badge){
    if(lio)lio.textContent=badge.icon;
    if(lln)lln.textContent=badge.label+'-Level';
    if(nextBadge&&spf&&spl){
      const pct=Math.min(99,Math.round(((dept.avg-badge.minAvg)/(nextBadge.minAvg-badge.minAvg))*100));
      setTimeout(()=>{spf.style.width=pct+'%';},300);
      spl.textContent='Noch '+(nextBadge.minAvg-dept.avg)+' Pkt./Person bis '+nextBadge.label;
    } else if(spf){
      spf.style.width='100%';
      if(spl)spl.textContent='Maximales Level erreicht! 🏆';
    }
  } else {
    if(lio)lio.textContent='🌱';
    if(lln)lln.textContent='Noch kein Level';
    const first=BADGE_LEVELS_LOCAL[0];
    const pct=Math.min(99,Math.round((dept.avg/first.minAvg)*100));
    setTimeout(()=>{if(spf)spf.style.width=pct+'%';},300);
    if(spl)spl.textContent='Noch '+(first.minAvg-dept.avg)+' Pkt./Person bis Bronze';
  }

  // Band
  const bids=['spBandRank','spBandCO2','spBandAvg','spBandMembers'];
  const bvals=['#'+rank,co2+' kg',dept.avg,dept.count];
  bids.forEach((id,i)=>{const el=document.getElementById(id);if(el)el.textContent=bvals[i];});
}

/* Hook processData + showTab ohne Hoisting-Bug (IIFE-Assignment statt function declaration) */
(function(){
  const _origPD = window.processData;
  window.processData = function(rows){
    _origPD(rows);
    /* ESG rendern */
    const totalPts=_allDepts.reduce((s,d)=>s+d.total,0);
    const co2Total=Math.round(totalPts*0.12);
    renderESGImpact(_allDepts,co2Total,_allRows);
    /* Spotlight im Team-Tab rendern wenn Abteilung gewählt */
    const own=document.getElementById('ownTeamSelect')?.value;
    if(own) renderSpotlight();
  };
  const _origST = window.showTab;
  window.showTab = function(name,btn){
    _origST(name,btn);
    if(name==='esg'&&_allDepts.length){
      const tp=_allDepts.reduce((s,d)=>s+d.total,0);
      renderESGImpact(_allDepts,Math.round(tp*0.12),_allRows);
    }
    if(name==='team') renderSpotlight();
  };
})();

