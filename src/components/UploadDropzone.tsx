"use client";

import { useCallback, useRef, useState } from "react";

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled: boolean;
}

export default function UploadDropzone({
  onFilesSelected,
  disabled,
}: UploadDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
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

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        onFilesSelected(files);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onFilesSelected]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative border-2 border-dashed rounded-lg p-10 text-center transition-all ${
        disabled
          ? "border-[#dadce0] bg-[#f8f9fa] cursor-not-allowed opacity-60"
          : dragOver
          ? "border-[#1a73e8] bg-[#e8f0fe]"
          : "border-[#dadce0] hover:border-[#1a73e8] hover:bg-[#f8f9fa] cursor-pointer"
      }`}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/heic,image/heif,image/webp,video/mp4,video/quicktime,video/x-msvideo"
        className="hidden"
        onChange={handleFileInput}
        disabled={disabled}
      />

      <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
        disabled
          ? "bg-[#f1f3f4]"
          : dragOver
          ? "bg-[#d3e3fd]"
          : "bg-[#f1f3f4]"
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
          : "Drop files here or click to browse"}
      </p>
      <p className="text-[#80868b] text-[12px]">
        Photos (JPEG, PNG, HEIC, WebP) and Videos (MP4, MOV, AVI)
      </p>
    </div>
  );
}
