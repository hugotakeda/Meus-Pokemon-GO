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
- Combine as tags **100%, Shiny, Sombroso (Rocket), Purificado, Sortudo e Mega**.
- Registre CP, IVs de ataque/defesa/PS de 0 a 15 e anotações opcionais. A tag 100% preenche 15/15/15; esses IVs também marcam a tag automaticamente.
- Use **Tenho** e **Quero pegar**. **Peguei!** move um desejo para a coleção.
- Edite registros, remova com opção de desfazer e registre evoluções mantendo tags e anotações.
- Busque por nome, filtre por tag e ordene por adição, mais recentes, CP, IV, nome ou número da Pokédex. Valores de CP/IV não cadastrados ficam por último.
- Exporte e importe sua coleção em JSON. A importação valida os registros e pede confirmação antes de substituir uma coleção existente.

A visão geral mostra totais da coleção, shinies, IVs perfeitos, espécies distintas e um radar que cruza desejos com encontros do guia. O cruzamento usa a espécie e as condições shiny/sombroso/Mega; não confirma IV perfeito, condição sortuda, purificação ou uma forma regional específica. Formas alternativas continuam compartilhando o número da espécie na coleção; o nome do objetivo fica na anotação quando adicionado pelo guia.

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

## Eventos, novidades e lembretes

- Consulte eventos em andamento, próximos e todos os eventos da fonte, com links para os detalhes.
- Datas sem horário confirmado aparecem como não informadas; o site não inventa datas ou rotações.
- Horários locais do jogo seguem o fuso do dispositivo. Horários globais fornecidos em UTC são convertidos para esse mesmo fuso, conforme o [contrato da fonte](https://github.com/bigfoott/ScrapedDuck/wiki/Events).
- Salve lembretes e exporte um evento ou toda a lista em `.ics` para seu aplicativo de calendário.
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
- **Não calcula nível de Mega.** Formas regionais e alternativas usam os atributos da forma padrão, podendo gerar aproximações ou nenhum resultado.
- Na coleção, shiny usa a arte shiny da PokéAPI quando disponível; outras variantes usam arte normal e identificação visual. Formas regionais e alternativas usam a arte da espécie padrão. As imagens do guia preservam as fornecidas por Leek Duck.

## Armazenamento e compatibilidade

A coleção continua na chave `pgo`, mantendo o formato anterior:

```json
{
  "have": [],
  "want": []
}
```

Cada registro mantém `uid`, `id` (número da Pokédex), `name`, `cp`, `note`, `iv`, as tags booleanas e, quando presente, `evolvedFrom`. Não é necessário migrar um backup válido da versão anterior. Ao publicar no **mesmo domínio/origem e navegador**, os registros existentes continuam disponíveis.

| Chave no `localStorage` | Conteúdo |
| --- | --- |
| `pgo` | Coleção e desejos, compatíveis com o formato anterior |
| `pgo-dex` | Nomes e números da Pokédex |
| `pgo-evo` | Cadeias de evolução consultadas |
| `pgo-stats` | Atributos calculados para espécies fora da tabela embutida |
| `pgo-companion-feed-v1` | Cache dos cinco feeds e horários das consultas |
| `pgo-profile` | Perfil e código de treinador |
| `pgo-reminders` | Lembretes de eventos |
| `pgo-notifications` | Preferência de notificações |
| `pgo-watch` | Preferência de avisos de rotações |

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
companion-data.js   Consulta, normalização e cache dos feeds
companion-rules.js  Regras do radar e identificação de mudanças de rotação
app.js              Integração da interface, guias e radar
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
