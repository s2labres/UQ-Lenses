/* Survey · section 03: coverage map, takeaways, finder, filters, paper list.
   Data: ./data/papers.json (survey-data/, brief 03), ./data/survey.json (section text, brief 07), ./data/papers.bib.
   The preview embeds the same three files as <script type="application/json|text/plain"> blocks
   (#sv-data-papers, #sv-data-text, #sv-data-bib); when those are absent the files are fetched.
   Math: strings carry LaTeX between \( \); MathJax 3 typesets them once "uql:mathjax" has fired.
   State lives in the hash: #survey?lens=rep&Z=theta&cell=Z.rep.theta&q=probe&sort=year */
(function(){
  var V="20261123d", BASE="./data/";
  var LK=["str","rep","dis","sem"];
  var AX={Z:{field:"Z",tab:"cov-z"},S:{field:"S",tab:"cov-s"},target:{field:"targets",tab:"cov-target"}};
  var GROUPS=["lens","target","Z","S","access","ns","metric","type"];
  var FIELD={lens:"lens",target:"targets",Z:"Z",S:"S",access:"access",ns:"ns",metric:"metrics",type:"type"};
  /* ASCII aliases for the hash; unicode values are accepted on read too */
  var ALIAS={Z:{"∅":"none","y":"y","θ":"theta","x′":"x"},S:{"∅":"none","Z_S":"Z_S","ρ_S":"rho_S","U_S":"U_S","ψ_S":"psi_S"}};
  var root, P, T, L, COV, BIB=null, BIBSRC="", typeOrder={}, sameId={};
  var S0=function(){return {q:"",f:{lens:[],target:[],Z:[],S:[],access:[],ns:[],metric:[],type:[]},cell:null,sort:"lens",all:false}};
  var st=S0();

  function $(id){return document.getElementById(id)}
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  function stripTex(s){return String(s).replace(/\\\(|\\\)/g,"").replace(/\\mathcal\s*U/g,"𝒰").replace(/\\varnothing/g,"∅").replace(/\\(rho|psi|theta|lambda)/g,function(m,g){return {rho:"ρ",psi:"ψ",theta:"θ",lambda:"λ"}[g]}).replace(/\\text\{([^}]*)\}/g,"$1").replace(/[{}\\]/g,"")}
  function reduce(){return window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches}
  function uniq(a){var o=[];a.forEach(function(x){if(o.indexOf(x)<0)o.push(x)});return o}
  function arr(v){return Array.isArray(v)?v:[v]}

  /* ---------- MathJax queue (same pattern as lenses.js) ---------- */
  var queued=[];
  function typeset(el){
    var M=window.MathJax;
    if(M&&M.typesetPromise){try{M.typesetClear&&M.typesetClear([el])}catch(e){} return M.typesetPromise([el]).catch(function(){})}
    if(queued.indexOf(el)<0) queued.push(el);
  }
  document.addEventListener("uql:mathjax",function(){var q=queued;queued=[];q.forEach(typeset);jumpIn()});

  /* ---------- data helpers ---------- */
  function vals(p,g){
    if(g==="access") return p.access_all||[p.access];
    return arr(p[FIELD[g]]);
  }
  function papersOf(rows){return uniq(rows.map(function(p){return p.id})).length}
  function fill(s){
    return String(s).replace(/\{(papers|rows|lens|tgt|cell|type_header)(?::([^}]+))?\}/g,function(m,k,a){
      if(k==="papers") return papersOf(P);
      if(k==="rows") return P.length;
      if(k==="lens") return papersOf(P.filter(function(p){return p.lens===a}));
      if(k==="tgt") return papersOf(P.filter(function(p){return p.targets.indexOf(a)>=0}));
      if(k==="cell"){var t=a.split("."),c=COV["lens_x_"+t[0]];return c?c.cells[t[1]][t[2]].n:m}
      if(k==="type_header") return st.f.lens.length===1?L.type_header[st.f.lens[0]]:"Type";
      return m;
    });
  }
  function symHtml(g,v){
    if(g==="Z"||g==="S"||g==="ns") return T.sym_html[g][v]||esc(v);
    if(g==="access") return L.access[v].sym;
    return esc(v);
  }
  function valName(g,v){
    if(g==="lens") return L.lens[v].name;
    if(g==="target") return L.target[v];
    if(g==="metric") return L.metric[v];
    if(g==="access") return L.access[v].name;
    if(g==="ns") return L.ns[v].name;
    if(g==="Z"||g==="S") return L[g][v].name;
    return v;
  }
  function chipStyle(g,v){
    if(g==="lens") return "--c:var(--"+v+");--cbg:var(--"+v+"-bg)";
    if(g==="target") return "--tc:var(--"+v.toLowerCase()+(v==="FTH"||v==="UNS"?"-text":"")+");--tb:var(--"+v.toLowerCase()+"-bg)";
    if(g==="metric"){var k=v==="FTH"?"fthm":v.toLowerCase();return "--mc:var(--"+k+(k==="scr"||k==="fthm"?"-text":"")+");--mb:var(--"+k+"-bg)"}
    return "";
  }

  /* ---------- hash state ---------- */
  function toHash(){
    var q=[];
    GROUPS.forEach(function(g){
      if(st.f[g].length) q.push(g+"="+st.f[g].map(function(v){return encodeURIComponent(ALIAS[g]?ALIAS[g][v]:v)}).join(","));
    });
    if(st.cell) q.push("cell="+[st.cell.axis,st.cell.lens,ALIAS[st.cell.axis]&&ALIAS[st.cell.axis][st.cell.col]||st.cell.col].map(encodeURIComponent).join("."));
    if(st.q) q.push("q="+encodeURIComponent(st.q));
    if(st.sort!=="lens") q.push("sort="+st.sort);
    return "#survey"+(q.length?"?"+q.join("&"):"");
  }
  function unalias(g,v){
    if(!ALIAS[g]) return v;
    for(var k in ALIAS[g]) if(ALIAS[g][k]===v||k===v) return k;
    return v;
  }
  function fromHash(h){
    var s=S0(), i=h.indexOf("?");
    if(h.slice(0,8)!=="#survey?"||i<0) return null;
    h.slice(i+1).split("&").forEach(function(kv){
      var j=kv.indexOf("="), k=kv.slice(0,j), v=kv.slice(j+1);
      if(j<0) return;
      if(GROUPS.indexOf(k)>=0) s.f[k]=v.split(",").map(function(x){return unalias(k,decodeURIComponent(x))}).filter(Boolean);
      else if(k==="q") s.q=decodeURIComponent(v.replace(/\+/g," "));
      else if(k==="sort") s.sort=v==="year"?"year":"lens";
      else if(k==="cell"){
        var t=v.split(".").map(decodeURIComponent);
        if(AX[t[0]]&&LK.indexOf(t[1])>=0) s.cell={axis:t[0],lens:t[1],col:t[2]==="total"?"total":unalias(t[0],t.slice(2).join("."))};
      }
    });
    if(s.cell&&!cellRows(s.cell)) s.cell=null;
    s.all=!!s.cell;
    return s;
  }
  function writeHash(){
    var h=toHash();
    /* nav.js keeps a hash while inside its section if it is listed in UQL.subHash */
    window.UQL=window.UQL||{}; UQL.subHash=UQL.subHash||{};
    var subs=(UQL.subHash.survey||[]).filter(function(x){return x.indexOf("survey?")!==0});
    if(h!=="#survey") subs.push(h.slice(1));
    UQL.subHash.survey=subs;
    if(location.hash!==h&&history.replaceState) history.replaceState(null,"",location.pathname+location.search+h);
  }

  /* ---------- filtering ---------- */
  function cellRows(c){
    var cov=COV["lens_x_"+c.axis]; if(!cov) return null;
    var cl=cov.cells[c.lens]; if(!cl) return null;
    if(c.col==="total") return P.filter(function(p){return p.lens===c.lens}).map(function(p){return p.row});
    return cl[c.col]?cl[c.col].rows:null;
  }
  function norm(s){return String(s).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase()}
  var HAY={};
  function matchQ(p){
    if(!st.q) return true;
    var h=HAY[p.row]||(HAY[p.row]=norm([p.method,p.title,p.authors.join(" ")].join(" ")));
    return norm(st.q).split(/\s+/).filter(Boolean).every(function(w){return h.indexOf(w)>=0});
  }
  function matchG(p,g){
    var want=st.f[g]; if(!want.length) return true;
    var have=vals(p,g);
    return want.some(function(v){return have.indexOf(v)>=0});
  }
  var cellSet=null;
  function pass(p,skip){
    if(cellSet&&!cellSet[p.row]) return false;
    if(!matchQ(p)) return false;
    for(var i=0;i<GROUPS.length;i++) if(GROUPS[i]!==skip&&!matchG(p,GROUPS[i])) return false;
    return true;
  }
  function active(){return !!(st.q||st.cell||GROUPS.some(function(g){return st.f[g].length}))}

  /* ---------- coverage map ---------- */
  function buildMap(){
    $("sv-h-map").textContent=T.map.title; $("sv-sub-map").textContent=T.map.sub;
    $("sv-cap").innerHTML=esc(T.map.caption)+' <span class="sv-gapkey"><span class="sv-gapsw" aria-hidden="true">0</span> '+esc(T.map.gap_note)+'</span>';
    Object.keys(AX).forEach(function(axis){
      var cov=COV["lens_x_"+axis], panel=$(AX[axis].tab), tm=T.map.tabs[axis];
      var colTex=function(c){return axis==="target"?'<span class="mono">'+c+'</span>':L[axis][c].tex};
      var colName=function(c){return axis==="target"?L.target[c]:L[axis][c].name};
      var axisName=axis==="target"?"target":axis;
      var h='<div class="cov-frame"><table class="cov"><caption class="vh">Coverage map: lens × '+esc(axisName)+'. Each cell is the number of surveyed papers; a bar under it splits them by the chosen breakdown.</caption><thead><tr><th scope="col" class="cov-corner"><span class="vh">Lens</span></th>'+
        cov.cols.map(function(c){
          return '<th scope="col" title="'+esc(colName(c))+'"><span class="cov-sym">'+colTex(c)+'</span><span class="cov-short">'+esc(tm.col_short[c]||colName(c))+'</span><span class="vh">'+esc(colName(c))+'</span></th>';
        }).join("")+'<th scope="col" class="cov-tot"><span class="cov-sym">'+esc(T.map.total_label)+'</span><span class="cov-short">'+esc(T.map.total_short)+'</span></th></tr></thead><tbody>'+
        LK.map(function(l){
          var name=L.lens[l].name;
          return '<tr data-lens="'+l+'"><th scope="row" title="'+esc(name)+'"><span class="code">'+l+'</span><span class="vh"> '+esc(name)+'</span></th>'+
            cov.cols.map(function(c){
              var n=cov.cells[l][c].n;
              var lab=name+", "+(axis==="target"?"target "+c+" ("+colName(c)+")":axis+" = "+stripTex(colTex(c))+" ("+colName(c)+")")+": "+n+" paper"+(n===1?"":"s");
              return '<td><button type="button" class="cv'+(n?"":" gap")+'" data-axis="'+axis+'" data-lens="'+l+'" data-col="'+esc(c)+'" aria-pressed="false" data-label="'+esc(lab)+'" aria-label="'+esc(lab)+'">'+
                '<span class="cv-n" aria-hidden="true">'+n+'</span>'+(n?'<span class="bar" aria-hidden="true"></span>':'')+'</button></td>';
            }).join("")+
            '<td><button type="button" class="cv tot" data-axis="'+axis+'" data-lens="'+l+'" data-col="total" aria-pressed="false" aria-label="'+esc(name+", all: "+cov.cells[l].total.n+" papers")+'">'+cov.cells[l].total.n+'</button></td></tr>';
        }).join("")+'</tbody></table></div>'+
        (tm.note_html?'<p class="sv-note">'+fill(tm.note_html)+'</p>':'');
      panel.innerHTML=h;
    });
    root.querySelectorAll(".cv").forEach(function(b){
      b.addEventListener("click",function(){
        var c={axis:b.dataset.axis,lens:b.dataset.lens,col:b.dataset.col};
        if(st.cell&&st.cell.axis===c.axis&&st.cell.lens===c.lens&&st.cell.col===c.col) st.cell=null;
        else st.cell=c;
        st.all=!!st.cell; hideCard(); update(); if(st.cell) toList();  /* a selected cell lists all its methods */
      });
    });
    buildDotCtl(); paintDots();
    typeset($("survey-map"));
  }

  /* ---------- breakdown bars + hover card: each cell's papers split by the chosen mode ---------- */
  var dotMode="ns";
  var TPRI=["GRD","FTH","UNS","COR"];
  function dotCats(){
    if(dotMode==="ns") return ["native","surr-sem","surr-dis"];
    if(dotMode==="access") return ["B","G","W"];
    return ["COR","GRD","FTH","UNS"];
  }
  function dotCat(rows,col,axis){ /* rows = this paper's rows inside the cell */
    if(dotMode==="target"&&axis==="target") return col; /* in lens × target a paper follows its own column */
    if(dotMode==="ns"){var ns=[].concat.apply([],rows.map(function(x){return x.ns}));return ns.indexOf("native")>=0?"native":ns.indexOf("surr-sem")>=0?"surr-sem":"surr-dis"}
    if(dotMode==="access") return vals(rows[0],"access")[0];
    var ts=[].concat.apply([],rows.map(function(x){return x.targets}));
    for(var i=0;i<TPRI.length;i++) if(ts.indexOf(TPRI[i])>=0) return TPRI[i];
    return "COR";
  }
  function catName(c){
    if(dotMode==="ns") return L.ns[c].name;
    if(dotMode==="access") return L.access[c].name;
    return c+" "+L.target[c];
  }
  function catSym(c){
    if(dotMode==="ns") return T.sym_html.ns[c];
    if(dotMode==="access") return L.access[c].sym;
    return '<span class="mono">'+c+'</span>';
  }
  var ROWBY={};
  function cellItems(b){
    if(!Object.keys(ROWBY).length) P.forEach(function(p){ROWBY[p.row]=p});
    var cell=b.dataset.col==="total"?null:COV["lens_x_"+b.dataset.axis].cells[b.dataset.lens][b.dataset.col], per={}, cats=dotCats();
    var rows=cell?cell.rows:P.filter(function(p){return p.lens===b.dataset.lens}).map(function(p){return p.row});
    rows.forEach(function(r){var p=ROWBY[r];(per[p.id]=per[p.id]||[]).push(p)});
    var items=Object.keys(per).map(function(id){var rs=per[id];return {c:dotCat(rs,b.dataset.col,b.dataset.axis),p:rs[0],m:uniq(rs.map(function(x){return x.method}))}});
    items.sort(function(x,y){return cats.indexOf(x.c)-cats.indexOf(y.c)||x.p.year-y.p.year});
    var cnt={};items.forEach(function(it){cnt[it.c]=(cnt[it.c]||0)+1});
    return {items:items,cnt:cnt,cats:cats.filter(function(c){return cnt[c]})};
  }
  function paintDots(){
    var MAX={}; Object.keys(AX).forEach(function(ax){var c=COV["lens_x_"+ax],m=0;LK.forEach(function(l){c.cols.forEach(function(k){m=Math.max(m,c.cells[l][k].n)})});MAX[ax]=m});
    root.querySelectorAll(".cv:not(.gap)").forEach(function(b){
      var r=cellItems(b), bar=b.querySelector(".bar");
      if(bar) bar.innerHTML='<span class="bi" style="width:calc((100% - 17px) * '+Math.max(.04,r.items.length/MAX[b.dataset.axis]).toFixed(3)+')">'+
        r.cats.map(function(c){return '<span class="sg s-'+dotMode+'-'+c+'" style="flex-grow:'+r.cnt[c]+'"></span>'}).join("")+'</span><span class="bn">'+r.items.length+'</span>';
      b.setAttribute("aria-label",b.dataset.label+" ("+r.cats.map(function(c){return r.cnt[c]+" "+catName(c)}).join(", ")+")");
    });
    var D=T.map.dots;
    $("sv-legend").innerHTML='<span class="vh">Bar legend: </span>'+dotCats().map(function(c){
      var lab=dotMode==="target"?'<span class="mono">'+c+'</span> '+esc(L.target[c]):c==="native"?catSym(c)+' '+esc(D.native_legend):dotMode==="access"?esc(catName(c)):catSym(c)+' '+esc(catName(c));
      return (dotMode==="target"&&c==="FTH"?'<span class="lg-br"></span>':'')+'<span class="lg"><span class="sw s-'+dotMode+'-'+c+'"></span>'+lab+'</span>';
    }).join("")+(dotMode==="target"&&D.target_note?'<span class="lg-note">'+esc(D.target_note)+'</span>':'');
    $("sv-dotmode").querySelectorAll("button").forEach(function(x){x.setAttribute("aria-pressed",String(x.dataset.m===dotMode))});
    hideCard();
  }
  function buildDotCtl(){
    var D=T.map.dots; dotMode=D.default||"ns";
    $("sv-dotlbl").textContent=D.label;
    var el=$("sv-dotmode");
    el.innerHTML=Object.keys(D.modes).map(function(m){return '<button type="button" data-m="'+m+'" aria-pressed="false">'+esc(D.modes[m])+'</button>'}).join("");
    el.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;dotMode=b.dataset.m;paintDots()});
    /* hover card: pointer hover or keyboard focus (not on tap) */
    var card=document.createElement("div"); card.className="sv-card"; card.id="sv-card"; card.hidden=true; card.setAttribute("aria-hidden","true");
    $("survey-map").appendChild(card);
    root.querySelectorAll(".cv:not(.gap)").forEach(function(b){
      b.addEventListener("mouseenter",function(e){showCard(b)});
      b.addEventListener("mouseleave",hideCard);
      b.addEventListener("focus",function(){if(b.matches(":focus-visible")) showCard(b)});
      b.addEventListener("blur",hideCard);
    });
    document.addEventListener("keydown",function(e){if(e.key==="Escape") hideCard()});
    window.addEventListener("scroll",hideCard,{passive:true});
  }
  function showCard(b){
    var card=$("sv-card"), r=cellItems(b), MAX=12, c=b.dataset.col;
    var head=c==="total"?cellLabel({axis:b.dataset.axis,lens:b.dataset.lens,col:"total"}):cellLabel({axis:b.dataset.axis,lens:b.dataset.lens,col:c});
    card.innerHTML='<p class="ch">'+head+' <span>'+r.items.length+' paper'+(r.items.length===1?'':'s')+'</span></p>'+
      '<p class="cb">'+r.cats.map(function(k){return '<span class="lg"><span class="sw s-'+dotMode+'-'+k+'"></span>'+r.cnt[k]+' '+esc(dotMode==="target"?k:catName(k))+'</span>'}).join("")+'</p>'+
      '<ul>'+r.items.slice(0,MAX).map(function(it){var a=it.p.authors||[];
        return '<li><span class="sw s-'+dotMode+'-'+it.c+'"></span><b>'+esc(it.m.join(", "))+'</b> <span>'+esc((a.length>2?a[0]+" et al.":a.join(" & "))+" "+it.p.year)+'</span></li>'}).join("")+
      (r.items.length>MAX?'<li class="more">+ '+(r.items.length-MAX)+' more · click the cell to see them all in the paper list below</li>':'')+'</ul>';
    card.dataset.lens=b.dataset.lens; card.hidden=false;
    var br=b.getBoundingClientRect(), cw=card.offsetWidth, ch=card.offsetHeight;
    var x=Math.min(Math.max(8,br.left+br.width/2-cw/2),window.innerWidth-cw-8), y=br.bottom+8;
    if(y+ch>window.innerHeight-8) y=Math.max(8,br.top-ch-8);
    card.style.left=x+"px"; card.style.top=y+"px";
  }
  function hideCard(){var c=$("sv-card"); if(c) c.hidden=true}
  function syncMap(){
    root.querySelectorAll(".cv").forEach(function(b){
      var on=!!st.cell&&st.cell.axis===b.dataset.axis&&st.cell.lens===b.dataset.lens&&st.cell.col===b.dataset.col;
      b.setAttribute("aria-pressed",String(on));
    });
  }
  function selectTabFor(axis){
    var t=$(AX[axis].tab.replace("cov-","cov-tab-"));
    if(t&&t.getAttribute("aria-selected")!=="true") t.click();
  }
  function cellLabel(c){
    if(c.col==="total") return '<span class="code" data-lens="'+c.lens+'">'+c.lens+'</span> all';
    var v=c.axis==="target"?c.col:symHtml(c.axis,c.col);
    return '<span class="code" data-lens="'+c.lens+'">'+c.lens+'</span> · '+(c.axis==="target"?"target":"<i>"+c.axis+"</i>")+' = '+v;
  }

  /* ---------- takeaways ---------- */
  function buildTakeaways(){
    var t=T.takeaways; $("sv-h-tk").textContent=t.title;
    $("sv-tks").innerHTML=t.items.map(function(x){
      return '<aside class="sv-tk" data-lens="'+x.lens+'" aria-label="Takeaway '+x.n+'"><span class="tt">Takeaway '+x.n+' · '+esc(x.title)+'</span>'+
        '<p>'+x.body_html+' <span class="sv-sec">'+esc(x.section)+'</span></p></aside>';
    }).join("");
    typeset($("sv-tks"));
  }

  /* ---------- finder: every answer re-applies all answers; a blank question clears its filter ---------- */
  function finderGroups(){
    var gs=[]; T.finder.questions.forEach(function(q){q.options.forEach(function(o){Object.keys(o.set).forEach(function(g){if(gs.indexOf(g)<0)gs.push(g)})})});
    return gs;
  }
  function buildFinder(){
    var F=T.finder, el=$("survey-finder");
    el.innerHTML='<summary>'+esc(F.summary)+'</summary><div class="sv-fd"><p class="sv-fd-note">'+esc(F.note)+'</p><div class="sv-fd-qs">'+
      F.questions.map(function(q){
        return '<fieldset><legend>'+esc(q.q)+'</legend>'+q.options.map(function(o,i){
          var tag=o.sym?'<span class="sv-fd-sym">'+symHtml("S",o.sym)+'</span> ':o.code?(q.id==="lens"?'<span class="code" data-lens="'+o.code+'">'+o.code+'</span> ':'<span class="chip tgt" style="'+chipStyle("target",o.code)+'">'+o.code+'</span> '):'';
          return '<label><input type="radio" name="sv-fd-'+q.id+'" value="'+i+'"> <span>'+tag+esc(o.label)+(o.hint?' <small>'+esc(o.hint)+'</small>':'')+'</span></label>';
        }).join("")+'</fieldset>';
      }).join("")+'</div><div class="sv-fd-foot"><p class="sv-fd-rule">'+F.rule_html+'</p>'+
      '<button type="button" class="sv-fd-reset" id="sv-fd-reset">'+esc(F.reset)+'</button></div></div>';
    function apply(){
      finderGroups().forEach(function(g){st.f[g]=[]});
      F.questions.forEach(function(q){
        var inp=el.querySelector('input[name="sv-fd-'+q.id+'"]:checked'); if(!inp) return;
        var o=q.options[+inp.value]; Object.keys(o.set).forEach(function(g){st.f[g]=o.set[g].slice()});
      });
      if(st.f.lens.length!==1) st.f.type=[];
      st.cell=null; st.all=false; update();
    }
    el.querySelectorAll("input").forEach(function(i){i.addEventListener("change",apply)});
    $("sv-fd-reset").addEventListener("click",function(){
      el.querySelectorAll("input").forEach(function(i){i.checked=false});
      finderGroups().forEach(function(g){st.f[g]=[]}); st.f.type=[];
      update();
    });
    typeset(el);
  }

  /* ---------- filters ---------- */
  function groupValues(g){
    if(g==="lens") return LK;
    if(g==="target") return Object.keys(L.target);
    if(g==="Z") return COV.lens_x_Z.cols;
    if(g==="S") return COV.lens_x_S.cols;
    if(g==="access") return ["B","G","W"];
    if(g==="ns") return ["native","surr-dis","surr-sem"];
    if(g==="metric") return Object.keys(L.metric);
    if(g==="type") return st.f.lens.length===1?typeOrder[st.f.lens[0]]:[];
    return [];
  }
  function chip(g,v,n){
    var on=st.f[g].indexOf(v)>=0, nm=valName(g,v), inner;
    if(g==="lens") inner='<span class="sym mono">'+v+'</span> '+esc(nm);
    else if(g==="target"||g==="metric") inner='<span class="sym mono">'+v+'</span> <small>'+esc(nm)+'</small>';
    else if(g==="type") inner=esc(v);
    else inner='<span class="sym">'+symHtml(g,v)+'</span> <small>'+esc(nm)+'</small>';
    return '<button type="button" class="fc fc-'+g+'" data-g="'+g+'" data-v="'+esc(v)+'" style="'+chipStyle(g,v)+'" aria-pressed="'+on+'"'+
      ' aria-label="'+esc((g==="lens"||g==="type"?"":v+", ")+nm+", "+n+" method"+(n===1?"":"s"))+'">'+inner+'<span class="n" aria-hidden="true">'+n+'</span></button>';
  }
  function buildFilters(){
    var F=T.filters, el=$("survey-filters");
    el.innerHTML='<div class="sv-search"><label class="vh" for="sv-q">'+esc(F.search_label)+'</label>'+
      '<input type="search" id="sv-q" placeholder="'+esc(F.search_placeholder)+'" autocomplete="off" spellcheck="false"></div>'+
      '<details class="sv-facets" id="sv-facets"><summary>'+esc(F.toggle)+' <span id="sv-facets-n"></span></summary><div class="sv-groups" id="sv-groups"></div></details>';
    var q=$("sv-q"), timer;
    q.addEventListener("input",function(){clearTimeout(timer);timer=setTimeout(function(){st.q=q.value.trim();st.all=false;update()},120)});
    var det=$("sv-facets"), mq=window.matchMedia&&matchMedia("(min-width: 700px)");
    det.open=!mq||mq.matches;
    $("sv-groups").addEventListener("click",function(e){
      var b=e.target.closest&&e.target.closest(".fc"); if(!b) return;
      var g=b.dataset.g, v=b.dataset.v, a=st.f[g], i=a.indexOf(v);
      if(i>=0) a.splice(i,1); else a.push(v);
      if(g==="lens") st.f.type=st.f.type.filter(function(t){return st.f.lens.length===1&&typeOrder[st.f.lens[0]].indexOf(t)>=0});
      st.all=false; update(); var nb=root.querySelector('.fc[data-g="'+g+'"][data-v="'+CSS.escape(v)+'"]'); if(nb) nb.focus();
    });
  }
  function renderFilters(){
    var F=T.filters;
    $("sv-groups").innerHTML=GROUPS.map(function(g){
      var vs=groupValues(g); if(!vs.length) return "";
      var label=g==="type"?L.type_header[st.f.lens[0]]:F.groups[g];
      return '<div class="sv-group" role="group" aria-label="'+esc(label)+'"><span class="gl">'+esc(label)+'</span><div class="gc">'+
        vs.map(function(v){
          var n=P.filter(function(p){return pass(p,g)&&vals(p,g).indexOf(v)>=0}).length;
          return chip(g,v,n);
        }).join("")+'</div></div>';
    }).join("");
    var k=GROUPS.reduce(function(s,g){return s+st.f[g].length},0);
    $("sv-facets-n").textContent=k?"("+k+" on)":"";
    var q=$("sv-q"); if(q.value.trim()!==st.q) q.value=st.q;
  }
  function renderActive(){
    var bits=[];
    if(st.cell) bits.push({k:"cell",h:cellLabel(st.cell)});
    if(st.q) bits.push({k:"q",h:'“'+esc(st.q)+'”'});
    GROUPS.forEach(function(g){st.f[g].forEach(function(v){
      bits.push({k:g,v:v,h:(g==="target"||g==="metric"||g==="lens"||g==="type"?esc(v):symHtml(g,v))+' <small>'+esc(g==="type"?L.type_header[st.f.lens[0]]||"type":T.filters.groups[g])+'</small>'});
    })});
    var el=$("sv-active");
    el.innerHTML=bits.length?bits.map(function(b,i){
      return '<button type="button" class="ac" data-i="'+i+'" aria-label="Remove filter: '+esc(stripHtml(b.h))+'">'+b.h+' <span aria-hidden="true">✕</span></button>';
    }).join("")+'<button type="button" class="ac clear" id="sv-clear">'+esc(T.filters.clear_all)+'</button>':"";
    el.querySelectorAll(".ac[data-i]").forEach(function(btn){
      btn.addEventListener("click",function(){
        var b=bits[+btn.dataset.i];
        if(b.k==="cell") st.cell=null; else if(b.k==="q") st.q="";
        else {st.f[b.k].splice(st.f[b.k].indexOf(b.v),1); if(b.k==="lens") st.f.type=st.f.lens.length===1?st.f.type:[];}
        update(); var f=el.querySelector(".ac"); (f||$("sv-q")).focus();
      });
    });
    var c=$("sv-clear"); if(c) c.addEventListener("click",clearAll);
  }
  function stripHtml(h){var d=document.createElement("div");d.innerHTML=h;return d.textContent.replace(/\s+/g," ").trim()}
  function clearAll(){var s=st.sort;st=S0();st.sort=s;update();$("sv-q").focus()}

  /* ---------- list ---------- */
  function sorted(rows){
    var r=rows.slice();
    r.sort(function(a,b){
      if(st.sort==="year"&&a.year!==b.year) return b.year-a.year;
      var d=LK.indexOf(a.lens)-LK.indexOf(b.lens); if(d) return d;
      d=typeOrder[a.lens].indexOf(a.type)-typeOrder[b.lens].indexOf(b.type); if(d) return d;
      if(a.year!==b.year) return a.year-b.year;
      return a.method.localeCompare(b.method);
    });
    return r;
  }
  function by(p){
    var a=p.authors||[], s=a.length>2?a[0]+" et al.":a.join(" & ");
    return esc(s)+' · '+esc(p.venue||"")+' '+p.year;
  }
  function coord(p){
    return '<span class="code" data-lens="'+p.lens+'">'+p.lens+'</span><span class="ty">'+esc(p.type)+'</span>'+
      '<span><i>Z</i> = '+p.Z.map(function(v){return symHtml("Z",v)}).join(", ")+'</span>'+
      '<span><i>S</i> = '+p.S.map(function(v){return symHtml("S",v)}).join(", ")+'</span>';
  }
  function card(p){
    var B=T.list.buttons, acc=vals(p,"access");
    var href=p.url||(p.arxiv?"https://arxiv.org/abs/"+p.arxiv:"");
    var others=(sameId[p.id]||[]).filter(function(o){return o.row!==p.row});
    var also="";
    if(others.length){
      var same=others.filter(function(o){return o.method===p.method}), diff=others.filter(function(o){return o.method!==p.method});
      also='<p class="pc-also">'+
        (same.length?esc(T.list.also)+' '+same.map(function(o){return '<span class="code" data-lens="'+o.lens+'">'+o.lens+'</span> '+esc(o.type)}).join(", "):"")+
        (same.length&&diff.length?" · ":"")+
        (diff.length?esc(T.list.same_paper)+': '+diff.map(function(o){return esc(o.method)+' (<span class="code" data-lens="'+o.lens+'">'+o.lens+'</span> '+esc(o.type)+')'}).join(", "):"")+'</p>';
    }
    return '<article class="pc" data-lens="'+p.lens+'" id="pc-'+p.row+'" aria-labelledby="pc-h-'+p.row+'">'+
      '<div class="pc-head"><h4 class="pc-m" id="pc-h-'+p.row+'">'+esc(p.method)+'</h4>'+
      '<span class="pc-marks"><span class="pc-acc" title="'+esc(acc.map(function(a){return L.access[a].name}).join(" / ")+" access")+'">'+acc.map(function(a){return L.access[a].sym}).join("/")+
      '<span class="vh">'+esc(acc.map(function(a){return L.access[a].name}).join(" or ")+" access")+'</span></span>'+
      '<span class="pc-ns" title="'+esc(p.ns.map(function(n){return L.ns[n].name}).join("; "))+'">'+p.ns.map(function(n){return T.sym_html.ns[n]}).join(" ")+
      '<span class="vh">, '+esc(p.ns.map(function(n){return L.ns[n].name}).join("; "))+'</span></span></span></div>'+
      (href?'<a class="pc-t" href="'+esc(href)+'" target="_blank" rel="noopener">'+esc(p.title)+'</a>':
        '<a class="pc-t pc-sch" href="https://scholar.google.com/scholar?q='+encodeURIComponent('"'+p.title+'"')+'" target="_blank" rel="noopener" title="'+esc(B.search_title)+'">'+esc(p.title)+
        ' <svg class="pc-mag" viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 10l4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'+
        '<span class="vh"> ('+esc(B.search_title)+')</span></a>')+'<p class="pc-by">'+by(p)+'</p>'+
      '<p class="pc-co">'+coord(p)+'</p>'+also+
      '<div class="pc-foot"><div class="pc-chips">'+p.targets.map(function(t){return '<span class="chip tgt" style="'+chipStyle("target",t)+'" title="'+esc(L.target[t])+'">'+t+'</span>'}).join("")+
      (p.metrics.length?'<span class="pc-sep" aria-hidden="true"></span>':'')+
      p.metrics.map(function(m){return '<span class="chip met" style="'+chipStyle("metric",m)+'" title="'+esc(L.metric[m])+' metric">'+m+'</span>'}).join("")+'</div>'+
      '<p class="pc-acts">'+
      (p.code?'<a href="'+esc(p.code)+'" target="_blank" rel="noopener">'+esc(B.code)+'<span class="vh">: '+esc(p.method)+'</span></a><span class="dot" aria-hidden="true">·</span>':'')+
      '<button type="button" data-bib="'+esc(p.id)+'"><span class="lbl">'+esc(B.bib)+'</span><span class="vh">: copy the entry for '+esc(p.method)+'</span></button>'+
      '</p></div></article>';
  }
  function renderList(rows){
    var Ls=T.list, n=rows.length, show=st.all?rows:rows.slice(0,Ls.initial);
    var gap=st.cell&&st.cell.col!=="total"&&!(cellRows(st.cell)||[]).length;
    $("sv-cards").innerHTML=n?show.map(card).join(""):
      '<div class="sv-empty"><p>'+esc(gap?Ls.empty_gap:Ls.empty)+'</p><button type="button" class="btn sm" id="sv-empty-clear">'+esc(Ls.clear)+'</button></div>';
    var ec=$("sv-empty-clear"); if(ec) ec.addEventListener("click",clearAll);
    $("sv-more").innerHTML=n>Ls.initial?'<button type="button" class="btn" id="sv-more-btn" aria-expanded="'+st.all+'">'+esc(st.all?Ls.show_less:fill(Ls.show_all).replace("{n}",n))+'</button>':"";
    var mb=$("sv-more-btn");
    if(mb) mb.addEventListener("click",function(){
      st.all=!st.all; renderList(rows); var b=$("sv-more-btn"); if(b) b.focus();
      if(!st.all){var l=$("survey-list"); if(l.getBoundingClientRect().top<0) l.scrollIntoView({block:"start",behavior:reduce()?"auto":"smooth"})}
    });
    var F=T.filters, np=papersOf(rows);
    $("sv-count").textContent=(active()?F.count:F.count_all).replace("{rows}",n).replace("{papers}",np);
    $("sv-count").textContent=$("sv-count").textContent.replace(/\b1 methods\b/,"1 method").replace(/\b1 papers\b/,"1 paper");
  }
  function buildSort(){
    var el=$("sv-sort"); el.setAttribute("aria-label",T.list.sort_label);
    el.innerHTML=Object.keys(T.list.sort).map(function(k){return '<button type="button" data-sort="'+k+'" aria-pressed="false">'+esc(T.list.sort[k])+'</button>'}).join("");
    el.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;st.sort=b.dataset.sort;update()});
  }

  /* ---------- BibTeX copy ---------- */
  function bibEntry(id){
    if(!BIB){
      BIB={}; var re=/@\w+\s*\{\s*([^,\s]+)\s*,/g, m;
      while((m=re.exec(BIBSRC))){
        var d=1, j=BIBSRC.indexOf("{",m.index)+1;
        while(d&&j<BIBSRC.length){var c=BIBSRC[j];if(c==="{")d++;else if(c==="}")d--;j++}
        BIB[m[1]]=BIBSRC.slice(m.index,j);
      }
    }
    return BIB[id];
  }
  function copyBib(btn){
    var id=btn.dataset.bib, text=bibEntry(id), Ls=T.list, lbl=btn.querySelector(".lbl"), status=$("sv-status");
    function done(ok){
      lbl.textContent=ok?Ls.buttons.copied:Ls.buttons.bib;
      status.textContent=(ok?Ls.bib_ok:Ls.bib_fail).replace("{id}",id);
      setTimeout(function(){lbl.textContent=Ls.buttons.bib;status.textContent=""},2000);
    }
    if(!text){done(false);return}
    function fallback(){
      var ta=document.createElement("textarea");
      ta.value=text;ta.setAttribute("readonly","");ta.style.position="fixed";ta.style.opacity="0";
      document.body.appendChild(ta);ta.select();
      var ok=false;try{ok=document.execCommand("copy")}catch(e){}
      document.body.removeChild(ta);done(ok);
    }
    if(navigator.clipboard&&window.isSecureContext) navigator.clipboard.writeText(text).then(function(){done(true)},fallback);
    else fallback();
  }

  /* ---------- update + scrolling ---------- */
  function update(noHash){
    var cr=st.cell&&cellRows(st.cell);
    cellSet=null;
    if(cr){cellSet={};cr.forEach(function(r){cellSet[r]=1})}
    var rows=sorted(P.filter(function(p){return pass(p)}));
    syncMap(); renderFilters(); renderActive(); renderList(rows);
    $("sv-sort").querySelectorAll("button").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.sort===st.sort))});
    if(!noHash) writeHash();
  }
  function toList(force){
    var l=$("survey-list"), r=l.getBoundingClientRect();
    if(force||r.top>window.innerHeight-80||r.bottom<80) l.scrollIntoView({block:"start",behavior:reduce()?"auto":"smooth"});
  }
  /* an incoming #survey?… link has no element to jump to: scroll to the section once the page has settled */
  var userMoved=false, wantJump=false;
  ["wheel","touchstart","keydown","mousedown"].forEach(function(ev){
    window.addEventListener(ev,function(){userMoved=true},{once:true,passive:true});
  });
  function jumpIn(){
    if(!wantJump||userMoved) return;
    var t=st.cell||GROUPS.some(function(g){return st.f[g].length})||st.q?$("survey-list"):root;
    t.scrollIntoView({behavior:"instant",block:"start"});
  }
  function applyHash(){
    var s=fromHash(location.hash||"");
    if(!s) return false;
    st=s; if(st.cell) selectTabFor(st.cell.axis);
    update(true); writeHash();
    return true;
  }

  function build(papers,text,bib){
    P=papers.papers; COV=papers.coverage; L=papers.labels; T=text; BIBSRC=bib||"";
    P.forEach(function(p){
      (typeOrder[p.lens]=typeOrder[p.lens]||[]).indexOf(p.type)<0&&typeOrder[p.lens].push(p.type);
      (sameId[p.id]=sameId[p.id]||[]).push(p);
    });
    $("sv-lede").innerHTML=fill(T.lede_html);
    $("sv-h-list").textContent=T.list.title;
    buildMap(); buildTakeaways(); buildFinder(); buildFilters(); buildSort();
    $("sv-cards").addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("[data-bib]");if(b)copyBib(b)});
    wantJump=applyHash();
    if(!wantJump) update(true);
    window.addEventListener("hashchange",function(){
      if((location.hash||"").indexOf("#survey?")===0){applyHash();toList(true)}
    });
    root.classList.add("ready");
    typeset($("sv-lede"));
    jumpIn();
  }

  function inline(id){var s=document.getElementById(id);return s?s.textContent:null}
  function init(){
    root=$("survey"); if(!root||!$("survey-explorer")) return;
    var ip=inline("sv-data-papers"), it=inline("sv-data-text"), ib=inline("sv-data-bib");
    if(ip&&it){build(JSON.parse(ip),JSON.parse(it),ib);return}
    function get(u,json){return fetch(BASE+u+"?v="+V).then(function(r){if(!r.ok)throw new Error(u+" "+r.status);return json?r.json():r.text()})}
    Promise.all([get("papers.json",1),get("survey.json",1)]).then(function(a){
      build(a[0],a[1],"");
      get("papers.bib").then(function(t){BIBSRC=t;BIB=null}).catch(function(){});
    }).catch(function(err){var s=$("sv-status-load"); if(s) s.textContent="Could not load the survey data ("+err.message+").";});
  }
  window.UQL=window.UQL||{}; UQL.explorer={init:init};
  init();
})();
