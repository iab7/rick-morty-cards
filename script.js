// =====================================================
// Rick and Morty – Catálogo de Personagens
// Consome https://rickandmortyapi.com/api/character
// e cria os cards dinamicamente (createElement + appendChild)
// =====================================================

const API_URL = "https://rickandmortyapi.com/api/character";
const CHAVE_FAVORITOS = "rm-favoritos";

// ---------- Elementos fixos da página ----------
const grade = document.getElementById("cards");
const mensagem = document.getElementById("mensagem");
const contagem = document.getElementById("contagem");
const campoBusca = document.getElementById("busca");
const filtroStatus = document.getElementById("filtro-status");
const btnFavoritos = document.getElementById("btn-favoritos");
const qtdFavoritos = document.getElementById("qtd-favoritos");
const paginacao = document.getElementById("paginacao");
const btnAnterior = document.getElementById("btn-anterior");
const btnProxima = document.getElementById("btn-proxima");
const paginaInfo = document.getElementById("pagina-info");

// ---------- Estado da aplicação ----------
const estado = {
  pagina: 1,
  totalPaginas: 1,
  nome: "",
  status: "",
  soFavoritos: false,
};

let favoritos = carregarFavoritos(); // { id: personagem }

// ---------- Traduções (a API devolve em inglês) ----------
const traducaoStatus = { Alive: "Vivo", Dead: "Morto", unknown: "Desconhecido" };
const classeStatus = { Alive: "vivo", Dead: "morto", unknown: "desconhecido" };
const traducaoGenero = {
  Male: "Masculino",
  Female: "Feminino",
  Genderless: "Sem gênero",
  unknown: "Desconhecido",
};
const traducaoEspecie = {
  Human: "Humano",
  Alien: "Alienígena",
  Robot: "Robô",
  Animal: "Animal",
  Disease: "Doença",
  Cronenberg: "Cronenberg",
  Poopybutthole: "Poopybutthole",
  Mythological: "Mitológico",
  Humanoid: "Humanoide",
  unknown: "Desconhecida",
};

// =====================================================
// FAVORITOS (salvos no localStorage do navegador)
// =====================================================
function carregarFavoritos() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_FAVORITOS)) || {};
  } catch (erro) {
    return {};
  }
}

function salvarFavoritos() {
  try {
    localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify(favoritos));
  } catch (erro) {
    // Se o navegador bloquear o armazenamento, os favoritos valem só até recarregar.
  }
}

function atualizarContadorFavoritos() {
  qtdFavoritos.textContent = Object.keys(favoritos).length;
}

// =====================================================
// CONSUMO DA API com fetch
// =====================================================
function montarUrl() {
  const parametros = new URLSearchParams({ page: estado.pagina });
  if (estado.nome) parametros.set("name", estado.nome);
  if (estado.status) parametros.set("status", estado.status);
  return `${API_URL}/?${parametros.toString()}`;
}

// Cache da sessão: uma página já carregada não é pedida de novo à API.
// Isso reduz o número de requisições e evita o erro 429 (Too Many Requests).
const PREFIXO_CACHE = "rm-cache:";

function lerCache(url) {
  try {
    return JSON.parse(sessionStorage.getItem(PREFIXO_CACHE + url));
  } catch (erro) {
    return null;
  }
}

function gravarCache(url, dados) {
  try {
    sessionStorage.setItem(PREFIXO_CACHE + url, JSON.stringify(dados));
  } catch (erro) {
    // Sem espaço ou bloqueado: o site continua funcionando, só sem cache.
  }
}

let controlador = null; // permite cancelar a busca anterior

function buscarNaApi(url, sinal) {
  return fetch(url, { signal: sinal }).then((resposta) => {
    // A API responde 404 quando a busca não encontra ninguém
    if (resposta.status === 404) return null;
    if (!resposta.ok) throw new Error(`a API respondeu com status ${resposta.status}`);
    return resposta.json();
  });
}

