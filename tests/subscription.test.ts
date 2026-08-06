/**
 * Tests unitaires pour le système d'essai gratuit
 * 
 * Ces tests vérifient la logique métier sans dépendre de Supabase
 */

// Mock pour éviter l'import de 'server-only'
import { vi, describe, test, expect } from 'vitest';
vi.mock('server-only', () => ({}));

import { calculateTrialRemainingDays, evaluateSubscription, SubscriptionRawData } from '../src/lib/subscriptionAccess';

describe('Système d\'essai gratuit', () => {
  describe('calculateTrialRemainingDays', () => {
    test('retourne null pour une date nulle', () => {
      expect(calculateTrialRemainingDays(null)).toBeNull();
    });

    test('retourne null pour une date invalide', () => {
      expect(calculateTrialRemainingDays('date-invalide')).toBeNull();
    });

    test('retourne 0 pour une date déjà passée', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(calculateTrialRemainingDays(pastDate.toISOString())).toBe(0);
    });

    test('calcule correctement les jours restants', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      futureDate.setHours(23, 59, 59, 999); // Fin de journée
      
      // Avec arrondi au supérieur, 5 jours restants
      expect(calculateTrialRemainingDays(futureDate.toISOString())).toBe(5);
    });

    test('utilise la date de référence fournie', () => {
      const trialEndsAt = new Date('2026-08-10T00:00:00Z').toISOString();
      const referenceDate = new Date('2026-08-05T00:00:00Z');
      
      expect(calculateTrialRemainingDays(trialEndsAt, referenceDate)).toBe(5);
    });
  });

  describe('evaluateSubscription', () => {
    const baseData: SubscriptionRawData = {
      role: 'admin',
      entrepriseId: 'entreprise-123',
      subscriptionStatus: 'trialing',
      trialStartedAt: new Date().toISOString(),
      trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // +15 jours
    };

    test('refuse l\'accès si le profil est manquant', () => {
      const data: SubscriptionRawData = {
        ...baseData,
        role: null,
        entrepriseId: null,
      };

      const decision = evaluateSubscription(data);
      expect(decision.authorized).toBe(false);
      expect(decision.reason).toBe('profile_missing');
    });

    test('accorde l\'accès aux super_admin', () => {
      const data: SubscriptionRawData = {
        ...baseData,
        role: 'super_admin',
      };

      const decision = evaluateSubscription(data);
      expect(decision.authorized).toBe(true);
      expect(decision.reason).toBe('super_admin');
      expect(decision.subscriptionStatus).toBe('super_admin_exempt');
    });

    test('refuse l\'accès si l\'entreprise est manquante', () => {
      const data: SubscriptionRawData = {
        ...baseData,
        subscriptionStatus: null,
        trialStartedAt: null,
        trialEndsAt: null,
      };

      const decision = evaluateSubscription(data);
      expect(decision.authorized).toBe(false);
      expect(decision.reason).toBe('company_missing');
    });

    test('accorde l\'accès pour un essai valide', () => {
      const decision = evaluateSubscription(baseData);
      expect(decision.authorized).toBe(true);
      expect(decision.reason).toBe('trial_valid');
      expect(decision.subscriptionStatus).toBe('trialing');
      expect(decision.trialRemainingDays).toBeGreaterThan(0);
      expect(decision.trialExpired).toBe(false);
    });

    test('refuse l\'accès pour un essai expiré', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const data: SubscriptionRawData = {
        ...baseData,
        trialEndsAt: pastDate.toISOString(),
      };

      const decision = evaluateSubscription(data);
      expect(decision.authorized).toBe(false);
      expect(decision.reason).toBe('trial_expired');
      expect(decision.trialExpired).toBe(true);
      expect(decision.trialRemainingDays).toBe(0);
    });

    test('accorde l\'accès pour un abonnement actif', () => {
      const data: SubscriptionRawData = {
        ...baseData,
        subscriptionStatus: 'active',
      };

      const decision = evaluateSubscription(data);
      expect(decision.authorized).toBe(true);
      expect(decision.reason).toBe('active_subscription');
      expect(decision.subscriptionStatus).toBe('active');
    });

    test('refuse l\'accès pour un abonnement en retard', () => {
      const data: SubscriptionRawData = {
        ...baseData,
        subscriptionStatus: 'past_due',
      };

      const decision = evaluateSubscription(data);
      expect(decision.authorized).toBe(false);
      expect(decision.reason).toBe('subscription_past_due');
      expect(decision.subscriptionStatus).toBe('past_due');
    });

    test('refuse l\'accès pour un abonnement impayé', () => {
      const data: SubscriptionRawData = {
        ...baseData,
        subscriptionStatus: 'unpaid',
      };

      const decision = evaluateSubscription(data);
      expect(decision.authorized).toBe(false);
      expect(decision.reason).toBe('subscription_unpaid');
      expect(decision.subscriptionStatus).toBe('unpaid');
    });

    test('refuse l\'accès pour un abonnement annulé', () => {
      const data: SubscriptionRawData = {
        ...baseData,
        subscriptionStatus: 'canceled',
      };

      const decision = evaluateSubscription(data);
      expect(decision.authorized).toBe(false);
      expect(decision.reason).toBe('subscription_canceled');
      expect(decision.subscriptionStatus).toBe('canceled');
    });

    test('refuse l\'accès pour un abonnement expiré', () => {
      const data: SubscriptionRawData = {
        ...baseData,
        subscriptionStatus: 'expired',
      };

      const decision = evaluateSubscription(data);
      expect(decision.authorized).toBe(false);
      expect(decision.reason).toBe('subscription_expired');
      expect(decision.subscriptionStatus).toBe('expired');
    });

    test('refuse l\'accès pour un abonnement incomplet', () => {
      const data: SubscriptionRawData = {
        ...baseData,
        subscriptionStatus: 'incomplete',
      };

      const decision = evaluateSubscription(data);
      expect(decision.authorized).toBe(false);
      expect(decision.reason).toBe('subscription_incomplete');
      expect(decision.subscriptionStatus).toBe('incomplete');
    });

    test('refuse l\'accès pour un statut inconnu', () => {
      const data: SubscriptionRawData = {
        ...baseData,
        subscriptionStatus: 'unknown_status' as any,
      };

      const decision = evaluateSubscription(data);
      expect(decision.authorized).toBe(false);
      expect(decision.reason).toBe('unknown_status');
      expect(decision.subscriptionStatus).toBe('unknown');
    });

    test('refuse l\'accès pour un essai avec date invalide', () => {
      const data: SubscriptionRawData = {
        ...baseData,
        trialEndsAt: 'date-invalide',
      };

      const decision = evaluateSubscription(data);
      expect(decision.authorized).toBe(false);
      expect(decision.reason).toBe('invalid_trial');
    });
  });

  describe('Cas limites', () => {
    test('essai qui se termine aujourd\'hui', () => {
      const now = new Date();
      // Créer une date de fin pour demain à 00:00:00 UTC
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      
      const trialEndsAt = tomorrow.toISOString();

      const data: SubscriptionRawData = {
        role: 'admin',
        entrepriseId: 'entreprise-123',
        subscriptionStatus: 'trialing',
        trialStartedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // -1 jour
        trialEndsAt: trialEndsAt,
      };

      const decision = evaluateSubscription(data);
      // Avec normalisation UTC, 1 jour restant
      expect(decision.trialRemainingDays).toBe(1);
      expect(decision.trialExpired).toBe(false);
    });

    test('essai qui vient de se terminer', () => {
      const now = new Date();
      const trialEndsAt = new Date(now.getTime() - 1000); // -1 seconde

      const data: SubscriptionRawData = {
        role: 'admin',
        entrepriseId: 'entreprise-123',
        subscriptionStatus: 'trialing',
        trialStartedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // -1 jour
        trialEndsAt: trialEndsAt.toISOString(),
      };

      const decision = evaluateSubscription(data);
      expect(decision.trialRemainingDays).toBe(0);
      expect(decision.trialExpired).toBe(true);
      expect(decision.authorized).toBe(false);
    });
  });
});