"use client";

interface SidebarTabsProps {
  activeTab: "livability" | "schools";
  onTabChange: (tab: "livability" | "schools") => void;
}

export function SidebarTabs({ activeTab, onTabChange }: SidebarTabsProps) {
  return (
    <div className="flex border-b">
      <button
        onClick={() => onTabChange("livability")}
        className={`flex-1 px-4 py-2.5 text-sm font-medium transition ${
          activeTab === "livability"
            ? "border-b-2 border-brand-600 text-brand-700"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        Livability
      </button>
      <button
        onClick={() => onTabChange("schools")}
        className={`flex-1 px-4 py-2.5 text-sm font-medium transition ${
          activeTab === "schools"
            ? "border-b-2 border-brand-600 text-brand-700"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        Schools
      </button>
    </div>
  );
}
