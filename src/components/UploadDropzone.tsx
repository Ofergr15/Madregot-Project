"use client";

import { useCallback, useRef, useState } from "react";

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled: boolean;
  processing?: boolean;
}

export default function UploadDropzone({
  onFilesSelected,
  disabled,
  processing,
}: UploadDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [picking, setPicking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [disabled, onFilesSelected]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    if (disabled || picking) return;
    setPicking(true);
    fileInputRef.current?.click();
  }, [disabled, picking]);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      setPicking(false);
      if (files.length > 0) {
        onFilesSelected(files);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onFilesSelected]
  );

  const showProcessing = picking || processing;

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
        disabled
          ? "border-[#dadce0] bg-[#f8f9fa] cursor-not-allowed opacity-60"
          : showProcessing
          ? "border-[#1a73e8] bg-[#e8f0fe]"
          : dragOver
          ? "border-[#1a73e8] bg-[#e8f0fe]"
          : "border-[#dadce0] hover:border-[#1a73e8] hover:bg-[#f8f9fa] cursor-pointer"
      }`}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileInput}
        disabled={disabled}
      />

      {showProcessing ? (
        <>
          <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-[#d3e3fd]">
            <svg className="w-6 h-6 text-[#1a73e8] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-[14px] text-[#1a73e8] font-medium mb-1">
            Processing selected files...
          </p>
          <p className="text-[#5f6368] text-[12px]">
            This may take a moment for large videos
          </p>
        </>
      ) : (
        <>
          <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            dragOver ? "bg-[#d3e3fd]" : "bg-[#f1f3f4]"
          }`}>
            <svg
              className={`w-6 h-6 ${
                disabled ? "text-[#dadce0]" : dragOver ? "text-[#1a73e8]" : "text-[#5f6368]"
              }`}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
            </svg>
          </div>

          <p className={`text-[14px] mb-1 ${
            disabled ? "text-[#80868b]" : "text-[#202124]"
          }`}>
            {disabled
              ? "Select a destination folder first"
              : dragOver
              ? "Drop files to upload"
              : "Tap to select photos & videos"}
          </p>
          <p className="text-[#80868b] text-[12px]">
            Select multiple files at once from your library
          </p>
        </>
      )}
    </div>
  );
}
