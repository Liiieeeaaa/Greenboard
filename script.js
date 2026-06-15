/* ── Sicherer localStorage-Wrapper (muss ganz oben stehen) ── */
const _ls = (() => {
  try { localStorage.setItem('__test__','1'); localStorage.removeItem('__test__'); return localStorage; }
  catch(e) {
    const mem = {};
    return { getItem: k=>mem[k]??null, setItem:(k,v)=>{mem[k]=String(v);}, removeItem:k=>{delete mem[k];} };
  }
})();

/* ══════════════════════════════════════════════════════════
   ADMIN-BEREICH
   Passwort hier ändern:
   ══════════════════════════════════════════════════════════ */
const ADMIN_PASSWORD = 'greenboard2026';

function openAdminLogin(){
  // Wenn schon eingeloggt: einfach Upload-Bereich zeigen/scrollen
  if(sessionStorage.getItem('gb_admin')==='1'){
    document.getElementById('adminUploadOuter').scrollIntoView({behavior:'smooth'});
    return;
  }
  document.getElementById('adminLoginOverlay').classList.add('open');
  setTimeout(()=>document.getElementById('adminPwInput').focus(),120);
}

function closeAdminLogin(){
  document.getElementById('adminLoginOverlay').classList.remove('open');
  document.getElementById('adminPwError').style.display='none';
  document.getElementById('adminPwInput').value='';
}

function checkAdminPassword(){
  if(document.getElementById('adminPwInput').value===ADMIN_PASSWORD){
    sessionStorage.setItem('gb_admin','1');
    closeAdminLogin();
    showAdminArea(true);
  } else {
    document.getElementById('adminPwError').style.display='block';
    document.getElementById('adminPwInput').value='';
    document.getElementById('adminPwInput').focus();
  }
}

function showAdminArea(show){
  const upload=document.getElementById('adminUploadOuter');
  const chip=document.getElementById('adminChip');
  if(upload)upload.style.display=show?'block':'none';
  if(chip)chip.style.display=show?'flex':'none';
}

