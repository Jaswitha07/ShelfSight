import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading...', size = 'md' }) {
  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
      <Loader2 className={`${sizeMap[size]} animate-spin text-blue-600 mb-2`} />
      {message && <p className="text-sm font-medium">{message}</p>}
    </div>
  );
}
