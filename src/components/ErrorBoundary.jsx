import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('Portal error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20, background:'var(--ds-bg)' }}>
          <div style={{ textAlign:'center', maxWidth:420 }}>
            <div style={{ fontSize:52, marginBottom:16 }}>⚠️</div>
            <h2 style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Something went wrong</h2>
            <p style={{ color:'var(--ds-text-muted)', marginBottom:24, lineHeight:1.6 }}>The portal encountered an unexpected error. Your data is safe — please refresh the page to continue.</p>
            <button onClick={() => { this.setState({ hasError:false }); window.location.reload() }}
              style={{ padding:'10px 22px', background:'var(--ds-brand)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:600, marginRight:10 }}>
              🔄 Refresh Page
            </button>
            <button onClick={() => this.setState({ hasError:false })}
              style={{ padding:'10px 22px', background:'var(--ds-surface)', color:'var(--ds-text-muted)', border:'1px solid var(--ds-border-strong)', borderRadius:8, cursor:'pointer', fontSize:14 }}>
              Try Again
            </button>
            <details style={{ marginTop:20, textAlign:'left', fontSize:12, color:'var(--ds-text-faint)' }}>
              <summary style={{ cursor:'pointer' }}>Error details</summary>
              <pre style={{ overflow:'auto', padding:10, background:'var(--ds-surface-3)', borderRadius:6, marginTop:8, fontSize:11 }}>
                {this.state.error?.message}
              </pre>
            </details>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
