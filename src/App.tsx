import { useState, useCallback, useMemo, useRef } from 'react'
import { parseCteXml, type CteExtraido } from './utils/parseCte'
import { extrairTextoDoPdf, parseCtePdf } from './utils/parseCtePdf'
import ExcelJS from 'exceljs'
import './App.css'

function parseDataEmissao(str: string): Date | null {
  if (!str) return null
  const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!m) return null
  const [, d, mo, y] = m
  const dt = new Date(parseInt(y, 10), parseInt(mo, 10) - 1, parseInt(d, 10))
  return isNaN(dt.getTime()) ? null : dt
}

function parseValorFrete(str: string): number {
  if (!str) return 0
  const limpo = str.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(limpo)
  return isNaN(n) ? 0 : n
}

function formatarValorFrete(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const CAMPOS: { key: keyof CteExtraido; label: string; mono?: boolean; editavel?: boolean }[] = [
  { key: 'numero', label: 'Número do CT-e' },
  { key: 'dataEmissao', label: 'Data da Emissão' },
  { key: 'rota', label: 'Rota', editavel: true },
  { key: 'valorFrete', label: 'Valor do Frete' },
  { key: 'valorTotalCarga', label: 'Valor Total da Carga' },
  { key: 'chaveAcesso', label: 'Chave de Acesso', mono: true },
  { key: 'numerosNotas', label: 'Números das Notas Fiscais' },
  { key: 'pagadorFrete', label: 'Pagador do Frete', editavel: true },
  { key: 'cnpjPagador', label: 'CNPJ Pagador do Frete', mono: true, editavel: true },
  { key: 'placa', label: 'Placa' },
]

function App() {
  const [dados, setDados] = useState<CteExtraido[]>([])
  const [erro, setErro] = useState('')
  const [visualizacao, setVisualizacao] = useState<'cards' | 'tabela'>('cards')
  const [dataInicial, setDataInicial] = useState('')
  const [dataFinal, setDataFinal] = useState('')
  const inputArquivoRef = useRef<HTMLInputElement>(null)

  const dadosFiltrados = useMemo(() => {
    try {
      if (!dataInicial && !dataFinal) return dados
      const di = dataInicial && dataInicial.length >= 10 ? new Date(dataInicial + 'T00:00:00') : null
      const df = dataFinal && dataFinal.length >= 10 ? new Date(dataFinal + 'T23:59:59') : null
      if ((di && isNaN(di.getTime())) || (df && isNaN(df.getTime()))) return dados
      return dados.filter((row) => {
        const dt = parseDataEmissao(row.dataEmissao)
        if (!dt || isNaN(dt.getTime())) return true
        if (di && dt < di) return false
        if (df && dt > df) return false
        return true
      })
    } catch {
      return dados
    }
  }, [dados, dataInicial, dataFinal])

  const totalFrete = useMemo(() => {
    try {
      return dadosFiltrados.reduce((acc, row) => acc + parseValorFrete(row.valorFrete), 0)
    } catch {
      return 0
    }
  }, [dadosFiltrados])

  const processarArquivos = useCallback(async (files: FileList | null) => {
    if (!files?.length) return
    setErro('')
    const erros: string[] = []

    const promessas = Array.from(files).map(
      async (file): Promise<{ ok: CteExtraido | null; erro: string | null }> => {
        const nome = file.name.toLowerCase()
        const isXml = nome.endsWith('.xml')
        const isPdf = nome.endsWith('.pdf')

        if (!isXml && !isPdf) {
          return { ok: null, erro: `${file.name}: use arquivo XML ou PDF` }
        }

        try {
          if (isXml) {
            const texto = await new Promise<string>((res, rej) => {
              const r = new FileReader()
              r.onload = () => res(r.result as string)
              r.onerror = rej
              r.readAsText(file, 'UTF-8')
            })
            const extraido = parseCteXml(texto)
            if (extraido.erro) return { ok: null, erro: `${file.name}: ${extraido.erro}` }
            return { ok: extraido, erro: null }
          } else {
            const texto = await extrairTextoDoPdf(file)
            const extraido = parseCtePdf(texto)
            if (extraido.erro) return { ok: null, erro: `${file.name}: ${extraido.erro}` }
            return { ok: extraido, erro: null }
          }
        } catch (e) {
          return { ok: null, erro: `${file.name}: ${e instanceof Error ? e.message : 'Erro ao processar'}` }
        }
      }
    )

    const resultados = await Promise.all(promessas)
    const novos = resultados.map((r) => r.ok).filter((ok): ok is CteExtraido => ok !== null)
    resultados.forEach((r) => {
      if (r.erro) erros.push(r.erro)
    })

    setDados((prev) => [...prev, ...novos])
    if (erros.length) setErro(erros.join('\n'))
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processarArquivos(e.target.files)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    processarArquivos(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()

  const exportarExcel = async () => {
    if (!dadosFiltrados.length) return
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('CT-e', { views: [{ state: 'frozen', ySplit: 1 }] })
    const idxValorFrete = CAMPOS.findIndex((c) => c.key === 'valorFrete')

    const rows: (string | number)[][] = [
      CAMPOS.map((c) => c.label),
      ...dadosFiltrados.map((c) => CAMPOS.map((campo) => String(c[campo.key] ?? ''))),
      CAMPOS.map((_, i) => (i === idxValorFrete ? formatarValorFrete(totalFrete) : i === 0 ? 'TOTAL' : '')),
    ]

    ws.addRows(rows)

    const numCols = CAMPOS.length
    const larguras: number[] = []
    for (let c = 0; c < numCols; c++) {
      let max = CAMPOS[c].label.length
      for (let r = 1; r < rows.length; r++) {
        const len = String(rows[r][c] ?? '').length
        if (len > max) max = len
      }
      larguras[c] = Math.min(Math.max(max + 2, 12), 55)
    }
    for (let i = 0; i < numCols; i++) {
      ws.getColumn(i + 1).width = larguras[i]
    }

    ws.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = { wrapText: true, vertical: 'top' }
      })
    })

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cte_exportado_${new Date().toISOString().slice(0, 10)}${(dataInicial || dataFinal) ? '_periodo' : ''}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportarPDF = () => {
    if (!dadosFiltrados.length) return
    const janela = window.open('', '_blank')
    if (!janela) {
      setErro('Permita pop-ups para salvar como PDF')
      return
    }
    const periodo = dataInicial || dataFinal ? `Período: ${dataInicial || '...'} a ${dataFinal || '...'}` : ''
    const idxValorFrete = CAMPOS.findIndex((c) => c.key === 'valorFrete')
    const ths = CAMPOS.map((c) => c.label).map((l) => `<th style="border:1px solid #334155;padding:6px;background:#1e3a5f;color:white;text-align:left">${l}</th>`).join('')
    const rows = dadosFiltrados
      .map((r) => CAMPOS.map((c) => `<td style="border:1px solid #334155;padding:4px">${String(r[c.key] ?? '').replace(/</g, '&lt;')}</td>`).join(''))
      .map((tr) => `<tr>${tr}</tr>`)
      .join('')
    const totalCells = CAMPOS.map((_, i) =>
      i === idxValorFrete
        ? `<td style="border:1px solid #334155;padding:4px;background:#1e293b;font-weight:bold">${formatarValorFrete(totalFrete)}</td>`
        : i === 0
          ? `<td style="border:1px solid #334155;padding:4px;background:#1e293b;font-weight:bold">TOTAL</td>`
          : `<td style="border:1px solid #334155;padding:4px;background:#1e293b"></td>`
    ).join('')
    janela.document.write(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>CT-e Export</title>
          <style>body{font-family:sans-serif;padding:20px;font-size:11px}
          table{border-collapse:collapse;width:100%;margin-top:10px}
          @media print{body{margin:0}}</style>
        </head>
        <body>
          <h1>Extrator CT-e - Relatório</h1>
          ${periodo ? `<p>${periodo}</p>` : ''}
          <table><thead><tr>${ths}</tr></thead><tbody>${rows}</tbody><tfoot><tr>${totalCells}</tr></tfoot></table>
        </body>
      </html>
    `)
    janela.document.close()
    janela.focus()
    setTimeout(() => janela.print(), 300)
  }

  const limpar = () => {
    setDados([])
    setErro('')
  }

  const removerLinha = (i: number) => {
    setDados((prev) => prev.filter((_, idx) => idx !== i))
  }

  const atualizarCampo = (i: number, campo: keyof CteExtraido, valor: string) => {
    setDados((prev) => prev.map((r, idx) => (idx === i ? { ...r, [campo]: valor } : r)))
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6">
      <header className="max-w-5xl mx-auto mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-blue-400">
          Extrator CT-e
        </h1>
        <p className="text-slate-400 mt-1">
          Extraia dados dos CT-e (PDF ou XML) e exporte para planilha
        </p>
      </header>

      <main className="max-w-5xl mx-auto space-y-4">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-blue-500 transition-colors bg-slate-900/50"
        >
          <input
            ref={inputArquivoRef}
            type="file"
            accept=".xml,.pdf"
            multiple
            onChange={handleInputChange}
            id="file-cte"
            className="hidden"
          />
          <label htmlFor="file-cte" className="cursor-pointer block">
            <span className="text-5xl">📄</span>
            <p className="mt-2 text-slate-300">
              Arraste arquivos PDF ou XML aqui ou clique para selecionar
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Um ou vários CT-e por vez — os novos serão somados à planilha
            </p>
          </label>
        </div>

        {erro && (
          <div className="bg-amber-900/50 border border-amber-600 rounded-lg p-3 text-amber-200 text-sm whitespace-pre-wrap">
            {erro}
          </div>
        )}

        {dados.length > 0 && (
          <>
            <div className="flex flex-wrap gap-4 items-end p-4 bg-slate-800/60 rounded-xl border border-slate-700">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                  <label className="block text-xs text-slate-500 uppercase tracking-wide">Data inicial</label>
                  <input
                    type="date"
                    value={dataInicial}
                    onChange={(e) => setDataInicial(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs text-slate-500 uppercase tracking-wide">Data final</label>
                  <input
                    type="date"
                    value={dataFinal}
                    onChange={(e) => setDataFinal(e.target.value)}
                    className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                {(dataInicial || dataFinal) && (
                  <button
                    onClick={() => { setDataInicial(''); setDataFinal('') }}
                    className="px-3 py-2 text-slate-400 hover:text-slate-200 text-sm"
                  >
                    Limpar filtro
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => inputArquivoRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium"
                  title="Adicionar mais CT-e à planilha"
                >
                  + Adicionar CT-e
                </button>
                <button
                  onClick={exportarExcel}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium"
                >
                  Exportar Excel
                </button>
                <button
                  onClick={exportarPDF}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium"
                >
                  Exportar PDF
                </button>
                <button
                  onClick={limpar}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium"
                >
                  Limpar tudo
                </button>
              </div>
              <div className="flex gap-2 bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setVisualizacao('cards')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    visualizacao === 'cards' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setVisualizacao('tabela')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    visualizacao === 'tabela' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tabela
                </button>
              </div>
            </div>

            <p className="text-slate-500 text-sm">
              {dadosFiltrados.length} de {dados.length} CT-e(s) na planilha
              {' — '}
              <span className="text-slate-300 font-medium">Total frete: R$ {formatarValorFrete(totalFrete)}</span>
              {(dataInicial || dataFinal) && ' (filtrado por data)'}
              {' — '}
              <button
                type="button"
                onClick={() => inputArquivoRef.current?.click()}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                adicionar mais
              </button>
            </p>

            {visualizacao === 'cards' ? (
              <div className="space-y-4">
                {dadosFiltrados.map((row, i) => {
                  const idxOrig = dados.indexOf(row)
                  return (
                  <div
                    key={i}
                    className="bg-slate-800/80 rounded-xl border border-slate-700 overflow-hidden"
                  >
                    <div className="bg-slate-700/80 px-4 py-3 flex items-center justify-between">
                      <span className="font-semibold text-blue-300">
                        CT-e #{i + 1} {row.numero && `• Nº ${row.numero}`}
                      </span>
                      <button
                        onClick={() => removerLinha(idxOrig)}
                        className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-900/30"
                        title="Remover"
                      >
                        ✕ Remover
                      </button>
                    </div>
                    <div className="p-4 grid gap-3 sm:grid-cols-1 md:grid-cols-2">
                      {CAMPOS.map(({ key, label, mono, editavel }) => {
                        const valor = (row[key] as string) ?? ''
                        return (
                          <div key={key} className="space-y-1">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
                            {editavel ? (
                              <input
                                type="text"
                                value={valor}
                                onChange={(e) => atualizarCampo(idxOrig, key, e.target.value)}
                                placeholder={`Digite ${label.toLowerCase()}...`}
                                className={`w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none ${mono ? 'font-mono text-sm' : ''}`}
                              />
                            ) : (
                              <p
                                className={`text-slate-200 break-words ${mono ? 'font-mono text-sm' : ''}`}
                                title={valor}
                              >
                                {valor || '—'}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  )
                })}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800">
                      <th className="text-left p-3 sticky left-0 bg-slate-800">#</th>
                      {CAMPOS.map((c) => (
                        <th key={c.key} className="text-left p-3 whitespace-nowrap">
                          {c.label}
                        </th>
                      ))}
                      <th className="p-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosFiltrados.map((row, i) => {
                      const idxOrig = dados.indexOf(row)
                      return (
                      <tr key={i} className="border-t border-slate-700 hover:bg-slate-800/50">
                        <td className="p-3 sticky left-0 bg-slate-900/95 font-medium">{i + 1}</td>
                        {CAMPOS.map(({ key, mono, editavel }) => {
                          const valor = (row[key] as string) ?? ''
                          return (
                            <td
                              key={key}
                              className={`p-3 max-w-[220px] break-words align-top ${mono ? 'font-mono text-xs' : ''}`}
                            >
                              {editavel ? (
                                <input
                                  type="text"
                                  value={valor}
                                  onChange={(e) => atualizarCampo(idxOrig, key, e.target.value)}
                                  placeholder="..."
                                  className={`w-full min-w-[100px] px-2 py-1.5 bg-slate-900 border border-slate-600 rounded text-slate-200 text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none ${mono ? 'font-mono' : ''}`}
                                />
                              ) : (
                                <span title={valor}>{(row[key] as string) || '—'}</span>
                              )}
                            </td>
                          )
                        })}
                        <td className="p-2 align-top">
                          <button
                            onClick={() => removerLinha(idxOrig)}
                            className="text-red-400 hover:text-red-300 p-1.5"
                            title="Remover"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    )})}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-600 bg-slate-800/80 font-semibold">
                      <td className="p-3 sticky left-0 bg-slate-800/80">TOTAL</td>
                      {CAMPOS.map(({ key }) => (
                        <td key={key} className="p-3">
                          {key === 'valorFrete' ? formatarValorFrete(totalFrete) : ''}
                        </td>
                      ))}
                      <td className="p-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App
