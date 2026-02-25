/**
 * Parser de PDF do CT-e (Conhecimento de Transporte Eletrônico)
 * Extrai texto do PDF e identifica os campos por padrões
 */

import * as pdfjsLib from 'pdfjs-dist'
import type { CteExtraido } from './parseCte'

// Worker do PDF.js: arquivo local no public/ (evita falhas de CDN/CORS em produção/Vercel)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

export async function extrairTextoDoPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise
  let textoCompleto = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    textoCompleto += pageText + '\n'
  }

  return textoCompleto
}

function formatarValor(v: string): string {
  if (!v) return '0,00'
  const num = parseFloat(v.replace(/\./g, '').replace(',', '.'))
  if (isNaN(num)) return v
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function parseCtePdf(texto: string): CteExtraido {
  const t = texto.replace(/\s+/g, ' ')

  const padrao: CteExtraido = {
    numero: '',
    dataEmissao: '',
    rota: '',
    valorFrete: '',
    valorTotalCarga: '',
    chaveAcesso: '',
    numerosNotas: '',
    pagadorFrete: 'L L E FERRAGENS LTDA KING OURO',
    cnpjPagador: '05.953.543/0002-28',
    placa: '',
  }

  // Chave de acesso: primeira chave de 44 dígitos (CT-e)
  const todasChaves = t.match(/\b\d{44}\b/g) || []
  const chaveCte = todasChaves.find((c) => c.substring(20, 22) === '57')
  if (chaveCte) {
    padrao.chaveAcesso = chaveCte
    padrao.numero = chaveCte.substring(25, 34).replace(/^0+/, '') || '0'
  } else if (todasChaves[0]) {
    padrao.chaveAcesso = todasChaves[0]
  }

  // Fallback número: se não extraiu da chave, tentar DACTE
  if (!padrao.numero) {
    const numMatch = t.match(/MODELO\s+57\s+S[EÉ]RIE\s+\d+\s+N[ÚU]MERO\s*(\d{3,12})\b/i) ||
      t.match(/DACTE[\s\S]{0,200}?N[ÚU]MERO\s*(\d{3,12})\b/i) ||
      t.match(/57\s+\d{3}\s+(\d{3,9})\b/) ||
      t.match(/(?:N[º°]|Número|nCT|nº)\s*[:\s]*(\d{6,12})/i)
    if (numMatch) padrao.numero = numMatch[1].replace(/^0+/, '') || numMatch[1]
  }

  // Data: DD/MM/YYYY ou DD-MM-YYYY
  const dataMatch = t.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/)
  if (dataMatch) padrao.dataEmissao = `${dataMatch[1]}/${dataMatch[2]}/${dataMatch[3]}`

  // Valor Total da Carga: exatamente do CT-e (VALOR TOTAL DA CARGA - R$ 9.949,39)
  // Regex flexível: permite texto entre label e valor (layout em tabela no PDF)
  const valorCargaMatch = t.match(/(?:VALOR\s+TOTAL\s+DA\s+CARGA|Valor\s+Total\s+da\s+Carga)[\s\S]{0,80}?R?\$?\s*([\d.,]+)/i) ||
    t.match(/(?:VALOR\s+TOTAL\s+DA\s+CARGA|Valor\s+Total\s+da\s+Carga)[:\s]*([\d.,]+)/i)
  if (valorCargaMatch) padrao.valorTotalCarga = formatarValor(valorCargaMatch[1])

  // Valor do frete: "FRETE VALOR" (Componentes da Prestação) > R$ 615,00
  const freteValorMatch = t.match(/(?:FRETE\s+VALOR|Frete\s+Valor)[\s\S]{0,80}?R?\$?\s*([\d.,]+)/i)
  const valorFreteMatch = t.match(/(?:Valor\s+do\s+Frete|vTPrest|vFrete)[\s\S]{0,80}?R?\$?\s*([\d.,]+)/i)
  if (freteValorMatch) {
    padrao.valorFrete = formatarValor(freteValorMatch[1])
  } else if (valorFreteMatch) {
    padrao.valorFrete = formatarValor(valorFreteMatch[1])
  } else {
    const r$Match = t.match(/R\$\s*([\d.,]+)/)
    if (r$Match) padrao.valorFrete = formatarValor(r$Match[1])
  }

  // Se Valor Total da Carga vazio mas temos valor (CT-e com único valor principal), usar
  if (!padrao.valorTotalCarga && padrao.valorFrete) {
    padrao.valorTotalCarga = padrao.valorFrete
  }

  // Placa: ABC1D23 ou ABC-1D23 ou ABC 1D23
  const placaMatch = t.match(/\b([A-Z]{3}[\s\-]?\d[A-Z]\d{2})\b/i) ||
    t.match(/(?:Placa|placa)[:\s]*([A-Z]{3}[\s\-]?\d[A-Z]\d{2})/i)
  if (placaMatch) padrao.placa = placaMatch[1].replace(/\s/g, '').toUpperCase()

  // Pagador do frete e CNPJ: valores fixos (editáveis)

  // Números das NF-e: coluna NÚMERO da tabela "DOCUMENTOS ORIGINÁRIOS"
  // Estratégia: extrair das chaves NF-e (posições 25-33 = número da NF no padrão SEFAZ)
  const nfNumeros: string[] = []
  const idxDoc = t.search(/DOCUMENTOS\s+ORIGIN[ÁA]RIOS|CHAVE\s+DE\s+ACESSO/i)
  const textoDoc = idxDoc >= 0 ? t.substring(idxDoc) : t
  const chaves44 = textoDoc.match(/\b\d{44}\b/g) || []
  chaves44.forEach((chave) => {
    if (chave.length >= 34 && chave.substring(20, 22) === '55') {
      const nf = chave.substring(25, 34)
      if (/^\d{9}$/.test(nf)) nfNumeros.push(nf)
    }
  })
  if (nfNumeros.length) padrao.numerosNotas = [...new Set(nfNumeros)].join(', ')

  // rota: deixar em branco para preenchimento manual

  // Validar se parece CT-e (chave ou número)
  if (!padrao.chaveAcesso && !padrao.numero && !padrao.valorFrete) {
    padrao.erro = 'Não foi possível identificar dados de CT-e no PDF. O layout pode ser incompatível.'
  }

  return padrao
}
