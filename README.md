# Meus Pokémon GO

Site de arquivo único para controlar os Pokémon que você tem no Pokémon GO e os que quer pegar. Você digita o nome, marca as variantes (100%, shiny, Rocket etc.) e o site mostra a imagem correspondente.

Não precisa instalar nada, nem ter servidor ou conta. É só abrir o arquivo no navegador.

## Como usar

1. Baixe o arquivo `index.html`.
2. Abra no navegador (Chrome, Edge, Firefox, Safari), no PC ou no celular.
3. Use sempre o mesmo navegador, porque é nele que seus dados ficam salvos (veja [Onde os dados ficam](#onde-os-dados-ficam)).

## Funcionalidades

**Adicionar Pokémon**
- Digite o nome em inglês (com sugestões automáticas) ou o número da Pokédex, de 1 a 1025.
- Marque as variantes: 100%, Shiny, Sombroso (Rocket), Purificado, Sortudo e Mega. Dá para combinar, como shiny sombroso.
- Informe o CP, os IVs (ataque, defesa e PS, de 0 a 15) e uma anotação, se quiser. Com 15/15/15 a tag 100% é marcada sozinha, e o card mostra a porcentagem de IV.
- Adicione em **Tenho** ou em **Quero pegar**.

**Nível calculado**
- Com o Pokémon, o CP e os três IVs preenchidos, o site calcula o nível e mostra ao lado do CP, no formulário, na janela de Editar e no card.
- A conta é a do jogo: `CP = piso((Ataque + IV) x raiz(Defesa + IV) x raiz(PS + IV) x multiplicador² / 10)`, com mínimo de 10. O site testa os níveis de 1 a 51 (de meio em meio) e mostra o que resulta no CP informado.
- Os atributos base e os multiplicadores de CP vêm do Game Master do Pokémon GO (repositório PokeMiners/game_masters) e estão embutidos no arquivo, então o cálculo não depende de internet. Os meios níveis usam a regra do jogo, a raiz da média dos quadrados dos multiplicadores vizinhos.
- Se um Pokémon novo ainda não estiver na tabela embutida, o site converte os atributos a partir da PokéAPI, o que pode deixar o nível aproximado.
- Se mais de um nível der o mesmo CP, aparece a faixa (por exemplo "3 a 3,5"). Se o CP só chega perto, aparece com "~". Se o CP não bate com o IV, o campo mostra "Não confere" e o card não exibe nível.
- Não calcula para Pokémon Mega. Formas regionais e alternativas usam os atributos da forma padrão, então o nível pode aparecer aproximado ou não aparecer.

**Imagens**
- O Pokémon shiny usa a arte shiny oficial.
- Sombroso, purificado e sortudo usam a arte normal sobre um fundo de cor própria, porque não existem imagens oficiais separadas para essas variantes.

**Gerenciar a coleção**
- **Peguei!** (aba Quero pegar): move o Pokémon para Tenho.
- **Evoluir** (aba Tenho): mostra as evoluções possíveis, você escolhe uma e informa o CP depois de evoluir. O card troca para a evolução, mantém as tags e a anotação, e mostra "Evoluiu de ...". O botão só aparece para Pokémon que ainda têm evolução.
- **Editar**: altera as tags (adicionar ou remover shiny, 100% etc.), o CP e a anotação.
- **Remover**: apaga o Pokémon da lista.

**Filtrar e ordenar**
- O botão "Filtrar / Ordenar" abre uma janela com as opções. O número entre parênteses mostra quantas estão ativas.
- Ordenação por adição, mais recentes, CP, IV, nome ou número da Pokédex.
- Mostrar apenas uma tag: 100%, Shiny, Rocket, Purificado, Sortudo ou Mega.
- Pokémon sem CP ou sem IV cadastrado ficam por último ao ordenar por esse valor.
- Há também uma busca por nome ao lado do botão.
- "Limpar" volta tudo ao padrão.

**Backup**
- Exportar e importar em arquivo `.json`.

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
| `pgo-stats` | Cache dos atributos base de Pokémon que não estão na tabela embutida |

## Requisitos

É preciso ter internet, porque o site usa dois serviços externos:

- [PokéAPI](https://pokeapi.co): lista de nomes e cadeias de evolução.
- [Repositório de sprites da PokéAPI no GitHub](https://github.com/PokeAPI/sprites): imagens dos Pokémon.

A lista de nomes e as evoluções ficam em cache depois da primeira consulta. As imagens dependem de conexão. Sem internet, ainda dá para digitar o número da Pokédex.

## Limitações

- Os nomes seguem a PokéAPI, em inglês (por exemplo `charizard`). Se o nome em português não for encontrado, use o número da Pokédex.
- Só há suporte aos Pokémon de 1 a 1025. Formas regionais e alternativas usam a imagem da forma padrão.
- O site não funciona como página hospedada no claude.ai, porque essas páginas bloqueiam imagens e requisições externas. Localmente ou em hospedagens comuns, como Vercel, Netlify e GitHub Pages, funciona normalmente.

## Publicar na Vercel

Envie a pasta com o `index.html` na raiz. O arquivo precisa ter esse nome, senão a Vercel mostra 404 na página inicial. Não precisa de build nem de configuração.

## Estrutura

Tudo está em um único arquivo:

```
index.html   HTML, CSS e JavaScript, sem dependências
README.md    este arquivo
```

## Personalização

- **Variantes:** o objeto `FLAGS` no início do script define as tags. Para criar uma nova, adicione a chave ali, uma opção no formulário (`<label class="chip c-nome">`) e as cores `.c-nome` e `.b.nome` no CSS.
- **Cores e fonte:** as cores ficam nas variáveis do bloco `:root` do CSS. A fonte é a Archivo, carregada do Google Fonts.

## Aviso

Projeto pessoal e sem fins lucrativos, sem relação com Niantic, Nintendo, Game Freak ou The Pokémon Company. Pokémon e Pokémon GO são marcas de seus respectivos donos.
