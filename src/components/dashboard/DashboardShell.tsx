import React from 'react';
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="flex">
        {/* Sidebar gauche */}
        <DashboardSidebar />

        {/* Contenu principal */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <DashboardHeader />

          {/* Contenu scrollable */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}