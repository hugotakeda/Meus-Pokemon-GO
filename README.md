# Meus Pokémon GO

Um companheiro de jornada para organizar sua coleção, encontrar oportunidades de captura e acompanhar eventos de Pokémon GO. Interface em português, responsiva, com navegação por coleção, desejos, guia, agenda e perfil de treinador.

O site usa HTML, CSS e JavaScript, sem build, backend, conta ou conexão com sua conta do jogo. Os registros pessoais ficam no navegador. Os encontros e eventos vêm de fontes comunitárias públicas.

## Começar

1. Baixe ou clone **a pasta completa** do projeto. A versão atual precisa dos arquivos JavaScript, CSS e `vendor/`, além do `index.html`.
2. Para desenvolver localmente, sirva a pasta com qualquer servidor estático. Por exemplo, se tiver Python:

   ```sh
   python -m http.server 8000
   ```

3. Abra `http://localhost:8000`. Para uso publicado, prefira HTTPS.
4. Use o mesmo navegador e endereço para reencontrar sua coleção. Exporte um backup antes de trocar de aparelho, domínio ou navegador.

Abrir `index.html` diretamente pode funcionar para a coleção, mas o comportamento do armazenamento, da área de transferência e das notificações varia com o navegador. Um servidor estático ou a versão hospedada oferece um ambiente mais consistente.

## Coleção e lista de desejos

- Adicione pelo nome em inglês, com sugestões, ou pelo número da Pokédex, de 1 a 1025.
- Selecione **Forma → Alola** ou digite, por exemplo, **Golem de Alola**, **Alolan Golem** ou **golem-alola**. As 18 formas de Alola têm nome, arte normal/shiny, atributos de CP e evoluções próprios. Para corrigir um registro antigo, use **Editar → Forma → Alola**; CP, IVs, tags e notas são mantidos. Registros antigos sem indicação de forma continuam como normais até você ajustá-los.
- Combine as tags **100%, Shiny, Sombroso (Rocket), Purificado, Sortudo e Mega**.
- Registre CP, IVs de ataque/defesa/PS de 0 a 15 e anotações opcionais. A tag 100% preenche 15/15/15; esses IVs também marcam a tag automaticamente.
- Use **Tenho** e **Quero pegar**. **Peguei!** move um desejo para a coleção.
- Edite registros, remova com opção de desfazer e registre evoluções mantendo tags e anotações.
- Busque por nome, filtre por tag e ordene por adição, mais recentes, CP, IV, nome ou número da Pokédex. Valores de CP/IV não cadastrados ficam por último.
- Exporte e importe sua coleção em JSON. A importação valida os registros e pede confirmação antes de substituir uma coleção existente.

A visão geral mostra totais da coleção, shinies, IVs perfeitos, espécies distintas e um radar que cruza desejos com encontros do guia. O cruzamento distingue a forma normal de Alola e respeita as condições shiny/sombroso/Mega; não confirma IV perfeito, condição sortuda ou purificação. As formas compartilham o número da espécie na Pokédex, mas cada exemplar tem sua própria identidade, notas e IVs. Outras formas regionais ainda não têm cadastro específico.

## Guia de capturas