function adminLogout(){
  sessionStorage.removeItem('gb_admin');
  showAdminArea(false);
}
const now = new Date();
const jan1 = new Date(now.getFullYear(),0,1);
const kw = Math.ceil(((now-jan1)/86400000+jan1.getDay()+1)/7);
document.getElementById('kwBadge').textContent='KW '+kw;
function showTab(id, btn) {
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  // Einstellungen-Button im Header
  const settBtn = document.getElementById('settingsNavBtn');
  if(settBtn) settBtn.classList.remove('active');
  document.getElementById('tab-'+id).classList.add('active');
  if(btn) btn.classList.add('active');
  // Wenn Einstellungen: Header-Button aktiv markieren
  if(id==='einstellungen' && settBtn) settBtn.classList.add('active');
}
function showSubTab(tabId, subId) {
  // Hide all subpanels in this tab
  document.querySelectorAll('#tab-'+tabId+' .subpanel').forEach(p=>p.style.display='none');
  // Deactivate all subtab buttons in this tab
  document.querySelectorAll('#tab-'+tabId+' .subtab-btn').forEach(b=>b.classList.remove('active'));
  // Show target subpanel
  const panel = document.getElementById('subpanel-'+tabId+'-'+subId);
  if(panel) panel.style.display='block';
  // Activate button
  const btn = document.getElementById('subtab-'+tabId+'-'+subId);
  if(btn) btn.classList.add('active');
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
  // \xa0 ist ein geschütztes Leerzeichen das Microsoft Forms manchmal anhängt
  const v=(val||'').toLowerCase().replace(/\xa0/g,' ').trim();
  for(const[k,p]of Object.entries(map))if(v.includes(k))return p;
  return null;
}
function scoreRow(row){
  const cols=Object.keys(row);
  const colFind=(test)=>cols.find(c=>test(c.toLowerCase().replace(/\xa0/g,' ').trim()));
  let pts=0;
  let commutePts=0,travelPts=0,homePts=0,printPts=0,socialPts=0;
  const commuteCol=colFind(c=>c.includes('verkehrsmittel')&&c.includes('arbeit'));
  if(commuteCol){const s=matchScore(SCORE.commute,row[commuteCol]);if(s!==null){pts+=s;commutePts=s;}}
  const travelCol=colFind(c=>c.includes('dienstreise'));
  if(travelCol){const s=matchScore(SCORE.travel,row[travelCol]);if(s!==null){pts+=s;travelPts=s;}}
  const homeCol=colFind(c=>c.includes('homeoffice'));
  if(homeCol){const raw=String(row[homeCol]||'0').replace(/\xa0/g,'').trim();const d=Math.min(5,Math.max(0,parseInt(raw)||0));homePts=SCORE.homeofficePts[d];pts+=homePts;}
  const printCol=colFind(c=>c.includes('seiten')||c.includes('gedruckt'));
  if(printCol){const s=matchScore(SCORE.print,row[printCol]);if(s!==null){pts+=s;printPts=s;}}
  const socialCol=colFind(c=>c.includes('social'));
  if(socialCol){const v=(row[socialCol]||'').toLowerCase();if(v.includes('ja')||v==='true'||v==='1'){pts+=SCORE.socialDay;socialPts=SCORE.socialDay;}}
  row._commutePts=commutePts;row._travelPts=travelPts;row._homePts=homePts;row._printPts=printPts;row._socialPts=socialPts;
  return pts;
}
function getAbteilung(row){const col=Object.keys(row).find(c=>c.toLowerCase().replace(/\xa0/g,' ').trim().includes('abteilung'));return col?(row[col]||'').replace(/\xa0/g,' ').trim()||null:null;}
function _colFind(row, test){ return Object.keys(row).find(c=>test(c.toLowerCase().replace(/\xa0/g,' ').trim())); }
function getEmail(row){const col=_colFind(row,c=>c.includes('mail'));return col?(row[col]||'').trim():'';}
function getName(row){
  const cols=Object.keys(row);
  const exact=cols.find(c=>c.toLowerCase().replace(/\xa0/g,' ').trim()==='name');
  if(exact&&(row[exact]||'').trim()) return (row[exact]||'').trim();
  const partial=cols.find(c=>c.toLowerCase().replace(/\xa0/g,' ').trim().includes('name')&&!c.toLowerCase().includes('abteilung')&&!c.toLowerCase().includes('datei'));
  if(partial&&(row[partial]||'').trim()) return (row[partial]||'').trim();
  const namelike=cols.find(c=>{
    const v=(row[c]||'').toString().trim();
    return v.includes(' ')&&!v.includes('@')&&!/\d/.test(v)&&v.length>4&&v.length<60;
  });
  if(namelike&&(row[namelike]||'').trim()) return (row[namelike]||'').trim();
  const emailCol=_colFind(row,c=>c.includes('mail'));
  if(emailCol){
    const email=(row[emailCol]||'').trim().toLowerCase();
    const local=email.split('@')[0]||'';
    if(local.includes('.')){
      return local.split('.').map(p=>p.charAt(0).toUpperCase()+p.slice(1)).join(' ');
    }
  }
  return '';
}
function _parseRowDate(row){
  const col=Object.keys(row).find(c=>c.toLowerCase().includes('startzeit')||c.toLowerCase().includes('start'));
  if(!col||!row[col])return null;
  const val=row[col];
  const d=typeof val==='number'?new Date(Math.round((val-25569)*86400*1000)):new Date(val);
  return isNaN(d)?null:d;
}
function getWeekObj(row){
  const d=_parseRowDate(row);if(!d)return null;
  const j1=new Date(d.getFullYear(),0,1);
  const kw=Math.ceil(((d-j1)/86400000+j1.getDay()+1)/7);
  const dateStr=d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'});
  return{kw,dateStr,label:'KW '+kw};
}
function getWeek(row){const w=getWeekObj(row);return w?w.label:null;}
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
  const grid=document.getElementById('badgesGrid');if(!grid||!depts.length)return;
  const badges=[];
  const byAvg=[...depts].sort((a,b)=>b.avg-a.avg);
  const byTotal=[...depts].sort((a,b)=>b.total-a.total);
  if(byAvg[0])badges.push({ico:'🏆',cls:'gold',name:'Wochenchampion',who:byAvg[0].name});
  if(byTotal[0])badges.push({ico:'💚',cls:'green',name:'Klima-Profi',who:byTotal[0].name});
  const consistent=depts.find(d=>d.count>=2);
  if(consistent)badges.push({ico:'🔄',cls:'silver',name:'Konstant aktiv',who:consistent.name});
  if(depts.length>=2)badges.push({ico:'🌱',cls:'blue',name:'Eco-Vorreiter',who:byAvg[1].name});
  if(depts.length>=3)badges.push({ico:'♻️',cls:'purple',name:'Top-Sparer',who:byTotal[2]?.name||byAvg[2].name});
  const bcEl=document.getElementById('badgeCount');if(bcEl)bcEl.textContent=badges.length+' Badges';
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
  const msR=document.getElementById('msReached');if(msR)msR.textContent=reached+' erreicht';
  return{reached,highestReached};
}
function processData(rows){
  // Alle gültigen Einträge behalten (kein last-wins-Dedup der Wochen zerstört)
  const validRows=rows.filter(r=>getAbteilung(r));

  // Für Abteilungsrangliste: nur neuester Eintrag pro Person zählt
  const latestPerPerson={};
  for(const row of validRows){
    const key=getEmail(row)||getName(row);if(!key)continue;
    const wObj=getWeekObj(row);
    const wNum=wObj?wObj.kw:0;
    if(!latestPerPerson[key]||wNum>=(latestPerPerson[key]._wNum||0))
      latestPerPerson[key]={...row,_wNum:wNum};
  }
  const deduped=Object.values(latestPerPerson);

  const deptMap={};
  for(const row of deduped){
    const dept=getAbteilung(row);if(!dept)continue;
    if(!deptMap[dept])deptMap[dept]={points:0,count:0};
    deptMap[dept].points+=scoreRow(row);deptMap[dept].count++;
  }
  const depts=Object.entries(deptMap).map(([name,d])=>({name,total:d.points,avg:Math.round(d.points/d.count),count:d.count})).sort((a,b)=>b.avg-a.avg);

  // _allRows mit ALLEN Einträgen + _kw/_date für Profil/Streak/Wochen
  const allRowsFull=validRows.map(row=>{
    const wObj=getWeekObj(row);
    return{...row,_name:getName(row),_dept:getAbteilung(row),_pts:scoreRow(row),
           _kw:wObj?String(wObj.kw):null,_date:wObj?wObj.dateStr:''};
  });

  weeklyData={};
  let skippedWeeks=0;
  for(const row of validRows){
    const wObj=getWeekObj(row),dept=getAbteilung(row);
    if(!wObj){skippedWeeks++;continue;}
    const w=wObj.label;
    if(!weeklyData[w])weeklyData[w]={};
    if(!weeklyData[w][dept])weeklyData[w][dept]={points:0,count:0};
    weeklyData[w][dept].points+=scoreRow(row);weeklyData[w][dept].count++;
  }
  if(skippedWeeks>0)console.warn(`[GreenBoard] ${skippedWeeks} Einträge ohne gültiges Datum – von Wochencharts ausgeschlossen.`);
  const totalPts=depts.reduce((s,d)=>s+d.total,0);
  document.getElementById('mTotal').textContent=totalPts;
  document.getElementById('mTotalSub').textContent=depts.length+' Abteilungen';
  document.getElementById('mPeople').textContent=deduped.length;
  document.getElementById('mCO2').innerHTML=Math.round(totalPts*CO2_PER_PT)+'<span>kg</span>';
  if(depts.length){document.getElementById('mLeader').textContent=depts[0].name;document.getElementById('mLeaderSub').textContent=depts[0].avg+' Pkt./Person';}
  document.getElementById('rankBadge').textContent=depts.length+' Abteilungen';
  renderLeaderboard(depts);renderPodium(depts);renderWeekTabs(depts);

  /* === NEU: Live-Impact-Zähler === */
  const co2Total=Math.round(totalPts*CO2_PER_PT);
  const wkeys=Object.keys(weeklyData).sort();
  const lastW=wkeys[wkeys.length-1],prevW=wkeys[wkeys.length-2];
  let weekPts=0,prevPts=0;
  if(lastW)weekPts=Object.values(weeklyData[lastW]).reduce((s,d)=>s+d.points,0);
  if(prevW)prevPts=Object.values(weeklyData[prevW]).reduce((s,d)=>s+d.points,0);
  const weekCO2=Math.round(weekPts*CO2_PER_PT);
  const todayCO2=weekCO2>0?Math.round(weekCO2/5):0;
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
    const bahnKm=Math.round(co2Total/0.028);
    const equivList=[
      {icon:'🚗',text:`${km} km Autofahrt`},
      {icon:'✈️',text:`${flights} Kurzflüge`},
      {icon:'⚡',text:`${days} Tage Strom`},
      {icon:'🌳',text:`${trees} Bäume/Jahr CO₂`},
      {icon:'🚂',text:`${bahnKm} km Bahnfahrt`},
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
  _allRows=allRowsFull;
  window._allDepts=_allDepts; window._allRows=_allRows;
  /* Profil-Auswahl befüllen */
  populateProfilSelect();
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
function renderPodium(depts){
  const el=document.getElementById('podiumContainer');
  if(!el||!depts.length)return;
  const top3=depts.slice(0,3);
  const rest=depts.slice(3);
  const weeks=Object.keys(weeklyData).sort();
  const lastW=weeks[weeks.length-1],prevW=weeks[weeks.length-2];
  // badge label
  const pb=document.getElementById('podestBadge');
  if(pb)pb.textContent=depts.length+' Abteilungen';
  // Podest-Höhen: 1.Platz höher als 2., 2. höher als 3.
  const heights={1:140,2:96,3:68};
  // Reihenfolge im Podest: links=2, mitte=1, rechts=3
  const order=top3.length>=3?[top3[1],top3[0],top3[2]]
             :top3.length===2?[top3[1],top3[0],null]
             :[null,top3[0],null];
  const posClass=['p2','p1','p3'];
  const posRank=[2,1,3];
  const CROWN_SVG='<svg class="podium-crown" viewBox="0 0 24 24" fill="currentColor"><path d="M2 19h20l-1.5-9-4.5 4-4-7-4 7-4.5-4L2 19z"/></svg>';
  const MEDAL_SVG=(cls)=>`<svg class="podium-medal-ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="14" r="6"/><path d="M9 9 6 2"/><path d="M15 9l3-7"/><path d="M12 12v4"/></svg>`;
  const colorsArr=[_teamColors[1]||'#2d8c34',_teamColors[0]||'#1f6b24',_teamColors[2]||'#a0674a'];
  function trendFor(name){
    if(!lastW||!prevW)return'';
    const la=weeklyData[lastW]?.[name],pr=weeklyData[prevW]?.[name];
    if(!la||!pr||pr.count<=0)return'';
    const d=Math.round(((Math.round(la.points/la.count)-Math.round(pr.points/pr.count))/Math.max(1,Math.round(pr.points/pr.count)))*100);
    return`<span class="dept-trend-chip ${d>=0?'up':'down'}" style="font-size:10px;">${d>=0?'▲':'▼'}${Math.abs(d)}%</span>`;
  }
  // Build columns HTML
  const colsHtml=order.map((d,idx)=>{
    if(!d)return'<div style="flex:1"></div>';
    const pc=posClass[idx],rank=posRank[idx];
    const av=_teamAvatars[d.name];
    const init=d.name.split(' ').map(p=>p[0]||'').join('').slice(0,2).toUpperCase()||'?';
    const avHtml=av
      ?`<img src="${av}" class="podium-av ${pc}" style="object-fit:cover;" alt="${d.name}">`
      :`<div class="podium-av ${pc}" style="background:${colorsArr[idx]}">${init}</div>`;
    const topIco=rank===1?CROWN_SVG:MEDAL_SVG(pc);
    const sparkles=rank===1?`
        <span class="podium-sparkle" style="width:6px;height:6px;left:-14px;top:6px;animation-delay:.2s;"></span>
        <span class="podium-sparkle" style="width:4px;height:4px;right:-10px;top:18px;animation-delay:1.1s;"></span>
        <span class="podium-sparkle" style="width:5px;height:5px;left:50%;top:-30px;animation-delay:2s;"></span>`:'';
    return`<div class="podium-col ${pc}">
      <div class="podium-avatar-zone">
        ${topIco}
        ${avHtml}
        ${sparkles}
      </div>
      <div class="podium-name" title="${d.name}">${d.name}</div>
      <div class="podium-pts">${d.avg} Pkt./Person</div>
      <div class="podium-step ${pc}" data-h="${heights[rank]}">
        <span class="podium-step-num ${pc}">${rank}</span>
      </div>
    </div>`;
  }).join('');
  // Rest rows
  const restHtml=rest.length?`<div class="podium-rest">${rest.map((d,i)=>{
    const rank=i+4;
    return`<div class="podium-rest-row">
      <span class="podium-rest-rank">${rank}</span>
      <span class="podium-rest-name" title="${d.name}">${d.name}</span>
      <span class="podium-rest-trend">${trendFor(d.name)}</span>
      <span class="podium-rest-pts">${d.avg} Pkt.</span>
    </div>`;
  }).join('')}</div>`:''
  el.innerHTML=`<div class="podium-stage">${colsHtml}</div><div class="podium-base"></div>${restHtml}`;
  // Animate step heights from 0 to target
  setTimeout(()=>{
    el.querySelectorAll('.podium-step[data-h]').forEach(s=>{
      s.style.height=s.dataset.h+'px';
    });
  },80);
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
      if(ok||rows.some(r=>getAbteilung(r))){
        processData(rows);
        try{
          const dateStr=new Date().toLocaleDateString('de-DE',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
          _ls.setItem('gb_excelData',JSON.stringify(rows));
          _ls.setItem('gb_excelDate',dateStr);
        }catch(e){console.warn('[GreenBoard] localStorage voll.',e);}
      }
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
    const displayName = anonymizeName(m._name||'–', i);
    const init=(m._name||'?').split(' ').map(p=>p[0]||'').join('').slice(0,2).toUpperCase();
    const anonInit = window._anonymMode ? String(i+1).padStart(2,'0') : init;
    const mco2=(m._pts*CO2_PER_PT).toFixed(1);
    const above=dept.avg>0?Math.round(((m._pts-dept.avg)/dept.avg)*100):0;
    const badge=getTeamBadge(m._pts);
    const chip=badge?`<span class="member-lvl-chip ${badge.level}">${badge.icon} ${badge.label}</span>`:'';
    _memberCache[m._name]={...m,co2:mco2,rank:i+1,total:members.length,avgPts:dept.avg,above};
    return`<div class="member-row" onclick="openMemberModal('${(m._name||'').replace(/'/g,"\\'")}')">
      <div class="member-avatar">${anonInit}</div>
      <div style="flex:1;min-width:0;"><div class="member-name-txt">${displayName}</div><div class="member-sub">${mco2} kg CO₂ · ${above>=0?'+':''}${above}% zum Team-Ø</div></div>
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
/* ===== Team-Avatar + Motto Storage (pro Abteilung, persistent) ===== */
let _teamAvatars={};
let _teamMottos={};
const _teamColors=['#1f6b24','#2d8c34','#a0674a','#8a8fa8','#c8a84b','#5ec466'];

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
    // serie_1 wird unten anhand von Wochendaten vergeben
    // social_hero wird unten korrekt via _socialPts vergeben
  }
  // Badges basierend auf verfügbaren Daten
  const allRows=_allRows||[];
  const ownRows=own?allRows.filter(r=>(r._dept||'')===own):allRows;
  // Badges auf Basis berechneter Punkte-Felder (spaltenname-unabhängig)
  if(ownRows.some(r=>(r._commutePts||0)>=15))_earnedBadges.add('bike_hero');
  if(ownRows.some(r=>(r._commutePts||0)>=10&&(r._commutePts||0)<15))_earnedBadges.add('opnv_profi');
  if(ownRows.some(r=>(r._commutePts||0)===5))_earnedBadges.add('fahrgemeinschaft');
  if(ownRows.some(r=>(r._printPts||0)>=15))_earnedBadges.add('druckfrei');
  if(ownRows.some(r=>(r._socialPts||0)>0))_earnedBadges.add('social_hero');
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
  ml.innerHTML=matches.sort((a,b)=>b._pts-a._pts).map((m,i)=>{
    const displayName = anonymizeName(m._name||'–', i);
    const init=(m._name||'?').split(' ').map(p=>p[0]||'').join('').slice(0,2).toUpperCase();
    const anonInit = window._anonymMode ? String(i+1).padStart(2,'0') : init;
    const above=dept&&dept.avg>0?Math.round(((m._pts-dept.avg)/dept.avg)*100):0;
    const badge=getTeamBadge(m._pts);
    const chip=badge?`<span class="member-lvl-chip ${badge.level}">${badge.icon} ${badge.label}</span>`:'';
    return`<div class="member-row" onclick="openMemberModal('${(m._name||'').replace(/'/g,"\\'")}')">
      <div class="member-avatar">${anonInit}</div>
      <div style="flex:1;min-width:0;"><div class="member-name-txt">${displayName}</div><div class="member-sub">${m.co2} kg CO₂ · ${above>=0?'+':''}${above}% zum Team-Ø</div></div>
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

// Demo-Daten entfernt – Dashboard startet leer oder mit gespeicherten Daten
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
  // Social-Score: basiert auf Social-Day-Rate (echte Daten, nicht tautologisch)
  const socialParticipants=deduped.filter(r=>(r._socialPts||0)>0).length;
  const socialRate=deduped.length>0?Math.round((socialParticipants/deduped.length)*100):0;
  const sScore=Math.min(100, 70+(depts.length>3?15:0)+(socialRate>20?15:0));
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
  const totalHODays = deduped.reduce((s,r)=>s+Math.round((r._homePts||0)/8),0);
  const energyKWh = Math.round(totalHODays * 3.2); // 3.2 kWh Pendelersparnis pro HO-Tag
  // Papier: 0P = 30+ Seiten gespart vs. 15P = 0 Seiten gedruckt
  // Schätzung: (15 - printPts) / 15 * 30 Seiten vermieden pro Person
  const totalPrintPts = deduped.reduce((s,r)=>s+(r._printPts||0),0);
  const paperSaved = Math.round(deduped.length > 0
    ? deduped.reduce((s,r)=>{ const pts=r._printPts||0; return s + Math.max(0,Math.round((15-pts)/15*30)); },0)
    : 0);
  const totalCommutePts = deduped.reduce((s,r)=>s+(r._commutePts||0),0);
  const mobilityKm = Math.round(totalCommutePts * 0.8); // Schätzung: grüne Pendelpunkte × 0.8 km-Faktor
  const waterL = Math.round(deduped.length * 55); // per person estimate
  const activeWeeks = Object.keys(weeklyData).length; // echte Anzahl Messwochen

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
    {id:'esgImpEnergy',barId:'esgBarEnergy',equivId:'esgEquivEnergy',val:energyKWh,max:5000,equiv:`≈ ${Math.round(energyKWh/3.5)} Tage Strom (Ø Haushalt)`},
    {id:'esgImpPaper',barId:'esgBarPaper',equivId:'esgEquivPaper',val:paperSaved,max:10000,equiv:`≈ ${Math.round(paperSaved/8333)} Bäume geschont`},
    {id:'esgImpMobility',barId:'esgBarMobility',equivId:'esgEquivMobility',val:mobilityKm,max:5000,equiv:`fossil-freie Wege`},
    {id:'esgImpWater',barId:'esgBarWater',equivId:'esgEquivWater',val:activeWeeks,max:26,equiv:'Messwochen im Wettbewerb'},
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
    tb.textContent=(diff>=0?'↑ +':'↓ ')+diff+'% zur Vorwoche';
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
    // Echte Kategorie-Aufschlüsselung aus tatsächlichen Daten
    const _ar=window._allRows||[];
    const cats=[
      {ico:'🏠',name:'Homeoffice',  pts:_ar.reduce((s,r)=>s+(r._homePts||0),0)},
      {ico:'🚲',name:'Mobilität',   pts:_ar.reduce((s,r)=>s+(r._commutePts||0),0)},
      {ico:'✈️',name:'Dienstreise', pts:_ar.reduce((s,r)=>s+(r._travelPts||0),0)},
      {ico:'🖨️',name:'Drucken',    pts:_ar.reduce((s,r)=>s+(r._printPts||0),0)},
      {ico:'🤝',name:'Social Day',  pts:_ar.reduce((s,r)=>s+(r._socialPts||0),0)},
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
  const customMotto=_teamMottos[own]||_ls.getItem('gb_motto_'+own);
  const defaultMotto=SPOTLIGHT_MOTTOS[Math.abs(own.split('').reduce((a,c)=>a+c.charCodeAt(0),0))%SPOTLIGHT_MOTTOS.length];
  if(customMotto)_teamMottos[own]=customMotto;
  const mt=document.getElementById('spMotto'); if(mt)mt.textContent=customMotto||defaultMotto;

  // Team-Profilbild: pro Abteilung laden, sonst zurücksetzen
  const savedTeamImg=_teamAvatars[own]||_ls.getItem('gb_teamimg_'+own);
  if(savedTeamImg)_teamAvatars[own]=savedTeamImg;
  applyTeamImg(savedTeamImg||null);

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
      const init = window._anonymMode
        ? String(i+1).padStart(2,'0')
        : (m._name||'?').split(' ').map(p=>p[0]||'').join('').slice(0,2).toUpperCase();
      return`<div class="sp-avatar" style="background:${colors[i%colors.length]}" title="${window._anonymMode?'Mitglied #'+(i+1):(m._name||'?')}">${init}</div>`;
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
    if(name==='team'){ renderSpotlight(); if(_allDepts.length) renderTeamTab(); }
    if(name==='profil'){ renderProfil(); }
  };
})();
/* ── Einstellungen: Dark Mode ─────────────────────────────── */
function applyDarkMode(on){
  document.body.classList.toggle('dark-mode', on);
  _ls.setItem('gb_darkmode', on?'1':'0');
}
function applyCompact(on){
  document.body.classList.toggle('compact-mode', on);
  _ls.setItem('gb_compact', on?'1':'0');
}
function applyPerformance(on){
  document.body.classList.toggle('perf-mode', on);
  _ls.setItem('gb_perf', on?'1':'0');
}
function applyPresentation(on){
  document.body.classList.toggle('presentation-mode', on);
  _ls.setItem('gb_presentation', on?'1':'0');
  // Falls Einstellungen-Tab aktiv ist beim Einschalten → zur Rangliste wechseln
  if(on){
    const activeTab=document.querySelector('.tab-content.active');
    if(activeTab && activeTab.id==='tab-einstellungen') showTab('rangliste', document.querySelector('.nav-tab'));
  }
}
function applyFocus(on){
  document.body.classList.toggle('focus-mode', on);
  _ls.setItem('gb_focus', on?'1':'0');
  // Falls ein ausgeblendeter Tab aktiv ist → zur Rangliste
  if(on){
    const hiddenTabs=['tab-mitmachen','tab-spielregeln','tab-profil'];
    const activeTab=document.querySelector('.tab-content.active');
    if(activeTab && hiddenTabs.includes(activeTab.id)) showTab('rangliste', document.querySelector('.nav-tab'));
  }
}
function applyInfoTooltips(on){
  document.body.classList.toggle('no-info-tooltips', !on);
  _ls.setItem('gb_infotooltips', on?'1':'0');
}
function copyFeedbackEmail(btn){
  navigator.clipboard.writeText('maxim.makarova@bbbank.de').then(()=>{
    const orig=btn.innerHTML;
    btn.innerHTML='<svg style="width:11px;height:11px;flex-shrink:0;" viewBox="0 0 16 16" fill="none"><path d="M2.5 8.5l3.5 3.5 7-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Kopiert!';
    btn.style.color='var(--green-700)';
    btn.style.borderColor='var(--green-400)';
    setTimeout(()=>{btn.innerHTML=orig;btn.style.color='';btn.style.borderColor='';},2000);
  });
}


window._anonymMode = false;
window._hideEmail = true;
function applyAnonym(on){
  window._anonymMode = on;
  _ls.setItem('gb_anonym', on?'1':'0');
  if(window._allDepts && window._allDepts.length){
    renderLeaderboard(window._allDepts);
    renderPodium(window._allDepts);
    const own=document.getElementById('ownTeamSelect')?.value;
    if(own) renderSpotlight();
    if(typeof renderTeamTab==='function' && own) renderTeamTab();
    // Re-render Mitglied-Suche falls sichtbar
    const q=document.getElementById('memberSearch')?.value?.toLowerCase()||'';
    if(typeof searchMembers==='function') searchMembers(q);
  }
}
function applyHideEmail(on){
  window._hideEmail = on;
  _ls.setItem('gb_hideEmail', on?'1':'0');
  // E-Mail-Spalten in allen sichtbaren Tabellen/Listen ausblenden
  document.querySelectorAll('.member-email-cell, .email-cell').forEach(el=>{
    el.style.display = on ? 'none' : '';
  });
}

function anonymizeName(name, idx){
  if(!window._anonymMode) return name;
  return 'Mitglied #' + String(idx+1).padStart(2,'0');
}

/* ── CSV Export ──────────────────────────────────────────── */
function exportCSV(){
  if(!window._allDepts || !window._allDepts.length){ alert('Bitte zuerst Daten laden.'); return; }
  const rows = [['Rang','Abteilung','Gesamtpunkte','Ø Punkte/Person','Mitglieder','CO₂ (kg)']];
  window._allDepts.forEach((d,i)=>{
    rows.push([i+1, d.name, d.total, d.avg, d.count, Math.round(d.total*0.12)]);
  });
  const csv = rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='greenboard_rangliste.csv'; a.click();
  URL.revokeObjectURL(url);
}

/* ── Platzierungen & Punkte als Excel (.xlsx) ─────────────── */
function exportExcelRanking(){
  if(!window._allDepts || !window._allDepts.length){ alert('Bitte zuerst Daten laden.'); return; }
  const hideEmail = window._hideEmail;
  const anonym = document.getElementById('settingAnonym')?.checked;

  // Sheet 1: Abteilungs-Rangliste
  const deptRows = window._allDepts.map((d,i)=>({
    'Platz': i+1,
    'Abteilung': d.name,
    'Gesamtpunkte': d.total,
    'Ø Punkte/Person': d.avg,
    'Mitglieder': d.count,
    'CO₂ gespart (kg)': Math.round(d.total*0.12),
  }));

  // Sheet 2: Mitarbeitende mit Platzierung pro Abteilung
  const memberRows = [];
  window._allDepts.forEach(d=>{
    const members = (window._allRows||[]).filter(r=>(r._dept||'')===d.name).sort((a,b)=>b._pts-a._pts);
    members.forEach((m,i)=>{
      memberRows.push({
        'Abteilung': d.name,
        'Platz (Team-intern)': i+1,
        'Name': anonym ? ('Mitglied #'+(i+1)) : (m._name||'–'),
        'Punkte': m._pts,
        'CO₂ (kg)': +(m._pts*0.12).toFixed(1),
        '% zum Team-Ø': d.avg>0 ? Math.round(((m._pts-d.avg)/d.avg)*100) : 0,
      });
    });
  });

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(deptRows);
  ws1['!cols'] = [{wch:8},{wch:24},{wch:14},{wch:16},{wch:12},{wch:16}];
  XLSX.utils.book_append_sheet(wb, ws1, 'Abteilungs-Ranking');

  const ws2 = XLSX.utils.json_to_sheet(memberRows);
  ws2['!cols'] = [{wch:22},{wch:18},{wch:24},{wch:10},{wch:10},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws2, 'Mitarbeitende');

  const stamp = new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb, `greenboard_platzierungen_${stamp}.xlsx`);
}

