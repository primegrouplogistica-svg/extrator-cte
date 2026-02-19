import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
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

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex items-center justify-center">
          <div className="max-w-md bg-slate-800 rounded-xl p-6 border border-slate-600">
            <h1 className="text-xl font-bold text-red-400 mb-2">Algo deu errado</h1>
            <p className="text-slate-300 text-sm mb-4">
              Ocorreu um erro ao filtrar ou exibir os dados. Tente limpar o filtro de datas ou recarregar a página.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium"
            >
              Recarregar página
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
