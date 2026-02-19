# Como usar o Extrator CT-e

## Opção 1: Usar no computador (desenvolvimento)

1. Abra o terminal na pasta do projeto
2. Execute: `npm run dev`
3. Acesse o link que aparecer (ex: http://localhost:5173)

---

## Opção 2: Gerar arquivos para usar em qualquer lugar

1. Execute: `npm run build`
2. Os arquivos ficarão na pasta `dist/`
3. Você pode:
   - **Copiar a pasta `dist`** para um pendrive ou pasta de rede e abrir o `index.html` no navegador
   - **Enviar para um servidor** (qualquer hospedagem web)
   - **Usar `npm run preview`** para testar o build localmente antes de publicar

---

## Opção 3: Publicar na internet (gratuito)

### Vercel (recomendado)
1. Crie conta em [vercel.com](https://vercel.com)
2. Instale: `npm i -g vercel`
3. Na pasta do projeto: `vercel`
4. Siga as instruções — você receberá um link tipo `https://seu-app.vercel.app`

### Netlify
1. Crie conta em [netlify.com](https://netlify.com)
2. Arraste a pasta `dist` (após `npm run build`) no site da Netlify
3. Ou conecte ao GitHub e faça deploy automático

### GitHub Pages
1. No `vite.config.ts`, adicione: `base: '/nome-do-repositorio/'`
2. Execute `npm run build`
3. Publique a pasta `dist` na branch `gh-pages` do seu repositório

---

## Opção 4: Instalar como app (PWA)

Após publicar na internet (Opção 3):

- **No Chrome (PC)**: ícone de instalação na barra de endereço → "Instalar Extrator CT-e"
- **No celular**: Menu do navegador → "Adicionar à tela inicial"

O app abrirá em janela própria, como um aplicativo.

---

## Resumo rápido

| Objetivo | Comando / Ação |
|----------|----------------|
| Testar localmente | `npm run dev` |
| Gerar arquivos finais | `npm run build` |
| Testar o build | `npm run preview` |
| Usar offline | Copie a pasta `dist` e abra `index.html` |
