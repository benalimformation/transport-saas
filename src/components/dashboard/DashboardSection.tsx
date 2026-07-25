import React from 'react';

interface DashboardSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  cols?: 1 | 2 | 3;
  action?: React.ReactNode;
}

export default function DashboardSection({ 
  title, 
  subtitle, 
  children, 
  action,
  cols = 1
}: DashboardSectionProps) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group">
      {/* Header de section */}
      <div className="px-4 py-3 border-b border-gray-800 bg-gradient-to-r from-gray-900 to-gray-950">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">{title}</h3>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">{action}</div>
          )}
        </div>
      </div>

      {/* Contenu */}
      <div className={`p-4 grid ${getGridCols(cols)} gap-3`}>
        {children}
      </div>
    </div>
  );
}

function getGridCols(cols: number) {
  switch (cols) {
    case 1:
      return "grid-cols-1";
    case 2:
      return "grid-cols-1 md:grid-cols-2";
    case 3:
      return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
    default:
      return "grid-cols-1";
  }
}

interface DashboardCardProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'purple';
}

export function DashboardCard({
  title,
  value,
  trend,
  trendValue,
  icon,
  color = 'blue'
}: DashboardCardProps) {
  const colors = {
    green: 'from-green-500 to-green-600',
    blue: 'from-blue-500 to-blue-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600'
  };

  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-gray-400'
  };

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {trend && trendValue && (
            <div className={`flex items-center mt-2 text-sm ${trendColors[trend]}`}>
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              <span className="ml-1">{trendValue}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}