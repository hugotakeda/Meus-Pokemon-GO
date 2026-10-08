# Meus Pokémon GO

Um companheiro de jornada para organizar sua coleção, encontrar oportunidades de captura e acompanhar os eventos de Pokémon GO. Tudo no navegador, em português, sem conta e sem backend.

---

## 🚀 Funcionalidades

- **Coleção e lista de desejos:** registre os Pokémon que você **tem** e os que **quer pegar**, pelo nome em inglês (com sugestões) ou pelo número da Pokédex, de 1 a 1025. **Peguei!** move um desejo para a coleção.
- **Variantes e formas:** combine as tags **100%, Shiny, Sombroso (Rocket), Purificado, Sortudo e Mega** e escolha a **forma de Alola**. O card mostra a imagem certa para cada versão: normal ou de Alola, comum ou shiny.
- **CP, IVs e nível calculado:** informe CP e IVs (0 a 15) e o site calcula o nível ao lado do CP. A tag 100% preenche 15/15/15.
- **Evolução e edição:** evolua um Pokémon mantendo tags e anotações, edite qualquer registro e remova com opção de desfazer.
- **Busca, filtros e ordenação:** por nome, tag, CP, IV, número da Pokédex ou ordem de adição.
- **Guia de capturas:** raids, ovos, pesquisas, Equipe Rocket e shinies, com um radar que cruza seus desejos com os encontros disponíveis.
- **Calendário mensal:** resumo do mês e grade de eventos válidos no Brasil, com detalhes, fonte e filtros.
- **Lembretes:** salve eventos, exporte em `.ics` e ative notificações do navegador.
- **Perfil do treinador:** nome, equipe e código de amizade, com QR gerado localmente.
- **Backup:** exporte e importe sua coleção em JSON.

---

## 🌐 Acesse

