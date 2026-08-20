"use client";

import { FileText, Image as ImageIcon, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface FileUploadProps {
  label: string;
  hint?: string;
  accept: string;
  onSelect: (file: File) => void;
  error?: string;
  progress?: number | null;
  selectedFileName?: string | null;
  onRemove?: () => void;
  disabled?: boolean;
}

export function FileUpload({
  label,
  hint,
  accept,
  onSelect,
  error,
  progress,
  selectedFileName,
  onRemove,
  disabled,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    onSelect(files[0]);
  }

  if (selectedFileName) {
    const isImage = /\.(jpe?g|png)$/i.test(selectedFileName);
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-neutral-800">{label}</span>
        <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5">
          {isImage ? <ImageIcon className="h-5 w-5 text-brand-600" /> : <FileText className="h-5 w-5 text-brand-600" />}
          <span className="flex-1 truncate text-sm text-neutral-700">{selectedFileName}</span>
          {typeof progress === "number" && progress < 100 ? (
            <span className="text-xs text-neutral-500">{progress}%</span>
          ) : onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove file"
              className="focus-ring rounded p-1 text-neutral-400 hover:text-neutral-700"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {typeof progress === "number" && progress < 100 && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
            <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        {error && <p className="text-xs text-error" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-neutral-800">{label}</span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={cn(
          "focus-ring flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
          dragOver ? "border-brand-500 bg-brand-50" : "border-neutral-300 hover:border-brand-400",
          disabled && "cursor-not-allowed opacity-60",
          error && "border-error",
        )}
      >
        <UploadCloud className="h-7 w-7 text-neutral-400" />
        <p className="text-sm text-neutral-600">
          <span className="font-medium text-brand-700">Click to upload</span> or drag and drop
        </p>
        {hint && <p className="text-xs text-neutral-400">{hint}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && <p className="text-xs text-error" role="alert">{error}</p>}
    </div>
  );
}
