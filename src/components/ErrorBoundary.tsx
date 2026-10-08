import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** A static node (e.g. App.tsx's usage), or a function given the caught error to render its message. */
  fallback: ReactNode | ((error: Error) => ReactNode)
}

interface State {
  error: Error | null
}

/** Class component required — React has no hook equivalent for catching render errors in children. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error caught by boundary', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return typeof this.props.fallback === 'function' ? this.props.fallback(this.state.error) : this.props.fallback
  }
}
