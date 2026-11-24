/* Evaluation · section 04: protocol row (target → criterion → metric), flow chart of the surveyed papers
   (target → metric family, hand-written SVG), notes, takeaway.
   Data: ./data/papers.json (survey-data/, brief 03: sankey, labels, papers) + ./data/eval.json (section text, brief 08).
   The preview embeds both as <script type="application/json"> blocks (#ev-data-papers, #ev-data-text);
   when those are absent the files are fetched.
   Criterion is recorded per target (tab:eval-metrics), not per paper, so the chart does not draw it; the protocol
   row shows each target's criteria. Each band is split: hatched = papers that report only that metric family.
   Links jump to the Survey list: #survey?target=COR&metric=CAL (AND across groups = the link's papers). */
(function(){
  var V="20261124a", BASE="./data/";
  var root, D, T, L, P, ROWS={}, U={}, LINKS=[], TN={}, MN={}, RNK_ONLY=0, TORD, MORD, lastW=0, queued=[];

  function $(id){return document.getElementById(id)}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  function typeset(el){
    var M=window.MathJax;
    if(M&&M.typesetPromise){try{M.typesetClear&&M.typesetClear([el])}catch(e){} return M.typesetPromise([el]).catch(function(){})}
    if(queued.indexOf(el)<0) queued.push(el);
  }
  document.addEventListener("uql:mathjax",function(){var q=queued;queued=[];q.forEach(typeset)});

  /* ---------- data ---------- */
  function derive(){
    P=D.papers;
    P.forEach(function(r){
      (ROWS[r.id]=ROWS[r.id]||[]).push(r);
      var u=U[r.id]=U[r.id]||{t:{},m:{},tl:{}};
      r.targets.forEach(function(t){u.t[t]=1;u.tl[t+":"+r.lens]=1});
      r.metrics.forEach(function(m){u.m[m]=1});
    });
    var ids=Object.keys(U);
    TORD=T.protocol.target_order; MORD=T.protocol.metric_order;
    TORD.forEach(function(t){TN[t]=ids.filter(function(i){return U[i].t[t]}).length});
    MORD.forEach(function(m){MN[m]=ids.filter(function(i){return U[i].m[m]}).length});
    RNK_ONLY=ids.filter(function(i){var m=Object.keys(U[i].m);return U[i].t.COR&&m.length===1&&m[0]==="RNK"}).length;
    var H=D.sankey.headline;
    if(RNK_ONLY!==H.cor_rnk_only) console.error("eval: ranking-only COR papers "+RNK_ONLY+" ≠ sankey.headline.cor_rnk_only "+H.cor_rnk_only);
    if(ids.length!==H.n_papers) console.error("eval: "+ids.length+" papers ≠ headline "+H.n_papers);
    D.sankey.targets.forEach(function(t){if(TN[t.id]!==t.n) console.error("eval: "+t.id+" "+TN[t.id]+" ≠ sankey "+t.n)});
    LINKS=D.sankey.links.map(function(l){
      var n=ids.filter(function(i){return U[i].t[l.source]&&U[i].m[l.target]}).length;
      if(n!==l.n) console.error("eval: link "+l.source+"→"+l.target+" "+n+" ≠ "+l.n);
      var only=l.ids.filter(function(i){var m=Object.keys(U[i].m);return m.length===1&&m[0]===l.target}).length;
      return {s:l.source,t:l.target,n:l.n,ids:l.ids,only:only};
    });
  }
  function crit(t){for(var i=0;i<D.sankey.targets.length;i++) if(D.sankey.targets[i].id===t) return D.sankey.targets[i].criterion; return []}
  function fill(s){
    var H=D.sankey.headline;
    return String(s).replace(/\{(\w+)(?::(\w+))?(?::(\w+))?\}/g,function(all,k,a,b){
      if(k==="papers") return H.n_papers;
      if(k==="cor") return TN.COR;
      if(k==="cor_rnk_only") return RNK_ONLY;
      if(k==="all_rnk_only") return H.all_rnk_only;
      if(k==="tgt") return TN[a];
      if(k==="met") return MN[a];
      if(k==="tl") return Object.keys(U).filter(function(i){return U[i].tl[a+":"+b]}).length;
      return all;
    });
  }
  function tname(t){return L.target[t]} function mname(m){return L.metric[m]}
  function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
  function linkMethods(l){
    return l.ids.map(function(id){
      var rs=ROWS[id].filter(function(r){return r.targets.indexOf(l.s)>=0&&r.metrics.indexOf(l.t)>=0});
      if(!rs.length) rs=ROWS[id];
      var p=rs[0], a=p.authors||[];
      return {m:rs.map(function(r){return r.method}).filter(function(x,i,arr){return arr.indexOf(x)===i}).join(", "),by:(a.length>2?a[0]+" et al.":a.join(" & "))+" "+p.year};
    });
  }
  function surveyHash(s,t){return "#survey?"+(s?"target="+s:"")+(s&&t?"&":"")+(t?"metric="+t:"")}

  /* ---------- protocol row ---------- */
  function chipT(t,tag,extra){return '<'+tag+' class="chip tgt" data-t="'+t+'"'+(extra||"")+'>'+t+'</'+tag+'>'}
  function chipC(c){return '<span class="chip crit" data-lens="'+c+'">'+c+'</span>'}
  function protocol(){
    var Pr=T.protocol, S=Pr.steps;
    $("ev-h-protocol").textContent=Pr.title;
    var tg='<li class="ev-step" data-step="target"><div class="ev-step-l"><h4 class="ev-step-h">'+esc(S.target.name)+'</h4><p class="ev-def">'+S.target.def_html+'</p></div><div class="ev-step-r">'+
      '<div class="ev-pills" role="group" aria-label="Targets">'+TORD.map(function(t){
        return '<button type="button" class="chip tgt ev-pick" data-t="'+t+'" data-k="'+t+'" aria-pressed="false" aria-controls="ev-tdetail">'+t+' <small>'+esc(tname(t))+'</small></button>'}).join("")+'</div>'+
      '<div class="ev-detail" id="ev-tdetail" aria-live="polite"></div></div></li>';
    var cr='<li class="ev-step" data-step="criterion"><div class="ev-step-l"><h4 class="ev-step-h">'+esc(S.criterion.name)+'</h4><p class="ev-def">'+S.criterion.def_html+'</p></div><div class="ev-step-r">'+
      '<div class="ev-crits">'+Pr.criteria.map(function(c){
        return '<div class="ev-crit" data-lens="'+c.key+'"><p class="ev-crit-h">'+chipC(c.key)+' '+esc(c.name)+'</p><p>'+esc(c.def)+'</p><p class="ev-ex"><span>'+esc(Pr.examples_label)+'</span> '+c.examples.map(esc).join(", ")+'</p></div>'}).join("")+'</div>'+
      '<p class="ev-gr">'+Pr.criterion_link_html+'</p></div></li>';
    var me='<li class="ev-step" data-step="metric"><div class="ev-step-l"><h4 class="ev-step-h">'+esc(S.metric.name)+'</h4><p class="ev-def">'+S.metric.def_html+'</p></div><div class="ev-step-r">'+
      '<div class="ev-pills" role="group" aria-label="Metric families">'+MORD.map(function(m){
        return '<button type="button" class="chip met ev-pick" data-m="'+m+'" data-k="'+m+'" aria-pressed="false" aria-controls="ev-mdetail">'+m+' <small>'+esc(mname(m))+'</small></button>'}).join("")+'</div>'+
      '<div class="ev-detail" id="ev-mdetail" aria-live="polite"></div></div></li>';
    function conn(){return '<li class="ev-conn" role="presentation"><svg class="ev-chev" viewBox="0 0 24 14" width="26" height="15" aria-hidden="true" focusable="false"><path d="M3 3l9 8 9-8"/></svg></li>'}
    var box=$("ev-proto"); box.innerHTML=tg+conn()+cr+conn()+me;
    function showT(t){
      var x=Pr.targets[t];
      $("ev-tdetail").innerHTML='<p class="ev-dh">'+chipT(t,"span")+' <b>'+esc(cap(tname(t)))+'</b> <span class="ev-dn">'+TN[t]+' papers</span></p>'+
        '<p class="ev-q">“'+esc(x.question)+'”</p><p class="ev-of">'+x.of_html+'</p>'+
        '<p class="ev-meta"><span>'+esc(Pr.criterion_label)+'</span> '+crit(t).map(chipC).join(" ")+' <span class="ev-gt">'+(x.gt?"✓ ":"– ")+esc(x.gt?Pr.gt_label.yes:Pr.gt_label.no)+'</span></p>';
      sel(box,"[data-step=target] .ev-pick",t); typeset($("ev-tdetail"));
    }
    function showM(m){
      var x=Pr.metrics[m];
      $("ev-mdetail").innerHTML='<p class="ev-dh"><span class="chip met" data-m="'+m+'">'+m+'</span> <b>'+esc(cap(mname(m)))+'</b> <span class="ev-dn">'+MN[m]+' papers</span></p>'+
        '<p class="ev-of">'+esc(x.def)+'</p><p class="ev-ex"><span>'+esc(Pr.examples_label)+'</span> '+x.examples.map(esc).join(", ")+'</p>';
      sel(box,"[data-step=metric] .ev-pick",m);
    }
    function sel(scope,q,k){scope.querySelectorAll(q).forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.k===k))})}
    box.querySelectorAll(".ev-pick").forEach(function(b){
      var f=b.dataset.t?function(){showT(b.dataset.t)}:function(){showM(b.dataset.m)};
      b.addEventListener("mouseenter",f); b.addEventListener("focus",f); b.addEventListener("click",f);
    });
    showT(TORD[0]); showM(MORD[0]);
    typeset(box);
  }

  /* ---------- flow chart ---------- */
  function layout(W,kFit){
    var c=W<480, g={W:W,compact:c};
    g.k=kFit||(c?1.75:2.3); g.gT=c?22:28; g.gM=c?12:16; g.nw=c?9:12;
    g.left=c?60:168; g.right=c?60:150; g.gate=c?8:24; g.top=30;
    g.xT=g.left; g.xTr=g.xT+g.nw; g.xGate=g.xTr+g.gate/2; g.xG1=g.xTr+g.gate; g.xM=W-g.right-g.nw; g.xc=(g.xG1+g.xM)/2;
    var tot=LINKS.reduce(function(a,l){return a+l.n},0)*g.k;
    var HL=tot+(TORD.length-1)*g.gT, HR=tot+(MORD.length-1)*g.gM, H=Math.max(HL,HR);
    g.H=g.top+H+10;
    var tn={}, mn={}, y=g.top+(H-HL)/2;
    TORD.forEach(function(t){var h=LINKS.filter(function(l){return l.s===t}).reduce(function(a,l){return a+l.n},0)*g.k;tn[t]={y0:y,y1:y+h,o:y};y+=h+g.gT});
    y=g.top+(H-HR)/2;
    MORD.forEach(function(m){var h=LINKS.filter(function(l){return l.t===m}).reduce(function(a,l){return a+l.n},0)*g.k;mn[m]={y0:y,y1:y+h,o:y};y+=h+g.gM});
    var ls=LINKS.slice().sort(function(a,b){return TORD.indexOf(a.s)-TORD.indexOf(b.s)||MORD.indexOf(a.t)-MORD.indexOf(b.t)});
    ls.forEach(function(l){var h=l.n*g.k;l.a0=tn[l.s].o;l.a1=l.a0+h;tn[l.s].o=l.a1});
    ls.slice().sort(function(a,b){return MORD.indexOf(a.t)-MORD.indexOf(b.t)||TORD.indexOf(a.s)-TORD.indexOf(b.s)}).forEach(function(l){var h=l.n*g.k;l.b0=mn[l.t].o;l.b1=l.b0+h;mn[l.t].o=l.b1});
    g.tn=tn; g.mn=mn; g.links=ls;
    return g;
  }
  /* side by side with the notes (≥ 1000 px): pick the px-per-paper scale so the chart column ends level with the notes */
  function fitK(W){
    var side=document.querySelector("#evaluation .ev-flowside"), box=$("ev-chart");
    if(!side||W<480||side.getBoundingClientRect().top-box.getBoundingClientRect().top>40) return 0;
    var extra=$("ev-legend").offsetHeight+$("ev-cap").offsetHeight+24;
    var want=side.offsetHeight-extra, tot=LINKS.reduce(function(a,l){return a+l.n},0);
    var k=(want-30-10-6*16)/tot; /* top pad, bottom pad, metric gaps (the taller column) */
    return Math.max(1.7,Math.min(2.6,k));
  }
  function band(g,a0,a1,b0,b1,from){
    var x0=from, x1=g.xM, xc=(g.xG1+g.xM)/2, r=function(v){return Math.round(v*10)/10};
    return "M"+r(x0)+","+r(a0)+"H"+r(g.xG1)+"C"+r(xc)+","+r(a0)+" "+r(xc)+","+r(b0)+" "+r(x1)+","+r(b0)+
      "V"+r(b1)+"C"+r(xc)+","+r(b1)+" "+r(xc)+","+r(a1)+" "+r(g.xG1)+","+r(a1)+"H"+r(x0)+"Z";
  }
  function linkLabel(l){
    var s=cap(tname(l.s))+" to "+mname(l.t)+": "+l.n+" paper"+(l.n===1?"":"s");
    if(l.only) s+=", "+T.flow.link_only.replace("{only}",l.only);
    return s;
  }
  function chart(){
    var box=$("ev-chart"), W=Math.min(box.clientWidth||640,780);
    if(!W) return; lastW=W;
    var g=layout(W,fitK(W)), F=T.flow, s=[], c=g.compact;
    s.push('<svg class="ev-svg" width="'+W+'" height="'+Math.ceil(g.H)+'" viewBox="0 0 '+W+' '+Math.ceil(g.H)+'" role="group" aria-labelledby="ev-h-flow" aria-describedby="ev-cap">');
    s.push('<defs>'+TORD.map(function(t){return '<pattern id="ev-hatch-'+t+'" data-tt="'+t+'" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><rect width="6" height="6" class="ev-hb"/><line x1="0" y1="0" x2="0" y2="6" class="ev-hl"/></pattern>'}).join("")+'</defs>');
    /* column heads */
    s.push('<g class="ev-heads" aria-hidden="true"><text x="'+g.xTr+'" y="14" text-anchor="end">'+esc(F.heads.target)+'</text>'+
      (c?'<text x="'+(W-2)+'" y="14" text-anchor="end">'+esc(F.heads.metric)+'</text>':'<text x="'+g.xM+'" y="14">'+esc(F.heads.metric)+'</text>')+'</g>');
    /* links (one focusable <a> each; the hatched top sub-band = papers reporting only this family) */
    s.push('<g class="ev-links">');
    g.links.forEach(function(l){
      var split=l.only>0, h='<a class="lk" href="'+surveyHash(l.s,l.t)+'" data-s="'+l.s+'" data-t="'+l.t+'" data-tt="'+l.s+'" aria-label="'+esc(linkLabel(l))+'">';
      if(split){
        var m=l.only*g.k;
        h+='<path class="lk-p lk-only" style="fill:url(#ev-hatch-'+l.s+')" d="'+band(g,l.a0,l.a0+m,l.b0,l.b0+m,g.xTr)+'"/>'+
           '<path class="lk-p" d="'+band(g,l.a0+m,l.a1,l.b0+m,l.b1,g.xTr)+'"/>'+
           '<path class="lk-f" d="'+band(g,l.a0,l.a1,l.b0,l.b1,g.xTr)+'"/>';
      } else h+='<path class="lk-p" d="'+band(g,l.a0,l.a1,l.b0,l.b1,g.xTr)+'"/><path class="lk-f" d="'+band(g,l.a0,l.a1,l.b0,l.b1,g.xTr)+'"/>';
      s.push(h+'</a>');
    });
    s.push('</g>');
    /* headline label on the ranking-only sub-band */
    var hl=g.links.filter(function(l){return l.s==="COR"&&l.t==="RNK"})[0];
    if(hl){
      var m=RNK_ONLY*g.k, ym=((hl.a0+hl.b0)/2+(hl.a0+hl.b0)/2+m)/2, lines=(c?F.headline_short:F.headline).map(fill);
      s.push('<text class="ev-hltext" aria-hidden="true" x="'+g.xc+'" y="'+(ym-3)+'" text-anchor="middle"><tspan class="b">'+esc(lines[0])+'</tspan><tspan x="'+g.xc+'" dy="16">'+esc(lines[1])+'</tspan></text>');
    }
    /* target nodes: filled pills; metric nodes: outlined squares */
    s.push('<g class="ev-nodes">');
    TORD.forEach(function(t){
      var n=g.tn[t], ym=(n.y0+n.y1)/2;
      s.push('<a class="nd nd-t" href="'+surveyHash(t)+'" data-tt="'+t+'" data-node="t" aria-label="'+esc(cap(tname(t))+": "+TN[t]+" papers")+'">'+
        '<rect class="nd-r" x="'+g.xT+'" y="'+n.y0+'" width="'+g.nw+'" height="'+Math.max(2,n.y1-n.y0)+'" rx="'+(g.nw/2)+'"/>'+
        '<rect class="nd-hit" x="'+(g.xT-g.left+4)+'" y="'+(ym-11)+'" width="'+(g.left-4+g.nw)+'" height="22"/>'+
        '<text class="nd-l" x="'+(g.xT-7)+'" y="'+(ym+4)+'" text-anchor="end"><tspan class="cd">'+t+'</tspan>'+(c?'':'<tspan class="nm" dx="6">'+esc(tname(t))+'</tspan>')+'<tspan class="n" dx="6">'+TN[t]+'</tspan></text></a>');
    });
    MORD.forEach(function(m){
      var n=g.mn[m], ym=(n.y0+n.y1)/2;
      s.push('<a class="nd nd-m" href="'+surveyHash(null,m)+'" data-m="'+m+'" data-node="m" aria-label="'+esc(cap(mname(m))+" metrics: "+MN[m]+" papers")+'">'+
        '<rect class="nd-r" x="'+(g.xM+.75)+'" y="'+(n.y0+.75)+'" width="'+(g.nw-1.5)+'" height="'+Math.max(1.5,n.y1-n.y0-1.5)+'" rx="1.5"/>'+
        '<rect class="nd-hit" x="'+g.xM+'" y="'+(ym-11)+'" width="'+(g.right+g.nw-2)+'" height="22"/>'+
        '<text class="nd-l" x="'+(g.xM+g.nw+7)+'" y="'+(ym+4)+'"><tspan class="cd">'+m+'</tspan>'+(c?'':'<tspan class="nm" dx="6">'+esc(mname(m))+'</tspan>')+'<tspan class="n" dx="6">'+MN[m]+'</tspan></text></a>');
    });
    s.push('</g></svg>');
    box.innerHTML=s.join("");
    wire(box);
  }

  /* ---------- hover card, highlight, navigation ---------- */
  function wire(box){
    var as=[].slice.call(box.querySelectorAll("a"));
    as.forEach(function(a){
      a.addEventListener("mouseenter",function(e){hl(box,a);card(a,e)});
      a.addEventListener("mousemove",function(e){place(e.clientX,e.clientY)});
      a.addEventListener("mouseleave",function(){unhl(box);hideCard()});
      a.addEventListener("focus",function(){hl(box,a); if(a.matches(":focus-visible")) card(a)});
      a.addEventListener("blur",function(){unhl(box);hideCard()});
      a.addEventListener("click",function(e){go(e,a)});
      a.addEventListener("keydown",function(e){
        var i=as.indexOf(a), k=e.key, j=-1;
        if(k==="ArrowDown"||k==="ArrowRight") j=Math.min(as.length-1,i+1);
        else if(k==="ArrowUp"||k==="ArrowLeft") j=Math.max(0,i-1);
        else if(k==="Home") j=0; else if(k==="End") j=as.length-1;
        else if(k===" "){e.preventDefault();a.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true}));return}
        if(j>=0){e.preventDefault();as[j].focus()}
      });
    });
  }
  function hl(box,a){
    box.classList.add("hl");
    box.querySelectorAll(".on").forEach(function(x){x.classList.remove("on")});
    a.classList.add("on");
    if(a.classList.contains("lk")){
      box.querySelectorAll('.nd-t[data-tt="'+a.dataset.s+'"],.nd-m[data-m="'+a.dataset.t+'"]').forEach(function(x){x.classList.add("on")});
    } else {
      var q=a.dataset.node==="t"?'.lk[data-s="'+a.dataset.tt+'"]':'.lk[data-t="'+a.dataset.m+'"]';
      box.querySelectorAll(q).forEach(function(x){x.classList.add("on")});
    }
  }
  function unhl(box){box.classList.remove("hl");box.querySelectorAll(".on").forEach(function(x){x.classList.remove("on")})}
  function cardInfo(a){
    var F=T.flow, ids, head;
    if(a.classList.contains("lk")){
      var l=LINKS.filter(function(x){return x.s===a.dataset.s&&x.t===a.dataset.t})[0];
      return {head:'<span class="chip tgt" data-t="'+l.s+'">'+l.s+'</span> → <span class="chip met" data-m="'+l.t+'">'+l.t+'</span> '+esc(cap(tname(l.s))+" to "+mname(l.t)),
        n:l.n, items:linkMethods(l),
        split:fill(F.card_split).replace("{only}",l.only).replace("{other}",l.n-l.only)};
    }
    if(a.dataset.node==="t"){var t=a.dataset.tt;
      ids=Object.keys(U).filter(function(i){return U[i].t[t]});
      head='<span class="chip tgt" data-t="'+t+'">'+t+'</span> '+esc(cap(tname(t)));
    } else {var m=a.dataset.m;
      ids=Object.keys(U).filter(function(i){return U[i].m[m]});
      head='<span class="chip met" data-m="'+m+'">'+m+'</span> '+esc(cap(mname(m)));
    }
    return {head:head,n:ids.length,items:ids.map(function(id){var p=ROWS[id][0],au=p.authors||[];return {m:p.method,by:(au.length>2?au[0]+" et al.":au.join(" & "))+" "+p.year}}),split:""};
  }
  function card(a,e){
    var c=$("ev-card"), F=T.flow, inf=cardInfo(a), MAX=6;
    c.innerHTML='<p class="ch">'+inf.head+' <span>'+inf.n+' paper'+(inf.n===1?"":"s")+'</span></p>'+
      (inf.split?'<p class="cb">'+esc(inf.split)+'</p>':'')+
      '<ul>'+inf.items.slice(0,MAX).map(function(it){return '<li><b>'+esc(it.m)+'</b> <span>'+esc(it.by)+'</span></li>'}).join("")+
      (inf.items.length>MAX?'<li class="more">'+esc(F.card_more.replace("{n}",inf.items.length-MAX))+'</li>':'')+'</ul>'+
      '<p class="cf">'+esc(F.card_click)+'</p>';
    c.hidden=false;
    if(e) place(e.clientX,e.clientY);
    else {var r=a.getBoundingClientRect(); place(r.left+r.width/2,r.top+r.height/2)}
  }
  function place(x,y){
    var c=$("ev-card"); if(c.hidden) return;
    var cw=c.offsetWidth, ch=c.offsetHeight, X=x+16, Y=y+16;
    if(X+cw>window.innerWidth-8) X=Math.max(8,x-cw-16);
    if(Y+ch>window.innerHeight-8) Y=Math.max(8,y-ch-16);
    c.style.left=X+"px"; c.style.top=Y+"px";
  }
  function hideCard(){var c=$("ev-card"); if(c) c.hidden=true}
  function go(e,a){
    var href=a.getAttribute("href");
    e.preventDefault(); hideCard();
    if(!document.getElementById("survey-list")){ /* preview, or a page without the Survey section */
      var n=href.indexOf("metric=")>0&&href.indexOf("target=")>0?LINKS.filter(function(l){return href===surveyHash(l.s,l.t)})[0].n:cardInfo(a).n;
      $("ev-nav-status").textContent=T.flow.nosurvey.replace("{hash}",href).replace("{n}",n);
      return;
    }
    if(location.hash===href&&history.replaceState) history.replaceState(null,"",location.pathname+location.search+"#evaluation");
    location.hash=href;
  }

  /* ---------- legend, caption, table, notes, takeaway ---------- */
  function rest(){
    var F=T.flow;
    $("ev-h-flow").textContent=fill(F.title); $("ev-sub-flow").textContent=F.sub;
    $("ev-legend").innerHTML='<span class="lg"><span class="sw sw-only"></span>'+esc(F.legend.only)+'</span><span class="lg"><span class="sw sw-other"></span>'+esc(F.legend.other)+'</span><span class="lg-br" aria-hidden="true"></span>'+
      '<span class="lg"><span class="chip tgt" data-t="COR">COR</span> target, filled</span><span class="lg"><span class="chip met" data-m="RNK">RNK</span> metric family, outlined</span>';
    $("ev-cap").textContent=F.caption;
    var cell={}; LINKS.forEach(function(l){cell[l.s+l.t]=l.n});
    $("ev-tbl").innerHTML='<summary>'+esc(F.table_toggle)+'</summary><div class="ev-tf"><table><caption>'+esc(F.table_caption)+'</caption><thead><tr><th scope="col">Target</th>'+
      MORD.map(function(m){return '<th scope="col" title="'+esc(mname(m))+'"><span class="chip met" data-m="'+m+'">'+m+'</span></th>'}).join("")+'<th scope="col">'+esc(F.table_total)+'</th></tr></thead><tbody>'+
      TORD.map(function(t){return '<tr><th scope="row"><span class="chip tgt" data-t="'+t+'">'+t+'</span> '+esc(tname(t))+'</th>'+
        MORD.map(function(m){var v=cell[t+m];return '<td>'+(v?v:'<span class="z" aria-label="0">–</span>')+'</td>'}).join("")+'<td class="tot">'+TN[t]+'</td></tr>'}).join("")+
      '</tbody><tfoot><tr><th scope="row">'+esc(F.table_total)+'</th>'+MORD.map(function(m){return '<td class="tot">'+MN[m]+'</td>'}).join("")+'<td class="tot">'+D.sankey.headline.n_papers+'</td></tr></tfoot></table></div>';
    benchmarks();
    $("ev-h-notes").textContent=T.notes_title;
    $("ev-notes").innerHTML=T.notes.map(function(n){return '<li>'+fill(n.html)+'</li>'}).join("");
    var K=T.takeaway;
    $("ev-takeaway").innerHTML='<aside class="ev-tk" aria-label="Takeaway '+K.n+'"><p class="tt">Takeaway '+K.n+' · '+esc(K.title)+'</p><p>'+esc(K.text)+' <span class="ev-sec">'+esc(K.sec)+'</span></p></aside>';
    $("ev-notes").querySelectorAll("a[href^='#survey?']").forEach(function(a){
      a.addEventListener("click",function(e){
        if(document.getElementById("survey-list")) return;
        e.preventDefault(); $("ev-nav-status").textContent=T.flow.nosurvey.replace("{hash}",a.getAttribute("href")).replace(" ({n} papers)","");
      });
    });
  }

  function benchmarks(){
    var B=T.benchmarks; if(!B||!$("ev-bench")) return;
    $("ev-h-bench").textContent=B.title; $("ev-sub-bench").innerHTML=B.sub_html;
    function lk(pt,cls){return pt.url?'<a'+(cls?' class="'+cls+'"':'')+' href="'+esc(pt.url)+'" target="_blank" rel="noopener" title="'+esc(B.link_title)+'">'+esc(pt.t)+'</a>':esc(pt.t)}
    function item(x){return '<span class="ev-bi">'+x.parts.map(function(pt){return lk(pt)}).join("")+
      (x.sup&&x.sup.length?'<sup>'+x.sup.map(function(pt){return lk(pt)}).join(" ")+'</sup>':'')+'</span>'}
    function grp(list,t){return list.length?'<span class="ev-bg">'+(t?chipT(t,"span",' title="'+esc(cap(tname(t)))+'"')+' ':'')+list.map(item).join(", ")+'</span>':''}
    $("ev-bench").innerHTML='<table><thead><tr><th scope="col">'+esc(B.head.format)+'</th><th scope="col">'+esc(B.head.benchmarks)+'</th></tr></thead><tbody>'+
      B.rows.map(function(r){return '<tr><th scope="row"><span class="ev-fmt">'+esc(r.key)+'</span><small>'+esc(r.name)+'</small></th><td>'+grp(r.all)+grp(r.GRD,"GRD")+grp(r.UNS,"UNS")+'</td></tr>'}).join("")+'</tbody></table>';
    $("ev-bench-note").innerHTML=B.note_html.replace("{items}",(B.note_items||[]).map(item).join(", "));
  }

  function build(papers,text){
    D=papers; T=text; L=papers.labels;
    derive();
    $("ev-lede").innerHTML=fill(T.lede_html);
    protocol(); rest(); chart();
    var box=$("ev-chart");
    var lastSide=0, side=document.querySelector("#evaluation .ev-flowside");
    if(window.ResizeObserver){
      new ResizeObserver(function(){var w=Math.min(box.clientWidth,780);if(Math.abs(w-lastW)>1) chart()}).observe(box);
      if(side) new ResizeObserver(function(){var h=side.offsetHeight;if(Math.abs(h-lastSide)>4){lastSide=h;chart()}}).observe(side);
    }
    else window.addEventListener("resize",function(){chart()});
    document.addEventListener("keydown",function(e){if(e.key==="Escape") hideCard()});
    window.addEventListener("scroll",hideCard,{passive:true});
    root.classList.add("ready");
  }
  function inline(id){var s=document.getElementById(id);return s?s.textContent:null}
  function init(){
    root=$("evaluation"); if(!root||!$("ev-chart")) return;
    var ip=inline("ev-data-papers"), it=inline("ev-data-text");
    if(ip&&it){build(JSON.parse(ip),JSON.parse(it));return}
    function get(u){return fetch(BASE+u+"?v="+V).then(function(r){if(!r.ok)throw new Error(u+" "+r.status);return r.json()})}
    Promise.all([get("papers.json"),get("eval.json")]).then(function(a){build(a[0],a[1])})
      .catch(function(err){var s=$("ev-status"); if(s) s.textContent="Could not load the evaluation data ("+err.message+").";});
  }
  window.UQL=window.UQL||{}; UQL.eval={init:init};
  init();
})();
