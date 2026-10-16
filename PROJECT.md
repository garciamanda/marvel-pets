# PROJECT.md — Marvel Pets

Documentação completa do projeto **Marvel Pets**. Este arquivo é o guia de referência
para quem for manter, evoluir ou contribuir com a extensão.

---

## 1. Visão Geral

| Campo | Valor |
|---|---|
| **Nome** | Marvel Pets |
| **Descrição** | Extensão do VS Code que adiciona personagens da Marvel (começando pelo Homem-Aranha) como pets animados na barra lateral do editor. |
| **Inspiração** | [VS Code Pets](https://marketplace.visualstudio.com/items?itemName=tonybaloney.vscode-pets) (tonybaloney.vscode-pets) |
| **Autor** | amand |
| **Versão atual** | 0.0.1 |
| **Publisher** | amand |
| **Licença** | MIT |

O pet fica em uma **WebviewView** dentro do Explorer, sobre um cenário de telhado de
Nova York à noite (100% CSS), e alterna sozinho entre estados animados a cada 5 segundos.

---

## 2. Funcionalidades Implementadas

- **WebviewViewProvider** registrado na barra lateral do Explorer (id `marvelPetsViewAmand2026XYZ`).
- **Sprite sheet animada** do Homem-Aranha (10 frames, 32×32 px cada, folha 320×32).
- **StateMachine** com 6 estados: `idle`, `walk`, `run`, `swing`, `sleep`, `talk`.
  - Troca de estado a cada **5 s**, sempre para um estado diferente do atual.
  - Movimento (translação horizontal + espelhamento) **apenas** em `walk` e `run`.
- **Fallbacks automáticos de sprite**: se um PNG não existir, o código (e a extensão)
  usam outro automaticamente:
  | Estado | Sprite próprio | Fallback |
  |---|---|---|
  | idle | `idle_1.png` | — |
  | walk | `walk_sheet.png` | — |
  | run | `run_sheet.png` | `walk_sheet.png` |
  | swing | `swing_sheet.png` | `walk_sheet.png` |
  | sleep | `sleep_sheet.png` | `idle_1.png` |
  | talk | `talk_sheet.png` | `idle_1.png` |
  - A quantidade de frames é **autodetectada** pelo `naturalWidth / 32` da imagem carregada.
  - Só o **asset** é herdado no fallback — o comportamento (velocidade, animação) é sempre do estado.
- **Balão de fala** no estado `talk`:
  - Frases temáticas aleatórias (12 frases em pt-BR).
  - Some após **3 s** (ou ao sair do estado).
  - Sempre **12px acima da cabeça** (`--bubble-gap`), medido com `getBoundingClientRect()`.
  - **Reposicionamento lateral**: se estourar a borda, o balão vai para o lado oposto do pet
    (classes `.bubble-left` / `.bubble-right` / `.bubble-center`), cauda acompanhando.
- **Layout responsivo**: pet `clamp(28px, 7vw, 44px)`, balão `min(160px, 38%)`,
  fonte/padding/cauda/folga via variáveis CSS em `:root`, com `@media (max-width: 300px)`.
- **Cenário temático** (CSS puro, sem imagens): céu noturno com estrelas, lua,
  skyline de prédios com janelas acesas, antenas, caixas d'água, telhado e teias.
- **Cache-busting**: `style.css` e `script.js` são servidos com `?v=<mtime>` para o
  webview nunca usar arquivos desatualizados durante o desenvolvimento.
- **Logs de depuração** — prefixo `🕷️` no console do webview:
  | Log | O que indica |
  |---|---|
  | `[1]`–`[3.1]` | Ativação da extensão e registro do provedor (host) |
  | `[4]`–`[6]` | `resolveWebviewView`, leitura do HTML e montagem das URIs (host) |
  | `[7]` | script.js carregado (webview) |
  | `[B0]` | StateMachine iniciada + debug API exposta |
  | `[B1]`–`[B4]` | showBubble / elemento encontrado / is-hidden removido / hideBubble |
  | `[B5]` | Estado `talk` entrou no `onEnter` |
  | `[B7]` | Estilo computado do balão (opacity, rect, gap, `na-tela=`) |
  | `[B8]` | Classes do balão após mostrar |
  | `[B9]` | `opacity/visibility` 250ms depois (prova que a animação termina visível) |
- **Debug API**: `window.__petDebug` com `forceTalk(phrase)`, `forceState(estado)`,
  `toggleDebug()`, `checkBubble()`, `positionBubble()`, `bubbleGap()` etc.

---

## 3. Arquitetura de Arquivos

```
marvel-pets/
├── package.json              # Configuração da extensão (comandos, views, publisher)
├── tsconfig.json             # Configuração do TypeScript (commonjs, ES2020, strict)
├── PROJECT.md                # Esta documentação
├── README.md                 # Apresentação do projeto (GitHub)
├── LICENSE                   # Licença MIT
├── .gitignore                # node_modules/, out/, *.vsix, .vscode-test/
├── src/
│   └── extension.ts          # Lógica principal (registra o WebviewViewProvider)
├── media/
│   ├── index.html            # Estrutura da Webview (game-container, pet, speech-bubble)
│   ├── style.css             # Estilo (cenário, pet, balão, responsividade, debug)
│   ├── script.js             # Lógica da Webview (StateMachine, animação, balão)
│   ├── spider-icon.svg       # Ícone auxiliar
│   ├── idle_1.png            # Sprite parado (32×32)
│   ├── walk_sheet.png        # Sprite sheet de caminhada (320×32, 10 frames)
│   └── (sprites futuros)     # run_sheet.png, swing_sheet.png, sleep_sheet.png, talk_sheet.png
└── .vscode/
    ├── launch.json           # Debug (preLaunchTask: npm: watch)
    └── tasks.json            # Task de watch (isBackground: true, problemMatcher: $tsc-watch)
```

### Fluxo de dados

```
extension.ts ──(lê index.html, injeta URIs)──▶ webview (iframe)
      │                                              │
      │  bust('style.css'/'script.js') com ?v=mtime  │
      │  getSpriteUris() com fs.existsSync + fallback │
      ▼                                              ▼
  logs [1]-[6]                              script.js (StateMachine + balão)
                                            logs [7], [B0]-[B9]
```

### Responsabilidades

- **`src/extension.ts`** — registra o provedor (view lateral + comando `marvelPets.start`
  que abre em painel), monta o HTML substituindo `{{placeholders}}`, resolve as URIs dos
  sprites com `fs.existsSync` (aplicando fallback) e aplica cache-busting.
- **`media/script.js`** — `StateMachine`, defs de sprite (`SPRITE_DEFS`), detecção de
  fallback por `new Image()`, animação de frames, movimento, balão de fala e debug API.
- **`media/style.css`** — cenário, `#pet`, `#speech-bubble` (visibilidade, cauda, lados,
  responsividade via `:root` variables) e modo debug visual.
- **`media/index.html`** — estrutura + injeção de `window.SPRITE_URIS` via `{{spritesJson}}`.

---

## 4. Tecnologias Usadas

- **TypeScript** (compilado com `tsc` para `out/`)
- **VS Code Extension API** (`WebviewViewProvider`, `Webview`, `asWebviewUri`)
- **HTML/CSS/JavaScript puro** na webview (sem frameworks, sem build de front-end)
- **Pixel Art** — sprites gerados com **Retro Diffusion** + **Pixellab**

---

## 5. Como Rodar o Projeto

```bash
# 1. Instalar dependências
npm install

# 2. Compilar
npm run compile

# 3. Pressionar F5 no VS Code para abrir a janela de desenvolvimento
#    (a configuração "Run Extension" já roda `npm run watch` antes)

# 4. Na janela de desenvolvimento, clicar na view "Marvel Pets" no Explorer
#    (ícone de teia na árvore do Explorer)
```

Atalhos úteis:

| Ação | Como |
|---|---|
| Recompilar em watch | `npm run watch` |
| Abrir o pet em um painel lateral | Comando **"Marvel: Iniciar Pet"** (`marvelPets.start`) |
| Console de depuração do pet | `Ctrl+Shift+P` → **Developer: Open Webview Developer Tools** → aba Console |
| Acessar a debug API | No Console, trocar o contexto para o **iframe** do webview (dropdown `top` → item com `vscode-webview://`) e digitar `__petDebug.forceTalk()` |

---

## 6. Como Gerar Novos Sprites

1. Use o **Retro Diffusion** para gerar o sprite base (32×32, estilo pixel art,
   Homem-Aranha em perfil, fundo transparente).
2. Use o **Pixellab** para animar (10 frames) e exportar como **sprite sheet horizontal**
   (320×32 px).
3. Salve na pasta `media/` com o **nome exato** do estado:

   | Arquivo | Estado |
   |---|---|
   | `idle_1.png` | parado (frame único 32×32) |
   | `walk_sheet.png` | caminhada |
   | `run_sheet.png` | corrida |
   | `swing_sheet.png` | balanço na teia |
   | `sleep_sheet.png` | dormindo |
   | `talk_sheet.png` | falando |

4. O código **detecta automaticamente** (sonda com `new Image()` + `fs.existsSync` na
   extensão) e para de usar o fallback. Se a largura da folha não for múltipla de 32,
   o número de frames é recalculado pelo `naturalWidth / 32`.

---

## 7. Roadmap (Funcionalidades Futuras)

- [ ] Adicionar mais personagens (Miles Morales, Deadpool, Wolverine, Pantera Negra).
- [ ] Botão "+" para adicionar personagens.
- [ ] Trocar de cenário (Telhado, Rua, Laboratório Oscorp).
- [ ] Persistência de personagens por cenário (`ExtensionContext.globalState`).
- [ ] Interações entre personagens.
- [ ] Sistema de humor (tamagotchi: fome, sono, felicidade).
- [ ] Efeitos visuais (partículas, teias voando).
- [ ] Comandos de contexto (alimentar, brincar, trocar de personagem).
- [ ] Publicar no Marketplace (publisher + `vsce package`/`vsce publish`).

---

## 8. Problemas Conhecidos / Limitações

- **Sprites de `run`, `swing`, `sleep` e `talk` ainda usam fallback** (`walk_sheet.png`
  e `idle_1.png`) até os arquivos serem gerados (ver seção 6).
- **`__petDebug` exige selecionar o iframe no DevTools**: o Console do DevTools do
  webview avalia no frame pai; a extensão roda no iframe (`vscode-webview://`).
  Troque o contexto no dropdown superior esquerdo do Console.
- **`opacity: 0` do balão (corrigido)**: havia conflito entre `transition` em
  `visibility` e a animação `bubble-pop`. Corrigido com `visibility: visible` no estado
  base, `animation ... both` em `.is-visible`, `animation: none` em `.is-hidden`, reflow
  forçado (`void bubble.offsetWidth`) e logs `[B8]`/`[B9]` para verificação.
- **Recarregar a janela é obrigatório** após mudanças em `out/extension.js`
  (`Developer: Reload Window`). CSS/JS da webview não precisam: o cache-busting por
  `mtime` cuida disso ao reabrir a view.
- **`talk` com balão por 3s dentro de um estado de 5s**: comportamento intencional
  (o balão some antes de a state machine trocar de estado).

---

## 9. Créditos

- Inspirado em **[VS Code Pets](https://github.com/tonybaloney/vscode-pets)** (tonybaloney).
- Sprites gerados com **Retro Diffusion** e **Pixellab**.
- Personagens da Marvel © **Marvel Comics** (projeto sem fins comerciais, fan-made).
