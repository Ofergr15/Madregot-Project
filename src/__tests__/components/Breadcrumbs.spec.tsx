import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Breadcrumbs from "@/components/Breadcrumbs";

describe("Breadcrumbs", () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all breadcrumb items", () => {
    const path = [
      { id: "root", name: "Root" },
      { id: "sub1", name: "Sub Folder" },
      { id: "sub2", name: "Current" },
    ];

    render(<Breadcrumbs path={path} onNavigate={mockNavigate} />);

    expect(screen.getByText("Root")).toBeInTheDocument();
    expect(screen.getByText("Sub Folder")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
  });

  it("renders last item as plain text (not a button)", () => {
    const path = [
      { id: "root", name: "Root" },
      { id: "current", name: "Current Folder" },
    ];

    render(<Breadcrumbs path={path} onNavigate={mockNavigate} />);

    const currentItem = screen.getByText("Current Folder");
    expect(currentItem.tagName).toBe("SPAN");
    expect(currentItem).toHaveClass("font-medium");
  });

  it("renders non-last items as clickable buttons", () => {
    const path = [
      { id: "root", name: "Root" },
      { id: "middle", name: "Middle" },
      { id: "current", name: "Current" },
    ];

    render(<Breadcrumbs path={path} onNavigate={mockNavigate} />);

    const rootButton = screen.getByRole("button", { name: "Root" });
    expect(rootButton).toBeInTheDocument();

    const middleButton = screen.getByRole("button", { name: "Middle" });
    expect(middleButton).toBeInTheDocument();
  });

  it("calls onNavigate with correct id when breadcrumb clicked", () => {
    const path = [
      { id: "root-id", name: "Root" },
      { id: "child-id", name: "Child" },
      { id: "current-id", name: "Current" },
    ];

    render(<Breadcrumbs path={path} onNavigate={mockNavigate} />);

    fireEvent.click(screen.getByRole("button", { name: "Root" }));
    expect(mockNavigate).toHaveBeenCalledWith("root-id");

    fireEvent.click(screen.getByRole("button", { name: "Child" }));
    expect(mockNavigate).toHaveBeenCalledWith("child-id");
  });

  it("renders separator chevrons between items", () => {
    const path = [
      { id: "1", name: "A" },
      { id: "2", name: "B" },
      { id: "3", name: "C" },
    ];

    const { container } = render(<Breadcrumbs path={path} onNavigate={mockNavigate} />);

    const chevrons = container.querySelectorAll("svg");
    expect(chevrons).toHaveLength(2);
  });

  it("does not render slash before first item", () => {
    const path = [{ id: "1", name: "Only" }];

    render(<Breadcrumbs path={path} onNavigate={mockNavigate} />);

    expect(screen.queryByText("/")).not.toBeInTheDocument();
  });

  it("renders single item as non-clickable", () => {
    const path = [{ id: "root", name: "Home" }];

    render(<Breadcrumbs path={path} onNavigate={mockNavigate} />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders empty when path is empty", () => {
    const { container } = render(
      <Breadcrumbs path={[]} onNavigate={mockNavigate} />
    );

    expect(container.querySelector("nav")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
