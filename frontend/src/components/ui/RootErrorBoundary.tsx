import { Component } from 'react';
import type { ReactNode } from 'react';
import ErrorState from './ErrorState';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Error boundaries must be class components — there is no hook
// equivalent of componentDidCatch/getDerivedStateFromError.
export default class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('App failed to render:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
          <div className="w-full max-w-lg">
            <ErrorState
              message="The app hit an unexpected error."
              onRetry={() => window.location.reload()}
            />
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
