// SkillStamp — Rate Limiting

// ═══════════════════════════════════════════════════════
//  RATE LIMITING (client-side)
// ═══════════════════════════════════════════════════════
var _rateStore={};
function checkRateLimit(action,maxCount,windowMs){
  var now=Date.now();
  if(!_rateStore[action]) _rateStore[action]={count:0,windowStart:now};
  var rec=_rateStore[action];
  if(now-rec.windowStart>windowMs){rec.count=0;rec.windowStart=now;}
  if(rec.count>=maxCount){toast('You\'re doing that too quickly. Please wait a moment.','bad');return false;}
  rec.count++;
  return true;
}