/* ── Mein Profil ─────────────────────────────────────────── */
window._profilImgs = {};
function handleProfilImg(e){
  const file = e.target.files[0]; if(!file) return;
  const sel = document.getElementById('profilPersonSelect');
  const name = sel ? sel.value : '';
  if(!name){ alert('Bitte zuerst eine Person auswählen.'); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    window._profilImgs[name] = ev.target.result;
    const av = document.getElementById('profilAvatar');
    av.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    _ls.setItem('gb_profilimg_'+name, ev.target.result);
  };
  reader.readAsDataURL(file);
}

function populateProfilSelect(){
  const sel = document.getElementById('profilPersonSelect');
  if(!sel || !window._allRows || !window._allRows.length) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">– Person wählen –</option>';
  const names = [...new Set(window._allRows.map(r=>r._name).filter(Boolean))].sort();
  names.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n; opt.textContent = n;
    sel.appendChild(opt);
  });
  if(current && names.includes(current)) sel.value = current;
}

const PROFIL_LEVELS = [
  {key:'none',   icon:'🌱', label:'Starter',  minPts:0,   color:'#7a9b7d'},
  {key:'bronze', icon:'🥉', label:'Bronze',   minPts:50,  color:'#a0674a'},
  {key:'silver', icon:'🥈', label:'Silber',   minPts:150, color:'#8a8fa8'},
  {key:'gold',   icon:'🥇', label:'Gold',     minPts:300, color:'#c8a84b'},
  {key:'platin', icon:'💎', label:'Platin',   minPts:500, color:'#1f6b24'},
];

