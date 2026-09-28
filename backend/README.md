# MaVitrine — API Python / FastAPI

## Statut réel

Backend indépendant, exécutable et testé localement. **Le frontend publié utilise encore son backend TypeScript/D1. Il n'appelle pas encore cette API.** Aucun compte, produit ou commande de production n'a été migré. Sites héberge le frontend/Worker ; cette API Python nécessite un hébergement distinct.

## Architecture

- `app/domain/` : entités Python, erreurs métier et ports de persistance. Aucun import FastAPI ou SQLAlchemy.
- `app/services/commerce.py` : propriété des boutiques, validation des commandes, calcul des prix, idempotence et transitions de statut. Dépend du port `UnitOfWork`.
- `app/infrastructure/database.py` : mapping SQLAlchemy séparé des entités, repository et transactions.
- `app/api/` : routes par domaine, schémas d'entrée/sortie, authentification et injection des dépendances.
- `app/core/` : configuration et cryptographie.
- `migrations/` : migrations Alembic versionnées ; aucune création automatique de tables au démarrage.
- `tests/` : tests API isolés, base temporaire par test.

Séparation des responsabilités et inversion des dépendances pour les règles métier. Les requêtes de reporting utilisent SQLAlchemy directement dans les routes en lecture seule ; elles pourront être extraites dans des query services si leur complexité augmente. Le stockage d'images est local et constitue l'adaptateur à remplacer pour un stockage objet partagé.

## Démarrage

Python 3.12 ou plus récent. Depuis `backend/` :

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.lock
cp .env.example .env
python -c "import secrets; print(secrets.token_hex(32))"
```

Copier la valeur générée dans `JWT_SECRET` du fichier `.env`. Ne jamais la publier.

```sh
alembic upgrade head
uvicorn app.main:create_app --factory --reload
pytest -q
```

Documentation interactive : `http://localhost:8000/docs` ; schéma : `/openapi.json`.
Pour PostgreSQL, définir `DATABASE_URL=postgresql+psycopg://...`. Le pilote est inclus ; les tests de cette livraison ont été exécutés sur SQLite, pas PostgreSQL.

## Contrat HTTP

Toutes les routes applicatives commencent par `/api/v1`.

| Groupe | Routes principales |
| --- | --- |
| Authentification | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` |
| Catalogue public | `GET /shops`, `GET /shops/{slug}`, `GET /shops/{slug}/products`, `GET /shops/{slug}/products/{id}` |
| Commande publique | `POST /shops/{slug}/orders` avec en-tête `Idempotency-Key` (16–100 caractères) |
| Boutique vendeur | `GET /seller/shop`, `PUT /seller/shop` |
| Produits vendeur | `GET /seller/products`, `POST /seller/products`, `PUT /seller/products/{id}`, `DELETE /seller/products/{id}` |
| Commandes vendeur | `GET /seller/orders`, `GET /seller/orders/{id}`, `PATCH /seller/orders/{id}` |
| Pilotage vendeur | `GET /seller/metrics`, `GET /seller/clients` |
| Administration | `GET /admin/metrics`, `GET /admin/shops`, `PATCH /admin/shops/{id}`, `GET /admin/orders` |
| Images | `POST /uploads` (multipart champ `file`), images publiques sous `/media/` |

L'authentification renvoie un JWT court, envoyé dans `Authorization: Bearer ...`. L'inscription ne permet jamais de choisir un rôle. Le compte admin est promu uniquement par un opérateur après création :

```sh
python -m app.cli promote-admin admin@example.com
```

Les prix sont des entiers en **centièmes de devise**, comme dans le frontend existant : `490000` représente `4 900 XOF`. Les prix du panier sont relus en base. Le client ne peut pas fournir le total. Les commandes conservent une copie du nom et du prix des articles, même après archivage du produit.

Les listes acceptent `offset` et `limit` (maximum 100). Une clé d'idempotence est unique par boutique : rejouer le même contenu restitue la commande existante ; changer le contenu produit un conflit. Deux requêtes concurrentes peuvent provoquer un conflit SQL : le client doit réessayer avec la même clé, jamais une nouvelle clé automatique.

## Sécurité et limites avant production

- Argon2 pour les mots de passe, JWT signé avec expiration, audience et émetteur vérifiés ; aucune confiance dans les en-têtes d'identité envoyés par un navigateur.
- Autorisation par propriétaire pour les produits et commandes ; rôle administrateur lu en base à chaque requête.
- Images décodées, limitées à 5 Mo / 16 mégapixels, réencodées en WebP avec nom aléatoire. Elles sont publiques et ne doivent contenir aucun document privé.
- La suspension d'une boutique masque son catalogue et bloque ses nouvelles commandes et modifications vendeur.
- Configurer HTTPS, limites de taille des requêtes et limitation de débit **avant exposition publique** (notamment login, inscription, commandes et uploads). La limite applicative des images intervient après le parsing multipart.
- Ajouter vérification d'email, récupération de mot de passe, révocation/renouvellement de session et journaux d'audit selon le besoin. Il n'y a pas encore de refresh token ou endpoint de révocation ; un token reste valable jusqu'à expiration, sauf désactivation du compte.
- Le paiement est manuel : aucun débit, abonnement automatique, remboursement ou webhook de paiement.
- Pas de gestion de stock, frais de livraison, taxes ou notifications email automatiques.
- Docker fourni ; lancer les migrations comme étape de release avant le serveur. Monter un volume persistant sur `/data/uploads` ; préférer un stockage objet pour plusieurs instances.

## Migration du frontend (reste à réaliser)

1. Choisir l'hébergement Python/PostgreSQL et son URL HTTPS.
2. Déployer les migrations et configurer le stockage, les secrets et CORS.
3. Définir le rattachement des identités ChatGPT actuelles aux nouveaux comptes (ne pas le déduire d'un email non vérifié).
4. Exporter/importer les données D1 et R2 avec mapping des propriétaires et contrôle des totaux.
5. Remplacer les accès D1 et Server Actions TypeScript par un adaptateur HTTP côté serveur ; brancher les formulaires d'authentification.
6. Tester la migration sur une copie, puis seulement basculer le site.

Les données réelles et les secrets ne font pas partie du dépôt GitHub.
