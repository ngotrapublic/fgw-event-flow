import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary - Phase 4 Step 4A
 * Catches React render errors and displays a fallback UI.
 * Logs error details for production debugging.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Structured logging for production debugging (no sensitive data)
        console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            message: 'UI_CRASH',
            errorName: error?.name,
            errorMessage: error?.message,
            componentStack: errorInfo?.componentStack?.slice(0, 500) // Truncate for safety
        }));

        this.setState({ error, errorInfo });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-2xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-md w-full text-center">
                        <div className="w-16 h-16 bg-rose-100 rounded-xl flex items-center justify-center mx-auto mb-6 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <AlertTriangle size={32} className="text-rose-600" />
                        </div>
                        <h1 className="text-2xl font-black text-black uppercase tracking-tight mb-2">
                            Oops! Something went wrong
                        </h1>
                        <p className="text-slate-500 font-medium mb-6">
                            An unexpected error occurred. Our team has been notified.
                        </p>
                        <button
                            onClick={this.handleRetry}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-black uppercase tracking-wider rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(79,70,229,0.5)] hover:shadow-[2px_2px_0px_0px_rgba(79,70,229,0.5)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                        >
                            <RefreshCw size={18} />
                            Reload App
                        </button>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="text-xs font-bold text-slate-400 cursor-pointer">
                                    Developer Details
                                </summary>
                                <pre className="mt-2 p-3 bg-slate-100 rounded-lg text-xs text-slate-600 overflow-auto max-h-40">
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
