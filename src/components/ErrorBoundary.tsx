import { Component, ReactNode } from 'react'
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed
    ? <div className="card mx-auto mt-24 max-w-md text-center"><h1>Something went wrong</h1><p className="my-2 text-sm text-slate-500">The page hit an unexpected error. Your saved data is not affected.</p><button className="btn" onClick={() => location.reload()}>Reload</button></div>
    : this.props.children }
}
