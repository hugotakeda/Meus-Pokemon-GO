# Meus Pokémon GO

Site de arquivo único para controlar os Pokémon que você tem no Pokémon GO e os que quer pegar. Você digita o nome, marca as variantes (100%, shiny, Rocket etc.) e o site mostra a imagem correspondente.

Não precisa instalar nada, nem ter servidor ou conta. É só abrir o arquivo no navegador.

## Como usar

1. Baixe o arquivo `pokemon-go.html`.
2. Abra no navegador (Chrome, Edge, Firefox, Safari), no PC ou no celular.
3. Use sempre o mesmo navegador, porque é nele que seus dados ficam salvos (veja [Onde os dados ficam](#onde-os-dados-ficam)).

## Funcionalidades

**Adicionar Pokémon**
- Digite o nome em inglês (com sugestões automáticas) ou o número da Pokédex, de 1 a 1025.
- Marque as variantes: 100%, Shiny, Sombroso (Rocket), Purificado, Sortudo e Mega. Dá para combinar, como shiny sombroso.
- Informe o CP e uma anotação, se quiser.
- Adicione em **Tenho** ou em **Quero pegar**.

**Imagens**
- O Pokémon shiny usa a arte shiny oficial.
- Sombroso, purificado e sortudo usam a arte normal sobre um fundo de cor própria, porque não existem imagens oficiais separadas para essas variantes.

**Gerenciar a coleção**
- **Peguei!** (aba Quero pegar): move o Pokémon para Tenho.
- **Evoluir** (aba Tenho): mostra as evoluções possíveis, você escolhe uma e informa o CP depois de evoluir. O card troca para a evolução, mantém as tags e a anotação, e mostra "Evoluiu de ...". O botão só aparece para Pokémon que ainda têm evolução.
- **Editar**: altera as tags (adicionar ou remover shiny, 100% etc.), o CP e a anotação.
- **Remover**: apaga o Pokémon da lista.

**Organização**
- Busca por nome.
- Filtros por tag: Todos, 100%, Shiny, Rocket, Purificado, Sortudo e Mega.
- Exportar e importar backup em arquivo `.json`.

## Onde os dados ficam

Tudo é salvo no `localStorage` do navegador, no próprio dispositivo. Nada é enviado para servidor nenhum.

Isso significa que:
- Cada navegador e cada aparelho tem a sua própria lista.
- Limpar os dados do navegador apaga a lista.

Para levar sua lista para outro aparelho, ou guardar uma cópia de segurança, use **Exportar backup** e depois **Importar backup** no destino.

Chaves usadas no `localStorage`:

| Chave | Conteúdo |
| --- | --- |
| `pgo` | Suas listas (Tenho e Quero pegar) |
| `pgo-dex` | Cache da lista de nomes e números dos Pokémon |
| `pgo-evo` | Cache das evoluções de cada Pokémon |

## Requisitos

É preciso ter internet, porque o site usa dois serviços externos:

- [PokéAPI](https://pokeapi.co): lista de nomes e cadeias de evolução.
- [Repositório de sprites da PokéAPI no GitHub](https://github.com/PokeAPI/sprites): imagens dos Pokémon.

A lista de nomes e as evoluções ficam em cache depois da primeira consulta. As imagens dependem de conexão. Sem internet, ainda dá para digitar o número da Pokédex.

## Limitações

- Os nomes seguem a PokéAPI, em inglês (por exemplo `charizard`). Se o nome em português não for encontrado, use o número da Pokédex.
- Só há suporte aos Pokémon de 1 a 1025. Formas regionais e alternativas usam a imagem da forma padrão.
- O site não pode ser publicado como página hospedada no claude.ai, porque essas páginas bloqueiam imagens e requisições externas. Use o arquivo localmente.

## Estrutura

Tudo está em um único arquivo:

```
pokemon-go.html   HTML, CSS e JavaScript, sem dependências
README.md         este arquivo
```

## Personalização

- **Variantes:** o objeto `FLAGS` no início do script define as tags. Para criar uma nova, adicione a chave ali, uma opção no formulário (`<label class="chip c-nome">`) e as cores `.c-nome` e `.b.nome` no CSS.
- **Cores e fonte:** as cores ficam nas variáveis do bloco `:root` do CSS. A fonte é a Archivo, carregada do Google Fonts.

## Aviso

Projeto pessoal e sem fins lucrativos, sem relação com Niantic, Nintendo, Game Freak ou The Pokémon Company. Pokémon e Pokémon GO são marcas de seus respectivos donos.
