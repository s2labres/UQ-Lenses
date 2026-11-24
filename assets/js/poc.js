/* Demo 5b · confidence cutoff (brief 10). The interactive version of the paper's Figure "correct-confidence"
   (and the two appendix figures): DecBase AUPRC per lens as the MSP lower-percentile cutoff rises.
   Data: ./data/poc.json (built by poc-section/scripts/build_poc_json.py). The preview embeds it as
   <script type="application/json" id="poc-data">; when absent the file is fetched.
   One widget (#poc-w) is moved into whichever model tab is open, so dataset, cutoff and CI toggle persist.
   Deep link: #poc-demo?model=llama-inst&data=mmlu&cutoff=50&est=1&lens=rep */
(function(){
  "use strict";
  var V="20261124d", BASE="./data/", NS="http://www.w3.org/2000/svg";
  var LENS={str:{name:"Structural"},rep:{name:"Representational"},dis:{name:"Distributional"},sem:{name:"Semantical"}};
  var ORDER=["str","rep","dis","sem"], DSORD=["triviaqa","popqa","mmlu"];
  var D, root, S={model:"qwen_inst",ds:"triviaqa",i:0,ci:true,est:false,focus:null}, G={}, liveT=null;

  function $(id){return document.getElementById(id)}
  function el(tag,a,p){var e=document.createElementNS(NS,tag);for(var k in a)if(a[k]!==null&&a[k]!==undefined)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e}
  function f3(v){return (Math.abs(v)<5e-4?0:v).toFixed(3)}
  function sg(v){var s=f3(v);return (+s>0?"+":+s<0?"−":"")+s.replace("-","")}
  function pct(p){return (+p.toFixed(2)).toString()}
  function cell(){return D.cutoff_curves[S.model][S.ds]}
  function modelKey(tabId){return tabId.replace("poc-tab-","").replace("-","_")}

  /* lens markers: str ● circle, rep ■ square, dis ▲ triangle, sem ◆ diamond (shape + 3-letter code, never colour alone) */
  function markPath(l,r){
    if(l==="str") return "M"+(-r)+",0a"+r+","+r+" 0 1,0 "+(2*r)+",0a"+r+","+r+" 0 1,0 "+(-2*r)+",0Z";
    if(l==="rep"){var s=r*0.9;return "M"+(-s)+","+(-s)+"H"+s+"V"+s+"H"+(-s)+"Z"}
    if(l==="dis"){var t=r*1.2;return "M0,"+(-t)+"L"+(t*0.95)+","+(t*0.7)+"L"+(-t*0.95)+","+(t*0.7)+"Z"}
    var q=r*1.25;return "M0,"+(-q)+"L"+q+",0L0,"+q+"L"+(-q)+",0Z";
  }
  function markSvgE(l){return '<svg class="poc-mk e" viewBox="-7 -7 14 14" aria-hidden="true" data-l="'+l+'"><path d="'+markPath(l,4.2)+'"/></svg>'}
  function markSvg(l){return '<svg class="poc-mk" viewBox="-7 -7 14 14" aria-hidden="true" data-l="'+l+'"><path d="'+markPath(l,4.6)+'"/></svg>'}

  /* ---------- build ---------- */
  function build(){
    var w=document.createElement("div");w.id="poc-w";w.className="poc-w";
    w.innerHTML=
      '<div class="poc-ctrl"><span class="poc-flab" id="poc-flab">Show</span>'+
        '<span class="poc-seg poc-focus" role="group" aria-labelledby="poc-flab">'+
          '<button type="button" data-f="" aria-pressed="true">All lenses</button>'+
          ORDER.map(function(l){return '<button type="button" data-f="'+l+'" data-l="'+l+'" aria-pressed="false" aria-label="'+LENS[l].name+' lens and its estimator">'+markSvg(l)+'<b>'+l+'</b></button>'}).join("")+
        '</span>'+
        '<button type="button" class="btn sm" id="poc-ci" aria-pressed="true">95% CI</button>'+
        '<button type="button" class="btn sm" id="poc-est" aria-pressed="false">UQ estimators</button>'+
      '</div>'+
      '<p class="poc-estnote" id="poc-estnote" hidden></p>'+
      '<p class="poc-mmlu" id="poc-mmlu" hidden>MMLU is a sanity check. Its answers are single-option letters, so g<sub>R</sub> has no lexical form to discard from the distributional lens.</p>'+
      '<div class="poc-legend" id="poc-legend" aria-hidden="true">'+ORDER.map(function(l){return '<span data-l="'+l+'">'+markSvg(l)+'<b>'+l+'</b> '+LENS[l].name+'</span>'}).join("")+
        '<span class="poc-lg-ch"><i></i>chance</span></div>'+
      '<div class="poc-grid">'+
        '<figure class="poc-fig"><div class="poc-chart" id="poc-chart"></div></figure>'+
        '<div class="poc-read" id="poc-read" aria-describedby="poc-keys"></div>'+
      '</div>'+
      '<details class="poc-tbl" id="poc-tbl"><summary>Show as table</summary><div class="poc-tblwrap" id="poc-tblwrap"></div></details>';
    /* dataset switch: on the model-tab line (#poc-ds-slot), outside the moving widget */
    var seg=document.createElement("span");seg.className="poc-seg";seg.setAttribute("role","group");seg.setAttribute("aria-labelledby","poc-dslab");
    seg.innerHTML=DSORD.map(function(k){return '<button type="button" data-ds="'+k+'" aria-pressed="false">'+D.meta.datasets[k]+'</button>'}).join("");
    seg.querySelectorAll("[data-ds]").forEach(function(b){b.addEventListener("click",function(){setDs(b.dataset.ds)})});
    var slot=$("poc-ds-slot");
    if(slot){slot.innerHTML='<span class="poc-flab" id="poc-dslab">Dataset</span>';slot.appendChild(seg)} else {var r=document.createElement("div");r.className="poc-ctrl";r.appendChild(seg);w.insertBefore(r,w.firstChild)}
    w.querySelector("#poc-ci").addEventListener("click",function(){S.ci=!S.ci;render()});
    w.querySelector("#poc-est").addEventListener("click",function(){S.est=!S.est;render()});
    w.querySelectorAll("[data-f]").forEach(function(b){b.addEventListener("click",function(){S.focus=b.dataset.f||null;render()})});
    buildChart(w.querySelector("#poc-chart"));
    return w;
  }
  function place(){
    var panel=$("poc-"+S.model.replace("_","-")),w=$("poc-w");
    if(w.parentNode!==panel) panel.appendChild(w);
  }
  function setDs(k){
    if(!D.cutoff_curves[S.model][k]) return;
    var p=cell().percentiles[S.i];S.ds=k;S.i=nearest(p);render();
  }
  function nearest(p){var P=cell().percentiles,b=0;P.forEach(function(q,i){if(Math.abs(q-p)<Math.abs(P[b]-p))b=i});return b}

  /* ---------- chart ---------- */
  function buildChart(host){
    var svg=el("svg",{class:"poc-svg",role:"group","aria-label":"AUPRC by MSP cutoff"},host);
    G.svg=svg;G.host=host;
    G.g=el("g",{},svg);
    G.over=el("rect",{class:"poc-over"},svg);
    G.handle=el("g",{class:"poc-handle",tabindex:0,role:"slider","aria-label":"MSP lower-percentile cutoff","aria-describedby":"poc-keys"},svg);
    el("rect",{x:-19,y:0,width:38,height:20,rx:5,class:"poc-h"},G.handle);
    G.hText=el("text",{x:0,y:14,"text-anchor":"middle",class:"poc-ht"},G.handle);
    el("rect",{x:-24,y:-4,width:48,height:28,class:"poc-hit"},G.handle);
    G.handle.addEventListener("keydown",function(e){
      var n=cell().percentiles.length,j=null;
      if(e.key==="ArrowRight"||e.key==="ArrowUp") j=Math.min(n-1,S.i+1);
      else if(e.key==="ArrowLeft"||e.key==="ArrowDown") j=Math.max(0,S.i-1);
      else if(e.key==="Home") j=0; else if(e.key==="End") j=n-1;
      else if(e.key==="PageUp") j=Math.min(n-1,S.i+3); else if(e.key==="PageDown") j=Math.max(0,S.i-3);
      if(j===null) return;
      e.preventDefault();if(j!==S.i){S.i=j;render()}
    });
    function fromX(cx){
      var r=svg.getBoundingClientRect(),x=(cx-r.left)*G.W/r.width,P=cell().percentiles,b=0;
      P.forEach(function(p,i){if(Math.abs(G.x(p)-x)<Math.abs(G.x(P[b])-x))b=i});
      if(b!==S.i){S.i=b;render()}
    }
    [G.over,G.handle].forEach(function(node){
      node.addEventListener("pointerdown",function(e){
        if(e.button!==undefined&&e.button!==0) return;
        if(node===G.handle) e.preventDefault();
        fromX(e.clientX);
        try{node.setPointerCapture(e.pointerId)}catch(err){}
        if(node===G.handle) node.focus({preventScroll:true});
        function mv(ev){fromX(ev.clientX)}
        function up(){node.removeEventListener("pointermove",mv);node.removeEventListener("pointerup",up);node.removeEventListener("pointercancel",up)}
        node.addEventListener("pointermove",mv);node.addEventListener("pointerup",up);node.addEventListener("pointercancel",up);
      });
    });
    var w0=0;
    function chk(){var w=host.clientWidth;if(w&&w!==w0){w0=w;render()}}
    if(window.ResizeObserver) new ResizeObserver(chk).observe(host); else window.addEventListener("resize",chk);
  }
  function niceStep(span,target){
    var raw=span/target,mag=Math.pow(10,Math.floor(Math.log10(raw))),n=raw/mag;
    return (n<1.5?1:n<3?2:n<7?5:10)*mag;
  }
  function layout(hasD){
    var W=Math.max(300,G.host.clientWidth||640),narrow=W<560;
    var L={W:W,narrow:narrow,l:narrow?40:46,r:narrow?10:58,t:36,mainH:narrow?210:260,tick:20,gap:narrow?34:40,dH:narrow?70:84,axt:34};
    L.mainB=L.t+L.mainH;
    if(hasD){L.dT=L.mainB+L.tick+L.gap;L.dB=L.dT+L.dH}else{L.dT=L.dB=L.mainB}
    L.H=L.dB+L.tick+L.axt;
    return L;
  }
  function render(){
    if(!D||!G.svg) return;
    place();
    var C=cell(),P=C.percentiles,n=P.length,hasD=!!(C.auroc||C.d_unemb),L=layout(hasD),g=G.g,i,l;
    /* VL: lenses drawn (one when a lens is focused); EL: estimators drawn (the focused lens's always, else all when toggled) */
    var VL=S.focus?[S.focus]:ORDER,EL=C.est&&(S.focus||S.est)?VL.filter(function(k){return C.est[k]}):[],E=null;
    if(EL.length){E={};EL.forEach(function(k){E[k]=C.est[k]})}
    if(S.focus&&EL.length&&!L.narrow) L.r=86;
    G.W=L.W;
    G.svg.setAttribute("viewBox","0 0 "+L.W+" "+L.H);
    g.innerHTML="";
    root.querySelectorAll("[data-ds]").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.ds===S.ds))});
    $("poc-ci").setAttribute("aria-pressed",String(S.ci));
    $("poc-est").hidden=!C.est||!!S.focus;$("poc-est").setAttribute("aria-pressed",String(S.est));
    root.querySelectorAll("#poc-w [data-f]").forEach(function(b){b.setAttribute("aria-pressed",String((b.dataset.f||null)===S.focus))});
    estNote(C,VL,EL);
    $("poc-legend").classList.toggle("show",L.narrow);
    var lg=$("poc-legend");lg.querySelectorAll(".poc-lg-e").forEach(function(e){e.remove()});
    lg.querySelectorAll("span[data-l]").forEach(function(sp){sp.hidden=VL.indexOf(sp.dataset.l)<0});
    if(S.focus) EL.forEach(function(l){var sp=document.createElement("span");sp.className="poc-lg-e";sp.dataset.l=l;
      sp.innerHTML=markSvgE(l)+'<b>'+E[l].name+'</b>';lg.appendChild(sp)});
    $("poc-mmlu").hidden=S.ds!=="mmlu";
    if($("poc-note-d")) $("poc-note-d").hidden=!hasD;
    var X0=0,X1=70;
    var x=G.x=function(p){return L.l+(p-X0)/(X1-X0)*(L.W-L.l-L.r)};
    var sh=C.shaded,firstSh=sh.indexOf(true),lastOk=firstSh<0?n-1:firstSh-1;
    /* y range: the lens lines (all cutoffs) and their CI where unshaded; chance only if it is close, else clipped and noted */
    var lo=1,hi=0;
    VL.forEach(function(l){for(i=0;i<n;i++){var v=C.auprc[l][i];lo=Math.min(lo,v);hi=Math.max(hi,v);if(!sh[i]&&S.ci){lo=Math.min(lo,C.ci95[l][i][0]);hi=Math.max(hi,C.ci95[l][i][1])}}});
    EL.forEach(function(l){E[l].auprc.forEach(function(v){if(v!==null){lo=Math.min(lo,v);hi=Math.max(hi,v)}})});
    var chMin=Math.min.apply(null,C.chance),chMax=Math.max.apply(null,C.chance),span=Math.max(0.05,hi-lo);
    var clipChance=chMin<lo-span*0.8;
    if(!clipChance){lo=Math.min(lo,chMin);hi=Math.max(hi,chMax)}
    var st=niceStep(Math.max(0.05,hi-lo),L.narrow?4:5),y0=Math.max(0,Math.floor((lo-st*0.25)/st)*st),y1=Math.min(1,Math.ceil((hi+st*0.1)/st)*st);
    if(y1-y0<st*2) y1=Math.min(1,y0+st*2);
    var y=function(v){return L.mainB-(v-y0)/(y1-y0)*L.mainH};
    var xR=x(X1),xL=x(X0);
    /* defs: clip to the main plot */
    var defs=el("defs",{},g),cp=el("clipPath",{id:"poc-clip"},defs);el("rect",{x:xL,y:L.t,width:xR-xL,height:L.mainH},cp);
    var cp2=el("clipPath",{id:"poc-clip2"},defs);el("rect",{x:xL,y:L.dT,width:xR-xL,height:L.dH},cp2);
    /* shading: from midway between the last unshaded and the first shaded cutoff */
    var shX=firstSh<0?null:(firstSh===0?xL:(x(P[firstSh-1])+x(P[firstSh]))/2);
    if(shX!==null){
      el("rect",{x:shX,y:L.t,width:xR-shX,height:L.mainH,class:"poc-shade"},g);
      if(hasD) el("rect",{x:shX,y:L.dT,width:xR-shX,height:L.dH,class:"poc-shade"},g);
      el("line",{x1:shX,x2:shX,y1:L.t,y2:L.mainB,class:"poc-shline"},g);
      if(hasD) el("line",{x1:shX,x2:shX,y1:L.dT,y2:L.dB,class:"poc-shline"},g);
      if(xR-shX>70){var stx=el("text",{x:(shX+xR)/2,y:L.mainB-8,"text-anchor":"middle",class:"poc-shtxt"},g);stx.textContent="≤ 50 incorrect"}
    }
    /* grid + y ticks */
    for(var v=y0;v<=y1+1e-9;v+=st){
      el("line",{x1:xL,x2:xR,y1:y(v),y2:y(v),class:"poc-gl"},g);
      var tt=el("text",{x:xL-6,y:y(v)+4,"text-anchor":"end",class:"poc-tick"},g);tt.textContent=(+v.toFixed(3)).toString();
    }
    el("rect",{x:xL,y:L.t,width:xR-xL,height:L.mainH,class:"poc-frame"},g);
    var xstep=L.W<420?20:10;
    for(var p=0;p<=X1;p+=xstep){
      (hasD?[L.mainB,L.dB]:[L.mainB]).forEach(function(yb){
        el("line",{x1:x(p),x2:x(p),y1:yb,y2:yb+4,class:"poc-axl"},g);
        var t=el("text",{x:x(p),y:yb+16,"text-anchor":"middle",class:"poc-tick"},g);t.textContent=p;
      });
    }
    var cy=(L.t+L.mainB)/2,yt=el("text",{x:12,y:cy,"text-anchor":"middle",class:"poc-axt",transform:"rotate(-90 12 "+cy+")"},g);yt.textContent="AUPRC";
    var xt=el("text",{x:(xL+xR)/2,y:L.H-8,"text-anchor":"middle",class:"poc-axt"},g);xt.textContent="MSP lower-percentile cutoff (%)";
    /* chance: dashed grey steps (the error rate of the kept questions) */
    var gm=el("g",{"clip-path":"url(#poc-clip)"},g);
    var dch="";
    for(i=0;i<n;i++){var xa=x(P[i]),xb=i<n-1?x(P[i+1]):x(P[i]);dch+=(i?"L":"M")+xa+","+y(C.chance[i])+"L"+xb+","+y(C.chance[i])}
    el("path",{d:dch,class:"poc-chance"},gm);
    if(clipChance){
      var cn=el("text",{x:xL+6,y:L.mainB-6,class:"poc-chnote"},g);
      cn.textContent="chance "+C.chance[0].toFixed(2)+" → "+C.chance[n-1].toFixed(2)+", below the axis";
    }
    /* CI bands, unshaded cutoffs only */
    if(S.ci) VL.forEach(function(l){
      if(lastOk<1) return;
      var up="",dn="";
      for(i=0;i<=lastOk;i++){up+=(i?"L":"M")+x(P[i])+","+y(C.ci95[l][i][1])}
      for(i=lastOk;i>=0;i--){dn+="L"+x(P[i])+","+y(C.ci95[l][i][0])}
      el("path",{d:up+dn+"Z",class:"poc-band","data-l":l},gm);
    });
    /* lines: solid where unshaded, dashed and faded where shaded */
    VL.slice().reverse().forEach(function(l){
      var a=C.auprc[l],ds="",dd="";
      for(i=0;i<=lastOk;i++) ds+=(i?"L":"M")+x(P[i])+","+y(a[i]);
      if(lastOk<n-1) for(i=Math.max(0,lastOk);i<n;i++) dd+=(i===Math.max(0,lastOk)?"M":"L")+x(P[i])+","+y(a[i]);
      if(dd) el("path",{d:dd,class:"poc-line dash","data-l":l},gm);
      if(ds) el("path",{d:ds,class:"poc-line","data-l":l},gm);
      for(i=0;i<=lastOk;i++) el("path",{d:markPath(l,3.2),transform:"translate("+x(P[i])+","+y(a[i])+")",class:"poc-pt","data-l":l},gm);
    });
    /* UQ estimator overlay (brief 02d): thin dotted lines, hollow markers, same lens colour; faded where shaded */
    EL.forEach(function(l){
      var a=E[l].auprc,ds="",dd="",pen=false;
      for(i=0;i<n;i++){if(a[i]===null){pen=false;continue}
        var pt=x(P[i])+","+y(a[i]);
        if(i<=lastOk){ds+=(pen?"L":"M")+pt}
        if(i>=lastOk&&lastOk<n-1){dd+=(dd&&a[i-1]!==null&&i>Math.max(0,lastOk)?"L":"M")+pt}
        pen=true;
      }
      if(dd) el("path",{d:dd,class:"poc-eline fade","data-l":l},gm);
      if(ds) el("path",{d:ds,class:"poc-eline","data-l":l},gm);
      for(i=0;i<=lastOk;i++) if(a[i]!==null) el("path",{d:markPath(l,3),transform:"translate("+x(P[i])+","+y(a[i])+")",class:"poc-ept","data-l":l},gm);
    });
    /* direct labels at the line ends (wide), de-collided; chance too when visible; the estimator too when one lens is picked */
    if(!L.narrow){
      var xe=x(P[n-1]);
      var labs=VL.map(function(l){var y0=y(C.auprc[l][n-1]);return {l:l,y:y0,y0:y0,x0:xe,t:l}});
      if(S.focus) EL.forEach(function(l){var a=E[l].auprc,k=n-1;while(k>0&&a[k]===null)k--;var y0=y(a[k]);labs.push({l:l,y:y0,y0:y0,x0:x(P[k]),t:E[l].name,e:true})});
      if(!clipChance){var yc=y(C.chance[n-1]);labs.push({l:"ch",y:yc,y0:yc,x0:xe,t:"chance"})}
      labs.sort(function(a,b){return a.y-b.y});
      for(i=1;i<labs.length;i++) if(labs[i].y-labs[i-1].y<13) labs[i].y=labs[i-1].y+13;
      var over=labs[labs.length-1].y-(L.mainB-2);if(over>0) labs.forEach(function(o){o.y-=over});
      for(i=labs.length-2;i>=0;i--) if(labs[i+1].y-labs[i].y<13) labs[i].y=labs[i+1].y-13;
      labs.forEach(function(o){
        el("line",{x1:o.x0+3,x2:xR+4,y1:o.y0,y2:o.y,class:"poc-lead"},g);
        if(o.l!=="ch") el("path",{d:markPath(o.l,3.4),transform:"translate("+(xR+10)+","+o.y+")",class:o.e?"poc-ept":"poc-pt","data-l":o.l},g);
        var t=el("text",{x:o.l==="ch"?xR+6:xR+17,y:o.y+4,class:o.l==="ch"?"poc-dlab ch":o.e?"poc-dlab est":"poc-dlab","data-l":o.l},g);t.textContent=o.t;
      });
    }
    /* Δ_unemb panel: AUROC(rep) − AUROC(dis) per cutoff with its 95% CI, as in the paper (brief 02c data);
       drawn only when the export has per-cutoff AUROC */
    var dlt=null,dci=C.d_unemb_ci95||null;
    if(hasD) dlt=C.d_unemb||C.auroc.rep.map(function(r,k){return r-C.auroc.dis[k]});
    if(hasD){
    var dvals=dlt.slice();if(dci) for(i=0;i<=lastOk;i++){dvals.push(dci[i][0],dci[i][1])}
    var m=Math.max(0.02,Math.max.apply(null,dvals.map(Math.abs))),dst=niceStep(m,2);
    var dlo=Math.min(0,Math.floor(Math.min.apply(null,dvals)/dst)*dst),dhi=Math.max(0,Math.ceil(Math.max.apply(null,dvals)/dst)*dst);
    if(dhi-dlo<dst*2){if(dhi<=0)dlo=-dst*2;else if(dlo>=0)dhi=dst*2;}
    var yd=function(v){return L.dB-(v-dlo)/(dhi-dlo)*L.dH};
    for(v=dlo;v<=dhi+1e-9;v+=dst){
      el("line",{x1:xL,x2:xR,y1:yd(v),y2:yd(v),class:Math.abs(v)<1e-9?"poc-zero":"poc-gl"},g);
      var t2=el("text",{x:xL-6,y:yd(v)+4,"text-anchor":"end",class:"poc-tick"},g);t2.textContent=(Math.abs(v)<1e-9?0:+v.toFixed(3)).toString();
    }
    el("rect",{x:xL,y:L.dT,width:xR-xL,height:L.dH,class:"poc-frame"},g);
    var dTitle=el("text",{x:xL,y:L.dT-8,class:"poc-dtitle"},g);
    dTitle.innerHTML='Δ<tspan class="sub" dy="3">unemb</tspan><tspan dy="-3"> = AUROC(rep) − AUROC(dis)</tspan>';
    var gd=el("g",{"clip-path":"url(#poc-clip2)"},g),dsd="",ddd="";
    if(dci&&S.ci&&lastOk>=1){
      var bu="",bd="";
      for(i=0;i<=lastOk;i++) bu+=(i?"L":"M")+x(P[i])+","+yd(dci[i][1]);
      for(i=lastOk;i>=0;i--) bd+="L"+x(P[i])+","+yd(dci[i][0]);
      el("path",{d:bu+bd+"Z",class:"poc-dband"},gd);
    }
    for(i=0;i<=lastOk;i++) dsd+=(i?"L":"M")+x(P[i])+","+yd(dlt[i]);
    if(lastOk<n-1) for(i=Math.max(0,lastOk);i<n;i++) ddd+=(i===Math.max(0,lastOk)?"M":"L")+x(P[i])+","+yd(dlt[i]);
    if(ddd) el("path",{d:ddd,class:"poc-dline dash"},gd);
    if(dsd) el("path",{d:dsd,class:"poc-dline"},gd);
    for(i=0;i<=lastOk;i++) el("circle",{cx:x(P[i]),cy:yd(dlt[i]),r:2.6,class:"poc-dpt"},gd);
    }
    /* cutoff marker across both panels + emphasised points */
    var xs=x(P[S.i]);
    el("line",{x1:xs,x2:xs,y1:L.t-4,y2:L.dB,class:"poc-cut"},g);
    EL.forEach(function(l){var v=E[l].auprc[S.i];if(v!==null) el("path",{d:markPath(l,4.6),transform:"translate("+xs+","+y(v)+")",class:"poc-ept big","data-l":l},g)});
    VL.forEach(function(l){el("path",{d:markPath(l,5),transform:"translate("+xs+","+y(C.auprc[l][S.i])+")",class:"poc-pt big","data-l":l},g)});
    if(hasD) el("circle",{cx:xs,cy:yd(dlt[S.i]),r:4,class:"poc-dpt big"},g);
    /* pointer overlay and handle on top */
    G.svg.appendChild(G.over);G.svg.appendChild(G.handle);
    G.over.setAttribute("x",xL);G.over.setAttribute("y",L.t);G.over.setAttribute("width",xR-xL);G.over.setAttribute("height",L.dB-L.t);
    G.handle.setAttribute("transform","translate("+xs+","+(L.t-32)+")");
    G.hText.textContent=pct(P[S.i]);
    G.handle.setAttribute("aria-valuemin",P[0]);G.handle.setAttribute("aria-valuemax",P[n-1]);G.handle.setAttribute("aria-valuenow",P[S.i]);
    G.handle.setAttribute("aria-valuetext",cutText(P[S.i])+(sh[S.i]?", 50 or fewer incorrect answers":""));
    readout(C,dlt,E);
    table(C,dlt,E);
    announce(C,dlt,E);
  }
  function cutText(p){return p===0?"no cutoff":"cutoff "+pct(p)+"%: the least confident "+pct(p)+"% removed"}

  /* ---------- readout ---------- */
  function sentence(C,dlt){
    var i=S.i,p=C.percentiles[i],est=C.n_incorrect_source==="estimated"&&p>0,N=C.n_test;
    var ni=(est?"about ":"")+C.n_incorrect[i];
    var a=p===0?"With no cutoff, all "+N+" test questions are kept, "+ni+" of them incorrect":
      "At a "+pct(p)+"% cutoff, "+C.n[i]+" of "+N+" questions are left, "+ni+" of them incorrect";
    return a+".";
  }
  function estNote(C,VL,EL){
    var nt=$("poc-estnote"),NM={str:"RAUQ",rep:"INSIDE",dis:"TE",sem:"SE"},on=C.est&&(S.focus||S.est);
    var miss=on?VL.filter(function(k){return !C.est[k]}).map(function(k){return NM[k]}):[];
    var h=(miss.length?miss.join(", ")+' is not available for this setting.':'')+
      (on&&S.ds==="mmlu"&&EL.indexOf("dis")>=0&&EL.indexOf("sem")>=0?' On MMLU, TE and SE coincide.':'');
    nt.hidden=!h;nt.innerHTML=h.trim();
  }
  function ev(E,l,i){var v=E&&E[l]?E[l].auprc[i]:null;return v===null||v===undefined?null:v}
  function readout(C,dlt,E){
    var i=S.i,p=C.percentiles[i],est=C.n_incorrect_source==="estimated"&&p>0,ch=C.chance[i];
    var h='<p class="poc-rh"><span class="mono">'+(p===0?"No cutoff":"Cutoff "+pct(p)+"%")+'</span> · '+D.meta.models[S.model]+' · '+D.meta.datasets[S.ds]+'</p>'+
      '<p class="poc-counts mono"><span><b>'+C.n[i]+'</b> of '+C.n_test+' questions left</span><span><b>'+(est?"≈":"")+C.n_incorrect[i]+'</b> incorrect</span></p>'+
      '<table class="poc-rt'+(E?' est':'')+'"><thead><tr><th scope="col">Lens</th><th scope="col">AUPRC</th><th scope="col">vs chance</th>'+(E?'<th scope="col">Estimator</th>':'')+'</tr></thead><tbody>'+
      ORDER.map(function(l){var a=C.auprc[l][i],e=ev(E,l,i);
        return '<tr data-l="'+l+'"'+(S.focus&&S.focus!==l?' class="dim"':'')+'><th scope="row">'+markSvg(l)+'<b>'+l+'</b><span class="poc-ln"> '+LENS[l].name+'</span></th><td class="mono">'+f3(a)+'</td><td class="mono">'+sg(a-ch)+'</td>'+
          (E?'<td class="mono est">'+(E[l]?markSvgE(l)+'<span class="poc-en">'+E[l].name+'</span> ':'')+(e===null?"–":f3(e))+'</td>':'')+'</tr>'}).join("")+
      '</tbody><tfoot><tr><th scope="row"><span class="poc-chk" aria-hidden="true"></span>chance</th><td class="mono">'+f3(ch)+'</td><td></td>'+(E?'<td></td>':'')+'</tr>'+
      (dlt?'<tr><th scope="row">Δ<sub>unemb</sub> <span class="poc-dn">AUROC rep − dis</span></th><td class="mono">'+sg(dlt[i])+'</td><td></td>'+(E?'<td></td>':'')+'</tr>':'')+'</tfoot></table>'+
      (E?'<p class="poc-key" aria-hidden="true"><span><i class="s"></i>DecBase</span><span><i class="d"></i>UQ estimator</span></p>':'')+
      '<p class="poc-say">'+sentence(C,dlt)+'</p>'+
      (C.shaded[i]?'<p class="poc-warn">50 or fewer incorrect answers at this cutoff.</p>':'');
    $("poc-read").innerHTML=h;
  }
  function table(C,dlt,E){
    var EL=E?ORDER.filter(function(k){return E[k]}):[];
    var est=C.n_incorrect_source==="estimated";
    var h='<table class="poc-full"><caption>'+D.meta.models[S.model]+' · '+D.meta.datasets[S.ds]+': DecBase AUPRC by MSP lower-percentile cutoff'+(est?' (incorrect counts estimated as chance × questions left)':'')+'</caption>'+
      '<thead><tr><th scope="col">cutoff %</th><th scope="col">left</th><th scope="col">incorrect</th><th scope="col">chance</th>'+ORDER.map(function(l){return '<th scope="col">'+l+'</th>'}).join("")+EL.map(function(l){return '<th scope="col">'+E[l].name+'</th>'}).join("")+(dlt?'<th scope="col">Δ<sub>unemb</sub> (AUROC)</th>':'')+'</tr></thead><tbody>'+
      C.percentiles.map(function(p,i){
        return '<tr'+(C.shaded[i]?' class="sh"':'')+(i===S.i?' aria-current="true"':'')+'><th scope="row">'+pct(p)+(C.shaded[i]?' *':'')+'</th><td>'+C.n[i]+'</td><td>'+(est&&p>0?"≈":"")+C.n_incorrect[i]+'</td><td>'+f3(C.chance[i])+'</td>'+
          ORDER.map(function(l){return '<td>'+f3(C.auprc[l][i])+'</td>'}).join("")+EL.map(function(l){var e=ev(E,l,i);return '<td>'+(e===null?"–":f3(e))+'</td>'}).join("")+(dlt?'<td>'+sg(dlt[i])+'</td>':'')+'</tr>'}).join("")+
      '</tbody></table><p class="poc-tnote">* 50 or fewer incorrect answers.</p>';
    $("poc-tblwrap").innerHTML=h;
  }
  function announce(C,dlt,E){
    clearTimeout(liveT);
    liveT=setTimeout(function(){
      $("poc-live").textContent=sentence(C,dlt)+" AUPRC: "+ORDER.map(function(l){return l+" "+f3(C.auprc[l][S.i])}).join(", ")+"; chance "+f3(C.chance[S.i])+"."+
        (E?" Estimators: "+ORDER.filter(function(l){return ev(E,l,S.i)!==null}).map(function(l){return E[l].name+" "+f3(E[l].auprc[S.i])}).join(", ")+".":"");
    },700);
  }

  /* ---------- deep link ---------- */
  function applyHash(scroll){
    var h=location.hash||"";
    if(h.indexOf("#poc-demo?")!==0) return false;
    var q={};h.slice(10).split("&").forEach(function(kv){var a=kv.split("=");q[decodeURIComponent(a[0])]=decodeURIComponent(a[1]||"")});
    var mk=String(q.model||"").toLowerCase();
    if(mk&&$("poc-tab-"+mk)) $("poc-tab-"+mk).click();
    var dk=String(q.data||"").toLowerCase();
    if(D.cutoff_curves[S.model][dk]) S.ds=dk;
    if(q.cutoff!==undefined&&q.cutoff!=="") S.i=nearest(+q.cutoff);
    if(q.est!==undefined) S.est=q.est==="1"||q.est==="on";
    if(q.lens!==undefined) S.focus=ORDER.indexOf(q.lens)>=0?q.lens:null;
    render();
    window.UQL=window.UQL||{};UQL.subHash=UQL.subHash||{};
    var subs=(UQL.subHash.demos||[]).filter(function(x){return x.indexOf("poc-demo?")!==0});subs.push(h.slice(1));UQL.subHash.demos=subs;
    if(scroll) root.scrollIntoView({behavior:"instant",block:"start"});
    return true;
  }

  /* ---------- boot ---------- */
  function start(data){
    D=data;
    var tl=root.querySelector('[role="tablist"]');
    var open=tl.querySelector('[aria-selected="true"]');
    if(open) S.model=modelKey(open.id);
    root.querySelector('[role="tabpanel"]:not([hidden])').appendChild(build());
    root.addEventListener("uql:tab",function(e){
      var k=modelKey(e.detail.tab);
      if(D.cutoff_curves[k]&&k!==S.model){var p=cell().percentiles[S.i];S.model=k;S.i=nearest(p);render()}
    });
    render();
    var jumped=applyHash(false);
    window.addEventListener("hashchange",function(){applyHash(true)});
    root.classList.add("ready");
    if(jumped) requestAnimationFrame(function(){root.scrollIntoView({behavior:"instant",block:"start"})});
  }
  function init(){
    root=$("poc-demo");
    if(!root||!$("poc-qwen-inst")) return;
    var s=$("poc-data");
    if(s){start(JSON.parse(s.textContent));return}
    fetch(BASE+"poc.json?v="+V).then(function(r){if(!r.ok)throw new Error("poc.json "+r.status);return r.json()}).then(start)
      .catch(function(e){var st=$("poc-status");if(st)st.textContent="The proof-of-concept data could not load ("+e.message+").";console.error(e)});
  }
  window.UQL=window.UQL||{}; UQL.poc={init:init};
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();
