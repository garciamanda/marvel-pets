# 🕷️ Marvel Pets

> Extensão do VS Code que adiciona personagens da Marvel como pets animados na barra lateral do editor.

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-%E2%89%A5%201.80.0-blue.svg)](https://code.visualstudio.com/)

O Homem-Aranha se instala na sua lateral do Explorer, sobre o telhado de Nova York,
e vive a vida: anda, corre, balança na teia, dorme e fala com você — com StateMachine,
sprites animados e balão de fala responsivo.

<!-- Captura de tela: adicione docs/screenshot.png e descomente a linha abaixo
![Marvel Pets em ação](docs/screenshot.png)
-->
> 📸 **Placeholder:** em breve um GIF/screenshot da extensão em ação.

## ✨ Funcionalidades

- 🕸️ **Pet animado** na barra lateral (Explorer) — 10 frames, pixel art 32×32.
- 🧠 **StateMachine** com 6 estados: `idle`, `walk`, `run`, `swing`, `sleep`, `talk`
  (troca automática a cada 5 segundos).
- 🗣️ **Balão de fala** com frases temáticas ("Thwip!", "Com grandes poderes..."),
  sempre acima da cabeça e nunca saindo da tela.
- 🖼️ **Cenário de telhado noturno** feito 100% em CSS (estrelas, lua, skyline, teias).
- 📦 **Fallbacks automáticos**: funciona mesmo sem todos os sprites gerados
  (`run` usa `walk`, `sleep`/`talk` usam `idle`).
- 📱 **100% responsivo** — adapta-se ao tamanho da Webview.

## 📥 Como instalar

### Opção A — Desenvolvimento (recomendado para contribuir)

```bash
git clone https://github.com/SEU-USUARIO/marvel-pets.git
cd marvel-pets
npm install
npm run compile
```

Depois pressione **F5** no VS Code para abrir a *Extension Development Host*
e clique na view **Marvel Pets** no Explorer.

### Opção B — Via VSIX

```bash
npm install
npx @vscode/vsce package
code --install-extension marvel-pets-0.0.1.vsix
```

## 🎮 Como usar

1. Abra o VS Code com a extensão ativa.
2. Clique no ícone da **teia** na árvore do **Explorer** → view *Marvel Pets*.
3. Pronto: o Homem-Aranha anima sozinho no cenário.

Comandos úteis:

| Comando | O que faz |
|---|---|
| `Marvel: Iniciar Pet` | Abre o pet em um painel lateral separado |

Depuração (para quem for contribuir):

- `Ctrl+Shift+P` → **Developer: Open Webview Developer Tools** → aba **Console**.
- No dropdown de contexto (canto superior esquerdo), selecione o **iframe** do webview
  (`vscode-webview://`) e use a debug API:
  ```js
  __petDebug.forceTalk('Thwip!')
  __petDebug.forceState('run')
  __petDebug.toggleDebug()   // contornos visuais de depuração
  ```

## 🎨 Sprites

Ainda em produção: `run_sheet.png`, `swing_sheet.png`, `sleep_sheet.png`, `talk_sheet.png`
— até lá, fallbacks automáticos. Quer ajudar? Gere 320×32 (10 frames de 32×32) e solte em
`media/` com o nome acima. Detalhes em [PROJECT.md](PROJECT.md#6-como-gerar-novos-sprites).

## 🤝 Como contribuir

1. Faça um fork do repositório.
2. Crie uma branch: `git checkout -b feat/minha-feature`.
3. Committe: `git commit -m "feat: descrição da mudança"`.
4. Abra um Pull Request descrevendo o que mudou e por quê.

Antes de abrir o PR: `npm run compile` sem erros e um teste manual na Extension
Development Host (F5). Guia completo de arquitetura em [PROJECT.md](PROJECT.md).

## 📄 Licença

[MIT](LICENSE) © amand

Personagens da Marvel © Marvel Comics — projeto fan-made, sem fins comerciais.
Inspirado em [VS Code Pets](https://github.com/tonybaloney/vscode-pets) (tonybaloney).
