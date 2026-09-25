# tracker — מנוע המעקב (Cloudflare Worker)

כרגע זו **גרסת הבדיקה של WP0**: היא מריצה כל דקה את המסלול האמיתי (הורדת הפיד של VATSIM וחיפוש ממוקד של ה-CID), כדי למדוד זמן מעבד אמיתי ב-Cloudflare לפני שבונים עליה (ADR-024). מכונת המצבים המלאה תיבנה ב-WP4.

## הרצת WP0: מה אתה עושה (פעם אחת)

1. **פותחים חשבון Cloudflare חינמי** ב-cloudflare.com. לא צריך כרטיס אשראי.
2. בתיקייה הזו:
   ```bash
   npm install
   ```
   ```bash
   npx wrangler login
   ```
   פקודת ה-login פותחת דפדפן, ושם אתה מאשר.
3. **פריסה עם ה-CID שלך:**
   ```bash
   npx wrangler deploy --var VATSIM_CID:<ה-CID שלך>
   ```
4. **בודקים שזה חי:** פותחים את הכתובת שה-deploy מדפיס, ומוסיפים לה `/probe`.

## מה נמדד
**Cloudflare Dashboard** ← Workers & Pages ← `smartlogbook-tracker` ← **Metrics** ← **CPU Time**.
**היעד:** הרבה מתחת לתקרה של 10ms. מקומית נמדד 0.3ms לחיפוש, אבל גם פענוח הטקסט של התגובה נספר, ולכן המדידה בענן היא הקובעת. כדאי להסתכל גם בשעות העומס של VATSIM (ערב, אירועים).

## בדיקות מקומיות
```bash
npm test
```
```bash
npx wrangler dev --test-scheduled
```
הפקודה השנייה מריצה את ה-Worker מקומית. אחריה, `curl "http://127.0.0.1:8787/__scheduled?cron=*+*+*+*+*"` מדמה הרצה מתוזמנת.

## כלים נלווים (`../tools/`)
הרצה מתיקיית השורש של הריפו:

| כלי | מה הוא עושה |
|---|---|
| `node tools/bench-feed.mjs` | מדידה מקומית על הפיד החי |
| `node tools/record-flight.mjs --cid <CID>` | **מקליט טיסה אמיתית** בשביל ספי זיהוי השלבים. מריצים לפני שמתחברים ל-VATSIM, והוא נעצר לבד 15 דקות אחרי הניתוק. |
| `node tools/check-simbrief.mjs --userid <Pilot ID>` | מוודא שה-OFP שלך מכיל את כל השדות הנדרשים (ADR-039) |
