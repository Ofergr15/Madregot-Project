import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FolderBrowser from "@/components/FolderBrowser";

const mockFolders = [
  {
    id: "folder-1",
    name: "Morning Run 2024-01-15",
    createdTime: "2024-01-15T08:00:00Z",
    modifiedTime: "2024-01-15T09:00:00Z",
    webViewLink: "https://drive.google.com/folder-1",
  },
  {
    id: "folder-2",
    name: "Evening Run 2024-01-16",
    createdTime: "2024-01-16T18:00:00Z",
    modifiedTime: "2024-01-16T19:00:00Z",
    webViewLink: "https://drive.google.com/folder-2",
  },
];

describe("FolderBrowser", () => {
  const mockSelectFolder = jest.fn();
  const mockOpenFolder = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading message when loading is true", () => {
    render(
      <FolderBrowser
        folders={[]}
        selectedFolderId={null}
        onSelectFolder={mockSelectFolder}
        onOpenFolder={mockOpenFolder}
        loading={true}
      />
    );

    expect(screen.getByText("Loading folders...")).toBeInTheDocument();
  });

  it("shows empty message when no folders and not loading", () => {
    render(
      <FolderBrowser
        folders={[]}
        selectedFolderId={null}
        onSelectFolder={mockSelectFolder}
        onOpenFolder={mockOpenFolder}
        loading={false}
      />
    );

    expect(screen.getByText("No subfolders here")).toBeInTheDocument();
    expect(screen.getByText("You can create one or upload to this folder")).toBeInTheDocument();
  });

  it("renders all folders", () => {
    render(
      <FolderBrowser
        folders={mockFolders}
        selectedFolderId={null}
        onSelectFolder={mockSelectFolder}
        onOpenFolder={mockOpenFolder}
        loading={false}
      />
    );

    expect(screen.getByText("Morning Run 2024-01-15")).toBeInTheDocument();
    expect(screen.getByText("Evening Run 2024-01-16")).toBeInTheDocument();
  });

  it("calls onSelectFolder when folder row is clicked", () => {
    render(
      <FolderBrowser
        folders={mockFolders}
        selectedFolderId={null}
        onSelectFolder={mockSelectFolder}
        onOpenFolder={mockOpenFolder}
        loading={false}
      />
    );

    fireEvent.click(screen.getByText("Morning Run 2024-01-15"));
    expect(mockSelectFolder).toHaveBeenCalledWith("folder-1");
  });

  it("calls onOpenFolder when folder row is double-clicked", () => {
    render(
      <FolderBrowser
        folders={mockFolders}
        selectedFolderId={null}
        onSelectFolder={mockSelectFolder}
        onOpenFolder={mockOpenFolder}
        loading={false}
      />
    );

    fireEvent.doubleClick(screen.getByText("Evening Run 2024-01-16"));
    expect(mockOpenFolder).toHaveBeenCalledWith("folder-2");
  });

  it("calls onOpenFolder when Open button is clicked", () => {
    render(
      <FolderBrowser
        folders={mockFolders}
        selectedFolderId={null}
        onSelectFolder={mockSelectFolder}
        onOpenFolder={mockOpenFolder}
        loading={false}
      />
    );

    const openButtons = screen.getAllByText("Open");
    fireEvent.click(openButtons[0]);
    expect(mockOpenFolder).toHaveBeenCalledWith("folder-1");
  });

  it("Open button click does not trigger onSelectFolder", () => {
    render(
      <FolderBrowser
        folders={mockFolders}
        selectedFolderId={null}
        onSelectFolder={mockSelectFolder}
        onOpenFolder={mockOpenFolder}
        loading={false}
      />
    );

    const openButtons = screen.getAllByText("Open");
    fireEvent.click(openButtons[0]);
    expect(mockSelectFolder).not.toHaveBeenCalled();
  });

  it("highlights selected folder with blue background", () => {
    render(
      <FolderBrowser
        folders={mockFolders}
        selectedFolderId="folder-1"
        onSelectFolder={mockSelectFolder}
        onOpenFolder={mockOpenFolder}
        loading={false}
      />
    );

    const folderRow = screen.getByText("Morning Run 2024-01-15").closest("div[class*='cursor-pointer']");
    expect(folderRow).toHaveClass("bg-[#c2e7ff]");
  });

  it("does not highlight non-selected folders", () => {
    render(
      <FolderBrowser
        folders={mockFolders}
        selectedFolderId="folder-1"
        onSelectFolder={mockSelectFolder}
        onOpenFolder={mockOpenFolder}
        loading={false}
      />
    );

    const folderRow = screen.getByText("Evening Run 2024-01-16").closest("div[class*='cursor-pointer']");
    expect(folderRow).not.toHaveClass("bg-blue-50");
  });

  it("renders Open button for each folder", () => {
    render(
      <FolderBrowser
        folders={mockFolders}
        selectedFolderId={null}
        onSelectFolder={mockSelectFolder}
        onOpenFolder={mockOpenFolder}
        loading={false}
      />
    );

    const openButtons = screen.getAllByText("Open");
    expect(openButtons).toHaveLength(2);
  });
});
