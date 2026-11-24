/* Light/Dark toggle (two copies: tab bar below 1280 px, contents navigator above). No saved choice = follow the system. Saved under localStorage "uql-theme". */
(function(){
  var root=document.documentElement, KEY="uql-theme";
  var mq=window.matchMedia?matchMedia("(prefers-color-scheme: dark)"):{matches:false};
  function isDark(){return root.dataset.theme?root.dataset.theme==="dark":mq.matches}
  function sync(){
    document.querySelectorAll("[data-theme-toggle] button").forEach(function(b){
      b.setAttribute("aria-pressed",String((b.dataset.t==="dark")===isDark()));
    });
    document.dispatchEvent(new CustomEvent("uql:theme",{detail:{dark:isDark()}}));
  }
  function init(){
    /* one delegated listener: covers every toggle, whenever it is added */
    document.addEventListener("click",function(e){
      var b=e.target.closest&&e.target.closest("[data-theme-toggle] button[data-t]");
      if(!b) return;
      root.dataset.theme=b.dataset.t;
      try{localStorage.setItem(KEY,b.dataset.t)}catch(err){}
      sync();
    });
    try{mq.addEventListener("change",sync)}catch(e){}
    sync();
  }
  window.UQL=window.UQL||{}; UQL.theme={init:init,isDark:isDark};
  init();
})();
