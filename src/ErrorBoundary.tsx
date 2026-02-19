import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  onLimparFiltro?: () => void
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Extrator CT-e] Erro capturado:', error, errorInfo)
  }

  handleLimparFiltro = () => {
    this.props.onLimparFiltro?.()
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex items-center justify-center">
          <div className="max-w-md bg-slate-800 rounded-xl p-6 border border-slate-600">
            <h1 className="text-xl font-bold text-red-400 mb-2">Algo deu errado</h1>
            <p className="text-slate-300 text-sm mb-4">
              Ocorreu um erro ao filtrar ou exibir os dados. Tente limpar o filtro de datas ou recarregar a página.
            </p>
            <div className="flex flex-wrap gap-2">
              {this.props.onLimparFiltro && (
                <button
                  onClick={this.handleLimparFiltro}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-medium"
                >
                  Limpar filtro e tentar novamente
                </button>
              )}
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium"
              >
                Recarregar página
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