// Se a rede falhar, espera um pouco e tenta mais uma vez
function buscarComNovaTentativa(url, sinal) {
  return buscarNaApi(url, sinal).catch((erro) => {
    if (erro.name === "AbortError" || erro.name === "TimeoutError") throw erro;
    return new Promise((resolver) => setTimeout(resolver, 1500)).then(() =>
      buscarNaApi(url, sinal)
    );
  });
}

function buscarPersonagens() {
  if (estado.soFavoritos) {
    mostrarFavoritos();
    return;
  }

  const url = montarUrl();

  // Cancela a busca anterior e define um limite de 10 segundos
  if (controlador) controlador.abort();
  controlador = new AbortController();
  const sinal = AbortSignal.any([controlador.signal, AbortSignal.timeout(10000)]);

  mostrarMensagem("Carregando personagens…");
  // Evita cliques repetidos enquanto a página carrega
  btnAnterior.disabled = true;
  btnProxima.disabled = true;

  const emCache = lerCache(url);
  const pedido = emCache
    ? Promise.resolve(emCache)
    : buscarComNovaTentativa(url, sinal).then((dados) => {
        if (dados) gravarCache(url, dados);
        return dados;
      });

  pedido
    .then((dados) => {
      if (!dados) {
        grade.replaceChildren();
        contagem.textContent = "0 personagens encontrados";
        estado.totalPaginas = 1;
        atualizarPaginacao();
        mostrarMensagem("Nenhum personagem encontrado. Tente outro nome ou status.");
        return;
      }

      estado.totalPaginas = dados.info.pages;
      contagem.textContent = `${dados.info.count} personagens encontrados`;
      mostrarMensagem("");
      renderizarCards(dados.results);
      atualizarPaginacao();
    })
    .catch((erro) => {
      if (erro.name === "AbortError") return; // substituída por uma busca mais nova

      console.error("Falha ao buscar a API:", erro);
      grade.replaceChildren();
      atualizarPaginacao(); // mantém "Anterior" e "Próxima" disponíveis
      mostrarMensagem(
        `Não foi possível carregar a página ${estado.pagina}. ` +
          "A API pode estar limitando as requisições (erro 429) ou a conexão falhou. " +
          "Aguarde um instante e tente de novo. ",
        true
      );

      const botao = criarElemento("button", "btn-repetir", "Tentar novamente");
      botao.type = "button";
      botao.addEventListener("click", buscarPersonagens);
      mensagem.appendChild(botao);
    });
}

// =====================================================
// CRIAÇÃO DINÂMICA DOS CARDS (DOM manipulation)
// =====================================================

// Função auxiliar: cria um elemento com classe e texto
function criarElemento(tag, classe, texto) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

// Cria uma linha "rótulo: valor" da lista de dados do card
function adicionarDado(lista, rotulo, valor) {
  lista.appendChild(criarElemento("dt", "", rotulo));
  lista.appendChild(criarElemento("dd", "", valor));
}

function criarCard(personagem) {
  const card = criarElemento("article", "card");
  card.dataset.id = personagem.id;

  // Nome
  const nome = criarElemento("h2", "card__nome", personagem.name);

  // Botão de favoritar (coração)
  const botaoFav = criarElemento("button", "card__fav");
  botaoFav.type = "button";
  atualizarBotaoFavorito(botaoFav, personagem);
  botaoFav.addEventListener("click", () => alternarFavorito(personagem, botaoFav, card));

  // Imagem
  const figura = criarElemento("figure", "card__foto");
  figura.style.margin = "0.8rem 0";
  const imagem = document.createElement("img");
  imagem.src = personagem.image;
  imagem.alt = `Imagem de ${personagem.name}`;
  imagem.loading = "lazy";
  imagem.width = 300;
  imagem.height = 300;
  figura.appendChild(imagem);

  // Status
  const status = criarElemento(
    "span",
    `card__status ${classeStatus[personagem.status] || "desconhecido"}`,
    traducaoStatus[personagem.status] || personagem.status
  );

  // Informações adicionais
  const dados = criarElemento("dl", "card__dados");
  adicionarDado(dados, "Espécie", traducaoEspecie[personagem.species] || personagem.species);
  adicionarDado(dados, "Gênero", traducaoGenero[personagem.gender] || personagem.gender);
  adicionarDado(dados, "Origem", personagem.origin.name);
  adicionarDado(dados, "Local atual", personagem.location.name);
  adicionarDado(dados, "Episódios", String(personagem.episode.length));

  // Monta o card com appendChild
  card.appendChild(nome);
  card.appendChild(botaoFav);
  card.appendChild(figura);
  card.appendChild(status);
  card.appendChild(dados);

  return card;
}

