# SmartLogBook

לוגבוק לטייס סימולטור עם חברת תעופה וירטואלית. **גרסה 2.0 חיה** ב-`main`, בכתובת https://smart-log-book-eta.vercel.app.
- `web/`: האפליקציה (Next.js 16, Neon, Vercel). **קרא את `web/AGENTS.md` לפני קוד Next.js.**
- `tracker/`: ה-Worker של המעקב (Cloudflare, D1).
- המערכת הישנה (1.x) נמחקה מהריפו. היא נשמרת רק בתג `legacy-final`.

## מסמכי הקונטקסט

| קובץ | מתי לקרוא |
|------|-----------|
| [`docs/STATUS.md`](docs/STATUS.md) | **בתחילת כל סשן.** מה נעשה, מה הבא, שאלות פתוחות |
| [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md) | אפיון, flow, סעיפי הכסף, מלאי הפיצ'רים |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | לוג החלטות (ADR), append-only |
| [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) | טבלאות Neon ו-D1, ספר החשבונות, מיפוי ההעברה |
| [`docs/WORK_PACKAGES.md`](docs/WORK_PACKAGES.md) | חבילות העבודה, הסדר והגדרת "גמור" |
| [`docs/mockups/`](docs/mockups/) | סקיצות מאושרות (s0 עד s6) |

## נוהל עבודה

1. **לפני כל שינוי גדול:** לשאול את כל השאלות, להציג סקיצה (HTML ב-`docs/mockups/`), ולחכות לאישור. תוכנית לפני קוד.
2. כל החלטה משמעותית נרשמת כ-ADR חדש ב-`DECISIONS.md`.
3. בסוף סשן: לעדכן את `docs/STATUS.md`.
4. בדיקות לפני כל commit: `npm test` ב-`web/` וב-`tracker/`. מיגרציות D1 רצות לפני פריסת ה-Worker (ADR-049).

## כללי זהב

- **מנוע חישוב אחד, בלי אקראיות.** לכל מספר יש מקור (ADR-006).
- **דוחות רק סוכמים את ספר החשבונות** ולעולם לא מחשבים מחדש (ADR-007).
- **VATSIM קודם, וידני כגיבוי.** תוכנית SimBrief היא חובה (ADR-019).
- **עיצוב פונקציונלי, כמה שפחות מסכים. לא "עיצוב של AI".**
