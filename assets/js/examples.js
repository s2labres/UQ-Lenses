/* Overview · "Four lenses applied to queries".
   Data: ./data/examples.json (from opening-example/site-data, 2026-11-16).
   Drawing: ported from the approved preview (opening-example/site-data/opening-preview.html);
   layout and the four viz functions are kept, only the data access changed to the JSON schema.
   Tabs use the site's ARIA tab helper (tabs.js); layer toggles are buttons (keyboard by default).
   Hash: #math / #opinion / #grounding / #factuality opens that tab and scrolls here. */
(function(){
  var EXAMPLES_URL="./data/examples.json";
  var root, data=null, layer={}, userMoved=false;

  /* colours are read from the container, so example-scoped token overrides apply */
  function css(v){return getComputedStyle(root).getPropertyValue("--"+v).trim()}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  function fmtp(p){return p>=.995?p.toFixed(4):p>=.01?p.toFixed(2):p.toFixed(4)}
  function roleCol(r){var v=data.meta.token_roles[r];return v?css(v.replace(/^--/,"")):css("ink")}

  /* ---------- structural: components writing into the residual stream ---------- */
  function vizStr(d,uid){
    var W=260,H=160,comp=d.components,n=comp.length,slot=W/n,bw=Math.min(62,slot-8),yb=10,bh=26,yc=52,yr=124;
    var max=Math.max.apply(null,comp.map(function(c){return c.dla}));
    var ink=css("str"), mk="ah-"+uid;
    var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Structural lens: largest component writes, in layer order: '+
      esc(comp.map(function(c){return c.name+" pushes "+d.tokens[c.pushes].label}).join("; "))+'">';
    s+='<defs><marker id="'+mk+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="'+ink+'"/></marker></defs>';
    s+='<line x1="4" x2="'+(W-6)+'" y1="'+yr+'" y2="'+yr+'" stroke="'+css("ink")+'" stroke-width="1.6" marker-end="url(#'+mk+')"/>';
    comp.forEach(function(c,i){
      var cx=slot*i+slot/2, tok=d.tokens[c.pushes], lab=tok.label, col=roleCol(tok.role), sw=1+2.6*c.dla/max;
      s+='<rect x="'+(cx-bw/2)+'" y="'+yb+'" width="'+bw+'" height="'+bh+'" rx="6" fill="'+css("bg")+'" stroke="'+ink+'" stroke-width="1.6"/>';
      s+='<text x="'+cx+'" y="'+(yb+17)+'" text-anchor="middle" class="ink" font-size="11.5">'+esc(c.name)+'</text>';
      s+='<line x1="'+cx+'" x2="'+cx+'" y1="'+(yb+bh)+'" y2="'+(yc-11)+'" stroke="'+ink+'" stroke-width="1.4"/>';
      var nat=Math.max(34,lab.length*7.4+18), tw=Math.min(nat,slot-4), fit=nat>tw?' textLength="'+(tw-10)+'" lengthAdjust="spacingAndGlyphs"':"";
      s+='<rect x="'+(cx-tw/2)+'" y="'+(yc-11)+'" width="'+tw+'" height="22" rx="6" fill="'+css("bg")+'" stroke="'+col+'" stroke-width="1.3"/>';
      s+='<text x="'+cx+'" y="'+(yc+4)+'" text-anchor="middle" font-size="12.5" font-weight="600"'+fit+' style="fill:'+col+'">+'+esc(lab)+'</text>';
      s+='<line x1="'+cx+'" x2="'+cx+'" y1="'+(yc+11)+'" y2="'+(yr-11)+'" stroke="'+ink+'" stroke-width="'+sw+'" marker-end="url(#'+mk+')"/>';
      s+='<circle cx="'+cx+'" cy="'+yr+'" r="8" fill="'+css("bg")+'" stroke="'+ink+'" stroke-width="1.4"/>';
      s+='<path d="M'+(cx-4)+' '+yr+'H'+(cx+4)+'M'+cx+' '+(yr-4)+'V'+(yr+4)+'" stroke="'+ink+'" stroke-width="1.4"/>';
    });
    s+='<text x="'+(W/2)+'" y="'+(H-4)+'" text-anchor="middle">residual stream</text>';
    return s+"</svg>";
  }

  /* ---------- representational: state direction between two anchors ---------- */
  function vizRep(d,L,uid){
    var W=260,H=160,ox=22,oy=142,len=180,c=css("rep");
    var angB=4*Math.PI/180, angA=86*Math.PI/180;
    var t=Math.max(-.08,Math.min(1.08,d.layers[L].t));
    var ang=angB+t*(angA-angB), mid=(angA+angB)/2, m1="ar-"+uid, m2="ars-"+uid;
    function P(a,r){var k=a>1.2?0.62:1;return [ox+Math.cos(a)*r*k, oy-Math.sin(a)*r*k]}
    function arr(a,r,w,op,dash){var p=P(a,r);return '<line x1="'+ox+'" y1="'+oy+'" x2="'+p[0]+'" y2="'+p[1]+'" stroke="'+c+'" stroke-width="'+w+'" stroke-opacity="'+op+'" '+(dash?'stroke-dasharray="5 4"':"")+' marker-end="url(#'+(w>2?m2:m1)+')"/>'}
    var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Representational lens at layer '+esc(L.replace(/^L/,""))+': hidden state between '+esc(d.anchor_A)+' and '+esc(d.anchor_B)+', position '+t.toFixed(2)+' (0 = '+esc(d.anchor_B)+', 1 = '+esc(d.anchor_A)+')">';
    s+='<defs><marker id="'+m1+'" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="'+c+'" fill-opacity=".45"/></marker>'+
       '<marker id="'+m2+'" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="'+c+'"/></marker></defs>';
    s+=arr(angA,len,1.4,.45)+arr(angB,len,1.4,.45)+arr(mid,len*.78,1.4,.55,true);
    var a=P(angA,len), b=P(angB,len), m=P(mid,len*.78);
    s+='<text x="'+(a[0]+6)+'" y="'+(a[1]+4)+'" font-size="12.5" style="fill:'+c+'">'+esc(d.anchor_A)+'</text>';
    s+='<text x="'+b[0]+'" y="'+(b[1]-8)+'" text-anchor="end" font-size="12.5" style="fill:'+c+'">'+esc(d.anchor_B)+'</text>';
    s+='<text x="'+(m[0]+6)+'" y="'+m[1]+'" font-size="12.5" style="fill:'+c+'">uncertain</text>';
    s+=arr(ang,len*.6,3,1);
    var st=P(ang,len*.6);
    s+='<text x="'+(st[0]+8)+'" y="'+(st[1]+(ang<.5?16:4))+'" font-size="12.5" font-weight="600" style="fill:'+c+'">state</text>';
    s+='<circle cx="'+ox+'" cy="'+oy+'" r="4" fill="'+c+'"/>';
    return s+"</svg>";
  }

  /* ---------- distributional: next-token bars ---------- */
  function vizDis(d){
    var bars=d.bars.map(function(b){return [b.token,b.p]}).concat([["other",d.other]]), c=css("dis");
    var W=260,H=160,top=26,rh=Math.min(24,(H-top-4)/bars.length),lx=92,bw=W-lx-50;
    var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Distributional lens, '+esc(d.position)+': '+
      esc(bars.map(function(b){return b[0]+" "+fmtp(b[1])}).join(", "))+'">';
    s+='<text x="4" y="12" font-style="italic" font-size="10.5">'+esc(d.position)+'</text>';
    bars.forEach(function(b,i){var y=top+i*rh,w=Math.max(1.5,b[1]*bw);
      s+='<text x="'+(lx-8)+'" y="'+(y+rh/2+5)+'" text-anchor="end" class="ink" font-size="13">'+esc(b[0])+'</text>';
      s+='<rect x="'+lx+'" y="'+(y+rh/2-7)+'" width="'+w+'" height="14" fill="'+c+'"/>';
      s+='<text x="'+(lx+w+6)+'" y="'+(y+rh/2+4)+'" font-size="12">'+fmtp(b[1])+'</text>';});
    return s+"</svg>";
  }

  /* ---------- semantical: meaning clusters as circles; every line is fitted to the circle's chord ---------- */
  var CW=.6; /* monospace advance, em */
  function fitLine(str,maxW,base,min){
    var size=Math.min(base,maxW/(str.length*CW)), t=str;
    if(size<min){size=min;var n=Math.max(1,Math.floor(maxW/(min*CW))-1);t=str.length>n?str.slice(0,n)+"…":str;}
    return {t:t,size:size,w:t.length*size*CW};
  }
  function vizSem(d){
    var cl=d.clusters.map(function(g){return [g.label,g.count,g.surface_forms||[]]});
    var W=260,H=160,c=css("sem"),n=d.n||cl.reduce(function(a,b){return a+b[1]},0);
    function R(k){return Math.max(28,68*Math.sqrt(k/n))}
    function chord(r,dy){return 2*Math.sqrt(Math.max(0,r*r-dy*dy))}
    var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Semantical lens: '+n+' sampled answers grouped by meaning: '+
      esc(cl.map(function(g){return g[0].replace(/\.$/,"")+" "+g[1]}).join(", "))+'">';
    function circle(x,y,r,g,isBig){
      var o='<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+css("bg")+'" fill-opacity=".55" stroke="'+c+'" stroke-opacity=".7" stroke-width="1.6"><title>'+esc(g[0])+': '+g[1]+'</title></circle>';
      if(r<40){ /* small cluster: plain label + count */
        var lab=(g[2].length?g[2][0]:g[0]).replace(/\.$/,"");
        var L=fitLine(lab,chord(r,9)-8,10.5,7.5);
        o+='<text x="'+x+'" y="'+(y-1)+'" text-anchor="middle" class="ink" font-size="'+L.size.toFixed(1)+'">'+esc(L.t)+'</text>';
        o+='<text x="'+x+'" y="'+(y+13)+'" text-anchor="middle" font-style="italic" font-size="10.5">'+g[1]+'</text>';
        return o;}
      var forms=(g[2].length?g[2]:[g[0].replace(/\.$/,"")]).slice(0,r>48?3:1);
      var tagH=15, gap=4, cnt=isBig?g[1]+" of "+n:String(g[1]), cntH=11;
      var total=forms.length*tagH+(forms.length-1)*gap+gap+cntH;
      var yy=y-total/2;
      forms.forEach(function(f){
        var dy=Math.max(Math.abs(yy-y),Math.abs(yy+tagH-y));
        var room=chord(r,dy)-8;
        var L=fitLine(f,room-8,11,7.5);
        var tw=Math.min(room,L.w+8);
        o+='<rect x="'+(x-tw/2)+'" y="'+yy+'" width="'+tw+'" height="'+tagH+'" rx="3" fill="'+c+'" fill-opacity=".14"/>';
        o+='<text x="'+x+'" y="'+(yy+tagH/2+L.size*.36)+'" text-anchor="middle" class="ink" font-size="'+L.size.toFixed(1)+'">'+esc(L.t)+'</text>';
        yy+=tagH+gap;});
      var Lc=fitLine(cnt,chord(r,Math.abs(yy+cntH-y))-8,10.5,7.5);
      o+='<text x="'+x+'" y="'+(yy+cntH-2)+'" text-anchor="middle" font-style="italic" font-size="'+Lc.size.toFixed(1)+'">'+esc(Lc.t)+'</text>';
      return o;}
    var big=cl[0],r0=R(big[1]),cx0=r0+6,cy0=H/2;
    s+=circle(cx0,cy0,r0,big,true);
    var rest=cl.slice(1);
    if(rest.length){
      var rs=rest.map(function(g){return R(g[1])}), colX=2*r0+14, maxr=Math.max.apply(null,rs);
      var total=rs.reduce(function(a,r){return a+2*r},0)+(rs.length-1)*4;
      if(total<=H-4){var y=(H-total)/2;rest.forEach(function(g,i){s+=circle(colX+maxr,y+rs[i],rs[i],g,false);y+=2*rs[i]+4;});}
      else{var pos=[[colX+rs[0],rs[0]+4],[W-rs[1]-4,H-rs[1]-4],[colX+rs[2]+2,H-rs[2]-4]];
        rest.forEach(function(g,i){var p=pos[i]||[W-20,20];s+=circle(p[0],p[1],rs[i],g,false);});}
    }
    return s+"</svg>";
  }

  /* ---------- one example = one tabpanel ---------- */
  function panelHTML(e){
    var t=e.target.toLowerCase();
    var h='<div class="qline"><p class="q"><b>Query:</b> '+esc(e.query)+' <span class="ref">('+esc(e.reference)+')</span></p>'+
      '<span class="chip tgt" style="--tc:var(--'+t+'-text,var(--'+t+'));--tb:var(--'+t+'-bg)" title="Target">'+esc(e.target)+'</span></div>';
    h+='<div class="lensgrid">'+data.lenses.map(function(L){return lensHTML(e,L)}).join("")+'</div>';
    h+='<p class="take">'+esc(e.takeaway)+'</p>';
    return h;
  }
  function lensHTML(e,L){
    var d=e.panels[L.key], on=!!d, suited=on&&L.key===e.suited_lens, uid=e.id+"-"+L.key, inner, ctl="";
    if(!on) inner="not run";
    else if(L.key==="str") inner=vizStr(d,uid);
    else if(L.key==="rep"){
      var ks=Object.keys(d.layers), Lr=layer[e.id]||d.default_layer;
      inner=vizRep(d,Lr,uid);
      ctl=ks.length>1
        ?'<span class="seg ctl" role="group" aria-label="Layer">'+ks.map(function(k){return '<button type="button" aria-pressed="'+(k===Lr)+'" data-ex="'+e.id+'" data-l="'+k+'">'+k+'</button>'}).join("")+'</span>'
        :'<span class="ctl lbl">'+esc(ks[0])+'</span>';
    }
    else if(L.key==="dis") inner=vizDis(d);
    else inner=vizSem(d);
    return '<article class="lpanel'+(suited?" suited":"")+(on?"":" off")+'" data-lens="'+L.key+'">'+
      '<h4>'+esc(L.name)+(suited?'<span class="vh"> (suited lens)</span>':'')+'</h4><p class="ask">'+esc(L.ask)+'</p>'+
      '<div class="card"><div class="in">'+inner+ctl+'</div></div></article>';
  }
  function renderPanel(e){
    var p=document.getElementById("ex-"+e.id);
    if(p) p.innerHTML=panelHTML(e);
  }
  function renderAll(){ if(data) data.examples.forEach(renderPanel); }

  /* [[key]] -> author-year link to #ref-key in the References section */
  function cite(text){
    return esc(text).replace(/\[\[([\w-]+)\]\]/g,function(_,k){
      var ref=document.getElementById("ref-"+k);
      return ref?'<a class="cite" href="#ref-'+k+'">('+esc(ref.dataset.cite)+')</a>':"";
    });
  }
  function jumpHere(){
    var bar=document.querySelector(".tabbar");
    window.scrollTo({top:root.getBoundingClientRect().top+window.scrollY-(bar?bar.offsetHeight:0)-8,behavior:"instant"});
  }
  function build(){
    var tl=root.querySelector('[role="tablist"]'), box=root.querySelector(".ex-panels");
    var want=(location.hash||"").slice(1), start=0;
    data.examples.forEach(function(e,i){if(e.id===want) start=i});
    tl.innerHTML=data.examples.map(function(e,i){
      return '<button class="ltab" role="tab" id="ex-tab-'+e.id+'" aria-controls="ex-'+e.id+'" aria-selected="'+(i===start)+'">'+
        '<span class="dot" style="background:var(--'+e.suited_lens+')" aria-hidden="true"></span>'+esc(e.tab)+'</button>';
    }).join("");
    box.innerHTML=data.examples.map(function(e,i){
      return '<div role="tabpanel" id="ex-'+e.id+'" aria-labelledby="ex-tab-'+e.id+'" tabindex="0"'+(i===start?"":" hidden")+'></div>';
    }).join("");
    renderAll();
    root.querySelector(".ex-foot").innerHTML=cite(data.meta.footnote);
    if(window.UQL&&UQL.tabs&&UQL.tabs.initTablist) UQL.tabs.initTablist(tl);

    /* user-picked tab -> shareable #id; the section scroll-spy leaves these alone (UQL.subHash) */
    tl.addEventListener("uql:tab",function(ev){
      if(!ev.detail.user||!history.replaceState) return;
      history.replaceState(null,"",location.pathname+location.search+"#"+ev.detail.panel.replace(/^ex-/,""));
    });
    /* layer toggles (event delegation survives re-renders) */
    box.addEventListener("click",function(ev){
      var b=ev.target.closest("button[data-l]"); if(!b) return;
      layer[b.dataset.ex]=b.dataset.l;
      var e=data.examples.filter(function(x){return x.id===b.dataset.ex})[0];
      renderPanel(e);
      var again=box.querySelector('button[data-ex="'+b.dataset.ex+'"][data-l="'+b.dataset.l+'"]');
      if(again) again.focus();
    });
    document.addEventListener("uql:theme",renderAll);
    /* in-page links to #math etc. after load */
    window.addEventListener("hashchange",function(){
      var h=location.hash.slice(1), tab=document.getElementById("ex-tab-"+h);
      if(!tab||!data.examples.some(function(e){return e.id===h})) return;
      if(tab.getAttribute("aria-selected")!=="true") tab.click();
      jumpHere();
    });
    if(want&&data.examples.some(function(e){return e.id===want})) jumpHere();
    else if(want&&!userMoved){
      /* the example grew the page after the browser's fragment jump: redo it for later sections (#survey, #ref-…) */
      var target=document.getElementById(want);
      if(target) target.scrollIntoView({behavior:"instant",block:"start"});
    }
  }

  function init(){
    root=document.getElementById("opening-example");
    if(!root) return null;
    ["wheel","touchstart","keydown","mousedown"].forEach(function(ev){
      window.addEventListener(ev,function(){userMoved=true},{once:true,passive:true});
    });
    window.UQL=window.UQL||{};
    fetch(EXAMPLES_URL).then(function(r){if(!r.ok) throw new Error(r.status);return r.json()})
      .then(function(j){
        data=j;
        UQL.subHash=UQL.subHash||{};
        UQL.subHash.overview=data.examples.map(function(e){return e.id});
        build();
      })
      .catch(function(){
        var box=root.querySelector(".ex-panels");
        if(box) box.innerHTML='<p class="ex-status">Could not load the example data ('+esc(EXAMPLES_URL)+').</p>';
      });
    return root;
  }
  window.UQL=window.UQL||{}; UQL.examples={init:init};
  init();
})();
