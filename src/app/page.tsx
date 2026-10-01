'use client';

import { ArrowRight, Check, ChevronDown, Truck, Users, FileText, MapPin, DollarSign, BarChart, CreditCard, Shield, Clock, Cloud, Zap, PieChart } from 'lucide-react';
import { useState } from 'react';

export default function Home() {

  // FAQ state
  const [activeFaq, setActiveFaq] = useState<number | null>(null);


  const faqs = [
    {
      question: "Quelle est la période d'essai ?",
      answer: "Vous bénéficiez de 30 jours d'essai gratuit, sans carte bancaire et sans engagement."
    },
    {
      question: "À quelles entreprises s'adresse le logiciel ?",
      answer: "La solution est conçue pour les artisans, TPE et PME du transport routier qui souhaitent centraliser leur gestion dans un outil simple."
    },
    {
      question: "Quelles opérations puis-je gérer ?",
      answer: "Vous pouvez gérer vos clients, devis, livraisons, véhicules, conducteurs, factures, dépenses et suivre la rentabilité de votre activité."
    },
    {
      question: "Puis-je créer mes documents de transport ?",
      answer: "Oui. Le logiciel permet de gérer les informations nécessaires à vos livraisons et de générer notamment vos bons de transport et CMR."
    }
  ];


  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <main className="bg-white text-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex-shrink-0">
                <span className="text-xl font-bold text-gray-900">TRANSPORT</span>
                <span className="text-xl font-bold text-green-600">ERP</span>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-6">
                <a href="/" className="text-gray-900 hover:text-green-600 px-3 py-2 text-sm font-medium">Accueil</a>
<a href="#modules" className="text-gray-500 hover:text-green-600 px-3 py-2 text-sm font-medium">Fonctionnalités</a>
<a href="#tarifs" className="text-gray-500 hover:text-green-600 px-3 py-2 text-sm font-medium">Tarifs</a>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/login" className="text-gray-500 hover:text-green-600 text-sm font-medium">Connexion</a>
              <a href="/register" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">ESSAI GRATUIT</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                TRANSPORT SIMPLIFIÉ.<br />
                GESTION MAÎTRISÉE.
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                ERP conçu spécialement pour les artisans, TPE et PME du transport routier.
              </p>
              <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                Remplacez Excel, Word, WhatsApp et le papier<br />
                par une seule solution de gestion.<br />
                Créez et suivez vos devis simplement,<br />
                générez vos CMR automatiquement,<br />
                et pilotez enfin votre rentabilité.
              </p>
              <p className="text-sm text-gray-500 mb-6 italic">
                Gérez un transport de A à Z : devis, livraison, CMR, facture et rentabilité.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="/register" className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium transition-colors inline-flex items-center">
                  🚛 Essayer gratuitement pendant 30 jours
                  <ArrowRight className="ml-2 w-4 h-4" />
                </a>
                <a href="#modules" className="bg-white hover:bg-gray-50 text-gray-900 px-6 py-3 rounded-md font-medium transition-colors border border-gray-200 inline-flex items-center">
                  Découvrir le logiciel
                  <ArrowRight className="ml-2 w-4 h-4" />
                </a>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  Sans carte bancaire
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  Sans engagement
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                 30 jours pour tester
                </div>
              </div>
            </div>

          </div>
        </div>
        </section>

      {/* Trust Banner */}
      <section className="py-8 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center">
              <Shield className="w-6 h-6 text-gray-600 mb-2" />
             <span className="text-sm font-medium text-gray-700">Conçu pour le transport routier</span>
            </div>
            <div className="flex flex-col items-center">
              <FileText className="w-6 h-6 text-gray-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">CMR et bons de transport intégrés</span>
            </div>
            <div className="flex flex-col items-center">
              <Cloud className="w-6 h-6 text-gray-600 mb-2" />
            <span className="text-sm font-medium text-gray-700">Accès sécurisé à votre espace</span>
            </div>
            <div className="flex flex-col items-center">
              <Zap className="w-6 h-6 text-gray-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Mises à jour incluses</span>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
               Du devis au paiement, dans un même workflow
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Centralisez les informations de vos opérations dans un même outil.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { name: "Client", icon: Users },
                { name: "Devis", icon: FileText },
                { name: "Livraison", icon: Truck },
                { name: "Bon de transport", icon: MapPin },
                { name: "CMR", icon: FileText },
                { name: "Facture", icon: DollarSign },
                { name: "Paiement", icon: CreditCard },
                { name: "Rentabilité", icon: BarChart }

].map((step, index) => {
  const StepIcon = step.icon

  return (
    <div key={step.name} className="flex items-center gap-3 bg-white p-4 rounded-lg border border-gray-100">
     <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
        <StepIcon className="w-4 h-4 text-green-600" />
      </div>

      <span className="font-medium text-gray-900">
        {step.name}
      </span>

      {index < 7 && (
       <ChevronDown className="ml-auto w-4 h-4 text-gray-400" />
      )}
    </div>
  )
})}


            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="modules" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
             Tout ce qu’il vous faut pour gérer votre activité
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "Clients", icon: Users, description: "Gestion complète de votre portefeuille clients" },
              { name: "Devis", icon: FileText, description: "Création et suivi de devis professionnels" },
              { name: "Livraisons", icon: Truck, description: "Planification et suivi des livraisons" },
              { name: "Camions", icon: Truck, description: "Gestion de votre flotte de véhicules" },
              { name: "Chauffeurs", icon: Users, description: "Gestion de vos conducteurs" },
              { name: "Factures", icon: DollarSign, description: "Création et suivi de vos factures" },
              { name: "Dépenses", icon: CreditCard, description: "Enregistrement et suivi de vos dépenses" },
              { name: "Rentabilité", icon: BarChart, description: "Analyse de rentabilité par client et trajet" }
            ].map((module) => (
              <div
                key={module.name}
                className="bg-white p-6 rounded-lg border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center mb-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <module.icon className="w-4 h-4 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{module.name}</h3>
                </div>
                <p className="text-sm text-gray-500">{module.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Les bénéfices concrets pour votre entreprise
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Gagnez du temps</h3>
              <p className="text-sm text-gray-500">Centralisez vos opérations et limitez les ressaisies</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Gérez votre facturation</h3>
              <p className="text-sm text-gray-500">Créez et suivez vos factures dans le même outil</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Retrouvez vos documents</h3>
              <p className="text-sm text-gray-500">Centralisez vos documents liés aux opérations de transport</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <PieChart className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Pilotez votre rentabilité</h3>
              <p className="text-sm text-gray-500">Analysez enfin la performance de votre activité</p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
             Centralisez votre gestion
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Avant</h3>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between">
                  <span className="text-gray-700">Excel</span>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between">
                  <span className="text-gray-700">Word</span>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between">
                  <span className="text-gray-700">WhatsApp</span>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between">
                  <span className="text-gray-700">Papier</span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Après</h3>
              <div className="space-y-4">
                <div className="bg-green-600 text-white p-4 rounded-lg flex items-center justify-between">
                  <span>ERP Transport</span>
                  <Check className="w-5 h-5" />
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between">
                 <span className="text-gray-700">Gestion centralisée</span>
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between">
                  <span className="text-gray-700">Documents professionnels</span>
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between">
                  <span className="text-gray-700">Rentabilité</span>
                  <Check className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="tarifs" className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Une offre simple, sans surprise
            </h2>
            <p className="text-gray-600">
              Toutes les fonctionnalités de TransportERP dans une seule offre.
            </p>
          </div>

          <div className="max-w-xl mx-auto bg-white p-8 rounded-lg border-2 border-green-600 shadow-lg">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                TRANSPORTERP
              </h3>

              <div className="mb-2">
                <span className="text-4xl font-bold text-gray-900">59 € HT</span>
                <span className="text-gray-500">/mois</span>
              </div>

              <p className="text-gray-500 mb-6">
                ou 590 € HT/an
              </p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="font-semibold text-green-700">
                  Offre Membres Fondateurs
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Les 10 premiers clients bénéficient de 39 € HT/mois pendant 12 mois.
                </p>
              </div>

              <ul className="space-y-3 text-sm text-gray-600 mb-8 text-left">
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  Toutes les fonctionnalités incluses
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  30 jours d'essai gratuit
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  Sans carte bancaire pendant l'essai
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  Mises à jour incluses
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  Sans engagement
                </li>
              </ul>

              <a
                href="/register"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-md font-medium transition-colors inline-block"
              >
                Essayer gratuitement pendant 30 jours
              </a>
            </div>
          </div>
        </div>
      </section>
      {/* FAQ Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Questions fréquentes
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transform transition-transform ${activeFaq === index ? 'rotate-180' : ''}`}
                  />
                </button>
                <div className={`px-6 pb-4 text-gray-600 overflow-hidden transition-all duration-300 ${activeFaq === index ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                  {faq.answer}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-green-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Reprenez le contrôle de votre entreprise.
          </h2>
          <p className="text-lg text-green-100 mb-8 max-w-2xl mx-auto">
            Passez à l'ERP conçu spécialement pour les petites entreprises de transport.
          </p>
          <a href="/register" className="bg-white text-green-600 px-8 py-3 rounded-md font-medium hover:bg-gray-100 transition-colors inline-flex items-center">
            Commencer gratuitement
            <ArrowRight className="ml-2 w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Produit</h3>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#modules" className="hover:text-gray-900">Fonctionnalités</a></li>
                <li><a href="#tarifs" className="hover:text-gray-900">Tarifs</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Transport ERP. Tous droits réservés.
            </p>

          </div>
        </div>
        </footer>
    </main>
  );
}