/* Local tab switchers (WAI-ARIA tabs, automatic activation): click, ←/→, Home/End.
   Also the Copy-BibTeX button. */
(function(){
  function initTablist(tl){
    var tabs=[].slice.call(tl.querySelectorAll('[role="tab"]'));
    if(!tabs.length||tl.dataset.tabsInit) return; /* empty lists are filled later by their owner, which calls initTablist again */
    tl.dataset.tabsInit="1";
    function select(t,focus,user){
      tabs.forEach(function(x){
        var on=x===t;
        x.setAttribute("aria-selected",String(on));
        x.tabIndex=on?0:-1;
        var p=document.getElementById(x.getAttribute("aria-controls"));
        if(p) p.hidden=!on;
      });
      if(focus) t.focus();
      tl.dispatchEvent(new CustomEvent("uql:tab",{bubbles:true,detail:{tab:t.id,panel:t.getAttribute("aria-controls"),user:!!user}}));
    }
    tabs.forEach(function(t,i){
      t.type="button";
      t.addEventListener("click",function(){select(t,false,true)});
      t.addEventListener("keydown",function(e){
        var j=null;
        if(e.key==="ArrowRight") j=(i+1)%tabs.length;
        else if(e.key==="ArrowLeft") j=(i-1+tabs.length)%tabs.length;
        else if(e.key==="Home") j=0;
        else if(e.key==="End") j=tabs.length-1;
        if(j!==null){e.preventDefault();select(tabs[j],true,true)}
      });
    });
    var start=tabs.filter(function(t){return t.getAttribute("aria-selected")==="true"})[0]||tabs[0];
    if(start) select(start,false);
  }
  function initCopy(){
    document.querySelectorAll("[data-copy]").forEach(function(btn){
      var src=document.getElementById(btn.dataset.copy), status=document.getElementById("bib-status");
      btn.addEventListener("click",function(){
        var text=src.textContent;
        function done(ok){
          btn.textContent=ok?"Copied":"Copy BibTeX";
          if(status) status.textContent=ok?"BibTeX copied to clipboard.":"Copy failed; select the text above instead.";
          setTimeout(function(){btn.textContent="Copy BibTeX";if(status)status.textContent=""},2000);
        }
        if(navigator.clipboard&&window.isSecureContext){
          navigator.clipboard.writeText(text).then(function(){done(true)},fallback);
        } else fallback();
        function fallback(){
          var ta=document.createElement("textarea");
          ta.value=text;ta.setAttribute("readonly","");ta.style.position="fixed";ta.style.opacity="0";
          document.body.appendChild(ta);ta.select();
          var ok=false;try{ok=document.execCommand("copy")}catch(e){}
          document.body.removeChild(ta);done(ok);
        }
      });
    });
  }
  function init(){
    document.querySelectorAll('[role="tablist"]').forEach(initTablist);
    initCopy();
  }
  window.UQL=window.UQL||{}; UQL.tabs={init:init,initTablist:initTablist};
  init();
})();
