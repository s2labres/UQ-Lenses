/* Sticky tab bar: scroll-spy (aria-current + owner-coloured underline), hash update on scroll,
   active tab kept in view inside the horizontally scrolling bar. Smooth scroll is CSS
   (html{scroll-behavior:smooth}, only under prefers-reduced-motion: no-preference). */
(function(){
  function init(){
    var bar=document.querySelector(".tabbar"), list=document.getElementById("tablinks");
    if(!bar||!list) return;
    var links=[].slice.call(list.querySelectorAll("a[href^='#']"));
    var secs=links.map(function(a){return document.getElementById(a.hash.slice(1))}).filter(Boolean);
    var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)");
    var current=null, ticking=false, writeHash=false;

    function keepInView(a){
      var l=a.offsetLeft, r=l+a.offsetWidth, vl=list.scrollLeft, vr=vl+list.clientWidth;
      if(l>=vl&&r<=vr) return;
      var left=l-(list.clientWidth-a.offsetWidth)/2;
      list.scrollTo({left:Math.max(0,left),behavior:reduce&&reduce.matches?"auto":"smooth"});
    }
    function pick(){
      /* the line sits under the bar's stuck position, not its current one, so the hero never counts */
      var line=bar.offsetHeight+32, id=null;
      secs.forEach(function(s){if(s.getBoundingClientRect().top<=line) id=s.id});
      var doc=document.documentElement;
      if(id&&window.innerHeight+window.scrollY>=doc.scrollHeight-2) id=secs[secs.length-1].id;
      return id;
    }
    function update(){
      ticking=false;
      var id=pick(), shown=id||secs[0].id;
      if(shown!==current){
        current=shown;
        links.forEach(function(a){
          var on=a.hash==="#"+shown;
          if(on){a.setAttribute("aria-current","true");keepInView(a)} else a.removeAttribute("aria-current");
        });
      }
      if(!writeHash) return; /* leave an incoming #hash alone until the user (or the browser's fragment jump) scrolls */
      /* a section may own sub-hashes (e.g. #math for an opening-example tab); keep them while inside it */
      var subs=window.UQL&&UQL.subHash, h=location.hash.slice(1);
      if(subs&&h){
        if(id&&subs[id]&&subs[id].indexOf(h)>=0) return;
        /* still in the hero on the way down to a sub-hash target: don't clear it */
        if(!id&&Object.keys(subs).some(function(k){return subs[k].indexOf(h)>=0})) return;
      }
      var want=id?"#"+id:"";
      if(location.hash!==want&&history.replaceState)
        history.replaceState(null,"",location.pathname+location.search+want);
    }
    function onScroll(){writeHash=true;if(!ticking){ticking=true;requestAnimationFrame(update)}}
    window.addEventListener("scroll",onScroll,{passive:true});
    window.addEventListener("resize",onScroll);
    /* hash may not be in the spy's reach yet on load (fonts/layout); re-check once settled */
    window.addEventListener("load",update);
    update();
  }
  window.UQL=window.UQL||{}; UQL.nav={init:init};
  init();
})();
