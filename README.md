# Extrator CT-e

Aplicativo web para extrair dados de CT-e (Conhecimento de Transporte Eletrônico) em **PDF ou XML** e exportar para planilha Excel.

## Campos extraídos

- Número do CT-e
- Data da emissão
- Rota
- Valor do frete
- Chave de acesso
- Soma das notas
- Números das notas fiscais
- Pagador do frete
- CNPJ pagador do frete
- Placa

## Como usar

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Inicie o app:
   ```bash
   npm run dev
   ```

3. Acesse no navegador (ex.: http://localhost:5173)

4. Arraste os arquivos PDF ou XML dos CT-e ou clique para selecionar

5. Clique em **Exportar Excel** para baixar a planilha

## Build para produção

```bash
npm run build
```

Os arquivos estarão na pasta `dist`. Você pode hospedar em Vercel, Netlify ou qualquer servidor estático.

## Tecnologias

- React + TypeScript + Vite
- Tailwind CSS
- PDF.js para extrair texto de PDF
- SheetJS (xlsx) para exportar Excel

## Nota sobre PDF

A extração de dados a partir de PDF funciona por reconhecimento de padrões no texto. O layout do CT-e pode variar conforme o emissor. Se algum campo não for preenchido corretamente, o XML continua sendo a opção mais precisa.
