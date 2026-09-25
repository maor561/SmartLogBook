# DATA MODEL — SmartLogBook 2.0

**גרסה:** 0.1 · **עודכן:** 2026-09-25 · **סטטוס:** טיוטה לאישור (שלב 4)
מבוסס על ADR-006, 007, 019, 020, 021, 024, 025–033.

המערכת נשענת על **שני מאגרים עם אחריות מופרדת** (ADR-024):

| מאגר | איפה | מה יש בו | מי כותב |
|---|---|---|---|
| **Neon (Postgres)** | Vercel, האפליקציה | הלוגבוק: טיסות, ספר חשבונות, תעריפים, הגדרות, שדות | רק האפליקציה |
| **D1 (SQLite)** | Cloudflare, ה-Worker | מצב המעקב החי של טיסה אחת בכל רגע | רק ה-Worker |

ההעברה בין המאגרים קורית ב-**IN**: האפליקציה קוראת מה-Worker את הטיסה שנעקבה (דרך API מוגן, ADR-031), בונה ממנה טיסה וספר חשבונות ב-Neon, ומאפסת את ה-Worker.

---

## Neon

### `flights`: טיסה (רשומה אחת לכל טיסה, כולל היסטוריות)

| קבוצה | עמודות | הערות |
|---|---|---|
| זהות | `id`, `callsign`, `ofp_id`, `ofp_generated_at` | `ofp_id` הוא `params.request_id` או `static_id` מה-OFP |
| מצב | `status` | `awaiting_completion` · `closed` · `historical` (מצבי המעקב החי נמצאים ב-D1) |
| מקור | `source` | `tracked` · `partial` · `manual` · `historical` (ADR-019, ADR-030) |
| מסלול | `origin_icao`, `dest_planned_icao`, `dest_actual_icao`, `alternate_icao`, `route_distance_nm`, `gc_distance_nm` | `dest_actual ≠ dest_planned` → הסטה |
| מטוס | `aircraft_type`, `registration`, `seats`, `mtow_kg`, `mlw_kg`, `oew_kg` | מה-OFP (ADR-032) |
| עומס | `pax`, `cargo_kg`, `payload_kg` | מה-OFP |
| זמנים מתוכננים | `sched_out`, `sched_off`, `sched_on`, `sched_in` | מה-OFP (`times.sched_*`) |
| זמנים בפועל | `out_at`, `off_at`, `on_at`, `in_at` + `times_source` (למשל `vvmm`) | v = VATSIM, m = ידני (ADR-019). ריק בטיסות היסטוריות |
| נגזר | `block_min`, `air_min` | עמודות מחושבות (generated) |
| נחיתה | `fpm`, `landing_lat`, `landing_lon` | הקואורדינטות מה-Worker, לזיהוי השדה (ADR-033) |
| רצף | `crew_location_icao` | מיקום הצוות לפני הטיסה (ADR-026) |
| תמחור | `rate_set_id`, `eia_fuel_price_per_kg`, `local_out_hour`, `orig_utc_offset` | **הצילום:** מה שהמחיר נבנה עליו (ADR-021, 025) |
| סגירה | `closed_at`, `edited_at` | `edited_at` ⇒ תג "נערכה" |
| היסטוריות | `legacy_planned_air_min`, `legacy_doc` (jsonb) | ADR-030 |

### `ledger_lines`: ספר החשבונות (ADR-007)

| עמודה | סוג | הערות |
|---|---|---|
| `id`, `flight_id` | | |
| `code` | enum | `tickets`, `cargo`, `fuel`, `ground_handling`, `catering`, `crew`, `maintenance`, `airport_fees`, `nav_charges`, `lease`, `hard_landing`, `positioning`, `diversion`, `legacy_profit` |
| `amount_cents` | bigint, **חתום** | הכנסה חיובית והוצאה שלילית. **רווח = SUM(amount_cents)**, בלי תנאים |
| `source` | enum | `simbrief` · `manual` · `auto` · `legacy` |
| `calc` | jsonb | הקלטים והשלבים לתצוגת "איך הגענו" (למשל מכפילי המחיר) |