Os dados são consultados de [Leek Duck](https://leekduck.com/), via [ScrapedDuck](https://github.com/bigfoott/ScrapedDuck):

- **Raids:** chefes, categoria, tipos e intervalos de CP de captura, incluindo bônus de clima quando informado.
- **Ovos:** espécies por distância, Sincroaventura, presentes, disponibilidade regional e raridade publicada pela fonte.
- **Pesquisas:** tarefas de campo e possíveis recompensas.
- **Equipe Rocket:** formações de líderes e recrutas, com indicação dos encontros que podem ser resgatados.
- **Shinies:** encontros que a fonte marca como elegíveis a shiny, reunidos por origem.

As categorias têm busca, filtros e a opção de mostrar apenas espécies da lista de desejos. **Quero pegar** adiciona o encontro à coleção de objetivos; no guia de shinies, também marca a tag shiny.

Os nomes, títulos e textos das tarefas preservam o conteúdo original da fonte, geralmente em inglês. Os rótulos da interface e os tipos de Pokémon são apresentados em português.

**Disponibilidade de shiny não significa uma chance aumentada.** O feed não fornece probabilidades verificáveis e o site não atribui taxas aos Pokémon. A calculadora permite informar uma taxa estimada por conta própria e calcula `1 - (1 - 1/taxa)^encontros`, assumindo encontros independentes com probabilidade constante. A raridade dos ovos é a classificação da fonte, não uma porcentagem de eclosão.

## Calendário mensal

A agenda reúne duas formas de consultar o mês, mantendo o fundo claro e os destaques verdes do site:

- **Resumo do mês:** um resumo em estilo de infográfico, com Pokémon, períodos, horários e bônus disponíveis na fonte. Permite comparar as rotações e os destaques do mês.
- **Calendário:** uma grade mensal que distribui os eventos pelos dias. Selecione um dia para consultar sua programação. Eventos que atravessam vários dias continuam sendo o mesmo evento; salvá-los em dias diferentes não cria vários lembretes.

Use mês anterior, mês seguinte e **Hoje** para navegar. Busque por Pokémon ou evento, filtre pelo **Tipo** e ative **Só os meus salvos** para rever os lembretes. Abra um cartão para consultar seus detalhes, fonte, lembrete e exportação para calendário. As imagens de Pokémon priorizam os sprites fornecidos por Leek Duck. Quando uma espécie aparece explicitamente no título e pode ser identificada na Pokédex, a agenda pode usar a arte da espécie da PokéAPI; o diálogo informa que essa imagem é ilustrativa e não confirma a forma ou a disponibilidade shiny. Um título ou banner genérico não é tratado como confirmação de uma espécie: quando a fonte não informa Pokémon ou bônus, a agenda apresenta essa ausência.

O calendário usa [Leek Duck](https://leekduck.com/events/), via o feed público de eventos do [ScrapedDuck](https://github.com/bigfoott/ScrapedDuck). É uma visão dos dados disponíveis na consulta, **não um arquivo histórico completo**. Meses anteriores podem ter eventos ausentes, e meses futuros podem estar parcialmente anunciados. Um dia sem registros significa apenas que não há eventos informados no conjunto carregado. O cache local não reconstrói anúncios antigos nem mantém um histórico permanente.

### Disponibilidade no Brasil

A agenda e os próximos eventos da visão geral mostram a programação recorrente global válida no Brasil e eventos brasileiros verificados. Edições presenciais estrangeiras e eventos genéricos sem confirmação ficam ocultos. Como o feed não contém localização estruturada, `brazil-event-scope.js` combina categorias globais recorrentes com um registro editorial de exceções, vinculado ao ID, tipo e intervalo exatos. Alterações nas datas de uma exceção exigem nova conferência; **Atualizar dados** não faz essa revisão editorial. Novos eventos genéricos precisam ser classificados nesse arquivo para aparecer.

Os detalhes exibem abrangência, condições, fonte e data da conferência quando houver revisão editorial. Por exemplo, a promoção TCG em lojas dos EUA fica excluída; o Dia Max de 24/10/2026 mostra Azelf para o Brasil; a pesquisa adidas indica as lojas brasileiras participantes. O término dos Twitch Drops ainda não confirmado é omitido e não pode gerar um lembrete com horário inventado. Eventos com datas parcialmente conhecidas ficam em uma lista de horários a confirmar no mês correspondente.

Datas sem horário confirmado aparecem como não informadas; o site não inventa datas ou rotações. Horários locais do jogo seguem o fuso do dispositivo. Horários globais fornecidos em UTC são convertidos para esse mesmo fuso, conforme o [contrato da fonte](https://github.com/bigfoott/ScrapedDuck/wiki/Events). Um evento pode, portanto, aparecer em outro dia ao mudar o fuso do dispositivo. Para viajar ou jogar em outra região, confira o horário indicado pela fonte.

### Bônus semanais e recompensa de pesquisa da temporada

Alguns detalhes da temporada não estão presentes no JSON do ScrapedDuck. O projeto inclui um suplemento editorial revisado em `companion-data.js` para os bônus semanais **Daily Discoveries** e os possíveis encontros da **Research Breakthrough**. Essa lista de encontros é a recompensa de descoberta extraordinária da temporada; não é a lista de tarefas de pesquisa de campo do guia.

O suplemento atual só é anexado ao evento `season-24-twilight-trails` quando seu início e fim locais correspondem exatamente a **8 de setembro de 2026, às 10h**, e **1º de dezembro de 2026, às 10h**. Não é aplicado automaticamente a outra temporada, a meses fora desse intervalo ou a um evento com datas diferentes.

| Informação                              | Proveniência e revisão                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Bônus semanais e condições da temporada | `sourceUrl`: [Twilight Trails — Leek Duck](https://leekduck.com/events/season-24-twilight-trails/)     |
| Pokémon da descoberta extraordinária    | `sourceUrl`: [Research Breakthrough — Leek Duck](https://leekduck.com/research/#research-breakthrough) |
| Data de conferência do suplemento       | `reviewedAt`: `2026-10-07`                                                                             |

O calendário apresenta a fonte e a data de revisão desses complementos. **Atualizar dados** consulta novamente os feeds, mas não revisa esse conteúdo editorial nem altera seu `reviewedAt`. Para atualizar o suplemento, é necessário conferir as páginas de origem e publicar os dados revisados. As condições da fonte continuam valendo, incluindo exceções nas semanas de eventos globais, faixas de horário e bônus restritos à participação presencial. A presença de um bônus semanal não confirma um Pokémon específico para aquela data.

## Novidades e lembretes

- Salve lembretes e exporte um evento ou toda a lista em `.ics` para seu aplicativo de calendário.
- Um evento precisa de início e fim válidos para ser salvo ou exportado. Eventos encerrados podem continuar na lista de lembretes para consulta ou remoção; não geram novos avisos.
- Ative notificações do navegador para avisos cerca de 15 minutos antes, quando o navegador permitir. **A página precisa permanecer aberta**, e o navegador pode suspender temporizadores. Não há serviço de push em segundo plano.
- Para alertas com o site fechado, importe o arquivo no calendário e habilite os avisos nele. O arquivo exportado é uma cópia: alterações posteriores de horário exigem nova exportação/importação.
- A opção de acompanhar rotações mostra avisos dentro da página quando novas consultas identificam mudanças. As consultas automáticas acontecem a cada 15 minutos enquanto a página está visível.
- Acesse as notícias oficiais em português e a página oficial de resgate de códigos pelos links da agenda. Não há feed de notícias inventado ou resgate automático.

## Perfil do treinador

Salve nome, equipe e código de amizade de 12 dígitos. O QR é gerado localmente com a biblioteca incluída em `vendor/`; você pode copiar o código ou baixar o QR em SVG. O preenchimento não autentica o treinador, valida a conta nem cria amizades automaticamente no jogo.

O QR contém os 12 números para leitura e cópia. A compatibilidade com o scanner interno da versão atual do jogo não foi validada; o código numérico continua disponível para adicionar o amigo manualmente.

## Atualização e falhas das fontes

Cada um dos cinco feeds possui cache e estado independentes:

- Cache de **15 minutos**, com atualização manual pelo botão **Atualizar dados**.
- Consultas simultâneas compartilhadas e timeout de **12 segundos** por requisição.
- Se uma fonte falhar, as demais continuam disponíveis. Uma cópia anterior pode ser exibida com aviso de possível desatualização por até **7 dias**; depois disso, o feed fica indisponível até uma consulta bem-sucedida.
- **Última consulta** é a hora em que o navegador baixou o conteúdo. Não é uma confirmação de quando o publicador revisou os dados: o feed não fornece essa data.
- Nomes, URLs e estrutura dos feeds passam por validação. HTML das pesquisas é convertido em texto, e os links/imagens dos feeds são restritos aos domínios HTTPS de Leek Duck.

As rotações são informação comunitária, podem mudar e não garantem um encontro no seu local. Confirme detalhes na fonte ou no jogo. O próprio GitHub também mantém cache dos arquivos publicados pelo ScrapedDuck.

## Nível calculado e imagens

Com espécie, CP e três IVs preenchidos, o site procura o nível que corresponde ao CP usando:

```text
CP = máximo(10, piso((Ataque + IV) × raiz(Defesa + IV) × raiz(PS + IV) × multiplicador² / 10))
```

- São testados níveis de **1 a 51**, de meio em meio. Os meios níveis usam a raiz da média dos quadrados dos multiplicadores vizinhos.
- A tabela existente de atributos e multiplicadores do Pokémon GO, baseada em [PokeMiners/game_masters](https://github.com/PokeMiners/game_masters), fica embutida em `collection.js`. Não depende de internet para as espécies contempladas e não é atualizada automaticamente.
- Para espécies ausentes da tabela, há conversão de atributos da PokéAPI, que pode produzir resultado aproximado.
- Se vários níveis gerarem o mesmo CP, aparece uma faixa. `~` indica aproximação; **Não confere** indica que CP e IV não combinaram com a conta.
- **Não calcula nível de Mega.** As formas de Alola usam atributos próprios do Pokémon GO, incorporados em `pokemon-forms.js` a partir da [PoGoAPI](https://pogoapi.net/api/v1/pokemon_stats.json), conferidos em 07/10/2026. Outras formas alternativas ainda não têm atributos específicos.
- Na coleção, as formas normal e de Alola usam sua respectiva arte normal/shiny da PokéAPI. Se a arte shiny não carregar, o fallback mantém a mesma forma regional. Outras variantes usam arte normal e identificação visual. As imagens do guia preservam as fornecidas por Leek Duck.

## Armazenamento e compatibilidade

A coleção continua na chave `pgo`, mantendo o formato anterior:

```json
{
  "have": [],
  "want": []
}
```

Cada registro mantém `uid`, `id` (número da Pokédex), `name`, `cp`, `note`, `iv`, as tags booleanas e, quando presente, `evolvedFrom`. O campo `form` distingue `normal` e `alola`. Backups anteriores continuam válidos: nomes explicitamente de Alola e seus IDs de variedade são reconhecidos; registros ambíguos mantêm a forma normal e podem ser corrigidos em Editar. Identificadores ausentes ou duplicados são reparados sem combinar os exemplares. Ao publicar no **mesmo domínio/origem e navegador**, os registros existentes continuam disponíveis.

| Chave no `localStorage` | Conteúdo                                                   |
| ----------------------- | ---------------------------------------------------------- |
| `pgo`                   | Coleção e desejos, compatíveis com o formato anterior      |
| `pgo-dex`               | Nomes e números da Pokédex                                 |
| `pgo-evo`               | Cadeias de evolução consultadas                            |
| `pgo-stats`             | Atributos calculados para espécies fora da tabela embutida |
| `pgo-companion-feed-v1` | Cache dos cinco feeds e horários das consultas             |
| `pgo-profile`           | Perfil e código de treinador                               |
| `pgo-reminders`         | Lembretes de eventos                                       |
| `pgo-notifications`     | Preferência de notificações                                |
| `pgo-watch`             | Preferência de avisos de rotações                          |

**Exportar backup** gera um JSON com as listas `have` e `want`, `version: 2` e um bloco `companion` contendo perfil e lembretes. A chave local `pgo` continua contendo apenas a coleção no formato original. Backups antigos com `have` e `want` continuam importáveis; sem um bloco `companion`, não substituem perfil e lembretes. Preferências de avisos e a permissão de notificações do navegador não são transportadas. Os lembretes também têm exportação própria em calendário.

Se os dados salvos da coleção estiverem corrompidos, novas inclusões ficam bloqueadas para evitar sobrescrita. A exportação preserva o conteúdo original para recuperação; uma importação válida libera novamente a edição. Limpar os dados do navegador apaga os registros locais. Cada dispositivo, navegador e origem têm seus próprios dados; não há sincronização automática.

A aplicação não envia sua coleção ou código de treinador a um backend próprio. O navegador consulta PokéAPI, GitHub, Leek Duck e Google Fonts para dados, imagens e fonte; essas requisições seguem as políticas dos respectivos serviços. O compartilhamento do QR e do código depende de sua ação.

## Desenvolvimento e testes

Não é necessário instalar dependências para executar o site. Os testes usam o executor nativo de uma versão atual do Node.js:

```sh
node --test tests/*.test.cjs
```

Os testes usam fixtures locais e cobrem normalização dos feeds, datas locais/UTC, cache, falhas parciais, timeout, validação dos backups, cálculos da coleção, lembretes e exportação de calendário. Os testes automatizados não substituem a conferência visual em desktop e celular nem garantem a disponibilidade futura dos provedores externos.

## Publicar

Publique o conteúdo completo da pasta, mantendo `index.html` na raiz, em uma hospedagem estática como Vercel, Netlify ou GitHub Pages. Não há comando de build nem variáveis secretas de ambiente. Na Vercel, use o preset **Other**, sem comando de build e com a raiz do projeto como diretório de saída, conforme a [documentação de sites estáticos](https://vercel.com/docs/builds/configure-a-build).

Não publique somente `index.html`: os arquivos locais abaixo são necessários. Mantenha o endereço atual do site se quiser preservar o acesso à coleção já armazenada nessa origem.

```text
index.html          Estrutura e navegação
styles.css          Redesign e layout responsivo
legacy.css          Estilos da coleção e dos diálogos existentes
collection.js       Coleção, backups, evoluções e cálculos
pokemon-forms.js    Formas de Alola, aliases, sprites, atributos GO e evoluções
companion-data.js   Consulta, normalização e cache dos feeds
companion-rules.js  Regras do radar e identificação de mudanças de rotação
app.js              Integração da interface, guias e radar
calendar-rules.js   Datas, categorias e recortes do calendário mensal
brazil-event-scope.js Disponibilidade no Brasil e exceções regionais verificadas
event-calendar.js   Resumo visual, grade mensal e detalhes dos eventos
event-calendar.css  Estilos do calendário e dos cartões de eventos
trainer.js          Perfil, QR, lembretes e calendário
trainer.css         Estilos de perfil e lembretes
vendor/qrcode.js    Gerador de QR incluído localmente
vendor/qrcode.LICENSE Licença do gerador de QR
tests/              Testes com Node.js
README.md           Este guia
```

## Fontes, uso e créditos

- [Leek Duck](https://leekduck.com/) fornece os encontros e a agenda; [ScrapedDuck](https://github.com/bigfoott/ScrapedDuck) publica esses dados para aplicativos externos com permissão do provedor.
- Os [termos do ScrapedDuck](https://github.com/bigfoott/ScrapedDuck#for-developers) exigem crédito a ambos, **proíbem colocar o uso da API atrás de um paywall** e **proíbem monetização do aplicativo com anúncios**. Mantenha os créditos visíveis ao reutilizar o projeto.
- [PokéAPI](https://pokeapi.co/) fornece nomes e evoluções; [PokeAPI/sprites](https://github.com/PokeAPI/sprites) fornece a arte da coleção.
- O cabeçalho de `vendor/qrcode.js` preserva os créditos e a licença do gerador de QR.

Projeto pessoal de fã, sem vínculo com GO Companion, Niantic, Nintendo, Game Freak ou The Pokémon Company. Pokémon e Pokémon GO são marcas de seus respectivos donos.