👉 **[Abrir o Meus Pokémon GO](https://meuspokemongo.vercel.app)**

Seus registros ficam salvos **no navegador**. Use o mesmo navegador e endereço para reencontrar sua coleção e exporte um backup antes de trocar de aparelho, domínio ou navegador.

---

## 💻 Como rodar localmente

Não é preciso instalar dependências. Baixe ou clone **a pasta completa** do projeto: o `index.html` depende dos arquivos JavaScript, CSS e da pasta `vendor/`.

**1. Clone o repositório:**

```
git clone https://github.com/hugotakeda/Meus-Pokemon-GO.git
cd Meus-Pokemon-GO
```

**2. Sirva a pasta com qualquer servidor estático.** Por exemplo, com Python:

```
python -m http.server 8000
```

**3. Abra** `http://localhost:8000` no navegador.

Abrir o `index.html` direto no navegador pode funcionar para a coleção, mas o armazenamento, a área de transferência e as notificações variam entre navegadores. Um servidor estático dá um ambiente mais consistente.

**Testes** (precisam apenas de uma versão atual do Node.js):

```
node --test tests/*.test.cjs
```

Os testes usam fixtures locais, sem rede. Eles não substituem a conferência visual em desktop e celular.

---

## 🛠️ Tecnologias Utilizadas

- **HTML5, CSS3 e JavaScript puro:** sem framework, sem build e sem backend.
- **`localStorage`:** guarda coleção, perfil e lembretes no próprio navegador.
- **[PokéAPI](https://pokeapi.co/) e [PokeAPI/sprites](https://github.com/PokeAPI/sprites):** nomes, evoluções e a arte oficial dos Pokémon.
- **[Leek Duck](https://leekduck.com/) via [ScrapedDuck](https://github.com/bigfoott/ScrapedDuck):** raids, ovos, pesquisas, Equipe Rocket, shinies e eventos.
- **Gerador de QR local:** biblioteca incluída em `vendor/`.
- **Executor de testes nativo do Node.js** (`node:test`).
- **[Vercel](https://vercel.com/):** hospedagem estática.

---

## 🎨 Imagens e formas

Cada card usa a arte oficial da PokéAPI e escolhe a versão pelo registro:

| Registro | Imagem exibida |
| --- | --- |
| Normal | Arte normal da espécie |
| Shiny | Arte shiny da espécie (se faltar, usa a normal) |
| De Alola | Arte da forma de Alola |
| De Alola + Shiny | Arte shiny da forma de Alola (se faltar, usa a normal de Alola) |

**Como marcar a forma de Alola:**

- Ao adicionar, digite o nome (por exemplo `raichu`) e escolha **De Alola** no campo **Forma**. O campo só aparece para espécies que têm essa forma.
- Ou digite direto: `raichu-alola`, `alolan raichu` ou `raichu de alola`. As sugestões do campo já incluem as formas de Alola.
- Para um registro existente, abra **Editar** e troque a **Forma**. CP, IVs, tags e anotações são mantidos. Um registro antigo que só diz “Golem” continua normal até você ajustar o exemplar desejado.
- No guia de capturas, **Quero pegar** em um encontro cujo nome indica Alola (por exemplo, "Alolan Vulpix") já registra a forma de Alola. Ela é um objetivo separado da forma normal.
- Ao evoluir, a forma de Alola é mantida quando a evolução também a tem (Rattata de Alola vira Raticate de Alola). Caso contrário, o registro volta à forma normal.

**Espécies com forma de Alola:** Rattata, Raticate, Raichu, Sandshrew, Sandslash, Vulpix, Ninetales, Diglett, Dugtrio, Meowth, Persian, Geodude, Graveler, Golem, Grimer, Muk, Exeggutor e Marowak.

---

## 🧮 Nível calculado

Com espécie, CP e os três IVs preenchidos, o site procura o nível que corresponde ao CP:

```
CP = máximo(10, piso((Ataque + IV) × raiz(Defesa + IV) × raiz(PS + IV) × multiplicador² / 10))
```

- São testados níveis de **1 a 51**, de meio em meio.
- A tabela de atributos e multiplicadores do Pokémon GO, baseada em [PokeMiners/game_masters](https://github.com/PokeMiners/game_masters), fica embutida em `collection.js` e não é atualizada automaticamente.
- Se vários níveis gerarem o mesmo CP, aparece uma faixa. `~` indica aproximação e **Não confere** indica que CP e IV não combinaram com a conta.
- **Formas de Alola** usam atributos próprios do Pokémon GO, incorporados em `pokemon-forms.js` a partir da [PoGoAPI](https://pogoapi.net/api/v1/pokemon_stats.json), conferidos em 07/10/2026. A consulta não depende de rede e não usa a conversão aproximada da PokéAPI para essas formas.
- **Mega não tem nível calculado.**

---

## 🗂️ Estrutura do Projeto

Não publique somente o `index.html`: todos os arquivos abaixo são necessários.

```
index.html            Estrutura e navegação
styles.css            Redesign e layout responsivo
legacy.css            Estilos da coleção e dos diálogos
collection.js         Coleção, formas, backups, evoluções e cálculo de nível
pokemon-forms.js      Formas de Alola, aliases, sprites, atributos GO e evoluções
companion-data.js     Consulta, normalização e cache dos feeds
companion-rules.js    Regras do radar e mudanças de rotação
app.js                Integração da interface, guias e radar
calendar-rules.js     Datas, categorias e recortes do calendário
brazil-event-scope.js Disponibilidade no Brasil e exceções verificadas
event-calendar.js     Resumo visual, grade mensal e detalhes dos eventos
event-calendar.css    Estilos do calendário
trainer.js            Perfil, QR, lembretes e exportação de calendário
trainer.css           Estilos de perfil e lembretes
vendor/               Gerador de QR e sua licença
tests/                Testes com Node.js
```

---

## 💾 Seus dados

A coleção fica na chave `pgo` do `localStorage`:

```
{
  "have": [],
  "want": []
}
```

Cada registro tem `uid`, `id` (número da Pokédex), `name`, `cp`, `note`, `iv`, as tags booleanas, `form` (`"normal"` ou `"alola"`) e, quando existe, `evolvedFrom`. Backups antigos continuam válidos: nomes explicitamente de Alola e seus IDs de variedade são reconhecidos; registros ambíguos mantêm a forma normal. Identificadores ausentes ou duplicados são reparados sem combinar os exemplares. Cada exemplar mantém notas e IVs independentes.

| Chave no `localStorage` | Conteúdo |
| --- | --- |
| `pgo` | Coleção e desejos |
| `pgo-dex` | Nomes e números da Pokédex |
| `pgo-evo` | Cadeias de evolução consultadas |
| `pgo-stats` | Atributos calculados para espécies fora da tabela embutida |
| `pgo-companion-feed-v1` | Cache dos cinco feeds |
| `pgo-profile` | Perfil e código de treinador |
| `pgo-reminders` | Lembretes de eventos |
| `pgo-notifications`, `pgo-watch` | Preferências de avisos |

- **Exportar backup** gera um JSON com `have`, `want`, `version: 2` e um bloco `companion` (perfil e lembretes). Backups antigos continuam importáveis.
- Cada dispositivo, navegador e endereço tem seus próprios dados, sem sincronização. Limpar os dados do navegador apaga os registros locais.
- Se os dados salvos estiverem corrompidos, novas inclusões ficam bloqueadas para evitar sobrescrita. Exporte o conteúdo original e importe um backup válido para continuar.
- O site **não envia** sua coleção nem seu código de treinador a nenhum backend próprio. O navegador consulta PokéAPI, GitHub, Leek Duck e Google Fonts, que seguem suas próprias políticas.

---

## ⚠️ Limitações conhecidas

- **Só a forma de Alola tem imagem própria por enquanto.** Outras formas regionais (Galar, Hisui, Paldea) usam a arte e os atributos da forma padrão.
- **O radar distingue espécie e forma de Alola**, além das condições shiny, sombroso e Mega. Ele não confirma IV perfeito, condição sortuda ou purificação.
- **Disponibilidade de shiny não significa chance aumentada.** O feed não traz probabilidades. A calculadora usa a taxa que você informar e assume encontros independentes.
- **As rotações são informação comunitária** e podem mudar. Confirme detalhes na fonte ou no jogo.
- **Feeds com cache de 15 minutos**, timeout de 12 segundos e atualização manual em **Atualizar dados**. Se uma fonte falhar, as outras continuam e uma cópia anterior pode aparecer, com aviso, por até 7 dias.
- **Notificações exigem a página aberta.** Para alertas com o site fechado, importe o `.ics` no seu aplicativo de calendário.
- O código de treinador e o QR não validam a conta nem criam amizades no jogo.

---

## 🔧 Manutenção dos dados editoriais

Duas partes do projeto dependem de revisão manual:

- **`brazil-event-scope.js`:** o feed não tem localização estruturada. O arquivo combina categorias globais recorrentes com exceções verificadas, ligadas ao ID, tipo e intervalo exatos do evento. Novos eventos genéricos precisam ser classificados ali para aparecer, e mudanças de data em uma exceção exigem nova conferência.
- **`companion-data.js`:** guarda o suplemento da temporada (bônus semanais e possíveis encontros da descoberta extraordinária), anexado só ao evento `season-24-twilight-trails` quando início e fim batem exatamente com 8 de setembro e 1º de dezembro de 2026, às 10h. Ele traz a fonte e a data de conferência (`reviewedAt`). **Atualizar dados** não revisa esse conteúdo: é preciso conferir as páginas de origem e publicar os dados revisados.

---

## 🚢 Publicar

Publique o conteúdo completo da pasta, com `index.html` na raiz, em qualquer hospedagem estática (Vercel, Netlify ou GitHub Pages). Não há comando de build nem variáveis de ambiente. Na Vercel, use o preset **Other**, sem build e com a raiz do projeto como diretório de saída. Mantenha o endereço atual se quiser preservar o acesso à coleção já salva nessa origem.

<!--
## 📸 Screenshots

Adicione as imagens em `assets/` e descomente este bloco.

### Minha coleção
![Minha coleção](assets/colecao.png)

### Guia de capturas
![Guia de capturas](assets/guia.png)

### Calendário mensal
![Calendário mensal](assets/calendario.png)
-->

---

## 🙏 Fontes, uso e créditos

- [Leek Duck](https://leekduck.com/) fornece os encontros e a agenda. [ScrapedDuck](https://github.com/bigfoott/ScrapedDuck) publica esses dados para aplicativos externos com permissão do provedor.
- Os [termos do ScrapedDuck](https://github.com/bigfoott/ScrapedDuck#for-developers) exigem crédito a ambos, **proíbem colocar o uso da API atrás de um paywall** e **proíbem monetizar o aplicativo com anúncios**. Mantenha os créditos visíveis ao reutilizar o projeto.
- [PokéAPI](https://pokeapi.co/) fornece nomes e evoluções, e [PokeAPI/sprites](https://github.com/PokeAPI/sprites) fornece a arte dos Pokémon.
- O cabeçalho de `vendor/qrcode.js` preserva os créditos e a licença do gerador de QR.

Projeto pessoal de fã, sem vínculo com GO Companion, Niantic, Nintendo, Game Freak ou The Pokémon Company. Pokémon e Pokémon GO são marcas de seus respectivos donos.
