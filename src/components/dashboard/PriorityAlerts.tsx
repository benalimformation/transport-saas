"use client";

import React from 'react';
import { AlertCircle, FileText, User, Truck, CreditCard, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface PriorityAlert {
  id: string;
  level: 'critical' | 'important' | 'note';
  badge: string;
  title: string;
  detail: string;
  time: string;
  href?: string;
}

interface PriorityAlertsProps {
  alerts?: PriorityAlert[];
}

export default function PriorityAlerts({ alerts = [] }: PriorityAlertsProps) {
  const getLevelStyles = (level: PriorityAlert['level']) => {
    switch (level) {
      case 'critical':
        return {
          iconColor: 'text-red-500',
          badgeColor: 'bg-red-500/20 text-red-500',
          accentBorder: 'border-l-2 border-l-red-500',
          bg: 'bg-red-500/5',
          border: 'border-red-500/10'
        };
      case 'important':
        return {
          iconColor: 'text-orange-500',
          badgeColor: 'bg-orange-500/20 text-orange-500',
          accentBorder: '',
          bg: 'bg-orange-500/5',
          border: 'border-orange-500/10'
        };
      case 'note':
        return {
          iconColor: 'text-blue-500',
          badgeColor: 'bg-blue-500/20 text-blue-500',
          accentBorder: '',
          bg: 'bg-blue-500/5',
          border: 'border-blue-500/10'
        };
      default:
        return {
          iconColor: 'text-gray-500',
          badgeColor: 'bg-gray-500/20 text-gray-500',
          accentBorder: '',
          bg: 'bg-gray-500/5',
          border: 'border-gray-500/10'
        };
    }
  };

  const getIcon = (level: PriorityAlert['level']) => {
    switch (level) {
      case 'critical': return AlertCircle;
      case 'important': return FileText;
      case 'note': return Truck;
      default: return CreditCard;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-white text-base">Alertes prioritaires</h3>
          <p className="text-xs text-gray-500 mt-0.5">Actions requises</p>
        </div>
        <span 
          className="text-sm text-gray-600 flex items-center cursor-not-allowed"
          aria-disabled="true"
          title="Cette fonctionnalité sera disponible prochainement"
        >
          Voir toutes
          <ExternalLink className="w-3 h-3 ml-1" />
        </span>
      </div>

      {/* Alerts list */}
      <div className="flex-1 space-y-0.5">
        {alerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-gray-500" />
            </div>
            <h4 className="text-lg font-medium text-white mb-2">Aucune alerte prioritaire</h4>
            <p className="text-sm text-gray-400 max-w-xs">
              Votre entreprise ne comporte actuellement aucune alerte.
            </p>
          </div>
        ) : (
          alerts.map((alert, index) => {
            const styles = getLevelStyles(alert.level);
            const Icon = getIcon(alert.level);
            const isFirstCritical = index === 0 && alert.level === 'critical';
            
            const content = (
              <div className={`p-3 ${styles.bg} border ${styles.border} hover:bg-gray-900/30 transition-colors duration-200 ${isFirstCritical ? styles.accentBorder : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`w-8 h-8 rounded-md ${styles.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${styles.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${styles.badgeColor}`}>
                          {alert.badge}
                        </span>
                        <span className="text-sm font-medium text-white truncate">
                          {alert.title}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{alert.detail}</p>
                    </div>
                  </div>
                  <div className="ml-2">
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {alert.time}
                    </span>
                  </div>
                </div>
              </div>
            );

            return alert.href ? (
              <Link href={alert.href} key={alert.id} className="block">
                {content}
              </Link>
            ) : (
              <div key={alert.id}>
                {content}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-800">
        <div className="text-xs text-gray-600 text-center italic">
          Alertes en temps réel • Basées sur votre activité
        </div>
      </div>
    </div>
  );
}

