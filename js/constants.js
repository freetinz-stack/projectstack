// === constants.js ===
const MF=['January','February','March','April','May','June','July','August','September','October','November','December'];
const MS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const SK='finflow_v5';
const CAT_MAP={
  // Banking
  'bank charges':'cat-bank','bank fee':'cat-bank','service charge':'cat-bank',
  'od protection':'cat-bank','od interest':'cat-bank','overdraft':'cat-bank',
  'interest charge':'cat-bank','annual fee':'cat-bank',
  // Telecom
  'verizon':'cat-telecom','at&t':'cat-telecom','t-mobile':'cat-telecom',
  'vodafone':'cat-telecom','telstra':'cat-telecom','sky broadband':'cat-telecom',
  'virgin media':'cat-telecom','bt internet':'cat-telecom',
  'phone plan':'cat-telecom','mobile plan':'cat-telecom','cell phone':'cat-telecom',
  'internet bill':'cat-telecom','broadband':'cat-telecom','hosting':'cat-telecom',
  // Subscriptions
  'netflix':'cat-subs','spotify':'cat-subs','apple music':'cat-subs',
  'disney+':'cat-subs','hulu':'cat-subs','amazon prime':'cat-subs',
  'youtube premium':'cat-subs','subscription':'cat-subs','membership':'cat-subs',
  'adobe':'cat-subs','dropbox':'cat-subs','icloud':'cat-subs','google one':'cat-subs',
  // Auto
  'car insurance':'cat-auto','auto insurance':'cat-auto',
  'car payment':'cat-auto','vehicle':'cat-auto','gas station':'cat-auto',
  'petrol':'cat-auto','fuel':'cat-auto','parking':'cat-auto','toll':'cat-auto',
  // Utilities
  'electricity':'cat-utility','electric bill':'cat-utility','water bill':'cat-utility',
  'gas bill':'cat-utility','natural gas':'cat-utility',
  'council tax':'cat-utility','rates':'cat-utility','waste':'cat-utility',
  // Housing
  'rent':'cat-housing','mortgage':'cat-housing','property tax':'cat-housing',
  'home insurance':'cat-housing','renters insurance':'cat-housing',
  'hoa':'cat-housing','maintenance':'cat-housing','repair':'cat-housing',
  'lawn':'cat-housing','pest control':'cat-housing',
  // Food / Meals
  'grocery':'cat-food','groceries':'cat-food','supermarket':'cat-food',
  'restaurant':'cat-food','dining':'cat-food','takeout':'cat-food','takeaway':'cat-food',
  'doordash':'cat-food','ubereats':'cat-food','grubhub':'cat-food',
  'coffee':'cat-food','lunch':'cat-food','dinner':'cat-food','breakfast':'cat-food',
  // Entertainment
  'entertainment':'cat-entertain','movie':'cat-entertain','cinema':'cat-entertain',
  'concert':'cat-entertain','event':'cat-entertain','ticket':'cat-entertain',
  'gaming':'cat-entertain','steam':'cat-entertain','playstation':'cat-entertain',
  'xbox':'cat-entertain','bowling':'cat-entertain','bar':'cat-entertain',
  // Fees
  'late fee':'cat-fees','overdraft fee':'cat-fees','penalty':'cat-fees',
  'processing fee':'cat-fees','transaction fee':'cat-fees','atm fee':'cat-fees',
  'wire fee':'cat-fees','foreign transaction':'cat-fees',
  // Health
  'health insurance':'cat-health','dental':'cat-health','pharmacy':'cat-health',
  'doctor':'cat-health','medical':'cat-health','hospital':'cat-health',
  'gym':'cat-health','fitness':'cat-health','vision':'cat-health',
  // Loans / credit
  'student loan':'cat-loan','personal loan':'cat-loan','credit card payment':'cat-loan',
  'loan payment':'cat-loan','car loan':'cat-loan','minimum payment':'cat-loan',
  // Tuition / Education
  'tuition':'cat-tuition','school fee':'cat-tuition','college':'cat-tuition',
  'university':'cat-tuition','course':'cat-tuition','education':'cat-tuition',
  'books':'cat-tuition','textbook':'cat-tuition','class':'cat-tuition',
  // Savings
  'savings':'cat-savings','emergency fund':'cat-savings','vacation fund':'cat-savings',
  'retirement':'cat-savings','investment':'cat-savings'
};
const CAT_LABELS={'cat-bank':'Banking','cat-telecom':'Telecom','cat-subs':'Subscriptions','cat-auto':'Auto','cat-utility':'Utilities','cat-housing':'Housing','cat-food':'Food/Meals','cat-entertain':'Entertainment','cat-fees':'Fees','cat-health':'Health','cat-loan':'Loan Pmt','cat-tuition':'Tuition','cat-savings':'Savings','cat-other':'Other'};
const CAT_COLORS={'Banking':'#2B6CB0','Telecom':'#6B46C1','Subscriptions':'#9D174D','Auto':'#B7791F','Utilities':'#276749','Housing':'#744210','Food/Meals':'#276749','Entertainment':'#553C9A','Fees':'#718096','Health':'#9D174D','Loan Pmt':'#718096','Tuition':'#2B6CB0','Savings':'#2B6CB0','Other':'#A0AEC0'};
const BDFT={'Banking':100,'Telecom':300,'Subscriptions':150,'Auto':600,'Utilities':250,'Housing':1500,'Food/Meals':400,'Entertainment':200,'Fees':50,'Health':200,'Loan Pmt':2500,'Tuition':800,'Savings':500,'Other':300};

// Safe tagged template — auto-escapes all interpolated values against XSS.
// Usage: el.innerHTML = safeHTML`<b>${userName}</b> owes <b>${fmt(amount)}</b>`;
function safeHTML(strings){
  var values=Array.prototype.slice.call(arguments,1);
  var result=strings[0];
  values.forEach(function(val,i){result+=esc(String(val==null?'':val))+strings[i+1];});
  return result;
}

