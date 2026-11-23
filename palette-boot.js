// Runs before the first paint so the launch screen already uses the chosen
// colour theme. Kept tiny and dependency-free on purpose.
(function(){
 var allowed={indigo:1,mint:1,blossom:1},id='indigo';
 try{var saved=localStorage.getItem('recomp-palette');if(saved&&allowed[saved])id=saved;}catch(e){}
 document.documentElement.setAttribute('data-palette',id);
})();
