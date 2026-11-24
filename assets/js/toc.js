/* Left contents navigator (≥ 1280 px, where it replaces the top tab bar; hidden below, where the tab bar remains).
   Built from the tab bar's section links plus each section's [data-toc] blocks (label = attribute value).
   Scroll-spy marks the current section and sub-block with aria-current. Sub-blocks start folded; clicking a
   section link unfolds it (and jumps there), and it stays unfolded while others are opened, until that section
   link is clicked again. Scrolling never folds or unfolds anything. Links are plain #hash anchors. */
(function(){
  function init(){
    var toc=document.getElementById("toc"), list=document.getElementById("tablinks"), bar=document.querySelector(".tabbar");
    if(!toc||!list) return;
    var secs=[].slice.call(list.querySelectorAll("a[href^='#']")).map(function(a){
      var el=document.getElementById(a.hash.slice(1));
      return el?{id:el.id,label:a.textContent,el:el,subs:[].slice.call(el.querySelectorAll("[data-toc][id]"))}:null;
    }).filter(Boolean);
    var box=document.getElementById("toc-list")||toc;
    box.innerHTML='<ol>'+secs.map(function(s){
      return '<li data-sec="'+s.id+'"><a href="#'+s.id+'"'+(s.subs.length?' aria-expanded="false" aria-controls="toc-sub-'+s.id+'"':'')+'>'+s.label+'</a>'+
        (s.subs.length?'<ol id="toc-sub-'+s.id+'">'+s.subs.map(function(b){return '<li><a href="#'+b.id+'">'+b.getAttribute("data-toc")+'</a></li>'}).join("")+'</ol>':"")+'</li>';
    }).join("")+'</ol>';

    /* keep sub-block hashes while inside their section (see nav.js) */
    function shareSubs(){
      window.UQL=window.UQL||{}; UQL.subHash=UQL.subHash||{};
      secs.forEach(function(s){
        var have=UQL.subHash[s.id]||[];
        s.subs.forEach(function(b){if(have.indexOf(b.id)<0) have=have.concat(b.id)});
        UQL.subHash[s.id]=have;
      });
    }
    shareSubs(); window.addEventListener("load",shareSubs);

    var links=[].slice.call(toc.querySelectorAll("a")), ticking=false, last="";
    /* click a section link: toggle its sub-list; other sections keep their state */
    toc.addEventListener("click",function(e){
      var a=e.target.closest("a[aria-expanded]"); if(!a) return;
      var open=a.getAttribute("aria-expanded")!=="true";
      a.setAttribute("aria-expanded",open?"true":"false");
      a.parentNode.classList.toggle("open",open);
    });
    function update(){
      ticking=false;
      var line=(bar?bar.offsetHeight:0)+40, sec=null, sub=null;
      secs.forEach(function(s){if(s.el.getBoundingClientRect().top<=line) sec=s});
      var doc=document.documentElement;
      if(sec&&window.innerHeight+window.scrollY>=doc.scrollHeight-2) sec=secs[secs.length-1];
      if(sec) sec.subs.forEach(function(b){if(b.getBoundingClientRect().top<=line) sub=b});
      var key=(sec?sec.id:"")+"|"+(sub?sub.id:"");
      if(key===last) return; last=key;
      links.forEach(function(a){
        var h=a.hash.slice(1), on=(sec&&h===sec.id)||(sub&&h===sub.id);
        if(on) a.setAttribute("aria-current",sub&&h===sub.id?"location":"true"); else a.removeAttribute("aria-current");
      });
    }
    function onScroll(){if(!ticking){ticking=true;requestAnimationFrame(update)}}
    window.addEventListener("scroll",onScroll,{passive:true});
    window.addEventListener("resize",onScroll);
    window.addEventListener("load",update);
    update();
  }
  window.UQL=window.UQL||{}; UQL.toc={init:init};
  init();
})();
