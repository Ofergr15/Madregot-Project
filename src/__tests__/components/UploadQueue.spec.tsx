import React from "react";
import { render, screen } from "@testing-library/react";
import UploadQueue, { QueuedFile } from "@/components/UploadQueue";

function createFile(name: string, size: number): File {
  const content = "x".repeat(Math.min(size, 100));
  const file = new File([content], name, { type: "image/jpeg" });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function createQueuedFile(overrides: Partial<QueuedFile> & { file?: File }): QueuedFile {
  return {
    id: "file-" + Math.random().toString(36).substr(2, 9),
    file: createFile("photo.jpg", 1024),
    status: "pending",
    progress: 0,
    ...overrides,
  };
}

describe("UploadQueue", () => {
  it("renders nothing when files array is empty", () => {
    const { container } = render(<UploadQueue files={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders queue header with correct counts", () => {
    const files: QueuedFile[] = [
      createQueuedFile({ status: "uploaded" }),
      createQueuedFile({ status: "uploaded" }),
      createQueuedFile({ status: "skipped" }),
      createQueuedFile({ status: "failed" }),
      createQueuedFile({ status: "pending" }),
    ];

    render(<UploadQueue files={files} />);

    expect(screen.getByText("Files (4/5)")).toBeInTheDocument();
  });

  it("shows uploaded count", () => {
    const files: QueuedFile[] = [
      createQueuedFile({ status: "uploaded" }),
      createQueuedFile({ status: "uploaded" }),
      createQueuedFile({ status: "pending" }),
    ];

    render(<UploadQueue files={files} />);

    expect(screen.getByText("2 uploaded")).toBeInTheDocument();
  });

  it("shows skipped count", () => {
    const files: QueuedFile[] = [
      createQueuedFile({ status: "skipped" }),
      createQueuedFile({ status: "pending" }),
    ];

    render(<UploadQueue files={files} />);

    expect(screen.getByText("1 skipped")).toBeInTheDocument();
  });

  it("shows failed count", () => {
    const files: QueuedFile[] = [
      createQueuedFile({ status: "failed" }),
      createQueuedFile({ status: "failed" }),
      createQueuedFile({ status: "pending" }),
    ];

    render(<UploadQueue files={files} />);

    expect(screen.getByText("2 failed")).toBeInTheDocument();
  });

  it("does not show uploaded label when none uploaded", () => {
    const files: QueuedFile[] = [createQueuedFile({ status: "pending" })];

    render(<UploadQueue files={files} />);

    expect(screen.queryByText(/uploaded/)).not.toBeInTheDocument();
  });

  it("does not show skipped label when none skipped", () => {
    const files: QueuedFile[] = [createQueuedFile({ status: "uploaded" })];

    render(<UploadQueue files={files} />);

    expect(screen.queryByText(/skipped/)).not.toBeInTheDocument();
  });

  it("does not show failed label when none failed", () => {
    const files: QueuedFile[] = [createQueuedFile({ status: "uploaded" })];

    render(<UploadQueue files={files} />);

    expect(screen.queryByText(/failed/)).not.toBeInTheDocument();
  });

  it("displays file names", () => {
    const files: QueuedFile[] = [
      createQueuedFile({ file: createFile("sunset.jpg", 2048) }),
      createQueuedFile({ file: createFile("morning-run.mp4", 5000000) }),
    ];

    render(<UploadQueue files={files} />);

    expect(screen.getByText("sunset.jpg")).toBeInTheDocument();
    expect(screen.getByText("morning-run.mp4")).toBeInTheDocument();
  });

  it("displays file sizes formatted correctly", () => {
    const files: QueuedFile[] = [
      createQueuedFile({ file: createFile("tiny.jpg", 500) }),
      createQueuedFile({ file: createFile("small.jpg", 2048) }),
      createQueuedFile({ file: createFile("medium.jpg", 5 * 1024 * 1024) }),
      createQueuedFile({ file: createFile("large.jpg", 2 * 1024 * 1024 * 1024) }),
    ];

    render(<UploadQueue files={files} />);

    expect(screen.getByText("500 B")).toBeInTheDocument();
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
    expect(screen.getByText("5.0 MB")).toBeInTheDocument();
    expect(screen.getByText("2.00 GB")).toBeInTheDocument();
  });

  it("displays status badges", () => {
    const files: QueuedFile[] = [
      createQueuedFile({ status: "pending" }),
      createQueuedFile({ status: "uploading", progress: 50 }),
      createQueuedFile({ status: "uploaded" }),
      createQueuedFile({ status: "skipped" }),
      createQueuedFile({ status: "failed" }),
    ];

    render(<UploadQueue files={files} />);

    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText("uploading")).toBeInTheDocument();
    expect(screen.getByText("uploaded")).toBeInTheDocument();
    expect(screen.getByText("skipped")).toBeInTheDocument();
    expect(screen.getByText("failed")).toBeInTheDocument();
  });

  it("shows progress bar for uploading files", () => {
    const files: QueuedFile[] = [
      createQueuedFile({ status: "uploading", progress: 75 }),
    ];

    const { container } = render(<UploadQueue files={files} />);

    const progressBar = container.querySelector('[style*="width: 75%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it("does not show progress bar for non-uploading files", () => {
    const files: QueuedFile[] = [
      createQueuedFile({ status: "pending" }),
      createQueuedFile({ status: "uploaded" }),
    ];

    const { container } = render(<UploadQueue files={files} />);

    const progressBars = container.querySelectorAll('[class*="bg-blue-600"][class*="h-1.5"]');
    expect(progressBars).toHaveLength(0);
  });

  it("calculates completed count as uploaded + skipped + failed", () => {
    const files: QueuedFile[] = [
      createQueuedFile({ status: "uploaded" }),
      createQueuedFile({ status: "skipped" }),
      createQueuedFile({ status: "failed" }),
      createQueuedFile({ status: "uploading", progress: 30 }),
      createQueuedFile({ status: "pending" }),
    ];

    render(<UploadQueue files={files} />);

    // 3 completed (uploaded + skipped + failed) out of 5 total
    expect(screen.getByText("Files (3/5)")).toBeInTheDocument();
  });
});
