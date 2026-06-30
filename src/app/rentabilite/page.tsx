"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function RentabilitePage() {
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [period, setPeriod] = useState<"month" | "quarter" | "year" | "custom">("month");
  const [customDateDebut, setCustomDateDebut] = useState<string | null>(null);
  const [customDateFin, setCustomDateFin] = useState<string | null>(null);
  const [caTotal, setCaTotal] = useState(0);
  const [depensesTotal, setDepensesTotal] = useState(0);
  const [beneficeNet, setBeneficeNet] = useState(0);
  const [marge, setMarge] = useState(0);
  const [facturesPayees, setFacturesPayees] = useState(0);
  const [livraisonsRealisees, setLivraisonsRealisees] = useState(0);
  const [hasData, setHasData] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initialiserPage();
  }, []);

  useEffect(() => {
    if (entrepriseId) {
      chargerDonnees(entrepriseId, period);
    }
  }, [entrepriseId, period, customDateDebut, customDateFin]);

  async function initialiserPage() {
    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (!userId) {
        window.location.href = "/login";
        return;
      }

      const { data: profil, error: profilError } = await supabase
        .from("profils")
        .select("entreprise_id, role")
        .eq("id", userId)
        .single();

      if (profilError || !profil) {
        setError("Profil utilisateur introuvable.");
        return;
      }

      if (profilError || !profil?.entreprise_id) {
        setError("Entreprise introuvable pour cet utilisateur.");
        return;
      }

      // Vérifier que l'utilisateur a les droits nécessaires
      const authorizedRoles = ["super_admin", "admin", "exploitant"];
      if (!authorizedRoles.includes(profil.role)) {
        setError("Accès refusé. Vous n'avez pas les droits nécessaires pour consulter cette page.");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 3000);
        return;
      }

      setEntrepriseId(profil.entreprise_id);
    } catch (err) {
      setError("Erreur lors de l'initialisation: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function chargerDonnees(idEntreprise: string, periode: "month" | "quarter" | "year" | "custom") {
    setLoading(true);
    setError(null);

    try {
      // Calculer les dates selon la période
      const now = new Date();
      let startDate: Date;
      let endDate: Date | null = null;

      // Si période personnalisée, utiliser les dates custom
      if (periode === "custom" && customDateDebut) {
        startDate = new Date(customDateDebut);
        if (customDateFin) {
          endDate = new Date(customDateFin);
          // Ajouter 1 jour à la date de fin pour inclure toute la journée
          endDate.setDate(endDate.getDate() + 1);
        }
      } else {
        // Période automatique (mois, trimestre, année)
        switch (periode) {
          case "month":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            break;
          case "quarter":
            const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
            startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
            endDate = new Date(now.getFullYear(), quarterStartMonth + 3, 1);
            break;
          case "year":
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear() + 1, 0, 1);
            break;
          default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        }
      }

      // Récupérer le CA (factures payées)
      const { data: facturesData, error: facturesError } = await supabase
        .from("factures")
        .select("montant_ttc")
        .eq("entreprise_id", idEntreprise)
        .eq("statut", "Payée")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate?.toISOString() || new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString());

      if (facturesError) throw facturesError;

      // Récupérer les dépenses
      const { data: depensesData, error: depensesError } = await supabase
        .from("depenses")
        .select("montant")
        .eq("entreprise_id", idEntreprise)
        .gte("date_depense", startDate.toISOString())
        .lte("date_depense", endDate?.toISOString() || new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString());

      if (depensesError) throw depensesError;

      // Récupérer le nombre de factures payées
      const { count: facturesPayeesCount, error: facturesCountError } = await supabase
        .from("factures")
        .select("*", { count: "exact", head: true })
        .eq("entreprise_id", idEntreprise)
        .eq("statut", "Payée")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate?.toISOString() || new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString());

      if (facturesCountError) throw facturesCountError;

      // Récupérer le nombre de livraisons réalisées
      const { count: livraisonsRealiseesCount, error: livraisonsCountError } = await supabase
        .from("livraisons")
        .select("*", { count: "exact", head: true })
        .eq("entreprise_id", idEntreprise)
        .eq("statut", "Livrée")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate?.toISOString() || new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString());

      if (livraisonsCountError) throw livraisonsCountError;

      // Calculer les métriques
      const caTotal = facturesData?.reduce((sum, f) => sum + (f.montant_ttc || 0), 0) || 0;
      const depensesTotal = depensesData?.reduce((sum, d) => sum + (d.montant || 0), 0) || 0;
      const beneficeNet = caTotal - depensesTotal;
      const marge = caTotal > 0 ? (beneficeNet / caTotal) * 100 : 0;

      // Vérifier si des données existent
      const hasData = caTotal > 0 || depensesTotal > 0 || (facturesPayeesCount || 0) > 0 || (livraisonsRealiseesCount || 0) > 0;

      setCaTotal(caTotal);
      setDepensesTotal(depensesTotal);
      setBeneficeNet(beneficeNet);
      setMarge(marge);
      setFacturesPayees(facturesPayeesCount || 0);
      setLivraisonsRealisees(livraisonsRealiseesCount || 0);
      setHasData(hasData);
    } catch (err) {
      setError("Erreur lors du chargement des données: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function setCustomPeriod() {
    if (customDateDebut) {
      setPeriod("custom");
    }
  }

  function formatPrix(montant: number) {
    return `${montant.toFixed(2)} €`;
  }

  function formatPourcentage(valeur: number) {
    return `${valeur.toFixed(2)}%`;
  }

  function getPeriodLabel() {
    const now = new Date();
    switch (period) {
      case "month": return `Mois en cours (${now.toLocaleString('fr-FR', { month: 'long', year: 'numeric' })})`;
      case "quarter": return `Trimestre en cours (Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()})`;
      case "year": return `Année en cours (${now.getFullYear()})`;
      case "custom":
        if (customDateDebut && customDateFin) {
          const start = new Date(customDateDebut);
          const end = new Date(customDateFin);
          return `Période personnalisée (${start.toLocaleDateString('fr-FR')} - ${end.toLocaleDateString('fr-FR')})`;
        } else if (customDateDebut) {
          return `À partir du ${new Date(customDateDebut).toLocaleDateString('fr-FR')}`;
        } else {
          return "Période personnalisée";
        }
      default: return "Période actuelle";
    }
  }

  function reinitialiserFiltres() {
    setPeriod("month");
    setCustomDateDebut(null);
    setCustomDateFin(null);
  }

  if (loading && !entrepriseId) {
    return (
      <main className="min-h-screen bg-gray-950 p-10 text-white">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="mb-4 text-2xl">Chargement...</div>
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-950 p-10 text-white">
        <div className="flex items-center justify-center h-screen">
          <div className="bg-red-900 border border-red-700 rounded-lg p-6 max-w-md text-center">
            <h2 className="text-2xl font-bold mb-4 text-red-400">Erreur</h2>
            <p className="text-red-300">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
            >
              Réessayer
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-5xl font-bold">Rentabilité</h1>
        <a href="/dashboard" className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-700">
          Retour au Dashboard
        </a>
      </div>

      {/* Section des filtres de période */}
      <div className="mb-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Date début</label>
            <input
              type="date"
              value={customDateDebut || ""}
              onChange={(e) => setCustomDateDebut(e.target.value || null)}
              className="w-full rounded bg-gray-800 p-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Date fin</label>
            <input
              type="date"
              value={customDateFin || ""}
              onChange={(e) => setCustomDateFin(e.target.value || null)}
              className="w-full rounded bg-gray-800 p-3"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={setCustomPeriod}
              className="rounded bg-blue-600 px-4 py-3 hover:bg-blue-700 flex-1"
              disabled={!customDateDebut}
            >
              Appliquer
            </button>
            <button
              onClick={reinitialiserFiltres}
              className="rounded bg-gray-600 px-4 py-3 hover:bg-gray-700 flex-1"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl text-gray-400">Période: {getPeriodLabel()}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod("month")}
              className={`px-4 py-2 rounded ${period === "month" ? "bg-blue-600" : "bg-gray-800 hover:bg-gray-700"}`}
            >
              Mois
            </button>
            <button
              onClick={() => setPeriod("quarter")}
              className={`px-4 py-2 rounded ${period === "quarter" ? "bg-blue-600" : "bg-gray-800 hover:bg-gray-700"}`}
            >
              Trimestre
            </button>
            <button
              onClick={() => setPeriod("year")}
              className={`px-4 py-2 rounded ${period === "year" ? "bg-blue-600" : "bg-gray-800 hover:bg-gray-700"}`}
            >
              Année
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-gray-400">Chargement des données...</p>
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <p className="text-gray-400">Chiffre d'Affaires</p>
              <h2 className="text-3xl font-bold text-green-400 mt-2">
                {formatPrix(caTotal)}
              </h2>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <p className="text-gray-400">Dépenses Totales</p>
              <h2 className="text-3xl font-bold text-red-400 mt-2">
                {depensesTotal > 0 ? formatPrix(depensesTotal) : "Aucune dépense enregistrée"}
              </h2>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <p className="text-gray-400">Bénéfice Net</p>
              <h2 className="text-3xl font-bold text-emerald-400 mt-2">
                {formatPrix(beneficeNet)}
              </h2>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <p className="text-gray-400">Marge</p>
              <h2 className="text-3xl font-bold text-blue-400 mt-2">
                {caTotal > 0 ? formatPourcentage(marge) : "N/A"}
              </h2>
            </div>
          </div>

          {/* Nouvelle ligne pour les indicateurs supplémentaires */}
          <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <p className="text-gray-400">Factures Payées</p>
              <h2 className="text-3xl font-bold text-purple-400 mt-2">
                {facturesPayees}
              </h2>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <p className="text-gray-400">Livraisons Réalisées</p>
              <h2 className="text-3xl font-bold text-yellow-400 mt-2">
                {livraisonsRealisees}
              </h2>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <p className="text-gray-400">Panier Moyen</p>
              <h2 className="text-3xl font-bold text-cyan-400 mt-2">
                {facturesPayees > 0 ? formatPrix(caTotal / facturesPayees) : "N/A"}
              </h2>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <p className="text-gray-400">Taux de Rentabilité</p>
              <h2 className="text-3xl font-bold text-indigo-400 mt-2">
                {caTotal > 0 ? formatPourcentage((beneficeNet / caTotal) * 100) : "N/A"}
              </h2>
            </div>
          </div>

          {/* Section graphiques simples sans bibliothèque externe */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h3 className="text-lg font-semibold mb-4">Répartition CA/Dépenses</h3>
              <div className="flex items-end gap-4 h-40">
                <div className="flex-1 flex flex-col justify-end">
                  <div
                    className="bg-green-500 rounded-t"
                    style={{ height: `${caTotal > 0 ? (caTotal / (caTotal + depensesTotal)) * 100 : 0}%` }}
                    title={`CA: ${formatPrix(caTotal)}`}
                  ></div>
                  <p className="text-center text-sm text-green-400 mt-2">CA</p>
                </div>
                <div className="flex-1 flex flex-col justify-end">
                  <div
                    className="bg-red-500 rounded-t"
                    style={{ height: `${depensesTotal > 0 ? (depensesTotal / (caTotal + depensesTotal)) * 100 : 0}%` }}
                    title={`Dépenses: ${formatPrix(depensesTotal)}`}
                  ></div>
                  <p className="text-center text-sm text-red-400 mt-2">Dépenses</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h3 className="text-lg font-semibold mb-4">Bénéfice Net</h3>
              <div className="flex items-center justify-center h-40">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="40%"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      className="text-gray-700"
                    />
                    <circle
                      cx="50%"
                      cy="50%"
                      r="40%"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="transparent"
                      strokeDasharray={`${(beneficeNet / (caTotal || 1)) * 100} 100`}
                      strokeLinecap="round"
                      className={beneficeNet >= 0 ? "text-emerald-500" : "text-red-500"}
                      transform="rotate(-90)"
                      style={{ transformOrigin: "50% 50%" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={beneficeNet >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {beneficeNet >= 0 ? "+" : ""}{formatPrix(beneficeNet)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}