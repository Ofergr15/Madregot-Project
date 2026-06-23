"use client";

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface BreadcrumbsProps {
  path: BreadcrumbItem[];
  onNavigate: (folderId: string) => void;
}

export default function Breadcrumbs({ path, onNavigate }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1 text-[14px] flex-wrap mb-4 px-1">
      {path.map((item, index) => (
        <span key={item.id} className="flex items-center gap-1">
          {index > 0 && (
            <svg className="w-4 h-4 text-[#5f6368]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {index === path.length - 1 ? (
            <span className="font-medium text-[#202124] px-2 py-1 rounded">
              {item.name}
            </span>
          ) : (
            <button
              onClick={() => onNavigate(item.id)}
              className="text-[#1a73e8] hover:bg-[#f1f3f4] px-2 py-1 rounded transition-colors font-medium"
            >
              {item.name}
            </button>
          )}
        </span>
      ))}
    </nav>
  );
}
