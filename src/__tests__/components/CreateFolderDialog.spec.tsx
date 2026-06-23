import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateFolderDialog from "@/components/CreateFolderDialog";

describe("CreateFolderDialog", () => {
  const mockClose = jest.fn();
  const mockCreate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue(undefined);
  });

  it("renders nothing when open is false", () => {
    const { container } = render(
      <CreateFolderDialog open={false} onClose={mockClose} onCreate={mockCreate} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders dialog when open is true", () => {
    render(
      <CreateFolderDialog open={true} onClose={mockClose} onCreate={mockCreate} />
    );

    expect(screen.getByText("New folder")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Untitled folder/)).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Create")).toBeInTheDocument();
  });

  it("has an input field", () => {
    render(
      <CreateFolderDialog open={true} onClose={mockClose} onCreate={mockCreate} />
    );

    const input = screen.getByPlaceholderText(/Untitled folder/);
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
  });

  it("calls onClose when Cancel is clicked", () => {
    render(
      <CreateFolderDialog open={true} onClose={mockClose} onCreate={mockCreate} />
    );

    fireEvent.click(screen.getByText("Cancel"));
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it("Create button is disabled when input is empty", () => {
    render(
      <CreateFolderDialog open={true} onClose={mockClose} onCreate={mockCreate} />
    );

    const createButton = screen.getByText("Create");
    expect(createButton).toBeDisabled();
  });

  it("Create button is disabled when input is only spaces", async () => {
    render(
      <CreateFolderDialog open={true} onClose={mockClose} onCreate={mockCreate} />
    );

    const input = screen.getByPlaceholderText(/Untitled folder/);
    await userEvent.type(input, "   ");

    const createButton = screen.getByText("Create");
    expect(createButton).toBeDisabled();
  });

  it("Create button is enabled when input has text", async () => {
    render(
      <CreateFolderDialog open={true} onClose={mockClose} onCreate={mockCreate} />
    );

    const input = screen.getByPlaceholderText(/Untitled folder/);
    await userEvent.type(input, "My Folder");

    const createButton = screen.getByText("Create");
    expect(createButton).not.toBeDisabled();
  });

  it("calls onCreate with trimmed name on submit", async () => {
    render(
      <CreateFolderDialog open={true} onClose={mockClose} onCreate={mockCreate} />
    );

    const input = screen.getByPlaceholderText(/Untitled folder/);
    await userEvent.type(input, "  New Folder  ");
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith("New Folder");
    });
  });

  it("closes dialog after successful creation", async () => {
    render(
      <CreateFolderDialog open={true} onClose={mockClose} onCreate={mockCreate} />
    );

    const input = screen.getByPlaceholderText(/Untitled folder/);
    await userEvent.type(input, "New Folder");
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(mockClose).toHaveBeenCalled();
    });
  });

  it("shows error message when onCreate throws", async () => {
    mockCreate.mockRejectedValue(new Error("Network error"));

    render(
      <CreateFolderDialog open={true} onClose={mockClose} onCreate={mockCreate} />
    );

    const input = screen.getByPlaceholderText(/Untitled folder/);
    await userEvent.type(input, "New Folder");
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("shows generic error when non-Error is thrown", async () => {
    mockCreate.mockRejectedValue("string error");

    render(
      <CreateFolderDialog open={true} onClose={mockClose} onCreate={mockCreate} />
    );

    const input = screen.getByPlaceholderText(/Untitled folder/);
    await userEvent.type(input, "New Folder");
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Failed to create folder")).toBeInTheDocument();
    });
  });

  it("shows Creating... text while submitting", async () => {
    let resolveCreate: () => void;
    mockCreate.mockImplementation(
      () => new Promise<void>((resolve) => { resolveCreate = resolve; })
    );

    render(
      <CreateFolderDialog open={true} onClose={mockClose} onCreate={mockCreate} />
    );

    const input = screen.getByPlaceholderText(/Untitled folder/);
    await userEvent.type(input, "New Folder");
    fireEvent.submit(input.closest("form")!);

    expect(await screen.findByText("Creating...")).toBeInTheDocument();

    resolveCreate!();
    await waitFor(() => {
      expect(screen.queryByText("Creating...")).not.toBeInTheDocument();
    });
  });

  it("disables input and buttons while creating", async () => {
    let resolveCreate: () => void;
    mockCreate.mockImplementation(
      () => new Promise<void>((resolve) => { resolveCreate = resolve; })
    );

    render(
      <CreateFolderDialog open={true} onClose={mockClose} onCreate={mockCreate} />
    );

    const input = screen.getByPlaceholderText(/Untitled folder/);
    await userEvent.type(input, "New Folder");
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(input).toBeDisabled();
      expect(screen.getByText("Cancel")).toBeDisabled();
    });

    resolveCreate!();
    await waitFor(() => {
      expect(mockClose).toHaveBeenCalled();
    });
  });

  it("clears input after successful creation", async () => {
    const { rerender } = render(
      <CreateFolderDialog open={true} onClose={mockClose} onCreate={mockCreate} />
    );

    const input = screen.getByPlaceholderText(/Untitled folder/);
    await userEvent.type(input, "New Folder");
    fireEvent.submit(input.closest("form")!);

    await waitFor(() => {
      expect(mockClose).toHaveBeenCalled();
    });

    // Reopen dialog
    rerender(
      <CreateFolderDialog open={true} onClose={mockClose} onCreate={mockCreate} />
    );

    // Input should have been cleared
    const newInput = screen.getByPlaceholderText(/Untitled folder/);
    expect(newInput).toHaveValue("");
  });
});
