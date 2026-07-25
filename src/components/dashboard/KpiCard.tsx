import React from 'react';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  statusColor: 'green' | 'orange' | 'red' | 'blue' | 'yellow' | 'purple';
  progress?: number; // Pourcentage de progression
  actionText?: string;
  href?: string;
}

export default function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  statusColor,
  progress,
  actionText,
  href
}: KpiCardProps) {
  const colorClasses = {
    green: 'bg-gray-900 border-green-500/20 text-green-500',
    orange: 'bg-gray-900 border-orange-500/20 text-orange-500',
    red: 'bg-gray-900 border-red-500/20 text-red-500',
    blue: 'bg-gray-900 border-blue-500/20 text-blue-500',
    yellow: 'bg-gray-900 border-yellow-500/20 text-yellow-500',
    purple: 'bg-gray-900 border-purple-500/20 text-purple-500'
  };

  const iconBgClasses = {
    green: 'bg-green-500/20',
    orange: 'bg-orange-500/20',
    red: 'bg-red-500/20',
    blue: 'bg-blue-500/20',
    yellow: 'bg-yellow-500/20',
    purple: 'bg-purple-500/20'
  };

  const CardContent = href ? (
    <Link
      href={href}
      className={`rounded-lg border ${colorClasses[statusColor]} p-3 shadow-sm hover:border-gray-700 hover:shadow-md transition-all duration-300 group block`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{title}</p>
          <p className="text-xl font-bold text-white mt-1.5">{value}</p>
          {subtitle && <p className="text-xs text-gray-600 mt-1.5">{subtitle}</p>}
          {progress && (
            <div className="mt-2.5 flex items-center">
              <div className="w-full bg-gray-800 rounded-full h-1">
                <div 
                  className={`${colorClasses[statusColor]} h-1 rounded-full`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="ml-1.5 text-xs text-gray-500">{progress}%</span>
            </div>
          )}
          {actionText && (
            <div className="mt-2 flex items-center text-xs">
              <span className={`${colorClasses[statusColor]} mr-1 transition-transform group-hover:translate-x-0.5`}>→</span>
              <span className="text-gray-500">{actionText}</span>
            </div>
          )}
        </div>
        <div className={`w-8 h-8 rounded-md ${iconBgClasses[statusColor]} flex items-center justify-center group-hover:scale-105 transition-transform duration-300`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  ) : (
    <div className={`rounded-lg border ${colorClasses[statusColor]} p-3 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{title}</p>
          <p className="text-xl font-bold text-white mt-1.5">{value}</p>
          {subtitle && <p className="text-xs text-gray-600 mt-1.5">{subtitle}</p>}
          {progress && (
            <div className="mt-2.5 flex items-center">
              <div className="w-full bg-gray-800 rounded-full h-1">
                <div 
                  className={`${colorClasses[statusColor]} h-1 rounded-full`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="ml-1.5 text-xs text-gray-500">{progress}%</span>
            </div>
          )}
          {actionText && (
            <div className="mt-2 flex items-center text-xs">
              <span className={`${colorClasses[statusColor]} mr-1`}>→</span>
              <span className="text-gray-500">{actionText}</span>
            </div>
          )}
        </div>
        <div className={`w-8 h-8 rounded-md ${iconBgClasses[statusColor]} flex items-center justify-center`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );

  return CardContent;
}