function renderizarCards(personagens) {
  grade.replaceChildren(); // limpa os cards anteriores

  const fragmento = document.createDocumentFragment();
  personagens.forEach((personagem) => {
    fragmento.appendChild(criarCard(personagem));
  });
  grade.appendChild(fragmento);
}

// =====================================================
// FAVORITOS NA INTERFACE
// =====================================================
function atualizarBotaoFavorito(botao, personagem) {
  const ativo = Boolean(favoritos[personagem.id]);
  botao.textContent = ativo ? "♥" : "♡";
  botao.setAttribute("aria-pressed", String(ativo));
  botao.setAttribute(
    "aria-label",
    ativo ? `Remover ${personagem.name} dos favoritos` : `Favoritar ${personagem.name}`
  );
}

function alternarFavorito(personagem, botao, card) {
  if (favoritos[personagem.id]) {
    delete favoritos[personagem.id];
  } else {
    favoritos[personagem.id] = personagem;
  }
  salvarFavoritos();
  atualizarContadorFavoritos();
  atualizarBotaoFavorito(botao, personagem);

  // Na tela de favoritos, o card desfavoritado sai da lista
  if (estado.soFavoritos && !favoritos[personagem.id]) {
    card.remove();
    if (!grade.children.length) mostrarFavoritos();
  }
}

function mostrarFavoritos() {
  const lista = Object.values(favoritos);
  paginacao.hidden = true;

  if (!lista.length) {
    grade.replaceChildren();
    contagem.textContent = "0 favoritos";
    mostrarMensagem("Você ainda não favoritou ninguém. Clique no coração de um card.");
    return;
  }

  contagem.textContent = `${lista.length} ${lista.length === 1 ? "favorito" : "favoritos"}`;
  mostrarMensagem("");
  renderizarCards(lista);
}

// =====================================================
// PAGINAÇÃO, MENSAGENS E EVENTOS
// =====================================================
function atualizarPaginacao() {
  paginacao.hidden = estado.totalPaginas <= 1;
  paginaInfo.textContent = `Página ${estado.pagina} de ${estado.totalPaginas}`;
  btnAnterior.disabled = estado.pagina <= 1;
  btnProxima.disabled = estado.pagina >= estado.totalPaginas;
}

function mostrarMensagem(texto, erro = false) {
  mensagem.textContent = texto;
  mensagem.classList.toggle("erro", erro);
}

function irParaTopo() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

btnAnterior.addEventListener("click", () => {
  if (estado.pagina > 1) {
    estado.pagina--;
    buscarPersonagens();
    irParaTopo();
  }
});

btnProxima.addEventListener("click", () => {
  if (estado.pagina < estado.totalPaginas) {
    estado.pagina++;
    buscarPersonagens();
    irParaTopo();
  }
});

// Busca por nome (espera o usuário parar de digitar)
let temporizador;
campoBusca.addEventListener("input", () => {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    estado.nome = campoBusca.value.trim();
    estado.pagina = 1;
    buscarPersonagens();
  }, 400);
});

filtroStatus.addEventListener("change", () => {
  estado.status = filtroStatus.value;
  estado.pagina = 1;
  buscarPersonagens();
});

btnFavoritos.addEventListener("click", () => {
  estado.soFavoritos = !estado.soFavoritos;
  btnFavoritos.setAttribute("aria-pressed", String(estado.soFavoritos));
  estado.pagina = 1;
  buscarPersonagens();
});

// ---------- Início ----------
atualizarContadorFavoritos();
buscarPersonagens();