'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface ActionItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface ActionDropdownProps {
  actions: ActionItem[];
}

export default function ActionDropdown({ actions }: ActionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
      >
        Aksi
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-[60] animate-fade-in">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                action.variant === 'danger'
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {action.icon && <span className="w-4 h-4 flex-shrink-0">{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
