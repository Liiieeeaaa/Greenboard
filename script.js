// KW

const now = new Date();
const jan1 = new Date(now.getFullYear(),0,1);

const kw = Math.ceil(
  ((now - jan1) / 86400000 + jan1.getDay() + 1) / 7
);

document.getElementById('kwBadge').textContent = 'KW ' + kw;

// TABS

function showTab(id, btn){

  document.querySelectorAll('.tab-content')
    .forEach(t => t.classList.remove('active'));

  document.querySelectorAll('.nav-tab')
    .forEach(t => t.classList.remove('active'));

  document.getElementById('tab-' + id)
    .classList.add('active');

  btn.classList.add('active');
}

// SCORING

const SCORE = {

  commute:{
    'fahrrad':15,
    'zu fuß':15,
    'zu fuss':15,
    'öpvn':10,
    'öpnv':10,
    'fahrgemeinschaft':5,
    'auto allein':0
  },

  travel:{
    'keine':15,
    'bahn':10,
    'öpvn':10,
    'öpnv':10,
    'fahrgemeinschaft':5,
    'auto allein':2,
    'flugzeug':0
  },

  print:{
    '0 seiten':15,
    '1-10':8,
    '11-30':3,
    '30+':0
  },

  homeofficePts:[0,8,16,24,30,35],

  socialDay:30
};

const CO2_PER_PT = 0.12;

function matchScore(map,val){

  const v = (val || '').toLowerCase().trim();

  for(const [k,p] of Object.entries(map)){
    if(v.includes(k)) return p;
  }

  return null;
}

console.log("GreenBoard geladen");
