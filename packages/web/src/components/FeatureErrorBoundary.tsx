"use client";

import { Component, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  featureId: string;
  featureName: string;
  onError: (featureId: string, error: Error) => void;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError(this.props.featureId, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-700">
                Fitur &ldquo;{this.props.featureName}&rdquo; mengalami error
              </p>
              <p className="text-[11px] text-red-500 mt-1">
                {this.state.error?.message || "Terjadi kesalahan yang tidak diketahui"}
              </p>
              <p className="text-[10px] text-red-400 mt-1">
                Fitur akan dinonaktifkan secara otomatis jika error terus terjadi.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
