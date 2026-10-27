// Aplica o tema salvo (ou o do aparelho) antes de a página aparecer, para não piscar claro antes do escuro.
(function(){var t;try{t=localStorage.getItem('tema');}catch(e){}if(t!=='claro'&&t!=='escuro')t=matchMedia('(prefers-color-scheme: dark)').matches?'escuro':'claro';document.documentElement.dataset.theme=t;})();