function getCat(n){
  const l=n.toLowerCase();
  // Check user-defined custom categories first
  if(S&&S.customCategories){
    for(const cc of S.customCategories){
      if(cc.keywords.some(kw=>l.includes(kw.toLowerCase())))return 'cat-custom-'+cc.id;
    }
  }
  // Check saved keyword overrides for built-in categories
  if(S&&S.categoryKeywords){
    const catCls={'Banking':'cat-bank','Telecom':'cat-telecom','Subscriptions':'cat-subs',
      'Auto':'cat-auto','Utilities':'cat-utility','Housing':'cat-housing','Food/Meals':'cat-food',
      'Entertainment':'cat-entertain','Fees':'cat-fees','Health':'cat-health',
      'Loan Pmt':'cat-loan','Tuition':'cat-tuition','Savings':'cat-savings','Other':'cat-other'};
    for(const[cat,kws]of Object.entries(S.categoryKeywords)){
      if(Array.isArray(kws)&&kws.some(kw=>l.includes(kw.toLowerCase()))&&catCls[cat])return catCls[cat];
    }
  }
  for(const[k,v]of Object.entries(CAT_MAP)){if(l.includes(k))return v;}
  return 'cat-other';
}

// ══════════════════════════════════════════════
// SEED DATA
// ══════════════════════════════════════════════
const DW=[
  {items:[{name:'Demo Rent',amount:1350,paid:true,dueDay:1},{name:'Demo Utilities',amount:87,paid:false,dueDay:5}]},
  {items:[{name:'Demo Phone Plan',amount:55,paid:true,dueDay:12},{name:'Demo Internet',amount:79,paid:false,dueDay:15}]},
  {items:[{name:'Demo Groceries',amount:310,paid:true,dueDay:20},{name:'Demo Car Insurance',amount:148,paid:false,dueDay:22}]},
  {items:[{name:'Demo Streaming',amount:18,paid:true,dueDay:27},{name:'Demo Gym',amount:45,paid:false,dueDay:28}]}
];
// Demo income — updated amounts from live
const DR=[{name:'Demo Primary Income',amount:6200,received:true},{name:'Demo Side Income',amount:1750,received:false}];
// Generate demo payment history relative to today — last 4 months paid, current month pending
function _makeDemoPayments(){
  var now=new Date();
  return Array.from({length:5},function(_,i){
    var d=new Date(now.getFullYear(),now.getMonth()-(4-i),1);
    return{month:MS[d.getMonth()]+' '+d.getFullYear(),paid:i<4};
  });
}
const DL=[
  {name:'Demo Credit Card',amount:400,originalAmount:600,rate:19.99,minPayment:20,payments:_makeDemoPayments()},
  {name:'Demo Personal Loan',amount:850,originalAmount:1000,rate:8.5,minPayment:20,payments:_makeDemoPayments()}
];
const DSV=[{name:'Demo Emergency Fund',target:8000,balance:3200,contribution:250,rate:2.5},{name:'Demo Vacation Fund',target:2500,balance:640,contribution:100,rate:1.5}];


const CAT_ALL=[
  {cls:'cat-bank',    lbl:'Banking',       icon:'🏦'},
  {cls:'cat-telecom', lbl:'Telecom',       icon:'📱'},
  {cls:'cat-subs',    lbl:'Subscriptions', icon:'🔄'},
  {cls:'cat-auto',    lbl:'Auto',          icon:'🚗'},
  {cls:'cat-utility', lbl:'Utilities',     icon:'💡'},
  {cls:'cat-housing', lbl:'Housing',       icon:'🏠'},
  {cls:'cat-food',    lbl:'Food/Meals',    icon:'🍽'},
  {cls:'cat-entertain',lbl:'Entertainment',icon:'🎬'},
  {cls:'cat-fees',    lbl:'Fees',          icon:'⚡'},
  {cls:'cat-health',  lbl:'Health',        icon:'🏥'},
  {cls:'cat-loan',    lbl:'Loan Pmt',      icon:'💳'},
  {cls:'cat-tuition', lbl:'Tuition',       icon:'🎓'},
  {cls:'cat-savings', lbl:'Savings',       icon:'🏦'},
  {cls:'cat-other',   lbl:'Other',         icon:'📦'},
];

// ══════════════════════════════════════════════
// WEEK AUTO-DETECTION
// Returns 0-based week index (0=Week1) for a due day within a month.
// Aligns weeks with the calendar — the week a day physically falls in.
// e.g. if May 1 is a Thursday, days 1-3 are Week 1, days 4-10 are Week 2, etc.
// ══════════════════════════════════════════════
function getWeekForDay(day,monthKey){
  if(!day||day<1||day>31)return 0;
  var key=monthKey||(typeof CMK!=='undefined'?CMK:'');
  if(!key)return 0;
  var parts=key.split(' ');
  var mo=MS.indexOf(parts[0]);
  var yr=parseInt(parts[1]);
  if(mo<0||isNaN(yr))return 0;
  var firstDayOfMonth=new Date(yr,mo,1).getDay(); // 0=Sun … 6=Sat
  var daysInMonth=new Date(yr,mo+1,0).getDate();
  // Allow up to index 4 (week 5) for months whose calendar spans 5 weeks.
  return Math.min(4,Math.floor((day-1+firstDayOfMonth)/7));
}

// Frequency labels used across the app
const FREQ_LABELS={
  monthly:  'Monthly',
  weekly:   'Weekly',
  biweekly: 'Bi-weekly',
  quarterly:'Quarterly',
  yearly:   'Yearly'
};