**כלל:** כל דוח, סטטיסטיקה ואבן דרך כספית = `SUM`/`GROUP BY` על הטבלה הזו. אסור לחשב מחדש (ADR-007).
**עריכה (ADR-021):** מוחקים ומייצרים מחדש את שורות הטיסה, באותו `rate_set_id`, ומעדכנים את `edited_at`.

### `rate_sets`: תעריפים עם גרסאות (הצילום של ADR-021)
- `id`, `created_at`, `params` (jsonb). הגרסה **בלתי ניתנת לשינוי**.
- **שינוי בהגדרות יוצר גרסה חדשה**, וטיסות חדשות מקבלות אותה. כל טיסה סגורה מצביעה על הגרסה שבה נסגרה. כך עריכה לעולם לא מושכת תעריפים חדשים.
- `params` כולל: עקומת הבסיס (F0, K, חזקה), טבלאות עונה, יום ושעה, המעקה, תוספת הדלק, עקומת המטען (ADR-025, 029), ומקדמי ההוצאות (ADR-026, 027, 028).

### `settings`: שורה אחת
`simbrief_id`, `vatsim_cid`, `home_base_icao` (ADR-026), `theme` (ADR-016), `current_rate_set_id`.

### `users`: שורה אחת (ADR-031)
`password_hash`, `failed_attempts`, `locked_until`. ה-sessions מנוהלים בספריית ההתחברות.

### `airports` (ADR-033)
`icao` (PK), `name`, `city`, `country`, `lat`, `lon`, `elevation_ft`, `type`. יש אינדקס מרחבי פשוט (lat/lon) לחיפוש השדה הקרוב.

### `eia_prices`
`week`, `usd_per_kg`, `fetched_at`. משמש מטמון ומקור ל"ערך האחרון" כש-EIA לא זמין (ADR-025).

### `milestones`: ייקבע בשלב 5 (Q6)

---

## D1 (Worker)

### `tracker`: שורה אחת, הטיסה הפעילה
| קבוצה | עמודות |
|---|---|
| מצב | `state`: `idle` · `armed` (תוכנית תואמת) · `at_gate` · `taxi_out` · `airborne` · `taxi_in` · `disconnected` · `interrupted` · `arrived` |
| התאמה | `cid`, `callsign`, `origin`, `dest`, `ofp_id`, `ofp_json` (תמצית ה-OFP שהאפליקציה צריכה כדי לבנות טיסה) |
| זמנים | `out_at`, `off_at`, `on_at`, `in_at` |
| אחרון שנראה | `last_seen_at`, `lat`, `lon`, `alt_ft`, `gs_kt`, `hdg`, `squawk`, `phase` |
| תקלות | `disconnected_at`, `feed_error_since` (ADR-024: תקלת פיד ≠ ניתוק) |

### `tracker_events`: יומן מעברים (לדיבאג)
`at`, `from_state`, `to_state`, `reason`. נמחק כשהטיסה עוברת ל-Neon. לפי ADR-022 לא נשמר מסלול.

---

## מיפוי: MongoDB → Neon (ADR-030)
| MongoDB | Neon |
|---|---|
| `date` | `sched_out` (משוער, מסומן) · `closed_at` |
| `origin`, `destination` | `origin_icao`, `dest_planned_icao` = `dest_actual_icao` |
| `aircraft`, `aircraft_max_passengers` | `aircraft_type`, `seats` |
| `passengers`, `payload`, `distance` | `pax`, `payload_kg`, `route_distance_nm` |
| `duration_mins` | `legacy_planned_air_min` |
| `fpm` | `fpm` |
| `profit` | שורה אחת ב-`ledger_lines`: `code=legacy_profit`, `source=legacy` |
| כל המסמך | `legacy_doc` |
| — | `source = status = historical` |
