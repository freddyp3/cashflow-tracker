import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Error boundaries must be class components — there is no hook
// equivalent of componentDidCatch/getDerivedStateFromError.
export default class GlobeErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Globe failed to render:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[600px] flex-col items-center justify-center text-center">
          <p className="text-gray-700 font-medium">
            The globe couldn&apos;t be displayed.
          </p>
          <p className="text-gray-500 text-sm mt-2 max-w-md">
            This usually means your browser has graphics acceleration disabled.
            Try enabling &quot;Use graphics acceleration&quot; in your browser
            settings and reloading the page.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
