/* Metric playground · Demos (brief 09).
   1. UQL.metrics: pure metric functions, no DOM (tests/metrics.html calls them).
      Conventions from A-appendix.tex sec:appendix-metrics: c = 1 is the positive class (correct, grounded or well
      specified), U = uncertainty (higher = more uncertain), confidence = 1 − U.
   2. The demo: one tab per target. COR, GRD and UNS share one widget (#pg-bin, moved into the open tab's panel;
      lanes and text follow the target): score strip, τ, one metric switch per family RNK / CAL / SCR / DEC,
      a calibration plot and a ranking plot. FTH: signal 1 vs signal 2, Spearman ρ, cMFG.
   Data: ./data/playground.json (text, presets) + ./data/papers.json (sankey.headline for the survey line).
   The preview embeds them as <script type="application/json"> blocks (#pg-data-text, #pg-data-headline);
   when absent the files are fetched.
   Real-data preset (COR only, brief 10): playground_real from ./data/poc.json (or the inline #poc-data block):
   c = 1 − incorrect, U = 1 − MSP or U = SE / se_max (ln 21). Up to 200 points for this preset only (smaller dots,
   9 dodge rows); adding points is disabled while its points are loaded, dragging still works.
   Deep link: #playground?tab=fth&preset=rank-only, #playground?tab=grd&preset=cal-not-rank (read on load and on hashchange). */
