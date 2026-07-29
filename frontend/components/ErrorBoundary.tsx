'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 m-4 bg-red-50 border-2 border-red-200 rounded-2xl flex flex-col items-center justify-center text-center max-w-2xl mx-auto animate-in zoom-in-95">
          <h2 className="text-xl font-bold text-red-600 mb-2">সাময়িক সমস্যা! (UI Crash)</h2>
          <p className="text-red-500 mb-4 text-sm font-medium">
            একটি অপ্রত্যাশিত সমস্যা হয়েছে। অনুগ্রহ করে নিচের মেসেজটি স্ক্রিনশট নিয়ে দিন:
          </p>
          <div className="bg-white p-4 rounded-xl border border-red-100 text-left w-full overflow-auto max-h-[300px]">
            <code className="text-xs text-red-800 break-all">
              {this.state.error?.message}
              <br/>
              {this.state.error?.stack?.substring(0, 500)}
            </code>
          </div>
          <button
            className="mt-6 px-6 py-2 bg-red-600 text-white rounded-xl font-bold"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            রিলোড করুন
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