function renderProfil(){
  populateProfilSelect();
  const sel = document.getElementById('profilPersonSelect');
  const name = sel ? sel.value : '';
  const content = document.getElementById('profilContent');
  const empty = document.getElementById('profilEmpty');
  if(!name || !window._allRows || !window._allRows.length){
    if(content) content.style.display='none';
    if(empty) empty.style.display='block';
    // reset hero
    document.getElementById('profilName').textContent='– Bitte Person wählen –';
    document.getElementById('profilDept').textContent='Keine Abteilung';
    document.getElementById('profilBadgeChip').textContent='🌱 Kein Level';
    document.getElementById('phPts').textContent='–';
    document.getElementById('phRank').textContent='–';
    document.getElementById('phCO2').textContent='–';
    return;
  }
  if(_vsModeActive){
    populateVSSelect();
    renderVS();
    if(content) content.style.display='none';
    if(empty) empty.style.display='none';
    return;
  }
  if(content) content.style.display='block';
  if(empty) empty.style.display='none';

  // Profilbild: pro Person laden, sonst auf Initialen zurücksetzen
  const av=document.getElementById('profilAvatar');
  const savedImg = window._profilImgs[name] || _ls.getItem('gb_profilimg_'+name);
  if(savedImg){
    window._profilImgs[name]=savedImg;
    av.innerHTML=`<img src="${savedImg}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
  } else {
    av.innerHTML = name.split(' ').map(p=>p[0]||'').join('').slice(0,2).toUpperCase()||'?';
  }

  const rows = window._allRows.filter(r=>r._name===name);
  const dept = rows[0]?._dept || '–';
  const totalPts = rows.reduce((s,r)=>s+r._pts,0);
  const co2 = Math.round(totalPts*0.12);

  // Team rank
  const personPts={};
  window._allRows.filter(r=>r._dept===dept).forEach(r=>{personPts[r._name]=(personPts[r._name]||0)+r._pts;});
  const sorted=Object.entries(personPts).sort((a,b)=>b[1]-a[1]);
  const teamRankIdx=sorted.findIndex(([n])=>n===name);
  const teamRank=teamRankIdx>=0?teamRankIdx+1:'–';

  // Global rank (alle Personen über alle Abteilungen)
  const globalPts={};
  window._allRows.forEach(r=>{globalPts[r._name]=(globalPts[r._name]||0)+r._pts;});
  const globalSorted=Object.entries(globalPts).sort((a,b)=>b[1]-a[1]);
  const globalRankIdx=globalSorted.findIndex(([n])=>n===name);
  const globalRank=globalRankIdx>=0?globalRankIdx+1:'–';
  const globalTotal=globalSorted.length;

  // Level
  const lvl = [...PROFIL_LEVELS].reverse().find(l=>totalPts>=l.minPts)||PROFIL_LEVELS[0];
  const nextLvl = PROFIL_LEVELS.find(l=>l.minPts>totalPts);

  // Hero
  document.getElementById('profilName').textContent=name;
  document.getElementById('profilDept').textContent=dept;
  document.getElementById('profilBadgeChip').textContent=lvl.icon+' '+lvl.label+'-Level';
  document.getElementById('phPts').textContent=totalPts;
  document.getElementById('phRank').textContent=teamRank!=='–'?'#'+teamRank:'–';
  document.getElementById('phGlobalRank').textContent=globalRank!=='–'?'#'+globalRank:'–';
  document.getElementById('phCO2').textContent=co2;

  // KPI cards
  document.getElementById('ppTotal').textContent=totalPts;
  document.getElementById('ppTotalSub').textContent=rows.length+' Einträge gesamt';
  document.getElementById('ppCO2').textContent=co2;
  document.getElementById('ppTeamRank').textContent=teamRank!=='–'?'#'+teamRank:'–';
  document.getElementById('ppTeamRankSub').textContent='von '+sorted.length+' Personen in '+dept;
  document.getElementById('ppGlobalRank').textContent=globalRank!=='–'?'#'+globalRank:'–';
  document.getElementById('ppGlobalRankSub').textContent='von '+globalTotal+' Teilnehmenden gesamt';
  document.getElementById('ppLevel').textContent=lvl.icon+' '+lvl.label;
  document.getElementById('ppLevelSub').textContent=nextLvl?'Noch '+(nextLvl.minPts-totalPts)+' Pkt. bis '+nextLvl.label:'Maximales Level erreicht! 🏆';

  // Einsparungen
  const maxPts=rows.length*110;
  const savings=[
    {ico:'🚗',label:'Mobilität (Anfahrt)',val:rows.reduce((s,r)=>s+(r._commutePts||0),0),max:rows.length*15},
    {ico:'🏠',label:'Homeoffice',val:rows.reduce((s,r)=>s+(r._homePts||0),0),max:rows.length*35},
    {ico:'🖨️',label:'Drucken gespart',val:rows.reduce((s,r)=>s+(r._printPts||0),0),max:rows.length*15},
    {ico:'✈️',label:'Dienstreisen',val:rows.reduce((s,r)=>s+(r._travelPts||0),0),max:rows.length*15},
  ];
  const savEl=document.getElementById('profilSavings');
  savEl.innerHTML=savings.map(s=>{
    const pct=s.max>0?Math.round((s.val/s.max)*100):0;
    return`<div class="ps-row">
      <div class="ps-ico">${s.ico}</div>
      <div class="ps-info">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <div class="ps-label">${s.label}</div>
          <div class="ps-val">${s.val}/${s.max} Pkt</div>
        </div>
        <div class="ps-bar-track"><div class="ps-bar-fill" style="width:${pct}%"></div></div>
      </div>
    </div>`;
  }).join('');

  // Verbesserungspotenzial
  const tips=[];
  const avgCommute=rows.length>0?rows.reduce((s,r)=>s+(r._commutePts||0),0)/rows.length:0;
  if(avgCommute<10) tips.push({ico:'🚲',title:'Öfter Rad oder ÖPNV nutzen',sub:'Fahrrad/zu Fuß = 15 Pkt., ÖPNV = 10 Pkt. pro Eintrag',gain:'+'+Math.round((15-avgCommute)*rows.length)+' mögliche Pkt.'});
  const avgHome=rows.length>0?rows.reduce((s,r)=>s+(r._homePts||0),0)/rows.length:0;
  if(avgHome<20) tips.push({ico:'🏠',title:'Mehr Homeoffice-Tage einplanen',sub:'3 Tage HO = 24 Pkt. pro Eintrag',gain:'+'+Math.round((24-avgHome)*rows.length)+' mögliche Pkt.'});
  const avgPrint=rows.length>0?rows.reduce((s,r)=>s+(r._printPts||0),0)/rows.length:0;
  if(avgPrint<10) tips.push({ico:'📄',title:'Weniger drucken',sub:'Papierlos = 15 Pkt. pro Eintrag',gain:'+'+Math.round((15-avgPrint)*rows.length)+' mögliche Pkt.'});
  const hasSocial=rows.some(r=>r._socialPts>0);
  if(!hasSocial) tips.push({ico:'🤝',title:'Social Day nutzen',sub:'Einmaliger Bonus: 30 Punkte',gain:'+30 Pkt.'});
  if(!tips.length) tips.push({ico:'🏆',title:'Super! Kaum Verbesserungspotenzial',sub:'Du schöpfst deine Punkte bereits sehr gut aus.',gain:''});
  document.getElementById('profilTips').innerHTML=tips.map(t=>`
    <div class="pt-row">
      <div class="pt-ico">${t.ico}</div>
      <div class="pt-info">
        <div class="pt-title">${t.title}</div>
        <div class="pt-sub">${t.sub}</div>
        ${t.gain?`<div class="pt-gain">${t.gain}</div>`:''}
      </div>
    </div>`).join('');

  // Level track
  const ltEl=document.getElementById('profilLevelTrack');
  ltEl.innerHTML=PROFIL_LEVELS.map(l=>{
    const isReached=totalPts>=l.minPts;
    const isCurrent=l.key===lvl.key;
    const cls=isCurrent?'current':isReached?'reached':'locked';
    return`<div class="plt-step">
      <div class="plt-dot ${cls}">${l.icon}</div>
      <div class="plt-lbl ${cls}">${l.label}</div>
      <div class="plt-pts">${l.minPts} Pkt.</div>
    </div>`;
  }).join('');

  // ── Persönliche Badges ──────────────────────────────────
  const weeksActive=Object.keys((()=>{const m={};rows.forEach(r=>{if(r._kw)m[r._kw]=1;});return m;})()).length;

  /* ── Streak Banner ───────────────────────────────────── */
  (()=>{
    // Collect all KWs with activity (as numbers)
    const kwSet=new Set();
    rows.forEach(r=>{ if(r._kw) kwSet.add(parseInt(r._kw,10)); });
    const kwArr=[...kwSet].filter(n=>!isNaN(n)).sort((a,b)=>a-b);
    // Calculate current streak (consecutive weeks counting back from latest)
    let streak=0;
    if(kwArr.length>0){
      const last=kwArr[kwArr.length-1];
      for(let i=kwArr.length-1;i>=0;i--){
        if(kwArr[kwArr.length-1]-(kwArr.length-1-i)===kwArr[i]) streak++;
        else break;
      }
    }
    // Build last 8 weeks dot indicators
    const allKwsGlobal=Object.keys(weeklyData).map(k=>parseInt(k,10)).filter(n=>!isNaN(n)).sort((a,b)=>a-b);
    const latestKw=allKwsGlobal.length>0?allKwsGlobal[allKwsGlobal.length-1]:0;
    const dotWeeks=Array.from({length:8},(_,i)=>latestKw-7+i);
    const banner=document.getElementById('streakBanner');
    const flameEl=document.getElementById('streakFlame');
    const countEl=document.getElementById('streakCount');
    const labelEl=document.getElementById('streakLabel');
    const dotsEl=document.getElementById('streakDots');
    if(!banner)return;
    if(streak>=1){
      banner.classList.add('active');
      countEl.textContent=streak+' Woche'+(streak!==1?'n':'')+' 🔥';
      labelEl.textContent=streak>=5?'Mega-Streak! Weiter so!':streak>=3?'Stark! Nicht abreißen lassen.':'Guter Start – bleib dabei!';
    } else {
      banner.classList.remove('active');
      countEl.textContent='Noch kein Streak';
      labelEl.textContent='Jeden Montag Aktionen eintragen – Streak starten!';
    }
    dotsEl.innerHTML=dotWeeks.map(kw=>{
      const active=kwSet.has(kw);
      const future=kw>latestKw;
      return`<div class="streak-dot ${future?'':active?'hit':'miss'}" title="KW ${kw}${active?' ✓ aktiv':future?'':' –'}"></div>`;
    }).join('');
  })();
  const isPaperless=rows.some(r=>r._printPts>=15);
  const hasBike=rows.some(r=>r._commutePts>=15);
  const hasHome3=rows.some(r=>r._homePts>=24);
  const hasSocialDay=rows.some(r=>(r._socialPts||0)>0);
  const topGlobal10pct=globalTotal>0&&globalRank!=='–'&&(globalRank/globalTotal)<=0.1;
  const topTeam1=teamRank===1;

  const PROFIL_BADGES=[
    {ico:'🚀',name:'Starter',cond:'Erste Punkte gesammelt',fn:()=>totalPts>0},
    {ico:'🌿',name:'Grüner Daumen',cond:'50+ Punkte erreicht',fn:()=>totalPts>=50},
    {ico:'🌳',name:'Klimaschützer',cond:'150+ Punkte erreicht',fn:()=>totalPts>=150},
    {ico:'💎',name:'Platin-Player',cond:'500+ Punkte erreicht',fn:()=>totalPts>=500},
    {ico:'📄',name:'Papierlos-Profi',cond:'Einmal komplett papierlos',fn:()=>isPaperless},
    {ico:'🚲',name:'Pedalritter',cond:'Mit Fahrrad/zu Fuß gependelt',fn:()=>hasBike},
    {ico:'🏠',name:'Homeoffice-Hero',cond:'3 Tage HO in einer Woche',fn:()=>hasHome3},
    {ico:'🤝',name:'Social Star',cond:'Social Day absolviert',fn:()=>hasSocialDay},
    {ico:'📅',name:'Konsistent',cond:'3+ Wochen aktiv',fn:()=>weeksActive>=3},
    {ico:'🔥',name:'Streak-Master',cond:'5+ Wochen aktiv',fn:()=>weeksActive>=5},
    {ico:'🏆',name:'Team-Champion',cond:'Platz 1 im Team',fn:()=>topTeam1},
    {ico:'🌍',name:'Global Top 10%',cond:'Top 10% aller Teilnehmer',fn:()=>topGlobal10pct},
  ];

  const unlockedBadges=PROFIL_BADGES.filter(b=>b.fn());
  document.getElementById('ppBadgeCount').textContent=unlockedBadges.length+' / '+PROFIL_BADGES.length+' freigeschaltet';
  document.getElementById('profilBadgesGrid').innerHTML=PROFIL_BADGES.map(b=>{
    const ok=b.fn();
    return`<div class="profil-badge-card ${ok?'unlocked':'locked'}">
      <div class="pbc-ico">${b.ico}</div>
      <div class="pbc-name">${b.name}</div>
      <div class="pbc-cond">${b.cond}</div>
      <span class="pbc-chip ${ok?'unlocked':'locked'}">${ok?'✓ Freigeschaltet':'Gesperrt'}</span>
    </div>`;
  }).join('');

  // Wochen
  const weekMap={};
  rows.forEach(r=>{
    const kw=r._kw||'?';
    if(!weekMap[kw]) weekMap[kw]={pts:0,date:r._date||''};
    weekMap[kw].pts+=r._pts;
  });
  const weekEntries=Object.entries(weekMap).sort((a,b)=>b[0].localeCompare(a[0]));
  const maxWkPts=Math.max(...weekEntries.map(([,v])=>v.pts),1);
  document.getElementById('ppWeeksBadge').textContent=weekEntries.length+' Wochen';
  document.getElementById('profilWeeks').innerHTML=weekEntries.map(([kw,v])=>`
    <div class="profil-week-row">
      <div class="pw-kw">KW ${kw}</div>
      <div class="pw-bar-wrap"><div class="pw-bar-track"><div class="pw-bar-fill" style="width:${Math.round(v.pts/maxWkPts*100)}%"></div></div></div>
      <div class="pw-pts">${v.pts}</div>
      <div class="pw-date">${v.date}</div>
    </div>`).join('') || '<div class="empty-state"><div class="empty-state-text">Keine Wochen-Daten</div></div>';

  // ── Performanzverlauf Chart ──────────────────────────
  (()=>{
    const sorted=Object.entries(weekMap).sort((a,b)=>a[0].localeCompare(b[0]));
    const labels=sorted.map(([kw])=>'KW '+kw);
    const data=sorted.map(([,v])=>v.pts);
    // Trend badge
    const badge=document.getElementById('ppTrendBadge');
    if(badge&&data.length>=2){
      const first=data[0],last=data[data.length-1];
      const diff=Math.round(((last-first)/Math.max(1,first))*100);
      badge.textContent=(diff>=0?'▲ +':'▼ ')+diff+'% seit KW '+sorted[0][0];
      badge.style.background=diff>=0?'var(--green-100)':'#fee2e2';
      badge.style.color=diff>=0?'var(--green-700)':'#991b1b';
    } else if(badge){ badge.textContent=data.length===1?'1 Woche':'Keine Daten'; }
    const canvas=document.getElementById('profilTrendChart');
    if(!canvas)return;
    // Destroy old instance if exists
    if(window._profilTrendChartInst){window._profilTrendChartInst.destroy();window._profilTrendChartInst=null;}
    if(!data.length){canvas.parentElement.innerHTML='<div class="empty-state" style="padding:2rem"><div class="empty-state-text">Noch keine Wochendaten</div></div>';return;}
    const avgVal=Math.round(data.reduce((s,v)=>s+v,0)/data.length);
    window._profilTrendChartInst=new Chart(canvas,{
      type:'line',
      data:{
        labels,
        datasets:[
          {
            label:'Punkte',
            data,
            borderColor:'#3aaa42',
            backgroundColor:'rgba(58,170,66,0.10)',
            pointBackgroundColor:data.map(v=>v===Math.max(...data)?'#c8a84b':v===0?'#e5e7eb':'#3aaa42'),
            pointBorderColor:data.map(v=>v===Math.max(...data)?'#c8a84b':v===0?'#d1d5db':'#3aaa42'),
            pointRadius:data.map(v=>v===Math.max(...data)?7:v===0?4:5),
            pointHoverRadius:8,
            borderWidth:2.5,
            tension:0.38,
            fill:true,
          },
          {
            label:'Ø',
            data:data.map(()=>avgVal),
            borderColor:'rgba(200,168,75,0.5)',
            borderDash:[4,4],
            borderWidth:1.5,
            pointRadius:0,
            fill:false,
          }
        ]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{
          legend:{display:false},
          tooltip:{
            backgroundColor:'rgba(255,255,255,0.95)',
            titleColor:'#0d2b0f',bodyColor:'#4a6b4d',
            borderColor:'rgba(45,140,52,0.2)',borderWidth:1,
            padding:10,
            callbacks:{
              title:ctx=>ctx[0].label,
              label:ctx=>ctx.datasetIndex===0?ctx.parsed.y+' Punkte':'Ø '+ctx.parsed.y+' Pkt.'
            }
          }
        },
        scales:{
          x:{grid:{display:false},ticks:{font:{size:11},color:'#7a9b7d'}},
          y:{
            beginAtZero:true,
            grid:{color:'rgba(45,140,52,0.08)'},
            ticks:{font:{size:11},color:'#7a9b7d',maxTicksLimit:5}
          }
        }
      }
    });
  })();
}

/* ── Restore settings + Excel-Daten aus localStorage ────── */
document.addEventListener('DOMContentLoaded',()=>{
  // Einstellungen
  const dm=_ls.getItem('gb_darkmode');
  const cp=_ls.getItem('gb_compact');
  const an=_ls.getItem('gb_anonym');
  const he=_ls.getItem('gb_hideEmail');
  if(dm==='1'){document.getElementById('settingDarkMode').checked=true;applyDarkMode(true);}
  if(cp==='1'){document.getElementById('settingCompact').checked=true;applyCompact(true);}
  const pf=_ls.getItem('gb_perf');
  if(pf==='1'){document.getElementById('settingPerformance').checked=true;applyPerformance(true);}
  const pr=_ls.getItem('gb_presentation');
  if(pr==='1'){document.getElementById('settingPresentation').checked=true;applyPresentation(true);}
  const fc=_ls.getItem('gb_focus');
  if(fc==='1'){document.getElementById('settingFocus').checked=true;applyFocus(true);}
  const it=_ls.getItem('gb_infotooltips');
  if(it==='0'){document.getElementById('settingInfoTooltips').checked=false;applyInfoTooltips(false);}
  if(an==='1'){document.getElementById('settingAnonym').checked=true;applyAnonym(true);}
if(he==='0'){const hec=document.getElementById('settingHideEmail');if(hec)hec.checked=false;applyHideEmail(false);}
  else{window._hideEmail=true;}

  // Gespeicherte Excel-Daten wiederherstellen
  const savedRows=_ls.getItem('gb_excelData');
  if(savedRows){
    try{
      const rows=JSON.parse(savedRows);
      if(rows&&rows.length){
        processData(rows);
        const savedDate=_ls.getItem('gb_excelDate')||'';
        const st=document.getElementById('fileStatus');
        if(st)st.innerHTML=`<div class="validation-box"><div class="validation-header ok">✅ Daten geladen (${savedDate}) · ${rows.length} Einträge · <a href="#" onclick="clearSavedData(event)" style="color:var(--green-700);margin-left:8px;">Löschen</a></div></div>`;
        const savedTeam=_ls.getItem('gb_selectedTeam');
        if(savedTeam){
          ['ownTeamSelect','ownTeamSelect2'].forEach(id=>{
            const s=document.getElementById(id);if(s)s.value=savedTeam;
          });
          renderLeaderboard(window._lastDepts||[]);
          renderTeamTab();
        }
      }
    }catch(e){_ls.removeItem('gb_excelData');}
  }

  // Admin-Session wiederherstellen (bleibt bis Tab geschlossen wird)
  if(sessionStorage.getItem('gb_admin')==='1') showAdminArea(true);
  // Enter-Taste im Passwort-Feld
  document.getElementById('adminPwInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')checkAdminPassword();});
});

function clearSavedData(e){
  if(e)e.preventDefault();
  if(!confirm('Gespeicherte Excel-Daten löschen? Das Dashboard zeigt danach den leeren Zustand.'))return;
  _ls.removeItem('gb_excelData');_ls.removeItem('gb_excelDate');_ls.removeItem('gb_selectedTeam');
  location.reload();
}

/* ── Gewähltes Team persistieren ─────────────────────────── */
function onTeamChange(sourceId){
  const s1=document.getElementById('ownTeamSelect');
  const s2=document.getElementById('ownTeamSelect2');
  const val=sourceId==='ownTeamSelect2'?(s2?s2.value:''):(s1?s1.value:'');
  if(s1)s1.value=val;
  if(s2)s2.value=val;
  if(val)_ls.setItem('gb_selectedTeam',val);
  else _ls.removeItem('gb_selectedTeam');
  renderLeaderboard(window._lastDepts||[]);
  renderTeamTab();
}

/* ── Team Profilbild ─────────────────────────────────────── */
function handleTeamImg(e){
  const file=e.target.files[0];
  if(!file)return;
  const own=document.getElementById('ownTeamSelect')?.value;
  if(!own){ alert('Bitte zuerst eine Abteilung auswählen.'); return; }
  const r=new FileReader();
  r.onload=ev=>{
    _teamAvatars[own]=ev.target.result;
    _ls.setItem('gb_teamimg_'+own,ev.target.result);
    applyTeamImg(ev.target.result);
    renderLeaderboard(window._lastDepts||[]);
    renderPodium(window._lastDepts||[]);
  };
  r.readAsDataURL(file);
}
function applyTeamImg(src){
  const el=document.getElementById('teamAvatarCircle');
  if(!el)return;
  if(src){el.innerHTML=`<img src="${src}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;}
  else{
    const own=document.getElementById('ownTeamSelect')?.value;
    const d=_allDepts.find(x=>x.name===own);
    el.innerHTML = d ? (d.name.split(' ').map(p=>p[0]||'').join('').slice(0,2).toUpperCase()||'🌿') : '🌿';
  }
}

/* ── Team Motto inline bearbeiten ────────────────────────── */
function startMottoEdit(){
  const cur=document.getElementById('spMotto').textContent;
  document.getElementById('mottoInput').value=cur.replace(/^„|"$/g,'');
  document.getElementById('spMotto').style.display='none';
  document.querySelector('[onclick="startMottoEdit()"]').style.display='none';
  document.getElementById('mottoEditWrap').style.display='flex';
  document.getElementById('mottoInput').focus();
}
function saveMottoEdit(){
  const own=document.getElementById('ownTeamSelect')?.value;
  if(!own){ cancelMottoEdit(); return; }
  const val=document.getElementById('mottoInput').value.trim()||'Gemeinsam für eine grünere BBBank';
  const text='„'+val+'"';
  document.getElementById('spMotto').textContent=text;
  _teamMottos[own]=text;
  _ls.setItem('gb_motto_'+own,text);
  cancelMottoEdit();
}
function cancelMottoEdit(){
  document.getElementById('mottoEditWrap').style.display='none';
  document.getElementById('spMotto').style.display='';
  const editBtn=document.querySelector('[onclick="startMottoEdit()"]');
  if(editBtn)editBtn.style.display='';
}

/* ============================================================
   VS MODUS
   ============================================================ */
let _vsModeActive = false;

function toggleVSMode(){
  _vsModeActive = !_vsModeActive;
  const btn = document.getElementById('vsToggleBtn');
  const row = document.getElementById('vsChallengerRow');
  const arena = document.getElementById('vsArenaWrap');
  const profilContent = document.getElementById('profilContent');
  if(_vsModeActive){
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> VS beenden';
    btn.classList.add('active');
    row.style.display='flex';
    // Populate challenger dropdown
    populateVSSelect();
    profilContent.style.display='none';
    renderVS();
  } else {
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3L4 7l4 4"/><path d="M4 7h16"/><path d="M16 21l4-4-4-4"/><path d="M20 17H4"/></svg> VS-Modus starten';
    btn.classList.remove('active');
    row.style.display='none';
    arena.style.display='none';
    arena.innerHTML='';
    // Restore normal profil
    const name = document.getElementById('profilPersonSelect')?.value;
    if(name && window._allRows?.length) profilContent.style.display='block';
  }
}

function populateVSSelect(){
  const mainSel = document.getElementById('profilPersonSelect');
  const vsSel = document.getElementById('vsPersonSelect');
  if(!vsSel||!window._allRows?.length) return;
  const mainName = mainSel?.value||'';
  const names = [...new Set(window._allRows.map(r=>r._name).filter(Boolean))].sort();
  const cur = vsSel.value;
  vsSel.innerHTML = '<option value="">– Person wählen –</option>' +
    names.filter(n=>n!==mainName).map(n=>`<option value="${n}" ${n===cur?'selected':''}>${n}</option>`).join('');
}

function getPersonStats(name){
  if(!name||!window._allRows) return null;
  const rows = window._allRows.filter(r=>r._name===name);
  if(!rows.length) return null;
  const dept = rows[0]?._dept||'–';
  const totalPts = rows.reduce((s,r)=>s+r._pts,0);
  const co2 = Math.round(totalPts*0.12);
  const commutePts = rows.reduce((s,r)=>s+(r._commutePts||0),0);
  const homePts = rows.reduce((s,r)=>s+(r._homePts||0),0);
  const printPts = rows.reduce((s,r)=>s+(r._printPts||0),0);
  const travelPts = rows.reduce((s,r)=>s+(r._travelPts||0),0);
  const socialPts = rows.reduce((s,r)=>s+(r._socialPts||0),0);
  const weeks = new Set(rows.map(r=>r._kw).filter(Boolean)).size;
  // Global rank
  const globalPts={};
  window._allRows.forEach(r=>{globalPts[r._name]=(globalPts[r._name]||0)+r._pts;});
  const globalSorted=Object.entries(globalPts).sort((a,b)=>b[1]-a[1]);
  const globalRank=(globalSorted.findIndex(([n])=>n===name)+1)||'–';
  // Team rank
  const teamPts={};
  window._allRows.filter(r=>r._dept===dept).forEach(r=>{teamPts[r._name]=(teamPts[r._name]||0)+r._pts;});
  const teamSorted=Object.entries(teamPts).sort((a,b)=>b[1]-a[1]);
  const teamRank=(teamSorted.findIndex(([n])=>n===name)+1)||'–';
  // Level
  const lvl=[...PROFIL_LEVELS].reverse().find(l=>totalPts>=l.minPts)||PROFIL_LEVELS[0];
  // Saved profile img
  const savedImg=window._profilImgs?.[name]||_ls.getItem('gb_profilimg_'+name)||null;
  return{name,dept,totalPts,co2,commutePts,homePts,printPts,travelPts,socialPts,weeks,globalRank,teamRank,lvl,savedImg,entries:rows.length};
}

function renderVS(){
  if(!_vsModeActive) return;
  const mainName = document.getElementById('profilPersonSelect')?.value;
  const vsName = document.getElementById('vsPersonSelect')?.value;
  const arena = document.getElementById('vsArenaWrap');
  if(!arena) return;

  if(!mainName || !vsName){
    arena.style.display='block';
    arena.innerHTML=`<div class="panel" style="margin-bottom:16px;"><div class="panel-body"><div class="empty-state" style="padding:2rem;">
      <div class="empty-state-icon">⚔️</div>
      <div class="empty-state-text">${!mainName?'Bitte zuerst oben eine Person wählen, dann den Herausforderer.':'Herausforderer wählen um den Vergleich zu starten.'}</div>
    </div></div></div>`;
    return;
  }

  const A = getPersonStats(mainName);
  const B = getPersonStats(vsName);
  if(!A||!B){ arena.innerHTML='<div class="empty-state"><div class="empty-state-text">Unzureichende Daten für Vergleich.</div></div>'; return; }

  // Determine winner
  const aWins = A.totalPts > B.totalPts;
  const bWins = B.totalPts > A.totalPts;
  const tie = A.totalPts === B.totalPts;

  // Avatar HTML helper
  const avatarHtml=(stats,colorClass)=>{
    const init=stats.name.split(' ').map(p=>p[0]||'').join('').slice(0,2).toUpperCase()||'?';
    const bg=colorClass==='left'?'var(--green-500)':'#6366f1';
    const imgContent=stats.savedImg
      ?`<img src="${stats.savedImg}" alt="">`
      :`<span>${init}</span>`;
    return`<div class="vs-avatar-wrap">
      <div style="position:relative;">
        <div class="vs-avatar-ring"></div>
        <div class="vs-avatar" style="background:${bg}">${imgContent}</div>
        <div class="vs-winner-crown">👑</div>
      </div>
    </div>`;
  };

  // Stat rows data
  const statRows=[
    {ico:'🏆',label:'Punkte',a:A.totalPts,b:B.totalPts,unit:''},
    {ico:'🌍',label:'CO₂ gespart',a:A.co2,b:B.co2,unit:'kg'},
    {ico:'📅',label:'Aktive Wochen',a:A.weeks,b:B.weeks,unit:''},
    {ico:'🚗',label:'Mobilität',a:A.commutePts,b:B.commutePts,unit:'Pkt.'},
    {ico:'🏠',label:'Homeoffice',a:A.homePts,b:B.homePts,unit:'Pkt.'},
    {ico:'🖨️',label:'Drucken',a:A.printPts,b:B.printPts,unit:'Pkt.'},
    {ico:'✈️',label:'Dienstreisen',a:A.travelPts,b:B.travelPts,unit:'Pkt.'},
    {ico:'📝',label:'Einträge',a:A.entries,b:B.entries,unit:''},
  ];

  // Count category wins
  let aScore=0,bScore=0,catTies=0;
  statRows.forEach(r=>{if(r.a>r.b)aScore++;else if(r.b>r.a)bScore++;else catTies++;});

  // Result banner
  let bannerCls, bannerText;
  if(tie){bannerCls='tie';bannerText=`🤝 Unentschieden – beide mit ${A.totalPts} Punkten`;}
  else if(aWins){bannerCls='left-wins';bannerText=`🏆 ${A.name} gewinnt! +${A.totalPts-B.totalPts} Punkte Vorsprung`;}
  else{bannerCls='right-wins';bannerText=`🏆 ${B.name} gewinnt! +${B.totalPts-A.totalPts} Punkte Vorsprung`;}

  // Funken-Elemente für den Farben-Kampf (6 Stück, rundum verteilt)
  const clashSparksHtml = Array.from({length:6}).map((_,i)=>
    `<div class="vs-clash-spark" style="--ang:${i*60}deg;animation-delay:${i*0.06}s"></div>`
  ).join('');

  arena.style.display='block';
  const maxPts=Math.max(A.totalPts,B.totalPts,1);
  const aPct=Math.round((A.totalPts/maxPts)*100);
  const bPct=Math.round((B.totalPts/maxPts)*100);

  const statRowsHtml=statRows.map((r,idx)=>{
    const maxV=Math.max(r.a,r.b,1);
    // Each bar fills up to 50% of the track width (meeting in the middle)
    // Winner bar pushes past center
    const total=r.a+r.b||1;
    const aPctTrack=Math.round((r.a/total)*100); // % of full track width
    const bPctTrack=100-aPctTrack;
    const aW=r.a>r.b, bW=r.b>r.a;
    const winCls=aW?'win-left':bW?'win-right':'win-tie';
    // clash point: where bars meet (percentage from left)
    const clashLeft=aPctTrack;
    return`<div class="vs-stat-row" data-idx="${idx}">
      <div class="vs-stat-header">
        <div style="text-align:right;">
          <div class="vs-stat-val left ${aW?'winner':''}">${r.a}${r.unit?` <span style="font-size:10px;font-weight:400;color:var(--text-muted)">${r.unit}</span>`:''}</div>
          ${aW?'<div class="vs-winner-chip green">Sieger ✓</div>':bW?'<div class="vs-winner-chip tie">–</div>':'<div class="vs-winner-chip tie">Gleich</div>'}
        </div>
        <div class="vs-stat-label">${r.ico} ${r.label}</div>
        <div>
          <div class="vs-stat-val right ${bW?'winner':''}">${r.b}${r.unit?` <span style="font-size:10px;font-weight:400;color:var(--text-muted)">${r.unit}</span>`:''}</div>
          ${bW?'<div class="vs-winner-chip blue">Sieger ✓</div>':aW?'<div class="vs-winner-chip tie">–</div>':'<div class="vs-winner-chip tie">Gleich</div>'}
        </div>
      </div>
      <div class="vs-battle-track ${winCls}"
           data-a="${aPctTrack}" data-b="${bPctTrack}" data-clash="${clashLeft}">
        <div class="vs-battle-left"></div>
        <div class="vs-battle-right"></div>
        <div class="vs-battle-clash" style="left:${clashLeft}%"></div>
      </div>
    </div>`;
  }).join('');

  arena.innerHTML=`
    <!-- Arena Hero -->
    <div class="vs-arena" style="margin-bottom:16px;">
      <div class="vs-arena-inner">
        <div class="vs-side left" data-winner="${aWins?'1':'0'}">
          ${avatarHtml(A,'left')}
          <div class="vs-side-name">${A.name}</div>
          <div class="vs-side-dept">${A.dept} · ${A.lvl.icon} ${A.lvl.label}</div>
          <div class="vs-side-pts">${A.totalPts}</div>
          <div class="vs-side-ptsub">Punkte</div>
          <div style="margin-top:6px;font-size:11px;color:rgba(255,255,255,0.6);">Global #${A.globalRank} · ${A.co2} kg CO₂</div>
        </div>
        <div class="vs-divider">
          <div class="vs-badge">VS</div>
          <div class="vs-clash-zone fighting">
            <div class="vs-clash-ring"></div>
            <div class="vs-clash-ring ring2"></div>
            <div class="vs-clash-glow"></div>
            <div class="vs-clash-orb left"></div>
            <div class="vs-clash-orb right"></div>
            ${clashSparksHtml}
          </div>
        </div>
        <div class="vs-side right" data-winner="${bWins?'1':'0'}">
          ${avatarHtml(B,'right')}
          <div class="vs-side-name">${B.name}</div>
          <div class="vs-side-dept">${B.dept} · ${B.lvl.icon} ${B.lvl.label}</div>
          <div class="vs-side-pts">${B.totalPts}</div>
          <div class="vs-side-ptsub">Punkte</div>
          <div style="margin-top:6px;font-size:11px;color:rgba(255,255,255,0.6);">Global #${B.globalRank} · ${B.co2} kg CO₂</div>
        </div>
      </div>
      <div class="vs-result-banner ${bannerCls}">
        <span class="vs-trophy">🏅</span>
        <span>${bannerText}</span>
      </div>
    </div>

    <!-- Score-Balken -->
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-header">
        <div class="panel-title">📊 Gesamtbewertung</div>
        <div class="panel-badge">${aScore}:${bScore}${catTies>0?' ('+catTies+' unentsch.)':''} Kategorien</div>
      </div>
      <div class="panel-body">
        <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin-bottom:12px;">
          <div>
            <div style="font-size:12px;font-weight:600;color:var(--green-700);margin-bottom:4px;">${A.name}</div>
            <div style="height:10px;background:var(--green-500);border-radius:5px 0 0 5px;width:${aPct}%;transition:width 0.9s ease;"></div>
          </div>
          <div style="font-size:11px;color:var(--text-muted);white-space:nowrap;">${A.totalPts} | ${B.totalPts}</div>
          <div>
            <div style="font-size:12px;font-weight:600;color:#4f46e5;margin-bottom:4px;text-align:right;">${B.name}</div>
            <div style="height:10px;background:#6366f1;border-radius:0 5px 5px 0;width:${bPct}%;transition:width 0.9s ease;margin-left:auto;"></div>
          </div>
        </div>
        <div style="text-align:center;font-size:12px;color:var(--text-muted);">
          ${aWins?`<b style="color:var(--green-700)">${A.name}</b> führt mit ${A.totalPts-B.totalPts} Punkten`:
            bWins?`<b style="color:#4f46e5">${B.name}</b> führt mit ${B.totalPts-A.totalPts} Punkten`:
            `Beide auf gleichem Niveau! 🤝`}
        </div>
      </div>
    </div>

    <!-- Kategorie-Duell -->
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-header">
        <div class="panel-title">⚡ Kategorie-Duell</div>
      </div>
      <div class="panel-body" style="padding:0.75rem 1rem;">
        <div class="vs-stats-grid">
          <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 4px;margin-bottom:4px;">
            <div style="font-size:11px;font-weight:700;color:var(--green-700);text-align:right;">${A.name}</div>
            <div style="width:60px;"></div>
            <div style="font-size:11px;font-weight:700;color:#4f46e5;">${B.name}</div>
          </div>
          ${statRowsHtml}
        </div>
      </div>
    </div>

    <!-- Zusammenfassung -->
    <div class="panel" style="margin-bottom:16px;">
      <div class="panel-header"><div class="panel-title">🎯 Fazit</div></div>
      <div class="panel-body">
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.7;">
          ${tie
            ?`<b>${A.name}</b> und <b>${B.name}</b> sind punktgleich bei ${A.totalPts} Punkten – ein echtes Duell auf Augenhöhe! 🤝`
            :aWins
              ?`<b style="color:var(--green-700)">${A.name}</b> gewinnt dieses Duell mit <b>${A.totalPts}</b> vs. <b>${B.totalPts}</b> Punkten – das sind <b>+${A.totalPts-B.totalPts} Punkte</b> Vorsprung und ${aScore} von ${statRows.length} Kategorien gewonnen.`
              :`<b style="color:#4f46e5">${B.name}</b> gewinnt dieses Duell mit <b>${B.totalPts}</b> vs. <b>${A.totalPts}</b> Punkten – das sind <b>+${B.totalPts-A.totalPts} Punkte</b> Vorsprung und ${bScore} von ${statRows.length} Kategorien gewonnen.`
          }
          ${!tie?`<br><br>Um aufzuholen, müsste <b>${aWins?B.name:A.name}</b> noch <b>${Math.abs(A.totalPts-B.totalPts)} Punkte</b> sammeln.`:''}
        </div>
      </div>
    </div>
  `;

  // ── Farben-Kampf: Spannung aufbauen, dann Sieger enthüllen ──
  const clashZone = arena.querySelector('.vs-clash-zone');
  const banner = arena.querySelector('.vs-result-banner');
  const sideEls = arena.querySelectorAll('.vs-side');
  const revealDelay = 1600; // ms Farben-Kampf-Dauer
  setTimeout(()=>{
    if(clashZone){
      clashZone.classList.remove('fighting');
      clashZone.classList.add(tie?'settled-tie':aWins?'settled-left':'settled-right');
    }
    sideEls.forEach(el=>{
      if(el.dataset.winner==='1') el.classList.add('winner-side');
    });
    if(banner) banner.classList.add('revealed');
  }, revealDelay);

  // ── Battle Bar Animation ──────────────────────────────────
  // Stagger each row: start at 0 width, then trigger fight class
  requestAnimationFrame(()=>{
    const tracks = arena.querySelectorAll('.vs-battle-track');
    tracks.forEach((track, i) => {
      const aW = parseFloat(track.dataset.a)||0;
      const bW = parseFloat(track.dataset.b)||0;
      const leftBar = track.querySelector('.vs-battle-left');
      const rightBar = track.querySelector('.vs-battle-right');
      // reset
      if(leftBar) leftBar.style.width='0%';
      if(rightBar) rightBar.style.width='0%';
      // staggered fight trigger (nach dem Farben-Kampf)
      setTimeout(()=>{
        track.classList.add('fight');
        if(leftBar) leftBar.style.width=aW+'%';
        if(rightBar) rightBar.style.width=bW+'%';
      }, revealDelay + 80 + i * 120);
    });
  });
}

/* ── ESG Info Popover toggle (für Touch/Click) ────────── */
function toggleEsgInfo(e){
  e.stopPropagation();
  const pop=document.getElementById('esgInfoPopover');
  if(!pop)return;
  pop.classList.toggle('open');
  if(pop.classList.contains('open')){
    const close=ev=>{if(!document.getElementById('esgInfoWrap')?.contains(ev.target)){pop.classList.remove('open');document.removeEventListener('click',close);}};
    setTimeout(()=>document.addEventListener('click',close),10);
  }
}

/* ── Tooltip-Positionierung ──────────────────────────────── */
(function(){
  let activeTooltip = null;

  function showTooltipFor(trigger, tooltipEl){
    if(!tooltipEl) return;
    tooltipEl.style.visibility = 'hidden';
    tooltipEl.style.display    = 'block';
    try{
      const r  = trigger.getBoundingClientRect();
      const tw = tooltipEl.offsetWidth  || 230;
      const th = tooltipEl.offsetHeight || 80;
      const margin = 8;
      let top  = r.top - th - margin;
      if(top < margin) top = r.bottom + margin;
      let left = r.right - tw;
      if(left < margin) left = margin;
      if(left + tw > window.innerWidth - margin) left = window.innerWidth - tw - margin;
      tooltipEl.style.top  = top  + 'px';
      tooltipEl.style.left = left + 'px';
    }catch(err){}
    tooltipEl.style.visibility = 'visible';
    activeTooltip = tooltipEl;
  }

  function hideTooltip(tooltipEl){
    if(!tooltipEl) return;
    tooltipEl.style.display    = 'none';
    tooltipEl.style.visibility = 'hidden';
    if(activeTooltip === tooltipEl) activeTooltip = null;
  }

  document.addEventListener('mouseover', function(e){
    try{
      const wrap = e.target.closest('.info-btn-wrap');
      if(wrap){
        const btn = wrap.querySelector('.info-btn');
        const tip = wrap.querySelector('.info-btn-tooltip');
        if(btn && tip) showTooltipFor(btn, tip);
      }
      const bc = e.target.closest('.bc-card');
      if(bc){
        const tip = bc.querySelector('.bc-tooltip');
        if(tip) showTooltipFor(bc, tip);
      }
    }catch(err){}
  }, {passive:true});

  document.addEventListener('mouseout', function(e){
    try{
      const wrap = e.target.closest('.info-btn-wrap');
      if(wrap && !wrap.contains(e.relatedTarget)){
        hideTooltip(wrap.querySelector('.info-btn-tooltip'));
      }
      const bc = e.target.closest('.bc-card');
      if(bc && !bc.contains(e.relatedTarget)){
        hideTooltip(bc.querySelector('.bc-tooltip'));
      }
    }catch(err){}
  }, {passive:true});

  window.addEventListener('scroll', function(){
    if(!activeTooltip) return;
    try{
      const wrap = activeTooltip.closest('.info-btn-wrap');
      if(wrap){ const btn=wrap.querySelector('.info-btn'); if(btn) showTooltipFor(btn,activeTooltip); }
      const bc = activeTooltip.closest('.bc-card');
      if(bc) showTooltipFor(bc, activeTooltip);
    }catch(err){}
  }, {passive:true});
})();

/* ── Wettbewerbs-Countdown ────────────────────────────────── */
(function(){
  // ⚙️ HIER ANPASSEN: Start- und Enddatum des Wettbewerbs
  // Testphase: KW 26-27 (ab 23.06.2026)
  // Wettbewerb: KW 28-37 (07.07.2026 – 12.09.2026)
  const CONTEST_START = new Date('2026-07-20T00:00:00');
  const CONTEST_END   = new Date('2026-09-14T23:59:59');

  function updateCountdown(){
    const now  = new Date();
    const banner = document.getElementById('contestBanner');
    const title  = document.getElementById('contestTitle');
    const sub    = document.getElementById('contestSub');
    const cdEl   = document.getElementById('contestCountdown');
    const wEl    = document.getElementById('cdWeeks');
    const dEl    = document.getElementById('cdDays');
    const hEl    = document.getElementById('cdHours');
    if(!banner) return;

    if(now < CONTEST_START){
      // Vor dem Wettbewerb → Countdown bis Start
      const diff = CONTEST_START - now;
      const weeks = Math.floor(diff / (7*24*3600*1000));
      const days  = Math.floor((diff % (7*24*3600*1000)) / (24*3600*1000));
      const hours = Math.floor((diff % (24*3600*1000)) / 3600000);
      if(title) title.textContent = 'nextGen fürs Klima 2026';
      if(sub)   sub.textContent   = '⏳ Testphase läuft (22.06.–13.07.) · Wettbewerb ab 20.07.';
      if(wEl) wEl.textContent = String(weeks).padStart(2,'0');
      if(dEl) dEl.textContent = String(days).padStart(2,'0');
      if(hEl) hEl.textContent = String(hours).padStart(2,'0');
    } else if(now <= CONTEST_END){
      // Wettbewerb läuft → Countdown bis Ende
      const diff = CONTEST_END - now;
      const weeks = Math.floor(diff / (7*24*3600*1000));
      const days  = Math.floor((diff % (7*24*3600*1000)) / (24*3600*1000));
      const hours = Math.floor((diff % (24*3600*1000)) / 3600000);
      // Aktuelle KW im Wettbewerb
      const elapsed = now - CONTEST_START;
      const currentWeek = Math.min(10, Math.floor(elapsed / (7*24*3600*1000)) + 1);
      if(title) title.textContent = 'nextGen fürs Klima 2026';
      if(sub)   sub.textContent   = `🟢 Wettbewerb läuft · Woche ${currentWeek} von 10`;
      if(wEl) wEl.textContent = String(weeks).padStart(2,'0');
      if(dEl) dEl.textContent = String(days).padStart(2,'0');
      if(hEl) hEl.textContent = String(hours).padStart(2,'0');
    } else {
      // Wettbewerb beendet
      if(title) title.textContent = 'nextGen fürs Klima 2026';
      if(sub)   sub.textContent   = '🏁 Wettbewerb beendet · Vielen Dank an alle Teilnehmenden!';
      if(cdEl)  cdEl.innerHTML    = '<div style="font-size:24px;color:#fff;">🏆</div>';
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    updateCountdown();
    setInterval(updateCountdown, 60000); // jede Minute aktualisieren
  });
})();

