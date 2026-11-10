# Rick and Morty – Catálogo de Personagens
**Acesse o projeto:** https://iab7.github.io/rick-morty-cards/

Site estático que consome a [The Rick and Morty API](https://rickandmortyapi.com/) e exibe os personagens em cards criados dinamicamente com JavaScript.

Projeto acadêmico da disciplina de Web Development Front-End (UniFECAF).

## Funcionalidades

- Cards gerados via JavaScript (`createElement` e `appendChild`), sem cards fixos no HTML
- Cada card mostra nome, imagem, status, espécie, gênero, origem, local atual e quantidade de episódios
- Busca por nome com atraso (debounce) para não sobrecarregar a API
- Filtro por status (vivo, morto, desconhecido)
- Paginação
- Favoritos salvos no `localStorage`
- Tratamento de erro e de busca sem resultados
- Layout responsivo e acessível (foco visível, `aria-label`, respeito a `prefers-reduced-motion`)

## Tecnologias

- HTML5
- CSS3 puro (sem frameworks)
- JavaScript (ES6+) com `fetch`

## Sobre a API

- Endpoint usado: `https://rickandmortyapi.com/api/character`
- Gratuita, sem token ou cadastro
- Resposta em JSON com `info` (total, páginas) e `results` (lista de personagens)
- Filtros usados: `page`, `name` e `status`

## Estrutura

```
rick-morty-cards/
├── index.html   # estrutura da página
├── style.css    # estilos e responsividade
├── script.js    # consumo da API e criação dos cards
└── README.md
```

## Autor

Isaque Abreu Santos – [GitHub](https://github.com/iab7)
