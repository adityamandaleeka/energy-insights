import React, { useCallback } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  compact?: boolean;
}

export function FileUpload({ onFileSelect, isLoading, compact = false }: FileUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.name.endsWith('.csv')) {
          onFileSelect(file);
        }
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  return (
    <div
      className={`border border-dashed rounded transition-colors cursor-pointer
        ${compact ? 'p-4' : 'p-8'}
        ${isDragging 
          ? 'border-violet-400 bg-violet-100 dark:border-violet-500 dark:bg-violet-800/50' 
          : 'border-violet-300 dark:border-violet-600 hover:border-violet-400 dark:hover:border-violet-500'
        }
        ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept=".csv"
        onChange={handleFileInput}
        className="hidden"
      />
      
      <div className="text-center">
        {isLoading ? (
          <p className="text-sm text-violet-500 dark:text-violet-400">Processing...</p>
        ) : compact ? (
          <p className="text-sm text-violet-700 dark:text-violet-300">
            Drop CSV or <span className="underline">browse</span>
          </p>
        ) : (
          <>
            <p className="text-sm text-violet-700 dark:text-violet-300">
              Drop your CSV file here or <span className="underline">browse</span>
            </p>
            <p className="text-xs text-violet-500 dark:text-violet-400 mt-2">
              Electric usage CSV only
            </p>
          </>
        )}
      </div>
    </div>
  );
}
