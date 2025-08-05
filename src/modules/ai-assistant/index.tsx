'use client';

import React, { Suspense, lazy, useEffect, useState } from 'react';
import { defaultAIAssistantConfig } from './types';

// Lazy load components for better performance
const AIAssistantChat = lazy(() => import('./components/AIAssistantChat').then(module => ({ default: module.AIAssistantChat })));

interface AIAssistantModuleProps {
  config?: Partial<typeof defaultAIAssistantConfig>;
  className?: string;
  showHeader?: boolean;
  showSettings?: boolean;
  // Enhanced props
  enablePerformanceMonitoring?: boolean;
  enableErrorBoundary?: boolean;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

// Error Boundary Component
class AIAssistantErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AIAssistant Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-[400px] bg-red-50 border border-red-200 rounded-lg">
          <div className="text-center">
            <div className="text-red-600 text-2xl mb-2">⚠️</div>
            <h3 className="text-red-800 font-semibold mb-2">Đã xảy ra lỗi</h3>
            <p className="text-red-600 text-sm mb-4">AI Assistant tạm thời không khả dụng</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Performance Monitoring Hook
const usePerformanceMonitoring = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      if (duration > 1000) {
        console.warn(`AIAssistant took ${duration.toFixed(2)}ms to load`);
      }
    };
  }, [enabled]);
};

// Default Loading Fallback
const DefaultLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px] bg-gradient-to-br from-blue-50 to-purple-50">
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto mb-4">
        <div className="absolute inset-0 rounded-full border-4 border-blue-200 animate-pulse"></div>
        <div className="absolute inset-2 rounded-full border-4 border-blue-400 animate-spin"></div>
        <div className="absolute inset-4 rounded-full bg-blue-500 animate-pulse"></div>
      </div>
      <h3 className="text-blue-800 font-semibold mb-2">Đang tải AI Assistant...</h3>
      <p className="text-blue-600 text-sm">Vui lòng chờ trong giây lát</p>
    </div>
  </div>
);

// Default Error Fallback
const DefaultErrorFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px] bg-gradient-to-br from-red-50 to-pink-50">
    <div className="text-center">
      <div className="text-red-600 text-4xl mb-4">🤖</div>
      <h3 className="text-red-800 font-semibold mb-2">AI Assistant không khả dụng</h3>
      <p className="text-red-600 text-sm mb-4">Vui lòng thử lại sau</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Tải lại trang
      </button>
    </div>
  </div>
);

const AIAssistantModule: React.FC<AIAssistantModuleProps> = ({
  config,
  className,
  enablePerformanceMonitoring = true,
  enableErrorBoundary = true,
  loadingFallback = <DefaultLoadingFallback />,
  errorFallback = <DefaultErrorFallback />,
}) => {
  const [isClient, setIsClient] = useState(false);

  // Performance monitoring
  usePerformanceMonitoring(enablePerformanceMonitoring);

  // Client-side only rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return loadingFallback;
  }

  const moduleContent = (
    <Suspense fallback={loadingFallback}>
      <AIAssistantChat
        config={config}
        className={className}
      />
    </Suspense>
  );

  if (enableErrorBoundary) {
    return (
      <AIAssistantErrorBoundary fallback={errorFallback}>
        {moduleContent}
      </AIAssistantErrorBoundary>
    );
  }

  return moduleContent;
};

export default AIAssistantModule;

// Export all components and hooks
export { BotAvatar, AIAssistantChat } from './components';
export * from './types';

// Export services
export * from '@/lib/axios/call-api-dify-realtime-TTS';

// Export enhanced utilities
export { AIAssistantErrorBoundary, DefaultLoadingFallback, DefaultErrorFallback };