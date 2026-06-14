/**
 * Config AdSense — publisher + slots d'unités manuelles in-content.
 *
 * Auto Ads (script global dans Base.astro) sert déjà sans slot. Ici on ajoute
 * des UNITÉS MANUELLES placées stratégiquement (meilleur revenu + contrôle).
 *
 * `enabled` : mettre à false sur un site NON conforme (contenu adulte, etc.)
 * pour ne servir AUCUNE pub manuelle (protège le compte AdSense). Le script
 * global Auto Ads doit aussi être retiré du Base.astro de ces sites.
 *
 * Un `<ins>` ne s'affiche que si `enabled` ET le slot est rempli.
 */
export const ADSENSE = {
  client: 'ca-pub-6150167828140567',
  enabled: true,
  /** slot = ID numérique du dashboard ; format = type d'unité AdSense. */
  slots: {
    inArticleTop: { slot: '8466253345', format: 'auto' as 'auto' | 'autorelaxed' | 'fluid' },
    inArticleEnd: { slot: '2729572866', format: 'autorelaxed' as 'auto' | 'autorelaxed' | 'fluid' },
    inArticleMid: { slot: '', format: 'auto' as 'auto' | 'autorelaxed' | 'fluid' },
  },
} as const;

export type AdSlotKey = keyof typeof ADSENSE.slots;
