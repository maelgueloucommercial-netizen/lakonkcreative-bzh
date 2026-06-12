/**
 * Sprint 4.2 — A/B testing runtime (côté Astro static build).
 *
 * Au build, picks la variante active selon abStartDate :
 *  - jours 0-6  → variantA
 *  - jours 7-13 → variantB
 *  - jours 14+  → original
 *
 * Le cron admin `30 9 * * *` rebuild les sites au minimum 1×/semaine via
 * un commit no-op (ou auto-pub d'une nouvelle fiche) → déclenche le
 * redeploy CF Pages → la variante affichée bascule automatiquement.
 *
 * Mesure CTR : GSC sync (cron 5h45) compare CTR par URL sur les 14j et
 * stocke le gagnant dans audit_logs.
 */
export interface AbVariants {
  variantA: { title: string; description: string };
  variantB: { title: string; description: string };
  rationale?: string;
}

export function pickActiveAbVariant(
  original: { title: string; description: string },
  variants: AbVariants | undefined,
  startDate: Date | undefined,
): { active: 'original' | 'A' | 'B'; title: string; description: string } {
  if (!variants || !startDate) return { active: 'original', ...original };
  const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / 86400_000);
  if (daysSinceStart < 0) return { active: 'original', ...original };
  if (daysSinceStart < 7) return { active: 'A', ...variants.variantA };
  if (daysSinceStart < 14) return { active: 'B', ...variants.variantB };
  return { active: 'original', ...original };
}
