// Aplica o tema salvo (ou o escuro padrão da identidade visual) antes de a página aparecer, para não piscar claro antes do escuro.
(function(){var t;try{t=localStorage.getItem('tema');}catch(e){}if(t!=='claro'&&t!=='escuro')t='escuro';document.documentElement.dataset.theme=t;})();