(function(){
  "use strict";
  var V="20261124d", BASE="./data/", POCV="20261124d";

  /* ================= 1 · metrics (pure) ================= */
  var BINS=10, EPS=1e-9;
  /* equal-width bins on [0,1]; EPS keeps 1 − 0.9 = 0.0999… in bin 1, and 1.0 goes to the last bin */
  function binIdx(v){var b=Math.floor(v*BINS+EPS);return b<0?0:b>BINS-1?BINS-1:b}
  function mean(a){var s=0;for(var i=0;i<a.length;i++)s+=a[i];return a.length?s/a.length:NaN}
  function sum(a){var s=0;for(var i=0;i<a.length;i++)s+=a[i];return s}

  /* P(a positive has lower U than a negative); ties count ½. null when one class is missing. */
  function auroc(u,c){
    var pos=[],neg=[],s=0,i,j;
    for(i=0;i<u.length;i++)(c[i]?pos:neg).push(u[i]);
    if(!pos.length||!neg.length) return null;
    for(i=0;i<pos.length;i++)for(j=0;j<neg.length;j++)s+=pos[i]<neg[j]?1:pos[i]===neg[j]?0.5:0;
    return s/(pos.length*neg.length);
  }
  /* ROC points, threshold sweeping U upward (accept U ≤ t); tied U move together (diagonal segment) */
  function rocCurve(u,c){
    var P=sum(c),N=u.length-P,ts=uniq(u),pts=[[0,0]];
    if(!P||!N) return null;
    ts.forEach(function(t){var tp=0,fp=0;for(var i=0;i<u.length;i++)if(u[i]<=t){if(c[i])tp++;else fp++}pts.push([fp/N,tp/P])});
    return pts;
  }
  function uniq(a){return a.slice().sort(function(x,y){return x-y}).filter(function(v,i,s){return i===0||v!==s[i-1]})}
  /* risk (error rate) of the k least uncertain, k = 1…n; tied U → expected risk over random tie-breaking */
  function riskCurve(u,c){
    var n=u.length,sorted=u.slice().sort(function(a,b){return a-b}),out=[],k,i;
    for(k=1;k<=n;k++){
      var t=sorted[k-1],below=0,eb=0,tied=0,et=0;
      for(i=0;i<n;i++){
        if(u[i]<t){below++;eb+=1-c[i]}
        else if(u[i]===t){tied++;et+=1-c[i]}
      }
      out.push((eb+(k-below)*et/tied)/k);
    }
    return out;
  }
  function oracleCurve(c){var n=c.length,nc=sum(c),o=[];for(var k=1;k<=n;k++)o.push(Math.max(0,k-nc)/k);return o}
  function aurc(u,c){return mean(riskCurve(u,c))}
  function auarc(u,c){return 1-aurc(u,c)}
  function aurcRandom(u,c){return 1-mean(c)}
  function aurcOracle(u,c){return mean(oracleCurve(c))}
  function prr(u,c){
    var r=aurcRandom(u,c),o=aurcOracle(u,c);
    if(Math.abs(o-r)<1e-15) return null;
    return (aurc(u,c)-r)/(o-r);
  }
  /* average precision (sklearn's AUPRC): positive = c = 1, score = confidence 1 − U */
  function prCurve(u,c){
    var P=sum(c),n=u.length;
    if(!P||P===n) return null;
    var conf=u.map(function(v){return 1-v}),ts=uniq(conf).reverse(),pts=[];
    ts.forEach(function(t){var tp=0,fp=0;for(var i=0;i<n;i++)if(conf[i]>=t){if(c[i])tp++;else fp++}pts.push([tp/P,tp/(tp+fp)])});
    return pts;
  }
  function auprc(u,c){
    var pts=prCurve(u,c);if(!pts) return null;
    var s=0,r0=0;pts.forEach(function(p){s+=(p[0]-r0)*p[1];r0=p[0]});
    return s;
  }
  function reliability(u,c){
    var b=[],i;
    for(i=0;i<BINS;i++)b.push({n:0,acc:0,conf:0});
    for(i=0;i<u.length;i++){var cf=1-u[i],m=b[binIdx(cf)];m.n++;m.acc+=c[i];m.conf+=cf}
    b.forEach(function(m){if(m.n){m.acc/=m.n;m.conf/=m.n}});
    return b;
  }
  function ece(u,c){var n=u.length,s=0;reliability(u,c).forEach(function(m){if(m.n)s+=m.n/n*Math.abs(m.acc-m.conf)});return s}
  function mce(u,c){var s=0;reliability(u,c).forEach(function(m){if(m.n)s=Math.max(s,Math.abs(m.acc-m.conf))});return s}
  /* equal-mass bins: point i → bin floor(10·(r_i − 1)/n), r_i = average rank by confidence, so ties share a bin */
  function aceBins(u,c){
    var n=u.length,conf=u.map(function(v){return 1-v}),r=ranks(conf),b=[],i;
    for(i=0;i<BINS;i++)b.push({n:0,acc:0,conf:0});
    for(i=0;i<n;i++){var k=Math.min(BINS-1,Math.floor(BINS*(r[i]-1)/n+EPS)),m=b[k];m.n++;m.acc+=c[i];m.conf+=conf[i]}
    b.forEach(function(m){if(m.n){m.acc/=m.n;m.conf/=m.n}});
    return b;
  }
  function ace(u,c){var n=u.length,s=0;aceBins(u,c).forEach(function(m){if(m.n)s+=m.n/n*Math.abs(m.acc-m.conf)});return s}
  function brier(u,c){var s=0;for(var i=0;i<u.length;i++){var d=1-u[i]-c[i];s+=d*d}return s/u.length}
  function accAt(u,c,tau){var s=0;for(var i=0;i<u.length;i++)s+=((u[i]<tau)?1:0)===c[i]?1:0;return s/u.length}
  function f1(u,c,tau){
    var tp=0,fp=0,fn=0;
    for(var i=0;i<u.length;i++){var d=u[i]<tau;if(d&&c[i])tp++;else if(d)fp++;else if(c[i])fn++}
    return tp?2*tp/(2*tp+fp+fn):0;
  }
  function ranks(a){
    var idx=a.map(function(v,i){return i}).sort(function(p,q){return a[p]-a[q]}),r=new Array(a.length),i=0;
    while(i<idx.length){
      var j=i;while(j+1<idx.length&&a[idx[j+1]]===a[idx[i]])j++;
      for(var k=i;k<=j;k++)r[idx[k]]=(i+j)/2+1;
      i=j+1;
    }
    return r;
  }
  /* Spearman ρ = Pearson on average ranks; null when either signal is constant */
  function spearman(x,y){
    var rx=ranks(x),ry=ranks(y),mx=mean(rx),my=mean(ry),sxy=0,sxx=0,syy=0;
    for(var i=0;i<x.length;i++){var a=rx[i]-mx,b=ry[i]-my;sxy+=a*b;sxx+=a*a;syy+=b*b}
    if(sxx===0||syy===0) return null;
    return sxy/Math.sqrt(sxx*syy);
  }
  /* cMFG (Yona et al. 2024, §4): f = 1 − |signal 2 − signal 1| per answer; mean within 10 equal-width bins of
     signal 1; then the mean over the non-empty bins, so every confidence level weighs the same */
  function cmfgBins(x,y){
    var b=[],i;
    for(i=0;i<BINS;i++)b.push({n:0,f:0});
    for(i=0;i<x.length;i++){var m=b[binIdx(x[i])];m.n++;m.f+=1-Math.abs(y[i]-x[i])}
    b.forEach(function(m){if(m.n)m.f/=m.n});
    return b;
  }
  function cmfg(x,y){return mean(cmfgBins(x,y).filter(function(m){return m.n}).map(function(m){return m.f}))}

  var UQL=window.UQL=window.UQL||{};
  UQL.metrics={auroc:auroc,aurc:aurc,auarc:auarc,aurcRandom:aurcRandom,aurcOracle:aurcOracle,prr:prr,auprc:auprc,
    ece:ece,mce:mce,ace:ace,brier:brier,accAt:accAt,f1:f1,spearman:spearman,cmfg:cmfg,
    riskCurve:riskCurve,oracleCurve:oracleCurve,rocCurve:rocCurve,prCurve:prCurve,reliability:reliability,aceBins:aceBins,cmfgBins:cmfgBins,binIdx:binIdx};

  /* run the reference fixtures (scripts/ref_metrics.py → metrics-expected.json) */
  UQL.metrics.check=function(E){
    var M=UQL.metrics,rows=[],tol=E.tolerance;
    function cmp(name,m,got,want){
      var ok=(want===null)?got===null:(got!==null&&Math.abs(got-want)<=tol);
      rows.push({name:name,metric:m,got:got,want:want,ok:ok});
    }
    E.cor.forEach(function(k){
      var u=k.u,c=k.c,got={auroc:M.auroc(u,c),aurc:M.aurc(u,c),aurcRandom:M.aurcRandom(u,c),aurcOracle:M.aurcOracle(u,c),
        ece:M.ece(u,c),brier:M.brier(u,c),accAt:M.accAt(u,c,k.tau),auarc:M.auarc(u,c),prr:M.prr(u,c),auprc:M.auprc(u,c),
        mce:M.mce(u,c),ace:M.ace(u,c),f1:M.f1(u,c,k.tau)};
      Object.keys(k.expected).forEach(function(m){cmp(k.name,m,got[m],k.expected[m])});
    });
    E.fth.forEach(function(k){
      var got={spearman:M.spearman(k.x,k.y),cmfg:M.cmfg(k.x,k.y)};
      Object.keys(k.expected).forEach(function(m){cmp(k.name,m,got[m],k.expected[m])});
    });
    return rows;
  };

  if(typeof document==="undefined") return;

  /* ================= 2 · the demo ================= */
  var NS="http://www.w3.org/2000/svg", MINN=4, MAXN=60;
  var root, T, H, LX, uid=0, liveT=null;
  var COR={pts:[],tau:0.5,preset:null,sel:null,target:"COR",pick:{},dense:false,src:"msp"}, FTH={pts:[],preset:null,sel:null};
  var REAL=null, POCMETA=null, pendingReal=false;
  var strip={}, scat={}, rows={}, plots={};

  function $(id){return document.getElementById(id)}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  function el(tag,attrs,parent){
    var e=document.createElementNS(NS,tag);
    for(var k in attrs) if(attrs[k]!==null&&attrs[k]!==undefined) e.setAttribute(k,attrs[k]);
    if(parent) parent.appendChild(e);
    return e;
  }
  function att(n,a){for(var k in a)n.setAttribute(k,a[k])}
  function f2(v){return v.toFixed(2)}
  function f3(v){return v===null?"—":(Math.abs(v)<5e-4?0:v).toFixed(3)}
  function clamp(v){return Math.min(1,Math.max(0,v))}
  function snap(v){return Math.round(clamp(v)*100)/100}
  /* {cor} {cor_rnk_only} from the survey headline; {pos} {neg} {item} … from the selected target */
  function fill(s){
    return String(s).replace(/\{(\w+)\}/g,function(a,k){
      if(LX&&LX[k]!==undefined) return LX[k];
      if(H&&H[k]!==undefined) return H[k];
      return a;
    });
  }
  function famName(f){return {RNK:"ranking",CAL:"calibration",SCR:"scoring",DEC:"decision",FTH:"faithfulness"}[f]||f}
  function metricDef(id){
    var out=null;T.cor.families.forEach(function(F){F.metrics.forEach(function(m){if(m.id===id)out=m})});return out;
  }

  /* ---------- readout rows ---------- */
  function arrowKey(host){
    if(host.querySelector(".pg-key")) return;
    var k=document.createElement("p");k.className="pg-key mono";k.setAttribute("aria-hidden","true");
    k.textContent="▲ higher is better · ▼ lower is better";host.appendChild(k);
  }
  function makeRow(host,fam,famLabel,metrics,onPick){
    arrowKey(host);
    var r=document.createElement("div");
    r.className="pg-row";r.dataset.m=fam;
    var head='<span class="chip met" title="'+esc(famName(fam))+'">'+fam+'</span>';
    if(metrics.length>1){
      head+='<span class="pg-mseg" role="group" aria-label="'+esc(famLabel)+' metric">'+metrics.map(function(m){
        return '<button type="button" data-pick="'+m.id+'" aria-pressed="false">'+esc(m.name)+'</button>'}).join("")+'</span>';
    } else head+='<span class="pg-name">'+esc(metrics[0].name)+'</span>';
    r.innerHTML=head+'<span class="pg-val mono"><span class="pg-arrow" data-arrow></span><span data-v>—</span></span><span class="pg-bar" aria-hidden="true"><i data-bar></i></span>'+
      '<span class="pg-dir" data-dir></span><span class="pg-gloss" data-gloss></span>';
    r.querySelectorAll("[data-pick]").forEach(function(b){b.addEventListener("click",function(){onPick(b.dataset.pick)})});
    host.appendChild(r);
    return r;
  }
  function setRow(r,v,dir,gloss,why){
    var val=r.querySelector("[data-v]"),bar=r.querySelector("[data-bar]");
    val.textContent=f3(v);
    if(v===null){val.title=why||"";val.setAttribute("aria-label","not defined: "+(why||""))}
    else{val.removeAttribute("title");val.removeAttribute("aria-label")}
    bar.style.width=(v===null?0:clamp(Math.abs(v))*100)+"%";
    /* "higher/lower is better" becomes ▲ / ▼ beside the value; the rest of the line stays */
    var up=/^higher is better/.test(dir),down=/^lower is better/.test(dir),ar=r.querySelector("[data-arrow]");
    ar.textContent=up?"▲":down?"▼":"";
    if(up||down){ar.title=up?"higher is better":"lower is better";ar.setAttribute("aria-label",ar.title);ar.setAttribute("role","img")}
    var rest=dir.replace(/^(higher|lower) is better( · )?/,"");
    var dl=r.querySelector("[data-dir]");dl.innerHTML=rest;dl.hidden=!rest;
    r.querySelector("[data-gloss]").textContent=gloss;
    r.querySelectorAll("[data-pick]").forEach(function(b){b.setAttribute("aria-pressed",String(COR.pick[r.dataset.m]===b.dataset.pick))});
  }
  function corValues(u,c){
    return {auroc:auroc(u,c),aurc:aurc(u,c),auarc:auarc(u,c),auprc:auprc(u,c),prr:prr(u,c),ece:ece(u,c),mce:mce(u,c),ace:ace(u,c),
      brier:brier(u,c),acc:accAt(u,c,COR.tau),f1:f1(u,c,COR.tau)};
  }
  function announce(){
    clearTimeout(liveT);
    liveT=setTimeout(function(){
      var out=$("pg-live");
      if(!$("pg-fth").hidden){
        var x=FTH.pts.map(function(p){return p.x}),y=FTH.pts.map(function(p){return p.y});
        out.textContent="Rank correlation "+f3(spearman(x,y))+", cMFG "+f3(cmfg(x,y))+".";
      } else {
        var u=COR.pts.map(function(p){return p.u}),c=COR.pts.map(function(p){return p.c}),v=corValues(u,c);
        out.textContent=T.cor.families.map(function(F){var id=COR.pick[F.fam];return metricDef(id).name+" "+f3(v[id])}).join(", ")+
          (", τ = "+f2(COR.tau)+".");
      }
      updateTables();
    },700);
  }

  /* ---------- binary tab: build ---------- */
  function buildCor(){
    var P=document.createElement("div"),t=T.cor;
    P.id="pg-bin";P.className="pg-panel";$("pg-cor").appendChild(P);
    P.innerHTML=
      '<p class="pg-sub" id="pg-cor-sub"></p>'+
      '<div class="pg-presets"><span class="pg-flab" id="pg-cor-plab">Preset</span><span class="seg" role="group" aria-labelledby="pg-cor-plab" id="pg-cor-presets"></span></div>'+
      '<p class="pg-pcap" id="pg-cor-cap"></p>'+
      '<div class="pg-realsrc" id="pg-realsrc" hidden></div>'+
      '<div class="pg-strip" id="pg-strip"></div>'+
      '<div class="pg-tools">'+
        '<span class="pg-scale mono" id="pg-scale"></span>'+
        '<span class="pg-selbox" id="pg-selbox"></span>'+
        '<span class="pg-add"><button type="button" class="btn sm" data-add="1" id="pg-add1"></button><button type="button" class="btn sm" data-add="0" id="pg-add0"></button><span class="pg-n mono" id="pg-n"></span></span>'+
      '</div>'+
      '<div class="pg-grid">'+
        '<div class="pg-readout" id="pg-cor-readout"></div>'+
        '<div class="pg-plots">'+
          '<figure class="pg-plot" data-m="CAL"><figcaption><span class="chip met">CAL</span> <span id="pg-cal-title"></span></figcaption><div class="pg-plotsvg" id="pg-calplot"></div><p class="pg-note" id="pg-cal-note"></p></figure>'+
          '<figure class="pg-plot" data-m="RNK"><figcaption><span class="chip met">RNK</span> <span id="pg-rnk-title"></span></figcaption><div class="pg-plotsvg" id="pg-rnkplot"></div><p class="pg-note" id="pg-rnk-note"></p></figure>'+
        '</div>'+
      '</div>'+
      '<p class="pg-moral" data-m="RNK">'+esc(t.moral)+'</p>'+
      '<table class="pg-sr" id="pg-cor-table"><caption>Current scores</caption><thead><tr><th scope="col">#</th><th scope="col">label</th><th scope="col">U</th><th scope="col">decision at τ</th></tr></thead><tbody></tbody></table>';
    var g=$("pg-cor-presets");
    t.presets.forEach(function(p){
      var b=document.createElement("button");
      b.type="button";b.dataset.preset=p.id;b.textContent=p.label;b.setAttribute("aria-pressed","false");
      b.addEventListener("click",function(){applyCor(p.id)});
      g.appendChild(b);
    });
    if(t.real_data){
      var rb=document.createElement("button"),rd=t.real_data;
      rb.type="button";rb.disabled=true;rb.textContent=rd.label;rb.title=rd.loading;
      rb.id="pg-real";rb.dataset.preset="real";rb.setAttribute("aria-pressed","false");
      rb.addEventListener("click",function(){applyReal(COR.src)});
      g.appendChild(rb);
      var rs=$("pg-realsrc");
      rs.innerHTML='<span class="pg-flab" id="pg-real-slab">'+esc(rd.switch)+'</span><span class="seg" role="group" aria-labelledby="pg-real-slab">'+["msp","se"].map(function(k){
        return '<button type="button" data-src="'+k+'" aria-pressed="false">'+esc(rd.sources[k].label)+'</button>'}).join("")+'</span>'+
        '<span class="pg-realnote" id="pg-realnote"></span>';
      rs.querySelectorAll("[data-src]").forEach(function(b){b.addEventListener("click",function(){applyReal(b.dataset.src)})});
    }
    var R=$("pg-cor-readout");
    t.families.forEach(function(F){
      COR.pick[F.fam]=F.metrics[0].id;
      rows[F.fam]=makeRow(R,F.fam,F.name,F.metrics,function(id){COR.pick[F.fam]=id;renderCor()});
    });
    P.querySelectorAll("[data-add]").forEach(function(b){
      b.addEventListener("click",function(){
        if(COR.pts.length>=MAXN||COR.dense) return;
        var p={id:++uid,u:0.5,c:+b.dataset.add};COR.pts.push(p);COR.sel=p.id;edited();renderCor();focusPt(p.id);
      });
    });
    buildStrip();
    plots.cal=plotSvg("pg-calplot");plots.rnk=plotSvg("pg-rnkplot");
  }
  function setTarget(k){
    if(!T.targets[k]) return;
    COR.target=k;LX=T.targets[k];
    var panel=$("pg-"+k.toLowerCase()),bin=$("pg-bin");
    if(bin.parentNode!==panel) panel.appendChild(bin);
    /* the real-data preset (TriviaQA, brief 10) is a correctness set: COR only; leaving COR drops its points */
    if($("pg-real")) $("pg-real").hidden=k!=="COR";
    if(k!=="COR"&&COR.dense){COR.dense=false;applyCor(T.cor.default_preset)}
    $("pg-cor-sub").innerHTML=fill(T.cor.sub);
    $("pg-scale").innerHTML=fill(T.cor.scale).replace(/\bU\b/g,"<i>U</i>");
    strip.lanes[1].lab.textContent="● "+fill(T.cor.lanes.pos);
    strip.lanes[0].lab.textContent="✕ "+fill(T.cor.lanes.neg);
    $("pg-add1").textContent="+ "+LX.pos;$("pg-add0").textContent="+ "+LX.neg;
    $("pg-cor-table").querySelector("caption").textContent="Current "+LX.items;
    syncPresets("cor");
    COR.pts.forEach(function(p){var n=strip.nodes[p.id];if(n)n.setAttribute("aria-label",ptLabel(p))});
    renderCor();
  }

  /* ---------- score strip ---------- */
  var SG={padL:14,padR:14,top:30,laneH:62,labH:18,gap:8,axisH:40};
  function laneTop(c){return SG.top+(c?0:SG.labH+SG.laneH+SG.gap)+SG.labH}
  function buildStrip(){
    var host=$("pg-strip");
    var svg=el("svg",{class:"pg-svg","aria-label":"Score strip",role:"group"},host);
    strip.svg=svg;
    var defs=el("defs",{},svg);
    var pat=el("pattern",{id:"pg-rej",width:6,height:6,patternUnits:"userSpaceOnUse",patternTransform:"rotate(45)"},defs);
    el("line",{x1:0,y1:0,x2:0,y2:6,class:"pg-rej-hatch"},pat);
    strip.lanes={};
    [1,0].forEach(function(c){
      var g=el("g",{class:"pg-lane "+(c?"ok":"bad")},svg);
      var lab=el("text",{class:"pg-lanelab"},g);
      var bg=el("rect",{class:"pg-lanebg"},g);
      bg.addEventListener("click",function(e){
        if(COR.pts.length>=MAXN||COR.dense||strip.justDragged) return;
        var p={id:++uid,u:snap(toU(e.clientX)),c:c};
        COR.pts.push(p);COR.sel=p.id;edited();renderCor();focusPt(p.id);
      });
      strip.lanes[c]={g:g,lab:lab,bg:bg};
    });
    /* τ shading sits above the lane backgrounds, below the points; it never takes the pointer */
    strip.accept=el("rect",{class:"pg-accept"},svg);
    strip.reject=el("rect",{class:"pg-reject",fill:"url(#pg-rej)"},svg);
    strip.axis=el("g",{class:"pg-axis","aria-hidden":"true"},svg);
    strip.tauLine=el("line",{class:"pg-tau-line"},svg);
    strip.accLab=el("text",{class:"pg-side","text-anchor":"end"},svg); strip.accLab.textContent="accept · d = 1";
    strip.rejLab=el("text",{class:"pg-side"},svg); strip.rejLab.textContent="reject · d = 0";
    strip.tau=el("g",{class:"pg-tau",tabindex:0,role:"slider","aria-label":"Threshold τ","aria-valuemin":0,"aria-valuemax":1,"aria-describedby":"pg-keys"},svg);
    el("rect",{x:-17,y:2,width:34,height:20,rx:5,class:"pg-tau-h"},strip.tau);
    var tt=el("text",{x:0,y:16,"text-anchor":"middle",class:"pg-tau-t"},strip.tau);tt.textContent="τ";
    el("rect",{x:-20,y:0,width:40,height:26,class:"pg-hit"},strip.tau);
    drag(strip.tau,function(x){COR.tau=snap(toU(x));renderCor()});
    strip.tau.addEventListener("keydown",function(e){
      var d=stepKey(e);
      if(e.key==="Home")COR.tau=0; else if(e.key==="End")COR.tau=1; else if(d===null) return; else COR.tau=snap(COR.tau+d);
      e.preventDefault();renderCor();
    });
    strip.pts=el("g",{class:"pg-pts"},svg);
    strip.nodes={};
    onResize(host,function(){layoutStrip();renderCor()});
    layoutStrip();
  }
  function onResize(node,cb){
    var w=0;
    function chk(){var nw=node.clientWidth;if(nw&&nw!==w){w=nw;cb()}}
    if(window.ResizeObserver) new ResizeObserver(chk).observe(node); else window.addEventListener("resize",chk);
  }
  function layoutStrip(){
    var W=Math.max(280,$("pg-strip").clientWidth||600),Hh=laneTop(0)+SG.laneH+SG.axisH;
    strip.W=W;strip.H=Hh;
    strip.svg.setAttribute("viewBox","0 0 "+W+" "+Hh);
    [1,0].forEach(function(c){
      var L=strip.lanes[c],y=laneTop(c);
      att(L.lab,{x:SG.padL-6,y:y-6});
      att(L.bg,{x:0,y:y,width:W,height:SG.laneH});
    });
    var ax=strip.axis;ax.innerHTML="";
    var y0=laneTop(0)+SG.laneH+4;
    el("line",{x1:xOf(0),x2:xOf(1),y1:y0,y2:y0,class:"pg-axisline"},ax);
    var step=W<420?0.2:0.1;
    for(var v=0;v<=1.0001;v+=step){
      var x=xOf(v);
      el("line",{x1:x,x2:x,y1:y0,y2:y0+4,class:"pg-axisline"},ax);
      var a=el("text",{x:x,y:y0+16,"text-anchor":"middle",class:"pg-tick"},ax);a.textContent=(+v.toFixed(1)).toString();
      var b=el("text",{x:x,y:y0+30,"text-anchor":"middle",class:"pg-tick2"},ax);b.textContent=(+(1-v).toFixed(1)).toString();
    }
  }
  function xOf(u){return SG.padL+u*(strip.W-SG.padL-SG.padR)}
  function toU(clientX){
    var r=strip.svg.getBoundingClientRect(),x=(clientX-r.left)*strip.W/r.width;
    return clamp((x-SG.padL)/(strip.W-SG.padL-SG.padR));
  }
  function stepKey(e){
    var s=e.shiftKey?0.1:0.01;
    if(e.key==="ArrowRight"||e.key==="ArrowUp") return s;
    if(e.key==="ArrowLeft"||e.key==="ArrowDown") return -s;
    return null;
  }
  /* pointer drag (mouse, touch, pen); fn(clientX, clientY) */
  function drag(node,fn,start){
    node.addEventListener("pointerdown",function(e){
      if(e.button!==undefined&&e.button!==0) return;
      e.preventDefault();
      if(start) start();
      try{node.setPointerCapture(e.pointerId)}catch(err){}
      node.focus({preventScroll:true});
      var moved=false;
      function mv(ev){moved=true;fn(ev.clientX,ev.clientY)}
      function up(){
        node.removeEventListener("pointermove",mv);node.removeEventListener("pointerup",up);node.removeEventListener("pointercancel",up);
        if(moved){strip.justDragged=true;setTimeout(function(){strip.justDragged=false},0)}
      }
      node.addEventListener("pointermove",mv);node.addEventListener("pointerup",up);node.addEventListener("pointercancel",up);
    });
  }
  function ptLabel(p){return (p.c?LX.Pos:cap(LX.neg))+" "+LX.item+", U = "+f2(p.u)}
  function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
  function makePt(p){
    var g=el("g",{class:"pg-pt "+(p.c?"ok":"bad"),role:"slider",tabindex:-1,"aria-valuemin":0,"aria-valuemax":1,
      "aria-roledescription":"draggable point","aria-describedby":"pg-keys"},strip.pts);
    el("circle",{r:12,class:"pg-hit"},g);
    el("circle",{r:10.5,class:"pg-ring"},g);
    if(p.c) el("circle",{r:6.5,class:"pg-dot"},g);
    else {el("path",{d:"M-5.5,-5.5L5.5,5.5M5.5,-5.5L-5.5,5.5",class:"pg-x-bg"},g);el("path",{d:"M-5.5,-5.5L5.5,5.5M5.5,-5.5L-5.5,5.5",class:"pg-x"},g)}
    drag(g,function(x){p.u=snap(toU(x));edited();renderCor()},function(){COR.sel=p.id;renderCor()});
    g.addEventListener("focus",function(){if(COR.sel!==p.id){COR.sel=p.id;renderCor()}});
    g.addEventListener("keydown",function(e){keyPt(e,p)});
    return g;
  }
  function keyPt(e,p){
    var d=stepKey(e),k=e.key;
    if(d!==null){p.u=snap(p.u+d)}
    else if(k==="Home"){p.u=0}
    else if(k==="End"){p.u=1}
    else if(k==="l"||k==="L"){flip(p);e.preventDefault();return}
    else if(k==="Delete"||k==="Backspace"){remove(p);e.preventDefault();return}
    else if(k==="n"||k==="N"||k==="p"||k==="P"){
      var lane=COR.pts.filter(function(q){return q.c===p.c}).sort(function(a,b){return a.u-b.u||a.id-b.id});
      var i=lane.indexOf(p),j=(k==="n"||k==="N")?Math.min(lane.length-1,i+1):Math.max(0,i-1);
      COR.sel=lane[j].id;renderCor();focusPt(lane[j].id);e.preventDefault();return;
    }
    else return;
    e.preventDefault();edited();renderCor();
  }
  function flip(p){p.c=1-p.c;var id=p.id;strip.nodes[id].remove();delete strip.nodes[id];edited();renderCor();focusPt(id)}
  function remove(p){
    if(COR.pts.length<=MINN) return;
    var lane=COR.pts.filter(function(q){return q.c===p.c&&q!==p}).sort(function(a,b){return Math.abs(a.u-p.u)-Math.abs(b.u-p.u)});
    COR.pts.splice(COR.pts.indexOf(p),1);
    strip.nodes[p.id].remove();delete strip.nodes[p.id];
    COR.sel=lane.length?lane[0].id:(COR.pts[0]&&COR.pts[0].id);
    edited();renderCor();if(COR.sel)focusPt(COR.sel);
  }
  function focusPt(id){var n=strip.nodes[id];if(n)n.focus({preventScroll:true})}
  function selected(){for(var i=0;i<COR.pts.length;i++)if(COR.pts[i].id===COR.sel)return COR.pts[i];return null}

  /* dodge overlapping points: left to right, each takes the row nearest the lane centre whose last point is ≥ 13 px away;
     when every row is taken (many equal scores), the row whose last point is furthest left */
  var ROWS=[0,-12,12,-24,24], ROWSD=[0,-6,6,-12,12,-18,18,-24,24];
  function offsets(){
    var res={},gap=COR.dense?6:13,RR=COR.dense?ROWSD:ROWS;
    [1,0].forEach(function(c){
      var last=RR.map(function(){return -1e9});
      COR.pts.filter(function(p){return p.c===c}).sort(function(a,b){return a.u-b.u||a.id-b.id}).forEach(function(p){
        var x=xOf(p.u),r=-1,i;
        for(i=0;i<RR.length;i++) if(x-last[i]>=gap){r=i;break}
        if(r<0){r=0;for(i=1;i<RR.length;i++) if(last[i]<last[r]) r=i}
        last[r]=x;res[p.id]=RR[r];
      });
    });
    return res;
  }

  function renderCor(){
    if(!strip.svg||!LX) return;
    var u=COR.pts.map(function(p){return p.u}),c=COR.pts.map(function(p){return p.c}),n=u.length;
    var xt=xOf(COR.tau),top=SG.top-4,bot=laneTop(0)+SG.laneH;
    att(strip.accept,{x:SG.padL,y:top,width:Math.max(0,xt-SG.padL),height:bot-top});
    att(strip.reject,{x:xt,y:top,width:Math.max(0,xOf(1)-xt),height:bot-top});
    att(strip.tauLine,{x1:xt,x2:xt,y1:22,y2:bot});
    strip.tau.setAttribute("transform","translate("+xt+",0)");
    strip.tau.setAttribute("aria-valuenow",COR.tau);strip.tau.setAttribute("aria-valuetext","τ = "+f2(COR.tau));
    att(strip.accLab,{x:xt-24,y:16});att(strip.rejLab,{x:xt+24,y:16});
    strip.accLab.style.display=xt-24>90?"":"none";strip.rejLab.style.display=strip.W-xt-24>90?"":"none";
    var off=offsets(),seen={},rover={1:null,0:null};
    COR.pts.forEach(function(p){if(p.id===COR.sel)rover[p.c]=p.id});
    [1,0].forEach(function(cc){
      if(rover[cc]===null){var l=COR.pts.filter(function(p){return p.c===cc}).sort(function(a,b){return a.u-b.u});if(l.length)rover[cc]=l[0].id}
    });
    COR.pts.forEach(function(p){
      var g=strip.nodes[p.id]||(strip.nodes[p.id]=makePt(p));
      seen[p.id]=1;
      g.setAttribute("transform","translate("+xOf(p.u)+","+(laneTop(p.c)+SG.laneH/2+(off[p.id]||0))+")");
      g.setAttribute("aria-label",ptLabel(p));g.setAttribute("aria-valuenow",p.u);g.setAttribute("aria-valuetext","U = "+f2(p.u));
      g.setAttribute("tabindex",rover[p.c]===p.id?0:-1);
      g.classList.toggle("sel",p.id===COR.sel);
    });
    Object.keys(strip.nodes).forEach(function(id){if(!seen[id]){strip.nodes[id].remove();delete strip.nodes[id]}});
    var s=selected(),box=$("pg-selbox");
    if(s){
      box.innerHTML='<span class="mono">'+esc(ptLabel(s))+'</span><button type="button" class="btn sm" data-act="flip" aria-keyshortcuts="L">Flip label</button>'+
        '<button type="button" class="btn sm" data-act="del" aria-keyshortcuts="Delete"'+(n<=MINN?' disabled title="At least '+MINN+' '+LX.items+'"':'')+'>Remove</button>';
      box.querySelector('[data-act="flip"]').onclick=function(){flip(s)};
      box.querySelector('[data-act="del"]').onclick=function(){remove(s)};
    } else box.innerHTML="";
    $("pg-n").textContent="n = "+n+" · "+sum(c)+" "+LX.pos;
    root.querySelectorAll("#pg-bin [data-add]").forEach(function(b){b.disabled=n>=MAXN||COR.dense});
    strip.svg.classList.toggle("dense",COR.dense);
    var rs=$("pg-realsrc");
    if(rs){
      rs.hidden=!COR.dense;
      rs.querySelectorAll("[data-src]").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.src===COR.src))});
      if(COR.dense) $("pg-realnote").textContent=T.cor.real_data.sources[COR.src].note;
    }
    /* readout */
    var v=corValues(u,c);
    T.cor.families.forEach(function(F){
      var id=COR.pick[F.fam],m=metricDef(id),dir=esc(fill(m.dir)),why;
      if(id==="aurc") dir+=' · random <b class="mono">'+f3(aurcRandom(u,c))+'</b> · oracle <b class="mono">'+f3(aurcOracle(u,c))+'</b>';
      if(id==="auprc") dir+=' · random <b class="mono">'+f3(mean(c))+'</b>';
      if(id==="acc"||id==="f1") dir+=' · τ = <b class="mono">'+f2(COR.tau)+'</b>';
      if(id==="auroc"||id==="auprc"||id==="prr") why="Needs both "+LX.pos+" and "+LX.neg+" "+LX.items+".";
      setRow(rows[F.fam],v[id],dir,fill(m.gloss),why);
    });
    renderCalPlot(u,c); renderRnkPlot(u,c);
    announce();
  }

  /* ---------- plots ---------- */
  var PG={W:300,H:236,l:40,r:10,t:10,b:44};
  function px(v){return PG.l+v*(PG.W-PG.l-PG.r)}
  function py(v){return PG.H-PG.b-v*(PG.H-PG.t-PG.b)}
  function plotSvg(host){
    var svg=el("svg",{viewBox:"0 0 "+PG.W+" "+PG.H,class:"pg-psvg",role:"img"},$(host));
    var defs=el("defs",{},svg),pat=el("pattern",{id:"pg-gap-"+host,width:5,height:5,patternUnits:"userSpaceOnUse",patternTransform:"rotate(45)"},defs);
    el("line",{x1:0,y1:0,x2:0,y2:5,class:"pg-gap-hatch"},pat);
    return {svg:svg,g:el("g",{},svg),hatch:"url(#pg-gap-"+host+")"};
  }
  function frame(g,xl,yl){
    el("rect",{x:px(0),y:py(1),width:px(1)-px(0),height:py(0)-py(1),class:"pg-frame"},g);
    [0,0.5,1].forEach(function(v){
      var a=el("text",{x:px(v),y:py(0)+15,"text-anchor":"middle",class:"pg-tick"},g);a.textContent=v;
      var b=el("text",{x:px(0)-6,y:py(v)+4,"text-anchor":"end",class:"pg-tick"},g);b.textContent=v;
      if(v===0.5){el("line",{x1:px(v),x2:px(v),y1:py(0),y2:py(1),class:"pg-grid"},g);el("line",{x1:px(0),x2:px(1),y1:py(v),y2:py(v),class:"pg-grid"},g)}
    });
    var xt=el("text",{x:(px(0)+px(1))/2,y:PG.H-8,"text-anchor":"middle",class:"pg-axt"},g);xt.textContent=xl;
    var cy=(py(0)+py(1))/2,yt=el("text",{x:12,y:cy,"text-anchor":"middle",class:"pg-axt",transform:"rotate(-90 12 "+cy+")"},g);yt.textContent=yl;
  }
  function head(which,key,extraNote){
    var p=T.cor.plots[key];
    $("pg-"+which+"-title").textContent=p.title;
    $("pg-"+which+"-note").textContent=fill(p.note)+(extraNote?" "+fill(extraNote):"");
    plots[which].svg.setAttribute("aria-label",p.title);
    plots[which].g.innerHTML="";
    frame(plots[which].g,fill(p.x),fill(p.y));
    return plots[which].g;
  }
  function renderCalPlot(u,c){
    var id=COR.pick.CAL,P=plots.cal;
    if(id==="ace"){
      var g=head("cal","ace");
      el("line",{x1:px(0),y1:py(0),x2:px(1),y2:py(1),class:"pg-diag"},g);
      aceBins(u,c).forEach(function(m){
        if(!m.n) return;
        el("line",{x1:px(m.conf),x2:px(m.conf),y1:py(m.acc),y2:py(m.conf),class:"pg-gapv"},g);
        el("circle",{cx:px(m.conf),cy:py(m.acc),r:3+Math.min(5,m.n),class:"pg-acedot"},g);
      });
      return;
    }
    var g2=head("cal","rel",id==="mce"?T.cor.plots.rel.note_mce:"");
    el("line",{x1:px(0),y1:py(0),x2:px(1),y2:py(1),class:"pg-diag"},g2);
    var bins=reliability(u,c),worst=-1,wv=-1;
    bins.forEach(function(m,i){if(m.n&&Math.abs(m.acc-m.conf)>wv){wv=Math.abs(m.acc-m.conf);worst=i}});
    bins.forEach(function(m,i){
      if(!m.n) return;
      var x0=px(i/BINS)+1.5,w=px(1/BINS)-px(0)-3;
      el("rect",{x:x0,y:py(m.acc),width:w,height:Math.max(0,py(0)-py(m.acc)),class:"pg-bar-acc"+(id==="mce"&&i===worst?" worst":"")},g2);
      var lo=Math.min(m.acc,m.conf),hi=Math.max(m.acc,m.conf);
      if(hi-lo>1e-9) el("rect",{x:x0,y:py(hi),width:w,height:py(lo)-py(hi),class:"pg-bar-gap"+(id==="mce"&&i===worst?" worst":""),fill:P.hatch},g2);
      el("line",{x1:x0,x2:x0+w,y1:py(m.conf),y2:py(m.conf),class:"pg-bar-conf"},g2);
      var t=el("text",{x:x0+w/2,y:py(Math.max(m.acc,m.conf))-4,"text-anchor":"middle",class:"pg-cnt"},g2);t.textContent=m.n;
    });
  }
  function stepPath(xs,ys){ /* horizontal steps: segment i spans xs[i]…xs[i+1] at height ys[i] */
    var d="M"+px(xs[0])+","+py(ys[0]);
    for(var i=0;i<ys.length;i++) d+="L"+px(xs[i])+","+py(ys[i])+"L"+px(xs[i+1])+","+py(ys[i]);
    return d;
  }
  function tauMark(g,x,label,right){
    el("line",{x1:px(x),x2:px(x),y1:py(0),y2:py(1),class:"pg-covtau"},g);
    var t=el("text",{x:px(x)+(right?-4:4),y:py(1)+12,"text-anchor":right?"end":"start",class:"pg-covlab"},g);t.textContent=label;
  }
  function renderRnkPlot(u,c){
    var id=COR.pick.RNK,m=metricDef(id),n=u.length,g,i;
    var acc=u.filter(function(v){return v<COR.tau}).length/n;
    if(m.plot==="roc"){
      g=head("rnk","roc");
      el("line",{x1:px(0),y1:py(0),x2:px(1),y2:py(1),class:"pg-rnd"},g);
      var pts=rocCurve(u,c);if(!pts) return;
      var d=pts.map(function(p,j){return (j?"L":"M")+px(p[0])+","+py(p[1])}).join("");
      el("path",{d:d+"L"+px(1)+","+py(0)+"Z",class:"pg-area"},g);
      el("path",{d:d,class:"pg-curve"},g);
      /* τ's operating point on the curve */
      var P=sum(c),N=n-P,tp=0,fp=0;
      for(i=0;i<n;i++)if(u[i]<COR.tau){if(c[i])tp++;else fp++}
      el("circle",{cx:px(fp/N),cy:py(tp/P),r:4.5,class:"pg-op"},g);
      var lab=el("text",{x:px(fp/N)+(fp/N>0.6?-8:8),y:py(tp/P)+(tp/P<0.15?-8:14),"text-anchor":fp/N>0.6?"end":"start",class:"pg-covlab"},g);lab.textContent="τ";
      return;
    }
    if(m.plot==="pr"){
      g=head("rnk","pr");
      var base=mean(c);
      el("line",{x1:px(0),x2:px(1),y1:py(base),y2:py(base),class:"pg-rnd"},g);
      var pr=prCurve(u,c);if(!pr) return;
      var xs=[0],ys=[];pr.forEach(function(p){xs.push(p[0]);ys.push(p[1])});
      var dp=stepPath(xs,ys);
      el("path",{d:dp+"L"+px(xs[xs.length-1])+","+py(0)+"L"+px(0)+","+py(0)+"Z",class:"pg-area"},g);
      el("path",{d:dp,class:"pg-curve"},g);
      return;
    }
    var r=riskCurve(u,c),o=oracleCurve(c),rnd=aurcRandom(u,c),xs2=[];
    for(i=0;i<=n;i++) xs2.push(i/n);
    if(m.plot==="arc"){ /* x = rejected fraction: retain n−j for segment j */
      g=head("rnk","arc");
      var ya=[],yo=[];for(i=0;i<n;i++){ya.push(1-r[n-1-i]);yo.push(1-o[n-1-i])}
      var da=stepPath(xs2,ya);
      el("path",{d:da+"L"+px(1)+","+py(0)+"L"+px(0)+","+py(0)+"Z",class:"pg-area"},g);
      el("line",{x1:px(0),x2:px(1),y1:py(1-rnd),y2:py(1-rnd),class:"pg-rnd"},g);
      el("path",{d:stepPath(xs2,yo),class:"pg-orc"},g);
      el("path",{d:da,class:"pg-curve"},g);
      tauMark(g,1-acc,"τ: rejected "+f2(1-acc),1-acc>0.5);
      return;
    }
    g=head("rnk","rc",id==="prr"?T.cor.plots.rc.note_prr:"");
    var dr=stepPath(xs2,r);
    el("path",{d:dr+"L"+px(1)+","+py(0)+"L"+px(0)+","+py(0)+"Z",class:"pg-area"},g);
    el("line",{x1:px(0),x2:px(1),y1:py(rnd),y2:py(rnd),class:"pg-rnd"},g);
    el("path",{d:stepPath(xs2,o),class:"pg-orc"},g);
    el("path",{d:dr,class:"pg-curve"},g);
    tauMark(g,acc,"τ: coverage "+f2(acc),acc>0.5);
  }

  /* ---------- faithfulness ---------- */
  var SC={W:360,H:360,l:46,r:12,t:12,b:46};
  function sx(v){return SC.l+v*(SC.W-SC.l-SC.r)}
  function sy(v){return SC.H-SC.b-v*(SC.H-SC.t-SC.b)}
  function buildFth(){
    var P=$("pg-fth"),t=T.fth;
    P.innerHTML=
      '<p class="pg-sub">'+t.sub+'</p>'+
      '<div class="pg-presets"><span class="pg-flab" id="pg-fth-plab">Preset</span><span class="seg" role="group" aria-labelledby="pg-fth-plab" id="pg-fth-presets"></span></div>'+
      '<p class="pg-pcap" id="pg-fth-cap"></p>'+
      '<div class="pg-fgrid">'+
        '<div class="pg-scat"><div id="pg-scat"></div><p class="pg-info mono" id="pg-info" aria-hidden="true"></p></div>'+
        '<div><div class="pg-readout" id="pg-fth-readout"></div>'+
        '<p class="pg-moral" data-m="FTH">'+esc(t.caption)+'</p></div>'+
      '</div>'+
      '<table class="pg-sr" id="pg-fth-table"><caption>Current answers</caption><thead><tr><th scope="col">#</th><th scope="col">'+esc(t.short[0])+'</th><th scope="col">'+esc(t.short[1])+'</th><th scope="col">f</th></tr></thead><tbody></tbody></table>';
    var g=$("pg-fth-presets");
    t.presets.forEach(function(p){
      var b=document.createElement("button");
      b.type="button";b.dataset.preset=p.id;b.textContent=p.label;b.setAttribute("aria-pressed","false");
      b.addEventListener("click",function(){applyFth(p.id)});
      g.appendChild(b);
    });
    scat.rows={};
    t.metrics.forEach(function(m){scat.rows[m.id]=makeRow($("pg-fth-readout"),m.fam,m.name,[m])});
    var svg=el("svg",{viewBox:"0 0 "+SC.W+" "+SC.H,class:"pg-ssvg",role:"group","aria-label":t.short[0]+" against "+t.short[1]},$("pg-scat"));
    scat.svg=svg;
    var ax=el("g",{class:"pg-axis","aria-hidden":"true"},svg);
    for(var i=0;i<BINS;i++) if(i%2) el("rect",{x:sx(i/BINS),y:sy(1),width:sx(0.1)-sx(0),height:sy(0)-sy(1),class:"pg-bin"},ax);
    el("rect",{x:sx(0),y:sy(1),width:sx(1)-sx(0),height:sy(0)-sy(1),class:"pg-frame"},ax);
    [0,0.5,1].forEach(function(v){
      var a=el("text",{x:sx(v),y:sy(0)+16,"text-anchor":"middle",class:"pg-tick"},ax);a.textContent=v;
      var b=el("text",{x:sx(0)-7,y:sy(v)+4,"text-anchor":"end",class:"pg-tick"},ax);b.textContent=v;
    });
    var xl=el("text",{x:(sx(0)+sx(1))/2,y:SC.H-10,"text-anchor":"middle",class:"pg-axt"},ax);xl.textContent=t.x;
    var cy=(sy(0)+sy(1))/2,yl=el("text",{x:13,y:cy,"text-anchor":"middle",class:"pg-axt",transform:"rotate(-90 13 "+cy+")"},ax);yl.textContent=t.y;
    el("line",{x1:sx(0),y1:sy(0),x2:sx(1),y2:sy(1),class:"pg-diag"},ax);
    var dl=el("text",{x:sx(0.98),y:sy(0.03),"text-anchor":"end",class:"pg-tick"},ax);dl.textContent="dashed diagonal = faithful";
    scat.gaps=el("g",{class:"pg-gaps","aria-hidden":"true"},svg);
    scat.pts=el("g",{},svg);
    scat.nodes={};
  }
  function toXY(cx,cy){
    var m=scat.svg.getScreenCTM();if(!m) return null;
    var pt=scat.svg.createSVGPoint();pt.x=cx;pt.y=cy;var q=pt.matrixTransform(m.inverse());
    return {x:snap((q.x-SC.l)/(SC.W-SC.l-SC.r)),y:snap((SC.H-SC.b-q.y)/(SC.H-SC.t-SC.b))};
  }
  function fLabel(p){var s=T.fth.short;return s[0]+" "+f2(p.x)+" · "+s[1]+" "+f2(p.y)+" · f = "+f2(1-Math.abs(p.y-p.x))}
  function makeF(p){
    var g=el("g",{class:"pg-pt fp",role:"slider",tabindex:-1,"aria-roledescription":"draggable point","aria-valuemin":0,"aria-valuemax":1,"aria-describedby":"pg-keys"},scat.pts);
    el("circle",{r:12,class:"pg-hit"},g);el("circle",{r:10.5,class:"pg-ring"},g);el("circle",{r:6,class:"pg-dot"},g);
    drag(g,function(cx,cy){var q=toXY(cx,cy);if(!q)return;p.x=q.x;p.y=q.y;edited();renderFth()},function(){FTH.sel=p.id;renderFth()});
    g.addEventListener("focus",function(){if(FTH.sel!==p.id){FTH.sel=p.id;renderFth()}});
    g.addEventListener("pointerenter",function(){$("pg-info").textContent=fLabel(p)});
    g.addEventListener("pointerleave",function(){var s=fSel();$("pg-info").textContent=s?fLabel(s):""});
    g.addEventListener("keydown",function(e){
      var s=e.shiftKey?0.1:0.01,k=e.key;
      if(k==="ArrowRight")p.x=snap(p.x+s); else if(k==="ArrowLeft")p.x=snap(p.x-s);
      else if(k==="ArrowUp")p.y=snap(p.y+s); else if(k==="ArrowDown")p.y=snap(p.y-s);
      else if(k==="n"||k==="N"||k==="p"||k==="P"){
        var l=FTH.pts.slice().sort(function(a,b){return a.x-b.x||a.id-b.id}),i=l.indexOf(p),j=(k==="n"||k==="N")?Math.min(l.length-1,i+1):Math.max(0,i-1);
        FTH.sel=l[j].id;renderFth();scat.nodes[l[j].id].focus({preventScroll:true});e.preventDefault();return;
      }
      else return;
      e.preventDefault();edited();renderFth();
    });
    return g;
  }
  function fSel(){for(var i=0;i<FTH.pts.length;i++)if(FTH.pts[i].id===FTH.sel)return FTH.pts[i];return null}
  function renderFth(){
    if(!scat.svg) return;
    var x=FTH.pts.map(function(p){return p.x}),y=FTH.pts.map(function(p){return p.y});
    var rov=FTH.sel;if(!fSel()&&FTH.pts.length)rov=FTH.pts.slice().sort(function(a,b){return a.x-b.x})[0].id;
    scat.gaps.innerHTML="";
    var seen={};
    FTH.pts.forEach(function(p){
      var g=scat.nodes[p.id]||(scat.nodes[p.id]=makeF(p));
      seen[p.id]=1;
      g.setAttribute("transform","translate("+sx(p.x)+","+sy(p.y)+")");
      g.setAttribute("aria-label",fLabel(p));g.setAttribute("aria-valuenow",p.x);g.setAttribute("aria-valuetext",fLabel(p));
      g.setAttribute("tabindex",p.id===rov?0:-1);
      g.classList.toggle("sel",p.id===FTH.sel);
      el("line",{x1:sx(p.x),x2:sx(p.x),y1:sy(p.x),y2:sy(p.y),class:"pg-gapline"},scat.gaps);
    });
    Object.keys(scat.nodes).forEach(function(id){if(!seen[id]){scat.nodes[id].remove();delete scat.nodes[id]}});
    var s=fSel();$("pg-info").textContent=s?fLabel(s):"";
    T.fth.metrics.forEach(function(m){
      var v=m.id==="spearman"?spearman(x,y):cmfg(x,y);
      setRow(scat.rows[m.id],v,esc(m.dir),m.gloss,"Rank correlation is undefined when one signal is constant.");
    });
    announce();
  }

  /* ---------- presets, edits, tables ---------- */
  function edited(){
    var tab=$("pg-fth").hidden?"cor":"fth",S=tab==="cor"?COR:FTH;
    if(S.preset){S.preset=null;syncPresets(tab)}
  }
  function syncPresets(tab){
    var S=tab==="cor"?COR:FTH,t=T[tab];
    $("pg-"+tab+"-presets").querySelectorAll("[data-preset]").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.preset===S.preset))});
    var p=t.presets.filter(function(q){return q.id===S.preset})[0],capEl=$("pg-"+tab+"-cap");
    if(tab==="cor"&&S.preset==="real"&&REAL){capEl.textContent=realCaption();capEl.classList.remove("edited");return}
    capEl.textContent=fill(p?p.caption:t.edited);
    capEl.classList.toggle("edited",!p);
  }
  function applyCor(id){
    if(id==="real") return applyReal(COR.src);
    var p=T.cor.presets.filter(function(q){return q.id===id})[0];if(!p) return false;
    COR.dense=false;
    COR.pts=p.pos.map(function(u){return {id:++uid,u:u,c:1}}).concat(p.neg.map(function(u){return {id:++uid,u:u,c:0}}));
    COR.tau=p.tau;COR.preset=id;COR.sel=null;
    syncPresets("cor");renderCor();return true;
  }
  /* real-data preset: c = 1 − incorrect (the playground's positive class is correct; the paper's is incorrect) */
  function applyReal(src){
    if(!REAL){pendingReal=true;return false}
    if(COR.target!=="COR") $("pg-tab-cor").click();
    COR.src=src==="se"?"se":"msp";
    var mx=REAL.se_max;
    COR.pts=REAL.msp.map(function(m,i){
      return {id:++uid,u:COR.src==="se"?Math.min(1,REAL.se[i]/mx):1-m,c:1-REAL.incorrect[i]};
    });
    COR.tau=0.5;COR.preset="real";COR.sel=null;COR.dense=true;
    syncPresets("cor");renderCor();return true;
  }
  function realCaption(){
    var npos=REAL.incorrect.filter(function(v){return !v}).length,m=REAL.model;
    return T.cor.real_data.caption.replace(/\{(\w+)\}/g,function(a,k){
      return {n:REAL.n,npos:npos,nneg:REAL.n-npos,model:(POCMETA&&POCMETA.models[m])||m,model_full:(POCMETA&&POCMETA.model_full[m])||m}[k]||a;
    });
  }
  function loadReal(){
    if(!T.cor.real_data) return;
    function got(d){
      if(!d||!d.playground_real) return;
      REAL=d.playground_real;POCMETA=d.meta;
      var rb=$("pg-real");if(rb){rb.disabled=false;rb.removeAttribute("title")}
      if(pendingReal){pendingReal=false;applyReal(COR.src)}
    }
    var s=document.getElementById("poc-data");
    if(s){got(JSON.parse(s.textContent));return}
    fetch(BASE+"poc.json?v="+POCV).then(function(r){if(!r.ok)throw new Error("poc.json "+r.status);return r.json()}).then(got)
      .catch(function(e){var rb=$("pg-real");if(rb)rb.title="The proof-of-concept data could not load.";console.error(e)});
  }
  function applyFth(id){
    var p=T.fth.presets.filter(function(q){return q.id===id})[0];if(!p) return false;
    FTH.pts=p.points.map(function(q){return {id:++uid,x:q[0],y:q[1]}});FTH.preset=id;FTH.sel=null;
    syncPresets("fth");renderFth();return true;
  }
  function updateTables(){
    var tb=$("pg-cor-table").tBodies[0];
    tb.innerHTML=COR.pts.slice().sort(function(a,b){return a.u-b.u}).map(function(p,i){
      return "<tr><td>"+(i+1)+"</td><td>"+(p.c?LX.pos:LX.neg)+"</td><td>"+f2(p.u)+"</td><td>"+(p.u<COR.tau?"accept":"reject")+"</td></tr>"}).join("");
    var tf=$("pg-fth-table").tBodies[0];
    tf.innerHTML=FTH.pts.slice().sort(function(a,b){return a.x-b.x}).map(function(p,i){
      return "<tr><td>"+(i+1)+"</td><td>"+f2(p.x)+"</td><td>"+f2(p.y)+"</td><td>"+f2(1-Math.abs(p.y-p.x))+"</td></tr>"}).join("");
  }

  /* ---------- deep link: #playground?tab=fth&preset=…, #playground?target=GRD&preset=… ---------- */
  function applyHash(scroll){
    var h=location.hash||"";
    if(h.indexOf("#playground?")!==0) return false;
    var q={};h.slice(12).split("&").forEach(function(kv){var a=kv.split("=");q[decodeURIComponent(a[0])]=decodeURIComponent(a[1]||"")});
    var tab=String(q.tab||q.target||"").toLowerCase();
    if(q.preset==="real"&&!tab) tab="cor";
    if(["cor","grd","uns","fth"].indexOf(tab)<0) tab=null;
    if(!tab&&q.preset) tab=T.fth.presets.some(function(p){return p.id===q.preset})?"fth":"cor";
    if(tab) $("pg-tab-"+tab).click();
    if(q.preset){if(tab==="fth")applyFth(q.preset);else applyCor(q.preset)}
    UQL.subHash=UQL.subHash||{};
    var subs=(UQL.subHash.demos||[]).filter(function(x){return x.indexOf("playground?")!==0});subs.push(h.slice(1));UQL.subHash.demos=subs;
    if(scroll) root.scrollIntoView({behavior:"instant",block:"start"});
    return true;
  }

  /* ---------- boot ---------- */
  function build(text,headline){
    T=text;H=headline;LX=T.targets[COR.target];
    $("pg-title").textContent=T.title;
    $("pg-lede").innerHTML=esc(T.lede)+" "+fill(T.survey_line);
    Object.keys(T.tabs).forEach(function(k){$("pg-tab-"+k.toLowerCase()).lastChild.textContent=" "+T.tabs[k]});
    $("pg-linkout").innerHTML=T.linkout;
    $("pg-keys").textContent=T.keys;
    buildCor();buildFth();
    setTarget(COR.target);
    applyCor(T.cor.default_preset);applyFth(T.fth.default_preset);
    /* the three binary tabs share #pg-bin: move it into the opened panel and switch the target */
    root.addEventListener("uql:tab",function(e){
      var k=(e.detail.panel||"").replace("pg-","").toUpperCase();
      if(T.targets[k]&&k!==COR.target) setTarget(k);
      announce();
    });
    var open=root.querySelector('[role="tab"][aria-selected="true"]');
    if(open){var k0=open.getAttribute("aria-controls").replace("pg-","").toUpperCase();if(T.targets[k0]&&k0!==COR.target)setTarget(k0)}
    var jumped=applyHash(false);
    window.addEventListener("hashchange",function(){applyHash(true)});
    loadReal();
    root.classList.add("ready");
    if(jumped) requestAnimationFrame(function(){root.scrollIntoView({behavior:"instant",block:"start"})});
  }
  function inline(id){var s=document.getElementById(id);return s?JSON.parse(s.textContent):null}
  function init(){
    root=$("playground");
    if(!root||!$("pg-cor")) return;
    var it=inline("pg-data-text"),ih=inline("pg-data-headline");
    if(it&&ih){build(it,ih);return}
    function get(u){return fetch(BASE+u+"?v="+V).then(function(r){if(!r.ok)throw new Error(u+" "+r.status);return r.json()})}
    Promise.all([get("playground.json"),get("papers.json")]).then(function(a){build(a[0],a[1].sankey.headline)})
      .catch(function(e){var s=$("pg-status");if(s)s.textContent="The metric playground could not load its data ("+e.message+").";console.error(e)});
  }
  UQL.playground={init:init};
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();
