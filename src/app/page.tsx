import ScreenPlaceholder from '@/components/ScreenPlaceholder';
import { ArrowRight, Check, ChevronDown, ChevronRight, Truck, Users, FileText, MapPin, DollarSign, BarChart, CreditCard, Shield, Clock, Headset, Cloud, Zap, Target, PieChart, HelpCircle } from 'lucide-react';

export default function Home() {
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
                  <a href="#" className="text-gray-900 hover:text-green-600 px-3 py-2 text-sm font-medium">Accueil</a>
                  <a href="#" className="text-gray-500 hover:text-green-600 px-3 py-2 text-sm font-medium">Fonctionnalités</a>
                  <a href="#" className="text-gray-500 hover:text-green-600 px-3 py-2 text-sm font-medium">Tarifs</a>
                  <a href="#" className="text-gray-500 hover:text-green-600 px-3 py-2 text-sm font-medium">Documentation</a>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a href="#" className="text-gray-500 hover:text-green-600 text-sm font-medium">Connexion</a>
              <a href="#" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">ESSAI GRATUIT</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                TRANSPORT SIMPLIFIÉ.<br />
                GESTION MAÎTRISÉE.
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Le premier ERP de gestion conçu pour les petites entreprises de transport.
              </p>
              <p className="text-lg text-gray-500 mb-8 leading-relaxed">
                Gérez vos clients,<br />
                vos devis,<br />
                vos livraisons,<br />
                vos factures<br />
                et votre rentabilité<br />
                dans une seule application.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <a href="#" className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium transition-colors inline-flex items-center">
                  Commencer gratuitement
                  <ArrowRight className="ml-2 w-4 h-4" />
                </a>
                <a href="#" className="bg-white hover:bg-gray-50 text-gray-900 px-6 py-3 rounded-md font-medium transition-colors border border-gray-200 inline-flex items-center">
                  Voir une démonstration
                  <ArrowRight className="ml-2 w-4 h-4" />
                </a>
              </div>
              <div className="mt-6 flex items-center justify-center lg:justify-start space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  30 jours gratuits
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  Sans carte bancaire
                </div>
                <div className="flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  Mise en route en moins de 20 minutes
                </div>
              </div>
            </div>
            <div className="mt-12 lg:mt-0">
              <ScreenPlaceholder
                title="Dashboard"
                subtitle="Tableau de bord complet"
                className="mx-auto"
              />
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
              <span className="text-sm font-medium text-gray-700">ERP français</span>
            </div>
            <div className="flex flex-col items-center">
              <Headset className="w-6 h-6 text-gray-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Support réactif</span>
            </div>
            <div className="flex flex-col items-center">
              <Cloud className="w-6 h-6 text-gray-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Hébergement sécurisé</span>
            </div>
            <div className="flex flex-col items-center">
              <Zap className="w-6 h-6 text-gray-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Mises à jour incluses</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Vous transportez des marchandises.
          </h2>
          <h3 className="text-2xl font-semibold text-gray-700 mb-8">
            Pourquoi perdre du temps avec votre gestion ?
          </h3>
          <div className="flex justify-center items-center space-x-8 mb-12">
            <div className="text-center">
              <div className="bg-gray-100 rounded-lg p-4 mb-2 inline-block">
                <span className="text-sm font-medium">Excel</span>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-gray-400" />
            <div className="text-center">
              <div className="bg-green-600 text-white rounded-lg p-4 mb-2 inline-block">
                <span className="text-sm font-medium">ERP Transport</span>
              </div>
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
                Un workflow unique du devis au paiement
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Une seule saisie. Plus aucune double ressaisie.
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
              ].map((step, index) => (
                <div key={step.name} className="flex items-center p-4 bg-white rounded-lg border border-gray-100">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-4">
                    <step.icon className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="font-medium text-gray-900">{step.name}</span>
                  {index < 7 && <ChevronDown className="ml-auto w-5 h-5 text-gray-300" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tous vos modules de gestion unifiés
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "Clients", icon: Users, description: "Gestion complète de votre portefeuille clients" },
              { name: "Devis", icon: FileText, description: "Création et suivi de devis professionnels" },
              { name: "Livraisons", icon: Truck, description: "Planification et suivi des livraisons" },
              { name: "Camions", icon: Truck, description: "Gestion de votre flotte de véhicules" },
              { name: "Chauffeurs", icon: Users, description: "Suivi des conducteurs et de leurs activités" },
              { name: "Factures", icon: DollarSign, description: "Facturation automatique et professionnelle" },
              { name: "Dépenses", icon: CreditCard, description: "Suivi des dépenses et gestion financière" },
              { name: "Rentabilité", icon: BarChart, description: "Analyse de rentabilité par client et trajet" }
            ].map((module) => (
              <div
                key={module.name}
                className="bg-white p-6 rounded-lg border border-gray-100 hover:shadow-md transition-shadow cursor-pointer group"
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
              <p className="text-sm text-gray-500">Plusieurs heures économisées chaque semaine grâce à l'automatisation</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Facturez plus vite</h3>
              <p className="text-sm text-gray-500">Factures générées et envoyées en quelques clics</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Retrouvez vos documents</h3>
              <p className="text-sm text-gray-500">Tous vos documents accessibles en quelques secondes</p>
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

      {/* Product Preview Slider */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Découvrez l'interface intuitive
            </h2>
          </div>
          <div className="relative">
            <div className="overflow-hidden">
              <div className="flex transition-transform duration-300 ease-in-out">
                {[
                  { title: "Dashboard", subtitle: "Vue d'ensemble de votre activité" },
                  { title: "Clients", subtitle: "Gestion de votre portefeuille" },
                  { title: "Devis", subtitle: "Création de devis professionnels" },
                  { title: "Livraisons", subtitle: "Suivi des livraisons en temps réel" },
                  { title: "Factures", subtitle: "Facturation simplifiée" },
                  { title: "Rentabilité", subtitle: "Analyse de performance" }
                ].map((preview, index) => (
                  <div key={preview.title} className="w-full flex-shrink-0 px-4">
                    <ScreenPlaceholder
                      title={preview.title}
                      subtitle={preview.subtitle}
                      height="300px"
                    />
                  </div>
                ))}
              </div>
            </div>
            <button className="absolute left-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-md hover:bg-gray-50">
              <ChevronRight className="w-5 h-5 text-gray-600 -rotate-180" />
            </button>
            <button className="absolute right-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-md hover:bg-gray-50">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Passez à l'ère moderne
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
                  <span className="text-gray-700">Workflow unique</span>
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
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Des tarifs adaptés à votre taille
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="bg-white p-8 rounded-lg border border-gray-200 flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">STARTER</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">39 €</span>
                <span className="text-gray-500">/mois</span>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 mb-8 flex-grow">
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  1 utilisateur
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  50 devis/mois
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  50 factures/mois
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  Support email
                </li>
              </ul>
              <button className="w-full bg-white border border-green-600 text-green-600 py-2 rounded-md font-medium hover:bg-green-50 transition-colors">
                Choisir STARTER
              </button>
            </div>

            {/* Pro Plan (Featured) */}
            <div className="bg-green-600 text-white p-8 rounded-lg border border-green-700 flex flex-col transform scale-105">
              <h3 className="text-lg font-semibold mb-2">PRO</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">69 €</span>
                <span className="text-green-200">/mois</span>
              </div>
              <ul className="space-y-3 text-sm text-green-100 mb-8 flex-grow">
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-200 mr-2" />
                  3 utilisateurs
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-200 mr-2" />
                  Devis illimités
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-200 mr-2" />
                  Factures illimitées
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-200 mr-2" />
                  Support prioritaire
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-200 mr-2" />
                  Analyse avancée
                </li>
              </ul>
              <button className="w-full bg-white text-green-600 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors">
                Choisir PRO
              </button>
            </div>

            {/* Business Plan */}
            <div className="bg-white p-8 rounded-lg border border-gray-200 flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">BUSINESS</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">99 €</span>
                <span className="text-gray-500">/mois</span>
              </div>
              <ul className="space-y-3 text-sm text-gray-600 mb-8 flex-grow">
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  10 utilisateurs
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  Toutes fonctionnalités
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  Support dédié
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-green-600 mr-2" />
                  Formation incluse
                </li>
              </ul>
              <button className="w-full bg-white border border-green-600 text-green-600 py-2 rounded-md font-medium hover:bg-green-50 transition-colors">
                Choisir BUSINESS
              </button>
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
            {[
              {
                question: "Quelle est la période d'essai ?",
                answer: "Nous offrons 30 jours d'essai gratuit sans engagement et sans carte bancaire requise."
              },
              {
                question: "Puis-je importer mes données existantes ?",
                answer: "Oui, nous proposons des outils d'import pour Excel et autres formats courants."
              },
              {
                question: "Comment se passe la formation ?",
                answer: "Nous fournissons des guides vidéo, une documentation complète et un support réactif."
              },
              {
                question: "Quelle est la politique de remboursement ?",
                answer: "Vous pouvez annuler à tout moment et nous offrons une garantie satisfait ou remboursé de 14 jours."
              },
              {
                question: "Le logiciel est-il sécurisé ?",
                answer: "Oui, nous utilisons un hébergement français sécurisé avec chiffrement des données."
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200">
                <button className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  <ChevronDown className="w-5 h-5 text-gray-400 transform transition-transform" />
                </button>
                <div className="px-6 pb-4 text-gray-600 hidden">
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
          <a href="#" className="bg-white text-green-600 px-8 py-3 rounded-md font-medium hover:bg-gray-100 transition-colors inline-flex items-center">
            Commencer gratuitement
            <ArrowRight className="ml-2 w-4 h-4" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Produit</h3>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-900">Fonctionnalités</a></li>
                <li><a href="#" className="hover:text-gray-900">Tarifs</a></li>
                <li><a href="#" className="hover:text-gray-900">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-900">Contact</a></li>
                <li><a href="#" className="hover:text-gray-900">Centre d'aide</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Entreprise</h3>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-900">À propos</a></li>
                <li><a href="#" className="hover:text-gray-900">Blog</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Légal</h3>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><a href="#" className="hover:text-gray-900">Mentions légales</a></li>
                <li><a href="#" className="hover:text-gray-900">Confidentialité</a></li>
                <li><a href="#" className="hover:text-gray-900">CGU</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Transport ERP. Tous droits réservés.
            </p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">Twitter</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 006 18.407a11.616 11.616 0 01-2.541-.18z" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">LinkedIn</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}