"use client";

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Home, Truck, Users, FileText, Package, CreditCard, BarChart, Settings, LogOut, ChevronRight, Briefcase, Cloud } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface NavItem {
  icon: any;
  label: string;
  href: string;
  exact?: boolean;
  disabled?: boolean;
}

// Fonction de traduction des rôles
const translateRole = (role: string | null): string => {
  switch (role) {
    case 'super_admin': return 'Super administrateur';
    case 'admin': return 'Administrateur';
    case 'exploitant': return 'Exploitant';
    case 'chauffeur': return 'Chauffeur';
    case 'client': return 'Client';
    default: return 'Utilisateur';
  }
};

// Fonction pour extraire les initiales d'un nom
const getInitials = (name: string | null): string => {
  if (!name || name.trim().length === 0) return 'UU';
  const nameParts = name.trim().split(' ');
  if (nameParts.length >= 2) {
    return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
  }
  return nameParts[0].length >= 2 ? nameParts[0].substring(0, 2).toUpperCase() : 'UU';
};

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profilData, setProfilData] = useState<{ nom: string; role: string; entreprise_id: string } | null>(null);
  const [entrepriseData, setEntrepriseData] = useState<{ nom: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserAndCompanyData();
  }, []);

  async function fetchUserAndCompanyData() {
    setLoading(true);
    setError(null);

    try {
      // Récupérer l'utilisateur connecté
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Utilisateur non connecté');
      }

      // Charger le profil utilisateur
      const { data: profil, error: profilError } = await supabase
        .from('profils')
        .select('nom, role, entreprise_id')
        .eq('id', user.id)
        .single();

      if (profilError) {
        throw new Error('Erreur lors du chargement du profil');
      }

      setProfilData(profil);

      // Charger l'entreprise de l'utilisateur
      const { data: entreprise, error: entrepriseError } = await supabase
        .from('entreprises')
        .select('nom')
        .eq('id', profil.entreprise_id)
        .single();

      if (entrepriseError && entrepriseError.code !== "PGRST116") {
        // PGRST116 = aucune ligne trouvée
        console.warn('Aucune entreprise trouvée pour cet utilisateur');
      }

      setEntrepriseData(entreprise);

    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      router.replace('/login');
      router.refresh();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      alert('Impossible de se déconnecter.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const mainNavItems: NavItem[] = [
    { icon: Home, label: 'Dashboard', href: '/dashboard', exact: true, disabled: false },
    { icon: Truck, label: 'Véhicules', href: '/camions', disabled: false },
    { icon: Users, label: 'Chauffeurs', href: '/chauffeurs', disabled: false },
    { icon: FileText, label: 'Devis', href: '/devis', disabled: false },
    { icon: Package, label: 'Livraisons', href: '/livraisons', disabled: false },
    { icon: CreditCard, label: 'Factures', href: '/factures', disabled: false },
    { icon: BarChart, label: 'Rentabilité', href: '/rentabilite', disabled: false },
    { icon: Briefcase, label: 'Clients', href: '/clients', disabled: false },
  ];

  const adminNavItems: NavItem[] = [
    { icon: Settings, label: 'Paramètres', href: '/parametres', disabled: false },
    { icon: Cloud, label: 'Sauvegardes', href: '#', disabled: true },
  ];

  const isItemActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-gray-950 border-r border-gray-800 min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <Link href="/dashboard" className="flex items-center">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mr-3">
            <Truck className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Transport</span>
          <span className="text-xl font-bold text-green-500">ERP</span>
        </Link>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <SidebarItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              href={item.href}
              active={isItemActive(item.href, item.exact)}
              disabled={item.disabled}
            />
          ))}
        </div>

        {/* Séparateur */}
        <div className="my-6 border-t border-gray-800"></div>

        {/* Administration */}
        <div className="space-y-1">
          <p className="text-xs uppercase text-gray-500 font-medium px-3 mb-2">
            Administration
          </p>
          {adminNavItems.map((item) => (
            <SidebarItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              href={item.disabled ? undefined : item.href}
              active={isItemActive(item.href)}
              disabled={item.disabled}
            />
          ))}
        </div>
      </nav>

      {/* Bas de sidebar - Société active */}
      <div className="p-4 border-t border-gray-800">
        <div className="p-3 bg-gray-900 rounded-lg border border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-3">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{entrepriseData?.nom || 'Chargement...'}</p>
                <p className="text-xs text-gray-400">Entreprise active</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </div>
        </div>

        {/* Profil utilisateur avec déconnexion */}
        <button
          className="mt-4 flex items-center p-3 hover:bg-gray-900 rounded-lg transition-colors cursor-pointer group w-full disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-label={isLoggingOut ? "Déconnexion en cours..." : "Se déconnecter"}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mr-3">
                <span className="text-xs font-bold text-white">{getInitials(profilData?.nom || null)}</span>
          </div>
          <div className="flex-1 text-left">
                <p className="text-sm font-medium text-white">{profilData?.nom || 'Chargement...'}</p>
                <p className="text-xs text-gray-400">
                  {isLoggingOut ? 'Déconnexion...' : translateRole(profilData?.role || null)}
                </p>
          </div>
          <LogOut className="w-4 h-4 text-gray-500 group-hover:text-gray-300" />
        </button>
      </div>
    </aside>
  );
}

interface SidebarItemProps {
  icon: any;
  label: string;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

function SidebarItem({ icon: Icon, label, href, active = false, disabled = false, onClick }: SidebarItemProps) {
  const baseClasses = `
    flex items-center px-3 py-3 rounded-lg transition-colors
    ${disabled 
      ? 'opacity-50 cursor-not-allowed' 
      : 'cursor-pointer hover:bg-gray-900/50'
    }
    ${active 
      ? 'bg-gradient-to-r from-green-900/20 to-green-800/10 border border-green-800/30' 
      : ''
    }
  `;

  const content = (
    <div
      className={baseClasses}
      onClick={disabled ? undefined : onClick}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-green-400' : 'text-gray-400'}`} />
      <span className={`ml-3 ${active ? 'text-white font-medium' : 'text-gray-300'}`}>
        {label}
        {disabled && (
          <span className="ml-2 text-xs text-gray-500">(Bientôt)</span>
        )}
      </span>
      {active && (
        <div className="ml-auto w-2 h-2 rounded-full bg-green-500"></div>
      )}
    </div>
  );

  if (href && !disabled) {
    return (
      <Link href={href}>
        {content}
      </Link>
    );
  }

  return content;
}