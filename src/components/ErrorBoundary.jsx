import React from 'react'
import { CircleAlert, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  handleReset = () => {
    if (typeof window !== 'undefined' && window.location?.reload) {
      window.location.reload()
      return
    }
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="w-full max-w-xl rounded-xl border border-border bg-card p-8 text-center shadow-sm">
            <CircleAlert className="mx-auto mb-4 size-16 text-destructive" aria-hidden />
            <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              An unexpected error occurred. Reload the window to recover.
            </p>
            <div className="flex justify-center gap-2">
              <Button onClick={this.handleReset}>
                <RefreshCw className="size-4" />
                Reload window
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error ? (
              <pre className="mt-6 overflow-auto rounded-md bg-muted p-3 text-left font-mono text-xs">
                {this.state.error.toString()}
              </pre>
            ) : null}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
