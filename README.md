# Ma Vitrine

SaaS de boutiques personnelles : catalogue public, panier, commandes sans intermédiaire et tableau de bord vendeur. Chaque boutique possède un lien `/boutique/[slug]`. Le site publié est accessible sur [Ma Vitrine](https://maison-vitrine-catalogue.dfkcb32838326.chatgpt.site).

## Fonctionnalités réellement disponibles

- Page de présentation du SaaS, boutiques publiques et fiches produits.
- Création d’une boutique après connexion ChatGPT ; profil, couverture, couleurs et paramètres de mise en page modifiables.
- Produits avec photo principale et galerie complémentaire, recherche et tri dans la boutique.
- Panier local au navigateur ; confirmation créant une commande persistante, sans encaisser d’argent. Tentatives répétées de la même commande dédupliquées.
- Tableau de bord vendeur : produits, clients, commandes, statuts, historique de suivi et informations de paiement déclarées par le vendeur.
- Interface d’administration réservée aux comptes listés dans la variable secrète `ADMIN_EMAILS` du runtime.

**Limites importantes :** les tarifs de l’abonnement sont indicatifs et aucun abonnement n’est encaissé ou appliqué automatiquement. Le paiement de la commande est organisé directement avec le vendeur. Les emails de confirmation automatiques, les domaines personnalisés et la synchronisation du backend Python ne sont pas encore disponibles.

## Architecture du site publié

- `app/` : pages React/Vinext, formulaires, actions serveur et API de commande ; les contrôles d’accès vendeur s’appuient sur l’identité fournie par Sites.
- `db/schema.ts`, `drizzle/` : schéma et migrations SQLite/D1 versionnées.
- Cloudflare D1 conserve boutiques, produits et commandes ; R2 conserve les images. Le navigateur conserve uniquement le panier provisoire.
- `.openai/hosting.json` : identifiant du projet et déclarations des bindings logiques Sites.
- `backend/` : backend **FastAPI indépendant**, documenté et testé localement. **Il n’est pas connecté au site publié et n’héberge aucune donnée de production.** Voir [`backend/README.md`](backend/README.md).

## Développement local

Node.js 22.13+ et pnpm 11.25+.

```sh
pnpm install
pnpm run dev
pnpm exec tsc --noEmit
pnpm run build
```

Le runtime local simule les bindings D1 et R2 selon `vite.config.ts`. Certaines pages de tableau de bord nécessitent la connexion Sites. Ne commettez pas de fichiers `.env`, clés, jetons, données locales ou sorties de compilation.

## Déploiement

Le projet est publié avec Sites. Conserver le même `project_id` dans `.openai/hosting.json`, générer une nouvelle migration avec `pnpm run db:generate` après tout changement du schéma et publier avec le workflow Sites. Les migrations déjà appliquées ne doivent pas être réécrites. Un miroir GitHub du code peut être maintenu séparément du dépôt source Sites.
