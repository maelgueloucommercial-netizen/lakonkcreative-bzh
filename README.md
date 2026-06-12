# darocco-fr

L'encyclopédie francophone de la cuisine italienne authentique. Site éditorial fondé sur le persona fictif de Lorenzo Da Rocco — consultant italo-français en cuisine italienne.

- **Stack** : Astro 5 (static) + Tailwind v4 + React islands + sitemap + Cloudflare Pages
- **Domaine prod** : `darocco.fr`
- **Registrar** : O2switch (les NS pointeront vers Cloudflare quand on déploiera)
- **Hébergement** : Cloudflare Pages
- **Identité** : fictive (cf doc projet §3 — collision avec restaurant Da Rocco actif au 119 rue de Grenelle Paris 7e)

## Architecture

5 piliers + blog éditorial :

1. **Régions** (`/regions`) — fiches des 20 régions italiennes : spécialités, AOP/DOP, plats emblématiques.
2. **Base de pâtes** (`/pates`) — 300+ formats prévus, sauces compatibles (règle d'aderenza), temps de cuisson exacts.
3. **Annuaire** (`/annuaire`) — épiceries italiennes authentiques en France par ville.
4. **Lexique** (`/lexique`) — termes culinaires italiens expliqués en français, avec prononciation.
5. **Boutique B2B** (`/boutique`) — catalogue produits AOP/DOP/IGP avec bouton "Demander un devis".

Plus le **blog** (`/blog`) avec recettes, guides et articles antifraude.

## Dev local

```bash
cd C:\Users\guelo\honda\reseau\darocco-fr
npm install
npm run dev    # http://localhost:4322 (port 4321 pris par felleries-admin)
```

## Build / déploiement

```bash
npm run build            # génère ./dist (HTML statique pur + sitemap)
npm run deploy           # nécessite wrangler login + projet Cloudflare Pages créé
```

## Étapes pour la prod

1. `wrangler pages project create darocco-fr --production-branch main`
2. Pointer NS de darocco.fr (chez O2switch) vers les NS Cloudflare donnés à la création de la zone
3. Cloudflare Pages → Custom domains → ajouter `darocco.fr` et `www.darocco.fr`
4. Cloudflare Email Routing → activer pour la zone, ajouter `contact@darocco.fr` → `mael.guelou.commercial@gmail.com`
5. `npm run deploy`

## Contenu initial livré

- 5 régions sur 20 (Sicile, Calabre, Émilie-Romagne, Toscane, Campanie)
- 5 formats de pâtes (Tagliatelle, Orecchiette, Bucatini, Penne, Tortellini)
- 5 termes du lexique (al dente, soffritto, mantecatura, 'nduja, antipasto)
- 3 articles backdatés (cinq erreurs pasta, cacio e pepe, italian sounding)
- 3 produits B2B (huile Laudemio AOP, Parmigiano 24 mois, 'Nduja IGP)
- 2 épiciers (Paris, Lyon)

À étoffer progressivement dans le rythme prévu par le doc projet §6 : 3 articles/semaine pendant 8 semaines, puis 1-2/semaine.

## Pages

- `/` — home avec hero, 5 piliers, articles récents, CTA B2B, teaser persona
- `/a-propos` — persona Lorenzo Da Rocco
- `/regions` + `/regions/[region]` — index + détail
- `/pates` + `/pates/[format]` — index + détail
- `/lexique` + `/lexique/[terme]` — index + détail
- `/annuaire` + (à venir) `/annuaire/[ville]`
- `/boutique` + `/boutique/[produit]` — catalogue B2B
- `/blog` + `/blog/[...slug]` — articles éditoriaux
- `/devis` — formulaire de demande de devis B2B
- `/devis-confirmation` — page de confirmation
- `/contact` — contact éditorial
- `/mentions-legales` — RGPD
- `/cgv-pro` — CGV B2B
- `/404` — page d'erreur

## Roadmap proche

- [ ] Compléter les 15 régions manquantes
- [ ] Étoffer la base de pâtes (objectif 300 formats sur 12 mois)
- [ ] React islands : carte régions interactive, sélecteur pasta-sauce
- [ ] OG images dynamiques par fiche
- [ ] Pages catégorie pour `/boutique/[categorie]` et `/annuaire/[ville]`
- [ ] Brancher le formulaire `/devis` à un vrai backend mail (Resend ou Cloudflare Email Workers)
