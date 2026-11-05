"use strict";
(function(){
  const $ = id => document.getElementById(id);
  const LS = "hatchery-state-v1";
  let state = {total:200, done:[], names:[], hatched:0, inv:{cookie:0,berry:0,bubbles:0,toy:0}, pets:{}, friends:{}};
  let doneSet = new Set();
  let view = "carton";
  let soundOn = true;
  try{ soundOn = localStorage.getItem("hatchery-sound") !== "off"; }catch(e){}

  try{ const s = JSON.parse(localStorage.getItem(LS)||"null"); if(s) applyState(s); }catch(e){}

  function applyState(s){
    state = {
      total: Math.max(1, Math.min(1000, +s.total || 200)),
      done: Array.isArray(s.done) ? s.done.filter(n=>Number.isInteger(n)) : [],
      names: Array.isArray(s.names) ? s.names.map(x=>typeof x==="string"?x.slice(0,200):"") : [],
      hatched: Math.max(0, +s.hatched || 0),
      pets: (s.pets && typeof s.pets === "object") ? s.pets : {},
      friends: (s.friends && typeof s.friends === "object") ? s.friends : {}
    };
    doneSet = new Set(state.done.filter(n=>n>=0 && n<state.total));
    state.inv = sanitizeInv(s.inv) || invFromDone(doneSet);
  }

  /* ---------- random + critters ---------- */
  function rng(seed){ let a = seed>>>0; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
  const SYL = ["pip","mo","zu","bo","fli","ka","nu","wib","lo","ti","gro","pa","miz","dee","ro","sku","bin","yo","fen","cha"];
  const TITLES = ["the Brave","the Snacky","the Unbothered","of the Inbox","the Tiny Boss","the Wobbly","the Overachiever","the Gremlin","the Calm","the Sparkly","the Supervisor","the Bean","the Legend","the Hype Crew","the Zoomer","the Cozy","the Loud","the Wise","the Speedy","the Final Boss"];
  const QUIPS = [
    "It has seen your to-do list and it is impressed.",
    "It eats procrastination for breakfast. You are safe now.",
    "Ten tasks gone. It wants to see ten more.",
    "It will now sit on your shoulder and say \"nice\" quietly.",
    "Born from pure productivity. Handle with snacks.",
    "It does a little dance every time you check a box.",
    "Its first word was \"done.\"",
    "It thinks you should drink some water. Then keep going.",
    "Rumor says it can smell an unfinished task from a mile away.",
    "It is small, but it believes in you a lot."
  ];
  function critterInfo(k){
    const r = rng(k*7919+31);
    const name = SYL[Math.floor(r()*SYL.length)] + SYL[Math.floor(r()*SYL.length)];
    return { name: name[0].toUpperCase()+name.slice(1)+" "+TITLES[(k-1)%TITLES.length], quip: QUIPS[Math.floor(r()*QUIPS.length)] };
  }
  function critterSVG(k){
    const r = rng(k*104729+7);
    const hue = Math.floor((k*137.5 + r()*40)%360);
    const body = `hsl(${hue} 70% 62%)`, dark = `hsl(${hue} 55% 38%)`, belly = `hsl(${hue} 80% 82%)`;
    const cx=50, cy=60, pts=[];
    for(let i=0;i<9;i++){ const a=i/9*Math.PI*2; const rad=27+r()*7; pts.push([cx+Math.cos(a)*rad*1.05, cy+Math.sin(a)*rad*0.92]); }
    let d=""; for(let i=0;i<pts.length;i++){ const p=pts[i], q=pts[(i+1)%pts.length]; const m=[(p[0]+q[0])/2,(p[1]+q[1])/2]; d += (i===0?`M${((pts[pts.length-1][0]+p[0])/2).toFixed(1)} ${((pts[pts.length-1][1]+p[1])/2).toFixed(1)}`:"") + ` Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`; }
    d+="Z";
    const acc = Math.floor(r()*6);
    let top="";
    if(acc===1) top=`<line x1="50" y1="34" x2="${44+r()*12}" y2="16" stroke="${dark}" stroke-width="3" stroke-linecap="round"/><circle cx="${48+r()*4}" cy="15" r="5" fill="#F7C948" stroke="#2A2A2A" stroke-width="2"/>`;
    if(acc===2) top=`<path d="M34 38 L30 20 L42 34Z M66 38 L70 20 L58 34Z" fill="#F4EDE0" stroke="#2A2A2A" stroke-width="2" stroke-linejoin="round"/>`;
    if(acc===3) top=`<path d="M50 34 C50 26 50 22 50 20" stroke="#3D8B4F" stroke-width="3" fill="none"/><path d="M50 22 C40 12 30 18 34 24 C40 28 48 26 50 22Z" fill="#5DBB63" stroke="#2A2A2A" stroke-width="2"/><path d="M50 22 C60 10 70 16 66 22 C60 27 52 26 50 22Z" fill="#5DBB63" stroke="#2A2A2A" stroke-width="2"/>`;
    if(acc===4) top=`<path d="M40 36 L52 8 L62 36Z" fill="#E2586B" stroke="#2A2A2A" stroke-width="2" stroke-linejoin="round"/><circle cx="52" cy="8" r="4" fill="#F7C948" stroke="#2A2A2A" stroke-width="2"/><path d="M45 26 L58 26" stroke="#FFF" stroke-width="3"/>`;
    if(acc===5) top=`<path d="M50 36 L36 28 L36 42Z M50 36 L64 28 L64 42Z" fill="#E2586B" stroke="#2A2A2A" stroke-width="2" stroke-linejoin="round" transform="translate(${r()>.5?-14:14} 0)"/>`;
    const eyes = 1+Math.floor(r()*3);
    let eyeSvg="";
    const xs = eyes===1?[50]:eyes===2?[40,60]:[36,50,64];
    xs.forEach((x,i)=>{ const y = eyes===3&&i===1?50:54; const er = eyes===1?10:7; eyeSvg+=`<circle cx="${x}" cy="${y}" r="${er}" fill="#FFF" stroke="#2A2A2A" stroke-width="2"/><circle cx="${x+1.5}" cy="${y+1}" r="${er*.48}" fill="#2A2A2A"/><circle cx="${x+3}" cy="${y-1.5}" r="${er*.16}" fill="#FFF"/>`; });
    const mouthType = Math.floor(r()*3);
    const mouth = mouthType===0?`<path d="M42 70 Q50 78 58 70" stroke="#2A2A2A" stroke-width="2.5" fill="none" stroke-linecap="round"/>`
      : mouthType===1?`<ellipse cx="50" cy="72" rx="4" ry="5" fill="#7A2633" stroke="#2A2A2A" stroke-width="2"/>`
      : `<path d="M42 69 Q50 79 58 69 Z" fill="#7A2633" stroke="#2A2A2A" stroke-width="2" stroke-linejoin="round"/><path d="M47 69 L48 73 L50 69" fill="#FFF"/>`;
    return `<svg viewBox="0 0 100 100" aria-hidden="true">
      <ellipse cx="38" cy="90" rx="9" ry="5" fill="${dark}" stroke="#2A2A2A" stroke-width="2"/>
      <ellipse cx="62" cy="90" rx="9" ry="5" fill="${dark}" stroke="#2A2A2A" stroke-width="2"/>
      ${top}
      <path d="${d}" fill="${body}" stroke="#2A2A2A" stroke-width="2.5"/>
      <ellipse cx="50" cy="74" rx="15" ry="11" fill="${belly}"/>
      <circle cx="31" cy="66" r="4" fill="#FF8FA3" opacity=".7"/><circle cx="69" cy="66" r="4" fill="#FF8FA3" opacity=".7"/>
      ${eyeSvg}${mouth}
    </svg>`;
  }

  /* ---------- rendering ---------- */
  const CRACK = '<svg viewBox="0 0 40 50" aria-hidden="true"><path d="M3 22 L10 17 L15 24 L21 16 L27 23 L32 17 L37 22" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/></svg>';
  function label(i){ const n = state.names[i]; return n && n.trim() ? n.trim() : "Task "+(i+1); }

  function renderCarton(){
    const c = $("carton"); c.textContent = "";
    for(let r=0; r<Math.ceil(state.total/10); r++){
      const row = document.createElement("div"); row.className="row";
      const lab = document.createElement("div"); lab.className="row-label";
      lab.textContent = (r*10+1)+"–"+Math.min(state.total,r*10+10); row.appendChild(lab);
      for(let j=0;j<10;j++){
        const i = r*10+j; const cup = document.createElement("div"); cup.className="cup";
        if(i<state.total){
          const b = document.createElement("button"); b.className="egg"+(doneSet.has(i)?" done":""); b.dataset.i=i;
          b.setAttribute("aria-pressed", doneSet.has(i)); b.title = label(i);
          b.setAttribute("aria-label", label(i)+(doneSet.has(i)?", done":""));
          b.innerHTML = CRACK + '<span class="n">'+(i+1)+'</span>';
          cup.appendChild(b);
        }
        row.appendChild(cup);
      }
      c.appendChild(row);
    }
  }
  function renderList(){
    const l = $("list"); l.textContent="";
    for(let i=0;i<state.total;i++){
      const li = document.createElement("div"); li.className="li"+(doneSet.has(i)?" done":"");
      li.innerHTML = '<span class="num">'+(i+1)+'</span>';
      const cb = document.createElement("input"); cb.type="checkbox"; cb.id="cb"+i; cb.checked=doneSet.has(i); cb.dataset.i=i; cb.setAttribute("aria-label","Done: "+label(i));
      const t = document.createElement("input"); t.type="text"; t.id="nm"+i; t.dataset.i=i; t.value = state.names[i]||""; t.placeholder="Task "+(i+1); t.maxLength=200;
      li.append(cb,t); l.appendChild(li);
    }
  }
  /* ---------- hatching schedule ----------
     Under 30 tasks: one buddy per 5 tasks. From 50 tasks up: one per 10.
     In between the count holds at 5, so adding a task never lowers it.
     Never fewer than 2. Buddies are spread evenly over the whole list, so the
     last one always hatches on the final task.
       tasks:   1-14  15-19  20-24  25-59  60-69 ... 254
       buddies:  2     3      4      5      6   ...  25          */
  function buddyCount(){ const t=state.total; return Math.max(2, Math.min(5, Math.floor(t/5)), Math.floor(t/10)); }
  function threshold(k){ return Math.max(1, Math.round(k*state.total/buddyCount())); }
  function earned(n){ const N=buddyCount(); let e=0; while(e<N && threshold(e+1)<=n) e++; return e; }
  let hatchQueue=[];
  function checkHatch(){
    const e=earned(doneSet.size);
    if(e<=state.hatched) return;
    for(let k=state.hatched+1;k<=e;k++) hatchQueue.push(k);
    state.hatched=e;
    if($("overlay").hidden) setTimeout(nextHatch,350);
  }
  function nextHatch(){ if(hatchQueue.length) celebrate(hatchQueue.shift()); }
  function ruleText(){
    const N=buddyCount(), t=state.total;
    const every=(t/N).toFixed(1).replace(/\.0$/,"");
    if(N===2 && t<10){ const a=threshold(1), b=threshold(2); return "2 critters will hatch from these "+t+(t===1?" task":" tasks")+(a===b?", both on task "+a+".":", on tasks "+a+" and "+b+"."); }
    return N+" critters will hatch from these "+t+" tasks, about one every "+every+" tasks.";
  }

  function renderStats(){
    const n = doneSet.size, tot = state.total;
    $("count").textContent = n;
    $("countSub").textContent = "of "+tot+" done · "+(tot-n)+" to go";
    $("bar").style.width = (n/tot*100).toFixed(1)+"%";
    $("barWrap").setAttribute("aria-valuemax", tot); $("barWrap").setAttribute("aria-valuenow", n);
    const N = buddyCount(), nextK = earned(n)+1;
    const prev = nextK>1 ? threshold(nextK-1) : 0, goal = nextK<=N ? threshold(nextK) : tot;
    const gap = Math.max(1, goal-prev), into = Math.min(gap, n-prev), left = goal-n;
    const p = $("pips"); p.textContent="";
    for(let k=0;k<gap;k++){ const e=document.createElement("span"); e.className="pip"+(k<into?" on":""); p.appendChild(e); }
    $("next").innerHTML = n>=tot ? "Every egg is cracked. <em>You did it.</em>"
      : left===1 ? "<em>1 more egg</em> until something hatches…"
      : "<em>"+left+" more eggs</em> to the next hatch";
    $("rule").textContent = ruleText();
    renderShelf();
  }
  function renderShelf(){
    const s = $("shelf"); s.textContent="";
    const slots = Math.max(buddyCount(), state.hatched);
    for(let k=1;k<=slots;k++){
      const d = document.createElement(k<=state.hatched?"button":"div");
      d.className = "slot"+(k<=state.hatched?" got":"");
      if(k<=state.hatched){ d.innerHTML = critterSVG(k); d.title = critterInfo(k).name; d.setAttribute("aria-label","Meet "+critterInfo(k).name); d.onclick=()=>celebrate(k,true); }
      else d.innerHTML = '<span class="q">#'+k+'</span>';
      s.appendChild(d);
    }
    updateInv();
    $("nurseryHint").textContent = state.hatched ? state.hatched+" of "+slots+" critters hatched. Tap one to meet it again." : "Your first critter hatches at "+threshold(1)+(threshold(1)===1?" task.":" tasks.");
  }
  function renderAll(){ if(view==="carton") renderCarton(); else if(view==="list") renderList(); else syncRoom(); renderStats(); $("total").value = state.total; }

  /* ---------- actions ---------- */
  function toggle(i, el){
    const adding = !doneSet.has(i);
    adding ? doneSet.add(i) : doneSet.delete(i);
    const got = loot(i); adjustInv(got, adding?1:-1); if(adding && el) lootPop(el, got);
    const n = doneSet.size;
    if(el){
      if(el.classList.contains("egg")){ el.classList.toggle("done",adding); el.setAttribute("aria-pressed",adding); el.setAttribute("aria-label",label(i)+(adding?", done":"")); el.classList.remove("pop"); void el.offsetWidth; if(adding) el.classList.add("pop"); }
      else el.closest(".li").classList.toggle("done",adding);
    }
    renderStats();
    if(adding){ blip(n%10); checkHatch(); renderStats(); }
    save();
  }

  $("carton").addEventListener("click", e=>{ const b=e.target.closest(".egg"); if(b) toggle(+b.dataset.i, b); });
  $("list").addEventListener("change", e=>{
    const t=e.target, i=+t.dataset.i;
    if(t.type==="checkbox"){ if(t.checked!==doneSet.has(i)) toggle(i,t); }
    else if(t.type==="text"){ state.names[i]=t.value; t.previousSibling.setAttribute("aria-label","Done: "+label(i)); save(); }
  });
  function setView(v){
    view=v; $("vCarton").setAttribute("aria-pressed",v==="carton"); $("vList").setAttribute("aria-pressed",v==="list"); $("vNursery").setAttribute("aria-pressed",v==="nursery");
    $("mainArea").hidden = v==="nursery"; $("play").hidden = v!=="nursery";
    if(v==="nursery") startRoom(); else stopRoom();
    if(v==="nursery"){ renderAll(); return; }
    $("carton").hidden = v!=="carton"; $("list").hidden = v!=="list";
    $("boardTitle").textContent = v==="carton"?"The carton":"Task list";
    $("boardHint").textContent = v==="carton"?"Tap an egg to crack it. Tap again to undo. Switch to List to give tasks names.":"Type a name next to any task. Tick the box when it's done.";
    renderAll();
  }
  $("vCarton").onclick=()=>setView("carton");
  $("vList").onclick=()=>setView("list");
  $("vNursery").onclick=()=>setView("nursery");
  $("openNursery").onclick=()=>{ setView("nursery"); $("play").scrollIntoView({behavior:"smooth",block:"start"}); };
  $("backToCarton").onclick=()=>setView("carton");
  function soundLabel(){ $("sound").textContent = soundOn?"Sound on":"Sound off"; $("sound").setAttribute("aria-pressed",soundOn); }
  $("sound").onclick=()=>{ soundOn=!soundOn; try{localStorage.setItem("hatchery-sound",soundOn?"on":"off");}catch(e){} soundLabel(); };
  soundLabel();

  $("total").addEventListener("change", ()=>{
    const v = Math.max(1, Math.min(1000, Math.round(+$("total").value||200)));
    $("total").value = v;
    if(v===state.total) return;
    state.total = v; doneSet = new Set([...doneSet].filter(i=>i<v));
    checkHatch(); renderAll(); save();
  });
  $("applyPaste").onclick=()=>{
    const lines = $("paste").value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    if(!lines.length) return;
    const t=Math.min(1000,lines.length);
    state.names=lines.slice(0,t).map(s=>s.slice(0,200));
    state.total=t; doneSet=new Set([...doneSet].filter(i=>i<t));
    $("paste").value=""; checkHatch(); renderAll(); save();
    flash("Your list now has "+t+(t===1?" task. ":" tasks. ")+buddyCount()+" critters will hatch from it.");
  };
  let resetArmed=false, resetTimer;
  $("reset").onclick=()=>{
    if(!resetArmed){ resetArmed=true; $("reset").textContent="Tap again to clear all progress"; clearTimeout(resetTimer); resetTimer=setTimeout(()=>{resetArmed=false;$("reset").textContent="Start over";},4000); return; }
    resetArmed=false; $("reset").textContent="Start over";
    doneSet=new Set(); state.hatched=0; hatchQueue=[]; state.inv=emptyInv(); renderAll(); save(); flash("Carton cleared. Names kept.");
  };
  function flash(t){ const m=$("resetMsg"); m.textContent=t; m.hidden=false; setTimeout(()=>m.hidden=true,3000); }

  /* ---------- surprise ---------- */
  function celebrate(k, replay){
    const info = critterInfo(k), tot = buddyCount(), at = threshold(k);
    $("cKicker").textContent = replay ? "Critter #"+k : "Hatch #"+k+" of "+tot+" · "+at+(at===1?" task done":" tasks done");
    $("cTitle").textContent = "Something is hatching…"; $("cText").textContent="";
    const stage=$("stage"); stage.innerHTML='<div class="big-egg"></div>';
    $("overlay").hidden=false; $("cClose").focus();
    const reveal=()=>{
      stage.querySelector(".big-egg")?.classList.add("crack");
      setTimeout(()=>{
        stage.innerHTML='<div class="critter-in">'+critterSVG(k)+'</div>';
        $("cTitle").textContent = "Meet "+info.name+"!";
        $("cText").textContent = (k>=tot && !replay) ? "That was the last egg. The whole nursery is here to cheer for you." : info.quip;
        if(!replay){ fanfare(); confetti(k>=tot?3:1); }
      }, replay?0:250);
    };
    replay ? reveal() : setTimeout(reveal, 900);
  }
  function closeCard(){ $("overlay").hidden=true; if(hatchQueue.length) setTimeout(nextHatch,300); }
  $("cClose").onclick=closeCard;
  $("cVisit").onclick=()=>{ $("overlay").hidden=true; hatchQueue=[]; setView("nursery"); $("play").scrollIntoView({behavior:"smooth",block:"start"}); };
  $("overlay").addEventListener("click",e=>{ if(e.target.id==="overlay") closeCard(); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape" && !$("overlay").hidden) closeCard(); });

  function confetti(mult){
    if(matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cv=$("confetti"); cv.hidden=false; const dpr=window.devicePixelRatio||1;
    cv.width=innerWidth*dpr; cv.height=innerHeight*dpr; const ctx=cv.getContext("2d"); ctx.scale(dpr,dpr);
    const cols=["#F2B132","#D9475C","#5DBB63","#4FA3E0","#B57BE0","#FFFFFF"];
    const P=[]; for(let i=0;i<140*mult;i++) P.push({x:innerWidth/2,y:innerHeight/2,vx:(Math.random()-.5)*16,vy:-Math.random()*16-4,s:4+Math.random()*6,r:Math.random()*6,vr:(Math.random()-.5)*.4,c:cols[i%cols.length],egg:Math.random()<.2});
    let t=0; (function f(){ ctx.clearRect(0,0,innerWidth,innerHeight); t++;
      P.forEach(p=>{ p.vy+=.4; p.vx*=.99; p.x+=p.vx; p.y+=p.vy; p.r+=p.vr; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.fillStyle=p.c;
        if(p.egg){ ctx.beginPath(); ctx.ellipse(0,0,p.s*.8,p.s,0,0,Math.PI*2); ctx.fill(); } else ctx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2); ctx.restore(); });
      if(t<200) requestAnimationFrame(f); else { ctx.clearRect(0,0,innerWidth,innerHeight); cv.hidden=true; } })();
  }

  /* ---------- sound ---------- */
  let ac=null;
  function tone(freq, start, dur, type, vol){
    if(!soundOn) return; try{ ac = ac || new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; }
    const o=ac.createOscillator(), g=ac.createGain(); o.type=type||"triangle"; o.frequency.value=freq;
    const t0=ac.currentTime+start; g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(vol||.15,t0+.01); g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0+dur+.05);
  }
  function blip(step){ tone(440*Math.pow(2,(step||10)/12),0,.12,"sine",.12); }
  function fanfare(){ [523,659,784,1047,784,1047].forEach((f,i)=>tone(f,i*.11,.25,"triangle",.14)); }

  /* ---------- nursery playroom ---------- */
  const FOOD_RATE = 100/(8*3600e3), FUN_RATE = 100/(4*3600e3); // full to empty: food in 8h, fun in 4h
  function petData(k){
    let p = state.pets[k];
    if(!p || typeof p!=="object"){ const now=Date.now(); p = state.pets[k] = {food:80,foodAt:now,fun:80,funAt:now,love:0}; }
    return p;
  }
  function level(p,key){ const at=+p[key+"At"]||Date.now(); return Math.max(0,Math.min(100,(+p[key]||0)-(Date.now()-at)*(key==="food"?FOOD_RATE:FUN_RATE))); }
  function bump(k,key,d){ const p=petData(k); p[key]=Math.min(100,level(p,key)+d); p[key+"At"]=Date.now(); }
  function bond(love){ const n=Math.min(5,Math.floor((+love||0)/8)); return "♥".repeat(n)+"♡".repeat(5-n); }

  /* ---------- pocket items (dropped by cracked eggs) ---------- */
  const COOKIE = '<svg viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="#D9A05B" stroke="#2A2A2A" stroke-width="2"/><circle cx="11" cy="11" r="2" fill="#5A3416"/><circle cx="18" cy="13" r="2" fill="#5A3416"/><circle cx="13" cy="19" r="2" fill="#5A3416"/><circle cx="20" cy="20" r="1.6" fill="#5A3416"/></svg>';
  const BERRY = '<svg viewBox="0 0 30 30"><path d="M15 6 C17 2 22 2 23 4 C20 5 18 6 15 8Z" fill="#5DBB63" stroke="#2A2A2A" stroke-width="1.5"/><circle cx="15" cy="18" r="9" fill="#B03A6B" stroke="#2A2A2A" stroke-width="2"/><circle cx="12" cy="15" r="2.2" fill="#FFF" opacity=".7"/></svg>';
  const BUBBLE = '<svg viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="#BFE6FF" fill-opacity=".45" stroke="#6FB7E8" stroke-width="2"/><path d="M9 11 Q11 7 15 7" stroke="#FFF" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>';
  const WAND = '<svg viewBox="0 0 30 30"><line x1="15" y1="16" x2="15" y2="29" stroke="#2A2A2A" stroke-width="3" stroke-linecap="round"/><circle cx="15" cy="9" r="7" fill="#BFE6FF" stroke="#2A2A2A" stroke-width="2.5"/></svg>';
  const STAR = '<svg viewBox="0 0 30 30"><path d="M15 2 L18.5 10.5 L27.5 11 L20.5 17 L23 26 L15 21 L7 26 L9.5 17 L2.5 11 L11.5 10.5Z" fill="#F7C948" stroke="#2A2A2A" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="14" r="1.5" fill="#2A2A2A"/><circle cx="18" cy="14" r="1.5" fill="#2A2A2A"/></svg>';
  const BALL = '<svg viewBox="0 0 30 30"><circle cx="15" cy="15" r="12" fill="#4FA3E0" stroke="#2A2A2A" stroke-width="2"/><path d="M4 13 Q15 20 26 13" stroke="#FFF" stroke-width="3" fill="none"/><circle cx="15" cy="7" r="2.5" fill="#F7C948"/></svg>';
  const ITEMS = {
    cookie:{label:"Cookies",svg:COOKIE,hint:"Tap the floor to drop a cookie. Fills a critter up."},
    berry:{label:"Berries",svg:BERRY,hint:"Tap the floor to scatter a handful of berries. A small snack, and a little fun."},
    bubbles:{label:"Bubbles",svg:WAND,hint:"Tap the room to blow bubbles. Critters that see them try to pop them."},
    toy:{label:"Squeaky stars",svg:STAR,hint:"Tap the floor to drop a squeaky star. Critters take turns squeaking it."}
  };
  function emptyInv(){ return {cookie:0,berry:0,bubbles:0,toy:0}; }
  function loot(i){
    const r=rng(i*7727+13), n=1+(r()<.45?1:0)+(r()<.15?1:0), out={};
    for(let j=0;j<n;j++){ const x=r(); const k=x<.42?"cookie":x<.7?"berry":x<.86?"bubbles":"toy"; out[k]=(out[k]||0)+1; }
    return out;
  }
  function invFromDone(set){ const inv=emptyInv(); set.forEach(i=>{ const l=loot(i); for(const k in l) inv[k]+=l[k]; }); return inv; }
  function sanitizeInv(v){ if(!v||typeof v!=="object") return null; const inv=emptyInv(); for(const k in inv) inv[k]=Math.max(0,Math.floor(+v[k]||0)); return inv; }
  function adjustInv(l,sign){ for(const k in l) state.inv[k]=Math.max(0,(state.inv[k]||0)+sign*l[k]); }
  function updateInv(){
    const inv=state.inv;
    $("invChip").textContent="In your pocket: "+inv.cookie+" cookies · "+inv.berry+" berries · "+inv.bubbles+" bubbles · "+inv.toy+" squeaky stars";
    document.querySelectorAll(".tool[data-tool]").forEach(b=>{ const k=b.dataset.tool; if(ITEMS[k]){ b.querySelector("b").textContent=inv[k]; b.classList.toggle("empty",!inv[k]); } });
  }
  function lootPop(el,l){
    const r=el.getBoundingClientRect(), list=[];
    for(const k in l) for(let c=0;c<l[k];c++) list.push(k);
    list.forEach((k,n)=>{
      const s=document.createElement("span"); s.className="loot"; s.innerHTML=ITEMS[k].svg;
      s.style.left=(r.left+r.width/2-12)+"px"; s.style.top=(r.top)+"px";
      s.style.setProperty("--dx",((n-(list.length-1)/2)*30)+"px"); s.style.animationDelay=(n*0.08)+"s";
      document.body.appendChild(s); setTimeout(()=>s.remove(),1300);
    });
  }

  /* ---------- personalities ---------- */
  const MOVES = [
    {id:"hopper",label:"Hopper",desc:"bounces around in big hops",speed:95,freq:7,amp:16,burst:true,pause:[0.6,2],dist:[60,160]},
    {id:"zoomer",label:"Zoomer",desc:"dashes from wall to wall",speed:190,freq:18,amp:3,pause:[0.4,1.6],dist:[180,420]},
    {id:"drifter",label:"Drifter",desc:"floats along in slow wiggles",speed:32,freq:3,amp:2,pause:[0,0.6],dist:[80,220]},
    {id:"homebody",label:"Homebody",desc:"sticks close to its favorite spot",speed:50,freq:10,amp:4,pause:[2,5],dist:[0,0]},
    {id:"pacer",label:"Pacer",desc:"paces back and forth",speed:70,freq:10,amp:4,pause:[0.3,0.8],dist:[0,0]},
    {id:"circler",label:"Circler",desc:"walks in loops",speed:60,freq:9,amp:4,pause:[0,0],dist:[0,0]}
  ];
  const FOCI = [
    {id:"foodie",label:"Foodie",desc:"can spot a snack from across the room",food:1.8,ball:0.6,span:9},
    {id:"player",label:"Ball-crazy",desc:"will chase any toy forever",food:0.8,ball:1.9,span:14},
    {id:"dreamy",label:"Dreamy",desc:"dozes off and misses things",food:0.75,ball:0.6,span:3.5},
    {id:"curious",label:"Curious",desc:"notices things behind its back",food:1.1,ball:1.1,span:6},
    {id:"shy",label:"Shy",desc:"gets spooked by speeding balls and rowdy friends",food:1,ball:0.45,span:4}
  ];
  function personality(k){
    const r=rng(k*31337+5), move=MOVES[(k-1)%MOVES.length], focus=FOCI[(k*2)%FOCI.length];
    const react=(0.15+r()*0.6)*(move.id==="zoomer"?0.5:1)*(focus.id==="dreamy"?1.8:1);
    return {move,focus,react,sight:150+r()*90,chaseSpeed:Math.max(110,move.speed*1.25)+r()*40,
      hx:0.1+r()*0.8,hy:0.2+r()*0.6,orbit:50+r()*50,paceW:70+r()*110};
  }
  function traitText(k){ const P=personality(k); return P.move.label+" · "+P.focus.label; }
  function traitSentence(k){ const P=personality(k); return critterInfo(k).name+" "+P.move.desc+" and "+P.focus.desc+"."; }
  const rand=(a)=>a[0]+Math.random()*(a[1]-a[0]);
  const isPlayful=P=>P.move.id==="zoomer"||P.move.id==="hopper"||P.focus.id==="player";
  const isCozy=P=>P.move.id==="homebody"||P.move.id==="drifter"||P.focus.id==="dreamy";
  function pairKey(a,b){ return a<b ? a+"-"+b : b+"-"+a; }
  function bestFriend(k){
    let best=0, n=0;
    for(const key in state.friends){ const [a,b]=key.split("-").map(Number); if(a!==k&&b!==k) continue; const o=a===k?b:a; if(o<=state.hatched && state.friends[key]>n){ n=state.friends[key]; best=o; } }
    return best ? {k:best,n} : null;
  }

  const room = $("room"), sight = $("sight");
  let pets = [], items = [], ball = null, tool = "pet", night = false, raf = 0, last = 0, selected = 0, rosterTimer = 0, clock = 0;
  const cards = {};

  function dims(){ const W=room.clientWidth, H=room.clientHeight, ps=W<520?58:88; return {W,H,ps,top:H*0.42-ps*0.6,bot:H-ps-8}; }
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,u)=>a+(b-a)*u;
  function place(el,x,y,z,extra){ el.style.transform="translate("+x.toFixed(1)+"px,"+y.toFixed(1)+"px)"+(extra||""); el.style.zIndex=Math.round(z); }
  function say(p,t,s){ p.bub.textContent=t; p.bub.classList.add("show"); p.bubT=s; }
  function fx(x,y,t){ const e=document.createElement("span"); e.className="fx"; e.textContent=t; e.style.left=x+"px"; e.style.top=y+"px"; room.appendChild(e); setTimeout(()=>e.remove(),1150); }
  function msg(t){ $("playMsg").textContent=t; }
  const nm=k=>critterInfo(k).name;

  function wander(p,P,D,sc,dt){
    const m=P.move.id, hx=P.hx*(D.W-D.ps), hy=lerp(D.top,D.bot,P.hy);
    if(m==="circler"){ p.ang+=dt*P.move.speed/P.orbit; p.tx=hx+Math.cos(p.ang)*P.orbit*sc*1.4; p.ty=hy+Math.sin(p.ang)*P.orbit*sc*0.5; return; }
    if(Math.hypot(p.tx-p.x,p.ty-p.y)>=4) return;
    p.wait-=dt; if(p.wait>0) return;
    p.wait=rand(P.move.pause);
    if(m==="pacer"){ p.side=!p.side; p.tx=hx+(p.side?1:-1)*P.paceW*sc; p.ty=hy; return; }
    if(m==="homebody"){ p.tx=hx+(Math.random()-.5)*140*sc; p.ty=hy+(Math.random()-.5)*60*sc; return; }
    const a=Math.random()*Math.PI*2, d=rand(P.move.dist)*sc; p.tx=p.x+Math.cos(a)*d; p.ty=p.y+Math.sin(a)*d*0.5;
  }

  /* ---------- critters playing with each other ---------- */
  const SOCIAL_DUR={greet:1.8,dance:3.4,snuggle:4.2,tag:5.5,spook:1.6};
  const SOCIAL_FUN={greet:2,dance:5,snuggle:4,tag:6,spook:0};
  function free(p){ return !p.chase && !p.social && p.nap<=0 && p.socCool<=0; }
  function startSocial(a,b){
    const A=a.per, B=b.per;
    let type;
    if(A.focus.id==="shy" && isPlayful(B)) type="spook";
    else if(B.focus.id==="shy" && isPlayful(A)){ type="spook"; [a,b]=[b,a]; }
    else {
      const w={greet:2, tag:1+2*(isPlayful(A)+isPlayful(B)), snuggle:1+2*(isCozy(A)+isCozy(B)), dance:1+2*((A.move.id==="hopper")+(B.move.id==="hopper"))};
      let tot=0; for(const k in w) tot+=w[k]; let x=Math.random()*tot;
      for(const k in w){ x-=w[k]; if(x<=0){ type=k; break; } }
      type=type||"greet";
    }
    const s={type,a,b,start:clock,dur:SOCIAL_DUR[type],it:a,lastTag:clock,lastFx:clock};
    a.social=b.social=s; a.chase=b.chase=null;
    if(type==="greet"){ say(a,"Hi!",1.2); setTimeout(()=>say(b,"hey!",1.2),400); }
    if(type==="dance"){ say(a,"♪",1.4); say(b,"♪♪",1.4); }
    if(type==="snuggle"){ say(a,"♥",1.4); }
    if(type==="tag"){ say(a,"tag!",1.2); say(b,"!",0.8); }
    if(type==="spook"){ say(a,"eep!",1.2); say(b,"?",1.2); }
  }
  function endSocial(s,completed){
    [s.a,s.b].forEach(p=>{ p.social=null; p.socCool=6+Math.random()*8; p.tx=p.x; p.ty=p.y; p.wait=0.5; });
    if(!completed || s.type==="spook") return;
    const key=pairKey(s.a.k,s.b.k); state.friends[key]=(+state.friends[key]||0)+1;
    bump(s.a.k,"fun",SOCIAL_FUN[s.type]); bump(s.b.k,"fun",SOCIAL_FUN[s.type]);
    const n=state.friends[key];
    const what={greet:"said hi to",dance:"had a dance with",snuggle:"snuggled up with",tag:"played tag with"}[s.type];
    msg(n%5===0 ? nm(s.a.k)+" and "+nm(s.b.k)+" are becoming best friends." : nm(s.a.k)+" "+what+" "+nm(s.b.k)+".");
    updateRoster(); saveSoon();
  }
  // Returns how this critter should move this frame while it is busy with a friend.
  function socialStep(p,s,D,sc){
    const q=s.a===p?s.b:s.a, P=p.per, half=D.ps/2;
    const face=()=>{ p.dir=(q.x-p.x)<0?-1:1; };
    if(s.type==="greet"){ face(); return {stay:true,hop:Math.abs(Math.sin(clock*9))*4}; }
    if(s.type==="dance"){ face(); if(p===s.a && clock-s.lastFx>0.9){ s.lastFx=clock; fx(p.x+D.ps,p.y,"♪"); } return {stay:true,hop:12*Math.abs(Math.sin(clock*7)),spin:true}; }
    if(s.type==="snuggle"){
      const side=p.x<q.x?-1:1;
      p.tx=q.x+side*D.ps*0.62; p.ty=q.y;
      const close=Math.hypot(p.tx-p.x,p.ty-p.y)<10;
      if(close){ face(); if(p===s.a && clock-s.lastFx>1){ s.lastFx=clock; fx((p.x+q.x)/2+half-6,Math.min(p.y,q.y),"♥"); } return {stay:true,hop:0}; }
      return {speed:60};
    }
    if(s.type==="tag"){
      if(p===s.it){
        p.tx=q.x; p.ty=q.y;
        if(Math.hypot(q.x-p.x,q.y-p.y)<D.ps*0.55 && clock-s.lastTag>0.9){ s.it=q; s.lastTag=clock; say(q,"tag!",1); say(p,"hehe",1); tone(700,0,.08,"square",.05); }
        return {speed:clock-s.lastTag<0.6?20:P.chaseSpeed*0.8};
      }
      const it=s.it; p.tx=p.x-(it.x-p.x)*2; p.ty=p.y-(it.y-p.y)*2;
      return {speed:P.move.speed*0.6+70};
    }
    if(s.type==="spook"){
      if(p===s.a){ p.tx=p.x-(q.x-p.x)*3; p.ty=p.y-(q.y-p.y)*3; return {speed:P.chaseSpeed*1.1}; }
      face(); return {stay:true,hop:0};
    }
    return {stay:true,hop:0};
  }

  /* ---------- room setup ---------- */
  function syncRoom(){
    const D=dims(); room.style.setProperty("--ps",D.ps+"px");
    pets = pets.filter(p=>{ if(p.k>state.hatched){ if(p.social) endSocial(p.social,false); p.el.remove(); return false; } return true; });
    for(let k=1;k<=state.hatched;k++){
      if(pets.some(p=>p.k===k)) continue;
      petData(k);
      const el=document.createElement("div"); el.className="pet"; el.dataset.k=k;
      el.setAttribute("role","button"); el.tabIndex=0; el.setAttribute("aria-label",nm(k));
      el.innerHTML='<div class="bod">'+critterSVG(k)+'</div><span class="bubble"></span>';
      room.appendChild(el);
      const x=Math.random()*(D.W-D.ps), y=lerp(D.top,D.bot,Math.random());
      pets.push({k,el,per:personality(k),bod:el.querySelector(".bod"),bub:el.querySelector(".bubble"),x,y,tx:x,ty:y,
        wait:Math.random()*3,dir:Math.random()<.5?-1:1,t:Math.random()*9,cool:0,bubT:0,give:0,nap:0,chase:null,
        ang:Math.random()*6.28,side:false,social:null,socCool:2+Math.random()*4,socCheck:Math.random()});
    }
    $("roomEmpty").hidden = state.hatched>0;
    $("roomEmptyN").textContent = threshold(1)+(threshold(1)===1?" egg":" eggs");
    renderRoster(); updateInv();
  }

  function renderRoster(){
    const r=$("roster");
    for(const k in cards){ if(+k>state.hatched){ cards[k].el.remove(); delete cards[k]; } }
    for(let k=1;k<=state.hatched;k++){
      if(cards[k]) continue;
      const b=document.createElement("button"); b.className="pcard"; b.dataset.k=k;
      b.innerHTML=critterSVG(k)+'<div><div class="nm"></div>'+
        '<div class="stat"><span>Food <b></b></span><div class="bar"><i></i></div></div>'+
        '<div class="stat"><span>Fun <b></b></span><div class="bar"><i></i></div></div>'+
        '<div class="love" aria-label="Bond"></div><div class="trait"></div><div class="trait bff"></div></div>';
      b.querySelector(".nm").textContent=nm(k);
      b.querySelector(".trait").textContent=traitText(k); b.title=traitSentence(k);
      b.onclick=()=>select(k,true);
      r.appendChild(b);
      const bars=b.querySelectorAll(".bar i"), vals=b.querySelectorAll(".stat b");
      cards[k]={el:b,food:bars[0],fun:bars[1],fv:vals[0],uv:vals[1],love:b.querySelector(".love"),bff:b.querySelector(".bff")};
    }
    updateRoster();
  }
  function updateRoster(){
    for(const k in cards){
      const p=petData(+k), c=cards[k], f=level(p,"food"), u=level(p,"fun");
      c.food.style.width=f+"%"; c.food.classList.toggle("low",f<30); c.fv.textContent=Math.round(f);
      c.fun.style.width=u+"%"; c.fun.classList.toggle("low",u<30); c.uv.textContent=Math.round(u);
      c.love.textContent=bond(p.love); c.love.title="Bond level "+Math.min(5,Math.floor((+p.love||0)/8))+" of 5";
      const bf=bestFriend(+k); c.bff.textContent = bf ? "Best friend: "+nm(bf.k) : "No best friend yet";
      c.el.classList.toggle("sel",selected===+k);
    }
  }
  function select(k,greet){
    selected=k;
    pets.forEach(p=>p.el.classList.toggle("sel",p.k===k));
    updateRoster();
    const p=pets.find(q=>q.k===k);
    if(greet && p){ say(p, night||p.nap>0?"Zz":"Hi!",1.2); }
    msg(traitSentence(k)+" The dashed ring shows how far it can see.");
  }
  function petIt(p){
    const d=petData(p.k); d.love=(+d.love||0)+1; bump(p.k,"fun",6);
    const D=dims(); fx(p.x+D.ps/2-6,p.y,"♥");
    say(p, night?"Zz":"♥",1.2);
    tone(880,0,.08,"sine",.1); tone(1175,.08,.1,"sine",.1);
    msg(nm(p.k)+(night?" smiles in their sleep.":" loves that."));
    updateRoster(); saveSoon();
  }

  /* ---------- items in the room ---------- */
  function addItem(kind,x,y,extra){
    const D=dims();
    if(items.length>=30){ const old=items.shift(); old.el.remove(); }
    const el=document.createElement("div"); el.className="item "+kind;
    el.innerHTML = kind==="cookie"?COOKIE : kind==="berry"?BERRY : kind==="bubble"?BUBBLE : STAR;
    room.appendChild(el);
    const it=Object.assign({kind,el,x:clamp(x-15,0,D.W-30),y:-30,vy:0,ty:clamp(y-15,D.top+D.ps*0.5,D.H-38),landed:false,life:30,uses:6,bounce:0},extra||{});
    items.push(it); return it;
  }
  function useItem(kind,x,y){
    const D=dims();
    if(kind==="cookie"){ addItem("cookie",x,y); msg("Cookie dropped. Hungry critters nearby will notice."); }
    if(kind==="berry"){ for(let i=0;i<3;i++) addItem("berry",x+(Math.random()-.5)*70,y+(Math.random()-.5)*30); msg("A handful of berries scattered on the floor."); }
    if(kind==="toy"){ addItem("toy",x,y,{life:35,uses:6}); msg("A squeaky star! Critters that see it will take turns squeaking it."); }
    if(kind==="bubbles"){
      for(let i=0;i<6;i++){
        const bx=clamp(x+(Math.random()-.5)*120,10,D.W-40), by=clamp(y+(Math.random()-.5)*60,D.top+D.ps*0.3,D.H-40);
        addItem("bubble",bx,by,{x:bx-15,y:by-15,landed:true,vx:(Math.random()-.5)*30,vy:(Math.random()-.5)*16,life:10+Math.random()*6,ph:Math.random()*6});
      }
      msg("Bubbles! Watch who tries to pop them.");
    }
    tone(660,0,.06,"sine",.08);
  }
  function toss(x,y){
    const D=dims();
    if(!ball){ const el=document.createElement("div"); el.className="item"; el.innerHTML=BALL; room.appendChild(el); ball={el}; }
    Object.assign(ball,{sx:D.W/2-15,sy:D.H-40,ex:clamp(x-15,0,D.W-30),ey:clamp(y-15,D.top+D.ps*0.5,D.H-34),fly:0,rest:0,vx:0,vy:0,spin:0,x:D.W/2-15,y:D.H-40});
    tone(300,0,.2,"sine",.08); tone(600,.05,.15,"sine",.06);
    msg("Ball's in the air! Only critters that can see where it lands will chase it.");
  }
  function removeItem(it){ const i=items.indexOf(it); if(i>=0) items.splice(i,1); it.el.remove(); }
  const isFood=k=>k==="cookie"||k==="berry";

  function step(now){
    const dt=Math.min(.05,(now-last)/1000); last=now; clock+=dt;
    const D=dims(), sc=Math.max(0.6,Math.min(1.3,D.W/900)), half=D.ps/2;
    items.slice().forEach(it=>{
      if(it.kind==="bubble"){
        it.life-=dt; it.ph+=dt;
        it.x+=(it.vx+Math.sin(it.ph*2)*12)*dt; it.y+=(it.vy+Math.cos(it.ph*1.5)*8)*dt;
        if(it.x<0||it.x>D.W-30) it.vx*=-1; if(it.y<D.top+D.ps*0.2||it.y>D.H-40) it.vy*=-1;
        it.x=clamp(it.x,0,D.W-30); it.y=clamp(it.y,D.top+D.ps*0.2,D.H-40);
        if(it.life<=0){ fx(it.x+6,it.y,"·"); removeItem(it); return; }
        place(it.el,it.x,it.y,it.y+30+200);
        return;
      }
      if(!it.landed){ it.vy+=1400*dt; it.y+=it.vy*dt; if(it.y>=it.ty){ it.y=it.ty; it.landed=true; tone(180,0,.08,"triangle",.08); } }
      if(it.kind==="toy" && it.landed){ it.life-=dt; it.bounce=Math.max(0,it.bounce-dt*3); if(it.life<=0||it.uses<=0){ fx(it.x+6,it.y,"✦"); removeItem(it); return; } }
      place(it.el,it.x,it.y-(it.bounce?Math.sin(it.bounce*Math.PI)*16:0),it.y+30);
    });
    if(ball && ball.sx!==undefined){
      if(ball.fly<1){
        ball.fly=Math.min(1,ball.fly+dt/0.7); const u=ball.fly;
        ball.x=lerp(ball.sx,ball.ex,u); ball.y=lerp(ball.sy,ball.ey,u)-Math.sin(u*Math.PI)*D.H*0.35;
        if(u>=1){ ball.vx=(ball.ex-ball.sx)*0.4; ball.vy=(ball.ey-ball.sy)*0.15; tone(220,0,.12,"sine",.1); }
      } else {
        ball.x+=ball.vx*dt; ball.y+=ball.vy*dt; const fr=Math.pow(0.3,dt); ball.vx*=fr; ball.vy*=fr;
        if(ball.x<0){ball.x=0;ball.vx=Math.abs(ball.vx);} if(ball.x>D.W-30){ball.x=D.W-30;ball.vx=-Math.abs(ball.vx);}
        const yt=D.top+D.ps*0.5, yb=D.H-34;
        if(ball.y<yt){ball.y=yt;ball.vy=Math.abs(ball.vy);} if(ball.y>yb){ball.y=yb;ball.vy=-Math.abs(ball.vy);}
        ball.rest = Math.hypot(ball.vx,ball.vy)<10 ? ball.rest+dt : 0;
      }
      ball.spin+=(ball.vx||0)*dt*0.08;
      place(ball.el,ball.x,ball.y,ball.y+30+(ball.fly<1?2000:0)," rotate("+ball.spin.toFixed(2)+"rad)");
    }
    const ballDown = !!(ball && ball.fly>=1);
    const ballLive = ballDown && ball.rest<2.5;
    const visible = items.filter(it=>it.landed);

    pets.forEach(p=>{
      const P=p.per;
      p.t+=dt; p.cool-=dt; p.bubT-=dt; p.give-=dt; p.socCool-=dt; p.socCheck-=dt;
      if(p.bubT<=0) p.bub.classList.remove("show");
      const pd=petData(p.k), fl=level(pd,"food"), hungry=fl<30, bored=level(pd,"fun")<30;
      const cx=p.x+half, cy=p.y+D.ps*0.7;
      if(!night && !p.chase && !p.social && p.nap<=0 && P.focus.id==="dreamy" && Math.random()<dt*0.03) p.nap=4+Math.random()*5;
      if(night || p.nap>0){
        if(p.social) endSocial(p.social,false);
        if(!night){ p.nap-=dt; if(p.nap<=0){ say(p,"!",0.8); p.give=0.5; } }
        if(p.bubT<=-1.5) say(p,"Zz",2.2);
        p.bod.style.transform="scaleX("+p.dir+") scaleY(.9) translateY(5%)";
        place(p.el,p.x,p.y,p.y+D.ps); return;
      }
      const ballOK = ballLive || (ballDown && P.focus.id==="player");
      // Notice things inside this critter's sight radius and in front of it
      if(!p.chase && p.give<=0){
        let best=null, bs=1e9;
        const look=(o,type)=>{
          const ox=o.x+15, oy=o.y+15, d=Math.hypot(ox-cx,oy-cy);
          const R=P.sight*sc*(isFood(type) ? P.focus.food*(hungry?1.35:fl>90?0.5:1) : P.focus.ball*(bored?1.25:1));
          const seen = P.focus.id==="curious" || d<55*sc || (ox-cx)*p.dir > -10;
          if(d<R && seen && d/R<bs){ bs=d/R; best={o,type,R}; }
        };
        visible.forEach(it=>look(it,it.kind));
        if(ballOK) look(ball,"ball");
        if(best){
          if(p.social) endSocial(p.social,false);
          p.chase={o:best.o,type:best.type,R:best.R,delay:P.react,start:p.t}; p.dir=(best.o.x+15-cx)<0?-1:1; say(p,"!",0.7);
        }
      }
      let speed=P.move.speed*(hungry?0.7:1), hop=null, stay=false, spin=false;
      if(p.chase){
        const c=p.chase, o=c.o;
        const gone = c.type==="ball" ? !ballOK : !items.includes(o);
        const d=Math.hypot(o.x+15-cx,o.y+15-cy);
        if(gone || d>c.R*1.6 || p.t-c.start>P.focus.span){
          if(!gone) say(p,"?",1);
          p.chase=null; p.give=gone?0.4:2.5; p.tx=p.x; p.ty=p.y; p.wait=0.4;
        } else {
          p.dir=(o.x+15-cx)<0?-1:1;
          if(c.delay>0){ c.delay-=dt; stay=true; }
          else { p.tx=o.x+15-half; p.ty=o.y+30-D.ps; speed=P.chaseSpeed; }
        }
      }
      if(!p.chase && p.social){
        const s=p.social;
        if(clock-s.start>s.dur) endSocial(s,true);
        else { const r=socialStep(p,s,D,sc); if(r.stay){ stay=true; hop=r.hop; spin=!!r.spin; } if(r.speed) speed=r.speed; }
      }
      if(!p.chase && !p.social){
        wander(p,P,D,sc,dt);
        if(P.focus.id==="shy" && ballLive && Math.hypot(ball.vx,ball.vy)>60){
          const bx=ball.x+15-cx, by=ball.y+15-cy;
          if(Math.hypot(bx,by)<100*sc){ p.tx=p.x-bx*1.6; p.ty=p.y-by*1.6; speed=P.chaseSpeed*1.2; p.wait=0.8; if(p.bubT<=0) say(p,"eep!",0.9); }
        }
        // Bump into a friend? Maybe start something together.
        if(p.socCheck<=0){
          p.socCheck=0.5;
          if(free(p) && Math.random()<0.4){
            let q=null, qd=2.4*D.ps;
            pets.forEach(o=>{ if(o!==p && free(o)){ const d=Math.hypot(o.x-p.x,o.y-p.y); if(d<qd){ qd=d; q=o; } } });
            if(q) startSocial(p,q);
          }
        }
      }
      p.tx=clamp(p.tx,0,D.W-D.ps); p.ty=clamp(p.ty,D.top,D.bot);
      const dx=p.tx-p.x, dy=p.ty-p.y, dist=Math.hypot(dx,dy);
      if(dist>3 && !stay){
        let f=1; const ph=Math.sin(p.t*P.move.freq);
        if(P.move.burst && !p.chase && !p.social){ f=Math.max(0,ph)*2.2; hop=P.move.amp*Math.max(0,ph); }
        else if(hop===null) hop=P.move.amp*Math.abs(ph);
        const s=Math.min(dist,speed*f*dt), nx=dx/dist, ny=dy/dist;
        p.x+=nx*s; p.y+=ny*s;
        if(P.move.id==="drifter" && !p.chase && !p.social){ const w=Math.sin(p.t*1.7)*22*dt; p.x-=ny*w; p.y+=nx*w; }
        if(Math.abs(dx)>2) p.dir=dx<0?-1:1;
      }
      p.x=clamp(p.x,0,D.W-D.ps); p.y=clamp(p.y,D.top,D.bot);
      if(p.chase && !stay){
        const c=p.chase, o=c.o, reach=Math.hypot(o.x+15-(p.x+half),o.y+15-(p.y+D.ps*0.7));
        if(c.type==="ball" && dist<14 && p.cool<=0){
          const a=(p.dir>0?0:Math.PI)+(Math.random()-.5)*1.8, v=(P.focus.id==="player"?320:240)+Math.random()*200;
          ball.vx=Math.cos(a)*v; ball.vy=Math.sin(a)*v*0.6; ball.rest=0; p.cool=0.9;
          bump(p.k,"fun",P.focus.id==="player"?11:8); say(p,"♪",1.2); tone(500+Math.random()*300,0,.1,"square",.05);
          if(P.focus.id!=="player" && Math.random()<0.45){ p.chase=null; p.give=2; }
          updateRoster(); saveSoon();
        } else if(isFood(c.type) && dist<14 && items.includes(o)){
          removeItem(o); p.chase=null; p.give=1.5;
          const boost=P.focus.id==="foodie"?1.3:1;
          bump(p.k,"food",(c.type==="cookie"?25:9)*boost); if(c.type==="berry") bump(p.k,"fun",2);
          if(c.type==="cookie") pd.love=(+pd.love||0)+1;
          say(p,"Yum!",1.2); fx(p.x+half-6,p.y,c.type==="cookie"?"♥":"+");
          [0,.09,.18].forEach(t=>tone(200+Math.random()*60,t,.07,"square",.05));
          msg(nm(p.k)+(c.type==="cookie"?" ate a cookie.":" gobbled a berry."));
          updateRoster(); saveSoon();
        } else if(c.type==="bubble" && reach<D.ps*0.6 && items.includes(o)){
          removeItem(o); p.chase=null; p.give=0.5;
          bump(p.k,"fun",P.focus.id==="player"?7:5); fx(o.x+6,o.y,"pop!"); say(p,"♪",0.8);
          tone(1400+Math.random()*400,0,.05,"sine",.08);
          updateRoster(); saveSoon();
        } else if(c.type==="toy" && dist<14 && items.includes(o)){
          o.uses--; o.bounce=1; p.chase=null; p.give=2.5;
          bump(p.k,"fun",P.focus.id==="player"?10:7); say(p,"squeak!",1);
          tone(1200,0,.06,"square",.06); tone(900,.07,.08,"square",.06);
          msg(nm(p.k)+" squeaked the star.");
          updateRoster(); saveSoon();
        }
      }
      if(!p.chase && !p.social && p.bubT<=-5 && Math.random()<dt*0.2){
        if(hungry) say(p,"!",2); else if(bored) say(p,"…",2); else if(Math.random()<.35) say(p,"♪",1.4);
      }
      const h=hop===null?0:hop;
      p.bod.style.transform="translateY("+(-h).toFixed(1)+"px) scaleX("+(spin?(Math.sin(clock*7)>0?1:-1):p.dir)+")"+(stay&&p.chase?" scaleY(1.08)":"");
      place(p.el,p.x,p.y,p.y+D.ps);
    });
    const sp = selected && pets.find(q=>q.k===selected);
    if(sp && !night && sp.nap<=0){
      const R=sp.per.sight*sc; sight.hidden=false; sight.style.width=sight.style.height=(2*R)+"px";
      place(sight, sp.x+half-R, sp.y+D.ps*0.7-R, 1);
    } else sight.hidden=true;
    raf=requestAnimationFrame(step);
  }
  function startRoom(){
    syncRoom();
    if(!raf){ last=performance.now(); raf=requestAnimationFrame(step); }
    clearInterval(rosterTimer); rosterTimer=setInterval(updateRoster,1000);
    const hungry=pets.filter(p=>level(petData(p.k),"food")<30).length;
    msg(!state.hatched ? "No critters yet. Crack "+threshold(1)+(threshold(1)===1?" egg":" eggs")+" to hatch one." : hungry ? hungry+(hungry===1?" critter is":" critters are")+" hungry. Try a cookie or some berries." : "Tap a critter to pet it, or pick an item from your pocket.");
  }
  function stopRoom(){ cancelAnimationFrame(raf); raf=0; clearInterval(rosterTimer); }

  room.addEventListener("pointerdown", e=>{
    const rect=room.getBoundingClientRect(), x=e.clientX-rect.left, y=e.clientY-rect.top;
    const petEl=e.target.closest(".pet"), p=petEl && pets.find(q=>q.el===petEl);
    if(p) select(p.k,false);
    if(!state.hatched){ msg("No critters yet. Crack "+threshold(1)+(threshold(1)===1?" egg":" eggs")+" to hatch one."); return; }
    if(tool==="pet"){ if(p) petIt(p); else msg("Tap a critter to pet it."); return; }
    if(night){ msg("Shh, everyone is asleep. Turn the lights on to play."); return; }
    if(tool==="ball"){ toss(x,y); return; }
    if(ITEMS[tool]){
      if(state.inv[tool]<=0){ msg("No "+ITEMS[tool].label.toLowerCase()+" left. Crack eggs on the carton to find more."); return; }
      state.inv[tool]--; updateInv(); useItem(tool,x,y); saveSoon();
    }
  });
  room.addEventListener("keydown", e=>{
    const petEl=e.target.closest && e.target.closest(".pet");
    if(petEl && (e.key==="Enter"||e.key===" ")){ e.preventDefault(); const p=pets.find(q=>q.el===petEl); if(p){ select(p.k,false); petIt(p); } }
  });
  document.querySelectorAll(".tool").forEach(b=>b.onclick=()=>{
    tool=b.dataset.tool; room.dataset.tool=tool;
    document.querySelectorAll(".tool").forEach(o=>o.setAttribute("aria-pressed",o===b));
    msg(tool==="pet"?"Tap a critter to pet it.":tool==="ball"?"Tap anywhere in the room to toss the ball. The ball is always free.":ITEMS[tool].hint+" You have "+state.inv[tool]+".");
  });
  $("lights").onclick=()=>{
    night=!night; room.classList.toggle("night",night);
    $("lights").textContent=night?"Lights on":"Lights out"; $("lights").setAttribute("aria-pressed",night);
    if(!night){ pets.forEach(p=>{ bump(p.k,"fun",5); say(p,"!",1); }); updateRoster(); saveSoon(); msg("Good morning, nursery. Everyone woke up refreshed."); }
    else msg("Lights out. Sweet dreams, little critters.");
  };

  /* ---------- saving (on this device) ---------- */
  function snapshot(){ return {app:"egg-carton-hatchery",version:1,total:state.total, done:[...doneSet].sort((a,b)=>a-b), names:state.names.slice(0,state.total), hatched:state.hatched, inv:state.inv, pets:state.pets, friends:state.friends}; }
  let saveTimer;
  function saveSoon(){ clearTimeout(saveTimer); saveTimer=setTimeout(save,600); }
  function save(){
    clearTimeout(saveTimer);
    try{ localStorage.setItem(LS, JSON.stringify(snapshot())); $("sync").textContent="Saved on this device"; }
    catch(e){ $("sync").textContent="Couldn't save. Your browser may be blocking storage (private mode?)."; }
  }
  // Save right away when the app is hidden or closed, so nothing waiting in the timer is lost.
  document.addEventListener("visibilitychange", ()=>{ if(document.hidden) save(); });
  window.addEventListener("pagehide", save);

  /* ---------- backups ---------- */
  $("exportBackup").onclick=()=>{
    const blob=new Blob([JSON.stringify(snapshot(),null,1)],{type:"application/json"});
    const url=URL.createObjectURL(blob), a=document.createElement("a");
    a.href=url; a.download="hatchery-backup-"+new Date().toISOString().slice(0,10)+".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
    flash("Backup saved to your downloads.");
  };
  $("importBackup").onclick=()=>$("backupFile").click();
  $("backupFile").addEventListener("change", e=>{
    const f=e.target.files && e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=()=>{
      try{
        const data=JSON.parse(r.result);
        if(!data || !Array.isArray(data.done)) throw new Error("bad");
        applyState(data); renderAll(); save();
        flash("Backup loaded: "+doneSet.size+" of "+state.total+" tasks done.");
      }catch(err){ flash("That file isn't a hatchery backup."); }
      e.target.value="";
    };
    r.readAsText(f);
  });

  renderAll();
  $("sync").textContent = (()=>{ try{ return localStorage.getItem(LS) ? "Saved on this device" : "Progress saves on this device as you go"; }catch(e){ return "Storage is blocked, so progress won't be kept"; } })();

  /* ---------- offline support ---------- */
  if("serviceWorker" in navigator && location.protocol!=="file:"){
    window.addEventListener("load", ()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
  }
})();
