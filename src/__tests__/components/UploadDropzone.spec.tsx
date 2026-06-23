import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import UploadDropzone from "@/components/UploadDropzone";

describe("UploadDropzone", () => {
  const mockFilesSelected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders drop zone text when not disabled", () => {
    render(
      <UploadDropzone onFilesSelected={mockFilesSelected} disabled={false} />
    );

    expect(
      screen.getByText("Drop files here or click to browse")
    ).toBeInTheDocument();
    expect(screen.getByText("Photos (JPEG, PNG, HEIC, WebP) and Videos (MP4, MOV, AVI)")).toBeInTheDocument();
  });

  it("renders disabled text when disabled", () => {
    render(
      <UploadDropzone onFilesSelected={mockFilesSelected} disabled={true} />
    );

    expect(
      screen.getByText("Select a destination folder first")
    ).toBeInTheDocument();
  });

  it("has a hidden file input", () => {
    render(
      <UploadDropzone onFilesSelected={mockFilesSelected} disabled={false} />
    );

    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass("hidden");
  });

  it("file input accepts correct mime types", () => {
    render(
      <UploadDropzone onFilesSelected={mockFilesSelected} disabled={false} />
    );

    const input = document.querySelector('input[type="file"]');
    expect(input).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/heic,image/heif,image/webp,video/mp4,video/quicktime,video/x-msvideo"
    );
  });

  it("file input supports multiple files", () => {
    render(
      <UploadDropzone onFilesSelected={mockFilesSelected} disabled={false} />
    );

    const input = document.querySelector('input[type="file"]');
    expect(input).toHaveAttribute("multiple");
  });

  it("calls onFilesSelected when files are dropped", () => {
    render(
      <UploadDropzone onFilesSelected={mockFilesSelected} disabled={false} />
    );

    const dropzone = screen.getByText("Drop files here or click to browse").closest("div[class*='border-2']")!;
    const file = new File(["content"], "photo.jpg", { type: "image/jpeg" });

    const dataTransfer = {
      files: [file],
    };

    fireEvent.drop(dropzone, { dataTransfer });

    expect(mockFilesSelected).toHaveBeenCalledWith([file]);
  });

  it("does not call onFilesSelected when disabled and files dropped", () => {
    render(
      <UploadDropzone onFilesSelected={mockFilesSelected} disabled={true} />
    );

    const dropzone = screen.getByText("Select a destination folder first").closest("div[class*='border-2']")!;
    const file = new File(["content"], "photo.jpg", { type: "image/jpeg" });

    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    });

    expect(mockFilesSelected).not.toHaveBeenCalled();
  });

  it("does not call onFilesSelected when no files in drop event", () => {
    render(
      <UploadDropzone onFilesSelected={mockFilesSelected} disabled={false} />
    );

    const dropzone = screen.getByText("Drop files here or click to browse").closest("div[class*='border-2']")!;

    fireEvent.drop(dropzone, {
      dataTransfer: { files: [] },
    });

    expect(mockFilesSelected).not.toHaveBeenCalled();
  });

  it("calls onFilesSelected when files selected via input", () => {
    render(
      <UploadDropzone onFilesSelected={mockFilesSelected} disabled={false} />
    );

    const input = document.querySelector('input[type="file"]')!;
    const file = new File(["content"], "photo.jpg", { type: "image/jpeg" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockFilesSelected).toHaveBeenCalledWith([file]);
  });

  it("applies disabled styling when disabled", () => {
    render(
      <UploadDropzone onFilesSelected={mockFilesSelected} disabled={true} />
    );

    const dropzone = screen.getByText("Select a destination folder first").closest("div[class*='border-2']");
    expect(dropzone).toHaveClass("cursor-not-allowed");
    expect(dropzone).toHaveClass("border-[#dadce0]");
  });

  it("applies hover-ready styling when enabled", () => {
    render(
      <UploadDropzone onFilesSelected={mockFilesSelected} disabled={false} />
    );

    const dropzone = screen.getByText("Drop files here or click to browse").closest("div[class*='border-2']");
    expect(dropzone).toHaveClass("cursor-pointer");
    expect(dropzone).toHaveClass("border-[#dadce0]");
  });

  it("disables file input when component is disabled", () => {
    render(
      <UploadDropzone onFilesSelected={mockFilesSelected} disabled={true} />
    );

    const input = document.querySelector('input[type="file"]');
    expect(input).toBeDisabled();
  });
});
