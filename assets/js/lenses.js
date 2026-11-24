/* Lenses · section 02, told in the order of the paper's four takeaways.
   Data: ./data/lenses.json (from lenses-section/site-data, 2026-11-16).
   Rendering: ported from the approved preview (lenses-section/site-data/lenses-preview.html).
   Math: strings carry LaTeX between \( \) / \[ \]; MathJax 3 (tex-svg, loaded in <head>) typesets them.
   All JSON text fields are trusted, author-written HTML. */
(function(){
  var URL_DATA="./data/lenses.json?v=20261116y", IMG_BASE="./assets/img/";
  var LK=["str","rep","dis","sem"];
  var root, D;

  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
  function lv(k){return "--c:var(--"+k+");--cbg:var(--"+k+"-bg)"}
  function $(id){return document.getElementById(id)}

  /* MathJax may still be loading: queue and flush on "uql:mathjax" (fired by the config in <head>) */
  var queued=[];
  function typeset(el){
    var M=window.MathJax;
    if(M&&M.typesetPromise){try{M.typesetClear&&M.typesetClear([el])}catch(e){} return M.typesetPromise([el]).catch(function(){})}
    queued.push(el);
  }
  document.addEventListener("uql:mathjax",function(){var q=queued;queued=[];q.forEach(typeset);rejump()});

  /* this section (and its maths) grows the page after the browser's fragment jump:
     redo the jump for targets in or below it, unless the reader has already moved */
  var userMoved=false;
  ["wheel","touchstart","keydown","mousedown"].forEach(function(ev){
    window.addEventListener(ev,function(){userMoved=true},{once:true,passive:true});
  });
  function rejump(){
    var h=(location.hash||"").slice(1), t=h&&document.getElementById(h);
    if(!t||userMoved||!root) return;
    if(t===root||root.contains(t)||(root.compareDocumentPosition(t)&Node.DOCUMENT_POSITION_FOLLOWING))
      t.scrollIntoView({behavior:"instant",block:"start"});
  }

  /* references: add this section's entries to the page's References list (kept sorted by author-year label),
     then turn every [[key]] / [[k1;k2]] in the data into an author-year link to #ref-key */
  function addRefs(list){
    var ul=document.querySelector("#references .refs"); if(!ul||!list) return;
    list.forEach(function(r){
      if(document.getElementById("ref-"+r.key)) return;
      var li=document.createElement("li"); li.id="ref-"+r.key; li.dataset.cite=r.cite.replace(/&amp;/g,"&"); li.innerHTML=r.html; ul.appendChild(li);
    });
    [].slice.call(ul.children).sort(function(a,b){return (a.dataset.cite||a.textContent).localeCompare(b.dataset.cite||b.textContent,"en",{sensitivity:"base"})}).forEach(function(li){ul.appendChild(li)});
  }
  function cites(s){
    return s.replace(/\[\[([^\]]+)\]\]/g,function(m,ks){
      var refs=ks.split(";").map(function(k){return document.getElementById("ref-"+k.trim())});
      if(refs.some(function(r){return !r})) return m;
      return '<a class="cite" href="#'+refs[0].id+'">('+refs.map(function(r){return esc(r.dataset.cite)}).join("; ")+')</a>';
    });
  }
  function resolve(o){
    if(typeof o==="string") return cites(o);
    if(Array.isArray(o)) return o.map(resolve);
    if(o&&typeof o==="object"){var r={};for(var k in o) r[k]=k==="references"||k==="meta"?o[k]:resolve(o[k]);return r}
    return o;
  }

  function takeaway(t){
    return '<aside class="tk" aria-label="Takeaway '+t.n+'"><span class="tt">Takeaway '+t.n+' · '+esc(t.title)+'</span><p>'+t.body_html+'</p></aside>';
  }

  function build(){
    var F=D.figure, A=D.axes, P=D.pipeline, R=D.rule;
    D.takeaways.forEach(function(t){var el=$("lz-tk-"+t.placement); if(el) el.innerHTML=takeaway(t)});
    $("lz-lead").textContent=D.intro.lead;

    /* figure 3, lens definitions, maps */
    $("lz-h-fig").textContent=F.title; var sf=$("lz-sub-fig"); sf.textContent=F.sub||""; sf.hidden=!F.sub;
    $("lz-fig").innerHTML='<img src="'+IMG_BASE+F.src+'" width="'+F.width+'" height="'+F.height+'" alt="'+esc(F.alt)+'" loading="lazy" decoding="async">';
    $("lz-figcap").innerHTML=(F.caption?esc(F.caption)+' ':'')+'<span class="hint">'+esc(F.scroll_hint)+'</span>';
    $("lz-h-lensdefs").textContent=F.lenses_title; $("lz-h-maps").textContent=F.maps_title;
    $("lz-lensdefs").innerHTML=F.lenses.map(function(l){
      return '<div class="ldef" style="'+lv(l.key)+'"><div class="lh"><h5>'+esc(l.name)+'</h5><span class="lcode">'+l.key+'</span></div>'+
        '<div class="ob">'+l.observation+'</div><p>'+l.text+'</p></div>';
    }).join("");
    $("lz-maps").innerHTML=F.maps.map(function(m){
      return '<div class="map" style="--a:var(--'+m.from+');--b:var(--'+m.to+')"><div class="mh"><span class="g">'+m.map+'</span><span class="ft">'+m.from+' → '+m.to+'</span></div><p>'+m.discards+'</p></div>';
    }).join("");

    /* axis cards */
    $("lz-h-axes").innerHTML=A.title; var sa=$("lz-sub-axes"); sa.textContent=A.sub||""; sa.hidden=!A.sub;
    $("lz-axes").innerHTML=A.cards.map(function(c){
      return '<article class="axis"><h4>'+c.key+' '+esc(c.title)+'</h4><p><b>The '+esc(c.name)+'.</b> '+c.sentence+'</p><div class="vals">'+
        c.values.map(function(v){
          if(v.lens) return '<span class="chip l" style="'+lv(v.lens)+'" title="'+esc(v.label)+'">'+esc(v.code)+'</span>';
          if(v.box)  return '<button type="button" class="chip n" data-box="'+v.box+'">'+v.code+'</button>';
          if(v.z)    return '<button type="button" class="chip n" data-z="'+v.z+'" aria-pressed="false" aria-label="Z: '+esc(v.label)+'">'+v.code+' <small>'+esc(v.label)+'</small></button>';
          return '<span class="chip n">'+v.code+' <small>'+esc(v.label)+'</small></span>';
        }).join("")+'</div></article>';
    }).join("");

    /* Z panel: the inference equation with the resampled symbol marked */
    var ZC=A.cards.filter(function(c){return c.values.some(function(v){return v.z})})[0];
    function showZ(z){
      var v=ZC.values.filter(function(x){return x.z===z})[0], el=$("lz-zdetail");
      root.querySelectorAll("[data-z]").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.z===z))});
      el.innerHTML='<div class="base">'+ZC.inference+'</div><div class="zeq">'+v.equation+'</div><p>'+v.definition+'</p>'+
        '<p class="dx"><b>Example:</b> '+v.examples.join(" · ")+'</p>';
      typeset(el);
    }
    root.querySelectorAll("[data-z]").forEach(function(b){b.addEventListener("click",function(){showZ(b.dataset.z)})});
    showZ("y");

    /* pipeline: segmented bar of buttons + detail panel */
    $("lz-h-pipe").textContent=P.title; $("lz-eq").innerHTML=P.equation; $("lz-defaults").innerHTML=P.defaults_html;
    $("lz-pipe").innerHTML=P.boxes.map(function(b){
      return '<button type="button" class="pbox'+(b.kind==="lens"?" obs":b.kind==="out"?" out":"")+'" data-id="'+b.id+'" aria-pressed="false" aria-label="'+
        esc(b.label_text+", "+b.role.replace(/\\\(|\\\)/g,""))+'"><span class="sym">'+b.label+'</span><span class="role">'+b.role+'</span></button>';
    }).join("");
    var sel="obs", shown="";
    function showBox(id){
      if(id===shown) return; shown=id;
      var b=P.boxes.filter(function(x){return x.id===id})[0], el=$("lz-detail");
      el.innerHTML='<div class="dh">'+b.label+'<span>'+b.role+'</span></div><p>'+b.definition+'</p>'+
        (b.examples.length?'<p class="dx"><b>Examples:</b> '+b.examples.join(" · ")+'</p>':"")+
        (b.default?'<p class="dx"><b>Default:</b> '+b.default+'</p>':"");
      typeset(el);
    }
    var boxes=[].slice.call(root.querySelectorAll(".pbox"));
    function pick(id){sel=id;boxes.forEach(function(x){x.setAttribute("aria-pressed",String(x.dataset.id===id))});showBox(id)}
    boxes.forEach(function(x,i){
      x.addEventListener("click",function(){pick(x.dataset.id)});
      x.addEventListener("mouseenter",function(){showBox(x.dataset.id)});
      x.addEventListener("mouseleave",function(){showBox(sel)});
      x.addEventListener("focus",function(){pick(x.dataset.id)});
      x.addEventListener("keydown",function(e){
        var d=e.key==="ArrowRight"||e.key==="ArrowDown"?1:e.key==="ArrowLeft"||e.key==="ArrowUp"?-1:0;
        if(d){e.preventDefault();boxes[(i+d+boxes.length)%boxes.length].focus()}
      });
    });
    pick("obs");
    root.querySelectorAll("[data-box]").forEach(function(b){
      var box=P.boxes.filter(function(x){return x.id===b.dataset.box})[0];
      b.setAttribute("aria-label",box.label_text+": show in the pipeline");
      b.addEventListener("click",function(){
        pick(b.dataset.box);
        $("lz-pipe").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"center"});
      });
    });

    /* rule, glosses, tie-back to the opening example, demos teaser */
    $("lz-h-rule").textContent=R.title; var ru=$("lz-rule"); ru.innerHTML=R.text_html||""; ru.hidden=!R.text_html;
    $("lz-gloss").innerHTML=R.glosses.map(function(g){return '<dt>'+esc(g.term)+'</dt><dd>'+g.text+'</dd>'}).join("");
    $("lz-tie-h").innerHTML=esc(R.tieback.title)+(R.tieback.sub?' <span>· '+esc(R.tieback.sub)+'</span>':'');
    $("lz-tie").innerHTML=R.tieback.rows.map(function(r){
      return '<div class="trow"><a class="tab" href="'+r.href+'" aria-label="'+esc(r.tab)+' example, in the Overview">'+esc(r.tab)+'</a>'+
        '<span class="mini" role="img" aria-label="suited lens: '+r.suited_lens+'">'+LK.map(function(k){return '<span class="'+(k===r.suited_lens?"on":"")+'" style="'+lv(k)+'">'+k+'</span>'}).join("")+'</span>'+
        '<span class="why">'+esc(r.why)+'</span></div>';
    }).join("");
    $("lz-teaser").innerHTML=D.demos_teaser.html;

    root.classList.add("ready");
    var p=typeset(root);
    rejump(); if(p) p.then(rejump);
  }

  function init(){
    root=$("lenses"); if(!root) return;
    fetch(URL_DATA).then(function(r){if(!r.ok) throw new Error(r.status);return r.json()})
      .then(function(j){addRefs(j.references);D=resolve(j);build()})
      .catch(function(){var s=$("lz-status"); if(s) s.textContent="Could not load the Lenses data ("+URL_DATA+").";});
  }
  window.UQL=window.UQL||{}; UQL.lenses={init:init};
  init();
})();
