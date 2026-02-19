/**
 * Parser de XML CT-e (Conhecimento de Transporte Eletrônico)
 * Extrai os campos necessários para planilha
 */

export interface CteExtraido {
  numero: string;
  dataEmissao: string;
  rota: string;
  valorFrete: string;
  valorTotalCarga: string;  // VALOR TOTAL DA CARGA (exatamente do CT-e)
  chaveAcesso: string;
  numerosNotas: string;
  pagadorFrete: string;
  cnpjPagador: string;
  placa: string;
  erro?: string;
}

function getByLocalName(doc: Document | Element, tagName: string): Element | null {
  const list = doc.getElementsByTagName('*');
  for (let i = 0; i < list.length; i++) {
    if (list[i].localName?.toLowerCase() === tagName.toLowerCase()) {
      return list[i];
    }
  }
  return null;
}

function getAllByLocalName(parent: Element, tagName: string): Element[] {
  const result: Element[] = [];
  const list = parent.getElementsByTagName('*');
  for (let i = 0; i < list.length; i++) {
    if (list[i].localName?.toLowerCase() === tagName.toLowerCase()) {
      result.push(list[i]);
    }
  }
  return result;
}

function getText(el: Element | null): string {
  return el?.textContent?.trim() ?? '';
}

function formatarData(dhEmi: string): string {
  if (!dhEmi) return '';
  // Formato: 2024-01-15T10:30:00-03:00
  const match = dhEmi.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return dhEmi;
}

function formatarValor(v: string): string {
  if (!v) return '0,00';
  const num = parseFloat(v);
  if (isNaN(num)) return v;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function parseCteXml(xmlTexto: string): CteExtraido {
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
  };

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlTexto, 'text/xml');

    // Verificar erro de parse
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      padrao.erro = 'XML inválido ou corrompido';
      return padrao;
    }

    // infCte ou infCTe (depende da versão)
    const infCte = getByLocalName(doc, 'infCte') || getByLocalName(doc, 'infCTe');
    if (!infCte) {
      padrao.erro = 'Arquivo não parece ser um CT-e válido';
      return padrao;
    }

    // Chave de acesso (atributo Id do infCte: "CTe321606...")
    const idAttr = infCte.getAttribute('Id');
    if (idAttr && idAttr.startsWith('CTe')) {
      padrao.chaveAcesso = idAttr.replace('CTe', '');
    }

    // ide - identificação
    const ide = getByLocalName(infCte, 'ide');
    if (ide) {
      padrao.numero = getText(getByLocalName(ide, 'nCT'));
      const dhEmi = getText(getByLocalName(ide, 'dhEmi'));
      padrao.dataEmissao = formatarData(dhEmi);
    }

    // rota: deixar em branco para preenchimento manual

    // vPrest - valores
    const vPrest = getByLocalName(infCte, 'vPrest');
    if (vPrest) {
      const vFrete = getText(getByLocalName(vPrest, 'vFrete'));
      const vRec = getText(getByLocalName(vPrest, 'vRec'));
      const vTPrest = getText(getByLocalName(vPrest, 'vTPrest'));
      padrao.valorFrete = formatarValor(vFrete || vRec || vTPrest);
      if (!padrao.valorTotalCarga) padrao.valorTotalCarga = formatarValor(vTPrest || vRec);
    }

    // infCteNorm > infDoc > infNFe - notas fiscais
    const infCteNorm = getByLocalName(infCte, 'infCteNorm') || infCte;
    const infDoc = getByLocalName(infCteNorm, 'infDoc');
    if (infDoc) {
      const infNFeList = getAllByLocalName(infDoc, 'infNFe');
      const nfNumeros: string[] = [];
      let soma = 0;
      infNFeList.forEach((inf) => {
        const nNF = getText(getByLocalName(inf, 'nNF'));
        const vNF = getText(getByLocalName(inf, 'vNF'));
        if (nNF) nfNumeros.push(nNF);
        if (vNF) soma += parseFloat(vNF) || 0;
      });
      padrao.numerosNotas = nfNumeros.join(', ');
      padrao.valorTotalCarga = formatarValor(soma.toString());  // valor total da carga = soma vNF
    }

    // pagadorFrete e cnpjPagador: valores fixos (editáveis)

    // veic - placa
    const veic = getByLocalName(infCte, 'veic') || getByLocalName(infCte, 'veiculo');
    if (veic) {
      padrao.placa = getText(getByLocalName(veic, 'placa')) || getText(getByLocalName(veic, 'placaVeic'));
    }
  } catch (e) {
    padrao.erro = e instanceof Error ? e.message : 'Erro ao processar XML';
  }

  return padrao;
}
