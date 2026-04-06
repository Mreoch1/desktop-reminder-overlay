import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

type State = { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message || 'Something went wrong.' }
  }

  componentDidCatch(err: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary', err, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="app-error-fallback">
          <h1 className="app-error-fallback__title">Something broke</h1>
          <p className="app-error-fallback__msg">{this.state.message}</p>
          <button
            type="button"
            className="app-error-fallback__btn"
            onClick={() => this.setState({ hasError: false, message: '' })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
