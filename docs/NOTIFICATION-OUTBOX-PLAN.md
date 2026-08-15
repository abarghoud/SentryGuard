# Plan — Outbox-lite de notifications sur `alert_events`

Branche cible : `feat/kafka-commit-before-notifications`
Statut : **implémenté** (étapes 1-6 et stats de l'étape 7) ; alarmes OCI à configurer côté console

---

## 1. Le pourquoi

### 1.1 Contexte

La branche `feat/kafka-commit-before-notifications` découple l'envoi des notifications (Telegram + push Expo) du traitement des messages Kafka :

- `VehicleAlertNotifierService.dispatch()` écrit l'alerte en DB (`alert_events`) puis enfile les envois dans `NotificationQueueService` (queue en mémoire, 5 workers, token bucket global 20/s).
- Le offset Kafka est commité dès le retour du handler (`kafka.service.ts` → `resolveOffset`), ce qui supprime la pression backpressure des appels Telegram/push sur le consumer et réduit la latence de traitement.

### 1.2 Problème

Le compromis actuel fait passer la livraison des notifications d'**at-least-once à at-most-once** :

| Scénario de perte | Conséquence aujourd'hui |
|---|---|
| Crash du process entre le commit du offset et l'envoi | notification perdue silencieusement |
| Queue pleine (`NOTIFICATION_QUEUE_SIZE` atteint) | notification dropée (log error uniquement) |
| Timeout du drain au graceful shutdown | notification perdue |

Les alertes étant persistées en DB et visibles dans l'onglet Alerts de l'app mobile, aucune alerte n'est jamais *totalement* perdue. Mais les notifications sont le cœur du produit : pour un break-in à 3h du matin, ce qui réveille l'utilisateur c'est le push, pas l'ouverture de l'app. Une notification silencieusement perdue est donc inacceptable ; une notification retardée de quelques minutes après un crash est acceptable.

### 1.3 Objectifs et contraintes

- **Zéro perte silencieuse** de notification (au pire : retardée, doublon possible).
- **Conserver le commit précoce du offset Kafka** — c'est l'apport principal de la branche.
- **Pas de mécanisme complexe de queue persistante** : pas de nouveau topic Kafka, pas de broker externe, pas de table outbox dédiée.
- S'appuyer sur l'existant : `alert_events`, crons NestJS, `DistributedLockService` (advisory lock Postgres).
- **Une notification en échec définitif ne doit jamais l'être en silence** : après un nombre d'essais plafonné, le statut `failed` est permanent (une notification trop retardée perd son intérêt) mais **observable** (compteur + alarme OCI). Pas de retry à cadence lente.

### 1.4 Alternatives écartées

| Alternative | Raison du rejet |
|---|---|
| Topic Kafka `notifications` dédié | Nouveau consumer group, rebalancing, rate-limiting global à refaire, DLQ — complexité élevée pour le besoin |
| Table outbox séparée | Redondante : `alert_events` contient déjà tout pour reconstruire une notification (`user_id`, `vin`, `type`, `severity`, `vehicle_display_name`, `created_at`) |
| Committer le offset seulement après envoi | Réintroduit le couplage latence Kafka ↔ Telegram/push que la branche supprime |

---

## 2. La solution proposée

**Principe : rendre l'intention de notifier durable en la couplant à l'écriture DB qui existe déjà, et faire de la DB le filet de rattrapage.**

```
Chemin nominal (inchangé)                Filet de sécurité (nouveau)
─────────────────────────                ─────────────────────────
Kafka msg                                Cron (1/min, advisory lock)
  → handler                                → SELECT alert_events
  → INSERT alert_events                      WHERE notification_status = 'pending'
      (notification_status = 'pending')      AND created_at < now() - 2 min
  → enqueue queue mémoire                   → ré-enfile dans la même queue
  → resolveOffset (tôt) ✅
  → workers envoient
  → UPDATE status = 'sent'
```

- **Chemin nominal** : la queue en mémoire reste le chemin principal. Aucune latence ajoutée en nominal.
- **Atomicité** : l'INSERT `alert_events` porte le statut `pending` — l'alerte et l'intention de notifier sont une seule écriture transactionnelle. Tout crash laisse une trace exploitable en DB.
- **Rattrapage** : un sweeper cron rattrape les lignes `pending` orphelines (crash, queue pleine, drain timeout) via `DistributedLockService` pour rester mono-instance.
- **Sémantique at-least-once** : un crash entre l'envoi réussi et le `UPDATE` peut produire un doublon — accepté (c'était déjà le cas de l'ancien design).

### Parcours détaillé d'une alerte

1. Handler Kafka (break-in ou sentry) → `VehicleAlertNotifierService.dispatch()`.
2. `SELECT vehicles` par VIN (users concernés) — synchrone, inchangé.
3. `AlertsService.record()` : `INSERT alert_events` **avec `notification_status = 'pending'`**, retourne les ids créés.
4. `enqueueUserNotifications()` enfile des **jobs sérialisables** `{ alertEventId, type, userId, vin, ... }` (plus de closures).
5. `dispatch()` retourne → `resolveOffset()` — latence Kafka préservée.
6. Workers (5 concurrents, token bucket 20/s) : résolvent le notifier via une registry `AlertEventType → notifier`, envoient, puis `UPDATE ... SET notification_status = 'sent' WHERE id = $id AND notification_status = 'pending'`.
7. Si étape 4/6 échoue ou crash : la ligne reste `pending`, le sweeper la ré-enfile au pire 2 minutes plus tard — **sauf si elle est déjà présente dans la queue en mémoire** (les jobs portent `alertEventId`, le sweeper interroge `notificationQueueService.has(alertEventId)` pour ne pas empiler de doublons pendant un backlog).

---

## 3. Étapes d'implémentation

### Étape 1 — Schéma : colonnes de statut sur `alert_events`

**Fichiers :**
- Modifier `apps/api/src/entities/alert-event.entity.ts` :
  - Nouvel enum `AlertEventNotificationStatus { Pending = 'pending', Sent = 'sent', Failed = 'failed' }`
  - Colonne `notification_status` (enum, default `pending`, nullable → voir note migration)
  - Colonne `notification_attempts` (int, default 0)
  - Index partiel `@Index('idx_alert_events_pending', ...)` sur `notification_status` où `pending` (recherche du sweeper en O(taille du backlog), pas O(table))
- Générer la migration :
  ```bash
  cd apps/api && npm run migration:generate -- alert-event-notification-status
  ```

**Note migration :** les lignes existantes doivent être rétro-compatible — `nullable: true` pour `notification_status` (les anciennes alertes n'ont pas vocation à être renvoyées ; le sweeper ignore les NULL). Ne pas backfiller.

**Justification :** une seule table touchée, pas de join supplémentaire, la purge existante (`deleteOldAlertEvents`, max 50/user) continue de fonctionner.

> **STOP — valider la migration et le diff d'entité avant de continuer.**

---

### Étape 2 — `AlertsService.record()` retourne l'événement créé

**Fichiers :**
- `apps/api/src/app/alerts/alerts.service.ts` :
  - `record()` retourne `Promise<string>` (l'id de l'`AlertEvent` créé) au lieu de `void` — l'INSERT porte déjà `notification_status = 'pending'` via le default
  - Nouvelle méthode `markNotificationSent(alertEventId: string): Promise<void>` — `UPDATE ... SET notification_status = 'sent' WHERE id = $id AND notification_status = 'pending'` (idempotent)
  - Nouvelle méthode `markNotificationAttemptFailed(alertEventId: string, maxAttempts: number): Promise<void>` — incrémente `notification_attempts`, passe à `failed` au-delà du seuil
- `apps/api/src/app/alerts/alerts.service.spec.ts` : couvrir les trois méthodes

**Justification :** centraliser les écritures de statut dans le service qui possède l'entité ; le `WHERE notification_status = 'pending'` du update rend le marquage idempotent (pas de doublon de compteur si sweep concurrent).

> **STOP — valider les tests de AlertsService.**

---

### Étape 3 — Registry de notifiers (suppression des closures)

**Problème :** aujourd'hui `AlertDispatchConfig.telegramNotifier` est une closure capturée par handler (ex. `break-in-alert-handler.service.ts` qui capture `keyboardBuilder`, i18n). Un job sérialisable enfilé en DB ne peut pas transporter une closure : le sweeper doit pouvoir reconstruire le notifier depuis le `type` de l'alerte.

**Fichiers :**
- Créer `apps/api/src/app/alerts/common/alert-notifier.registry.ts` :
  ```ts
  export interface AlertNotifierPayload {
    alertEventId: string;
    userId: string;
    vin: string;
    vehicleDisplayName?: string | null;
    type: AlertEventType;
    severity: AlertEventSeverity;
    correlationId?: string;
  }
  ```
  Registry injectable mappant `AlertEventType` → `(payload) => Promise<void>`, construite avec les notifiers break-in et sentry existants (les corps des closures actuelles deviennent des méthodes de ce registry).
- Créer `apps/api/src/app/alerts/common/alert-notifier.registry.spec.ts`
- Modifier `break-in-alert-handler.service.ts` et `sentry-alert-handler.service.ts` : ne passent plus de closure, passent le `type`
- Modifier `vehicle-alert-notifier.service.ts` + spec : `enqueueUserNotifications()` construit des `AlertNotifierPayload` et enfile `() => registry.notify(payload)`

**Justification :** une seule code path d'envoi pour le nominal et le rattrapage (le sweep réutilise exactement la queue et les workers existants) ; les jobs deviennent débogables et sérialisables.

> **STOP — valider le refactor : tous les tests alerts existants passent sans changement de comportement.**

---

### Étape 4 — Acknowledgment : marquer `sent` après envoi

**Fichiers :**
- `apps/api/src/app/alerts/common/vehicle-alert-notifier.service.ts` : dans `notifyUser()`, après succès de `Promise.all([pushTask, telegramTask])` → `alertsService.markNotificationSent(payload.alertEventId)` ; en échec → `markNotificationAttemptFailed(...)` (incrémente `notification_attempts`, passe à `failed` au-delà de `NOTIFICATION_SWEEP_MAX_ATTEMPTS`).
- `apps/api/src/app/alerts/common/vehicle-alert-notifier.service.spec.ts` : mocker `AlertsService` (déjà mocké) et asserter les appels de marquage.

**Sémantique `failed` :** permanent (pas de retry lent — une notification trop retardée n'a plus de valeur) mais **jamais silencieux** : le passage à `failed` logge en error avec compteur cumulé (`[NOTIFICATION_FAILED] total=N`), exposé dans le résumé périodique de la queue (étape 7) et couvert par une alarme OCI.

**Échec partiel multi-canal :** `Promise.all(push, telegram)` — si un canal échoue, le retry renvoie les deux canaux (doublon possible du canal déjà livré). C'est la sémantique historique du chemin actuel (retry du message Kafka entier renvoyait les deux canaux, plus un doublon `alert_events` en DB que l'UPDATE idempotent supprime ici). Risque accepté, documenté en section 5 — colonne de statut unique par alerte, pas de statut par canal.

**Justification :** le statut `pending` est le contrat : *aucune ligne ne doit rester `pending` si la notification est partie*. Le sweep et l'observabilité dérivent de ce seul invariant.

> **STOP — valider le parcours nominal de bout en bout (tests).**

---

### Étape 5 — Sweeper cron de rattrapage

**Fichiers :**
- Créer `apps/api/src/app/notifications/notification-sweeper.service.ts` :
  - `@Cron(NOTIFICATION_SWEEP_CRON_EXPRESSION)` (toutes les minutes)
  - `DistributedLockService.withLock(schedulerLockKeys.notificationSweep, ...)` — pattern du cron de refresh token, garantit un seul sweeper toutes instances
  - `SELECT` les `pending` avec `created_at < now() - NOTIFICATION_SWEEP_PENDING_THRESHOLD_MS` (default 2 min : laisse le chemin nominal finir avant de doublonner)
  - **Skip les lignes déjà présentes dans la queue en mémoire** (`notificationQueueService.has(alertEventId)`) — évite l'empilement de doublons quand la queue est en backlog pendant une tempête d'alertes
  - Pour chaque : reconstruit un `AlertNotifierPayload` et enfile dans `NotificationQueueService` (une seule code path)
  - Ignore les lignes `failed` (définitives, observées par alarme) et NULL (legacy)
  - Log résumé : `[NOTIFICATION_SWEEPER] Re-enqueued N pending alert(s), skipped M in-queue`
- Modifier `apps/api/src/app/notifications/notification-queue.service.ts` : ajouter `has(alertEventId: string): boolean` — les jobs transportent leur `alertEventId`, la méthode parcourt les jobs en attente + en cours
- Créer `notification-sweeper.service.spec.ts` (AAA, jest-mock-extended)
- Modifier `apps/api/src/config/scheduler-lock-key.config.ts` : ajouter la clé `notificationSweep`
- Créer `apps/api/src/config/notification-sweep-cron.config.ts` : `NOTIFICATION_SWEEP_CRON_EXPRESSION` (default `0 * * * * *`), `NOTIFICATION_SWEEP_PENDING_THRESHOLD_MS` (default 120000), `NOTIFICATION_SWEEP_MAX_ATTEMPTS` (default 3)
- Enregistrer le provider dans `app.module.ts`

**Justification :** couvre les trois scénarios de perte (crash, queue pleine, drain timeout) avec ~100 lignes ; l'advisory lock (`pg_try_advisory_xact_lock`, non bloquant) garantit qu'**une seule instance sweepe** — les 2 instances de prod tournent déjà ce pattern (cron token-refresh), la deuxième skip silencieusement quand le lock est pris. Le `WHERE status = 'pending'` du `markNotificationSent` rend la collision résiduelle inoffensive : au pire un doublon d'envoi, sémantique at-least-once acceptée.

**Limite connue du `has()` (2 instances) :** la queue en mémoire est locale à chaque instance — le sweeper de l'instance A ne voit pas les jobs en attente dans la queue de l'instance B. Si une ligne est en backlog chez B depuis > 2 min, A peut la ré-enfiler → **un doublon d'envoi borné** (A skip ensuite sa propre copie, pas d'accumulation multiplicative). Accepté, aligné avec la sémantique at-least-once. Pour aller plus loin il faudrait un dédoublonnage en DB (`UPDATE ... WHERE status = 'pending' AND processing = false` avec colonne `processing`), explicitement hors scope.

> **STOP — valider le sweeper et son test.**

---

### Étape 6 — Configuration et documentation

**Fichiers :**
- `apps/api/.env.example` : documenter `NOTIFICATION_SWEEP_*` avec commentaires (comme les vars existantes)
- `docs/NOTIFICATION-OUTBOX-PLAN.md` (ce document) : marquer les étapes implémentées

**Validation finale :**
```bash
cd apps/api && npm run migration:show
npx nx lint api && npx nx typecheck api && npx nx test api --skip-nx-cache
```

> **STOP — revue finale du diff complet.**

---

### Étape 7 (complémentaire, indépendante) — Observabilité et alarmes

À traiter dans la même MR ou une suivante, issues de la pré-review de la branche :

1. **Résumé périodique de la queue** : `NotificationQueueService` logge toutes les minutes une ligne de stats unique : `[NOTIFICATION_QUEUE] Stats: processed=N, dropped=D, failed=F, pending_age_max=Ms, throttled_ms=T`. Cette ligne est la base des log-based metrics OCI (pas d'émission de métrique custom dans le code aujourd'hui — tout passe par les logs).
2. **Alarmes OCI (log-based metrics)** :
   - `notification_failed_count` (pattern `[NOTIFICATION_FAILED]` ou champ `failed=F` de la ligne de stats) → alarme si > 0 sur une fenêtre : couvre le statut `failed` définitif (jamais silencieux).
   - **Approche de la limite Telegram** : alarme si `processed/min > ~1500` (~25/s, limite Bot API ~30/s) ou si `throttled_ms` croît — pour détecter qu'on s'approche du plafond avant d'investir dans un token bucket séparé Telegram/push. **Attention 2 instances :** les deux instances loggent dans le même log OCI, la log-based metric agrège donc automatiquement les deux — le seuil `~1500/min` vaut pour l'agrégat (le token bucket 20/s étant par instance, le plafond effectif est 40/s agrégé ; à ~10 k notifs/jour on en est loin).
3. **Dé-scoper le token bucket du push** (20/s appliqué aussi à Expo) : **reporté** — à ~10 000 notifs/jour on est loin de la limite ; l'alarme ci-dessus dira quand s'y mettre.
4. **Compteur de drops exposé** : couvert par `dropped=D` du résumé (1) — l'indicateur `count(pending AND age > threshold)` reste l'indicateur santé notifs.

---

## 4. Charge induite (API / DB)

- **Chemin nominal** : +1 `UPDATE` indexé par notification envoyée. Négligeable.
- **Sweeper** : 1 `SELECT` par minute sur index partiel (ne scanne que les `pending`). Négligeable.
- **Le reflux de `deleteOldAlertEvents`** (max 50/user) continue de borner la taille de la table — une ligne `pending` oubliée finit purgée avec le reste ; le statut `failed` à 3 tentatives empêche le poison-message de boucler.

## 5. Risques résiduels acceptés

| Risque | Mitigation |
|---|---|
| Doublon d'envoi (crash entre envoi et `UPDATE`, ou sweep concurrent du nominal) | At-least-once assumé ; seuil de 2 min avant sweep réduit la fenêtre |
| Empilement de doublons pendant un backlog (sweep répété d'une ligne encore en queue) | `notificationQueueService.has(alertEventId)` — le sweeper skip les lignes déjà en mémoire |
| Doublon sur le canal déjà livré en cas d'échec partiel (Telegram ok / push ko ou inverse) | Sémantique historique du chemin actuel (le retry Kafka renvoyait aussi les deux canaux) ; colonne de statut unique, pas de statut par canal — accepté |
| `failed` définitif après `NOTIFICATION_SWEEP_MAX_ATTEMPTS` échecs | Jamais silencieux : compteur dans les stats de queue + alarme OCI `notification_failed_count` |
| Notification retardée de ~2-3 min après un crash | Accepté par design (mieux que silencieusement perdue) |
| `alert_events` purgée (max 50/user ou `clearForUser`) avant rattrapage | Edge case : une alerte assez vieille pour être purgée n'a plus vocation à être notifiée |
