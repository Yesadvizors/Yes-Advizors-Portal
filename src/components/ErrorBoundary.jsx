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
        <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20, background:'#f9fafb' }}>
          <div style={{ textAlign:'center', maxWidth:420 }}>
            <div style={{ fontSize:52, marginBottom:16 }}>⚠️</div>
            <h2 style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Something went wrong</h2>
            <p style={{ color:'#6B7280', marginBottom:24, lineHeight:1.6 }}>The portal encountered an unexpected error. Your data is safe — please refresh the page to continue.</p>
            <button onClick={() => { this.setState({ hasError:false }); window.location.reload() }}
              style={{ padding:'10px 22px', background:'#0D7A53', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:600, marginRight:10 }}>
              🔄 Refresh Page
            </button>
            <button onClick={() => this.setState({ hasError:false })}
              style={{ padding:'10px 22px', background:'#fff', color:'#6B7280', border:'1px solid #D1D5DB', borderRadius:8, cursor:'pointer', fontSize:14 }}>
              Try Again
            </button>
            <details style={{ marginTop:20, textAlign:'left', fontSize:12, color:'#9CA3AF' }}>
              <summary style={{ cursor:'pointer' }}>Error details</summary>
              <pre style={{ overflow:'auto', padding:10, background:'#f3f4f6', borderRadius:6, marginTop:8, fontSize:11 }}>
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
