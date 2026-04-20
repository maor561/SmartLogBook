# דירוג חברת התעופה - Airline Rating Tab

## Context
המשתמש רוצה להוסיף טאב חדש "דירוג חברת התעופה" שמחשב ציון כולל לחברת התעופה על בסיס ביצועים אמיתיים.
- הצי הוא בעיקר 737 - **מגוון צי לא משפיע** על הדירוג
- **כמות נוסעים** צריכה להיות פרמטר שמשפיע
- הדירוג מבוסס על נתונים קיימים ב-API (טיסות, סטטיסטיקות, משימות)

---

## מבנה הדירוג - 6 קטגוריות (1-5 כוכבים)

### 1. בטיחות (Safety) - משקל 25%
| מדד | חישוב | 5 כוכבים | 1 כוכב |
|------|--------|----------|---------|
| אחוז נחיתות מושלמות | perfect landings / total | >= 60% | < 10% |
| FPM ממוצע | avg absolute FPM | <= 150 | > 400 |
| נחיתות קשות | hard landings / total | 0% | > 20% |

### 2. רווחיות (Profitability) - משקל 25%
| מדד | חישוב | 5 כוכבים | 1 כוכב |
|------|--------|----------|---------|
| רווח ממוצע לטיסה | avg_profit | >= $30K | < $5K |
| רווח לשעת טיסה | total_profit / total_hours | >= $10K/hr | < $2K/hr |
| עמידה ביעד רווח | current / goal | >= 100% | < 20% |

### 3. יעילות תפעולית (Efficiency) - משקל 20%

#### 3.1 צריכת דלק (Fuel Efficiency)
**נוסחה:**
```javascript
base_consumption = (דלק_ק"ג / משקל_כולל_ק"ג) / שעות_טיסה
ci_adjustment = avg_cost_index / cost_index_בטיסה
occupancy_adjustment = avg_occupancy_percent / occupancy_percent_בטיסה
altitude_adjustment = 1.15 - (altitude_feet / 100000)

efficiency_score = base_consumption × ci_adjustment × occupancy_adjustment × altitude_adjustment
```

**דירוג לפי ציון:**
| ציון | efficiency_score |
|------|-----------------|
| ⭐⭐⭐⭐⭐ | ≤ 0.020 |
| ⭐⭐⭐⭐ | 0.020-0.035 |
| ⭐⭐⭐ | 0.035-0.050 |
| ⭐⭐ | 0.050-0.070 |
| ⭐ | > 0.070 |

**ברירת מחדל (אם חסרים נתונים):** ציון 4

**נתונים נדרשים:**
- `fuel_kg` - דלק בטיסה
- `משקל_כולל` = OEW (operating empty weight) + passengers×80kg + cargo_kg
- `שעות_טיסה` - זמן הטיסה
- `cost_index` - CI בטיסה
- `avg_cost_index` - ממוצע CI של כל הטיסות
- `occupancy_percent` = passengers / max_seats × 100%
- `avg_occupancy_percent` - ממוצע תפוסה של כל הטיסות
- `altitude_feet` - גובה הטסה

#### 3.2 תפוסת נוסעים
| מדד | 5 כוכבים | 1 כוכב |
|------|----------|---------|
| ממוצע נוסעים בטיסה | >= 180 | < 50 |

#### 3.3 תפוסת מטען
| מדד | 5 כוכבים | 1 כוכב |
|------|----------|---------|
| ממוצע מטען לטיסה | >= 4000kg | < 500kg |

### 4. מוניטין (Reputation) - משקל 15%
| מדד | חישוב | 5 כוכבים | 1 כוכב |
|------|--------|----------|---------|
| יעדים ייחודיים | unique destinations | >= 20 | < 3 |
| יבשות | continents visited | >= 5 | 1 |
| משימות שהושלמו | completed missions | >= 10 | 0 |

### 5. פעילות (Activity) - משקל 15%
| מדד | חישוב | 5 כוכבים | 1 כוכב |
|------|--------|----------|---------|
| סה"כ טיסות | flights count | >= 100 | < 5 |
| שעות טיסה | total hours | >= 500 | < 10 |
| דרגת טייס | rank index (0-6) | >= 5 | 0 |

---

## קבצים לשינוי

### 1. `public/index.html`
- **שורה ~54** - הוסף כפתור טאב חדש:
  ```html
  <button class="tab-btn" onclick="switchTab('rating')" data-tab="rating">
    ⭐ <span id="tabRatingLabel">דירוג חברה</span>
  </button>
  ```
- **לפני `</main>`** - הוסף panel תוכן עם:
  - כרטיס ציון כולל (gauge/score גדול)
  - 6 כרטיסי קטגוריות עם progress bars
  - טבלת פירוט מדדים
  - טיפים לשיפור (dynamic tips)

### 2. `public/app.js`
- **switchTab() ~שורה 957** - הוסף: `if (tab === 'rating') renderAirlineRating();`
- **פונקציה חדשה `renderAirlineRating()`** (~200 שורות):
  - חישוב כל 15 המדדים מנתוני flights[] הקיימים
  - **חישוב צריכת דלק עם הנוסחה המתקדמת** (CI, occupancy, altitude adjustments)
  - חישוב ציון לכל קטגוריה (1-5)
  - חישוב ציון כולל משוקלל
  - רנדור הכרטיסים והגרפים
  - יצירת tips לשיפור (מבוסס על הקטגוריה הנמוכה ביותר)
- **פונקציית עזר `calculateFuelEfficiency(flight, avgCI, avgOccupancy)`** - חישוב efficiency_score
- **פונקציית עזר `calculateCategoryScore(value, min, max)`** - מפה ערך לטווח 1-5

### 3. `public/css/style.css`
- סגנונות עבור:
  - `.rating-score-main` - ציון כולל גדול (עיגול/gauge)
  - `.rating-category-card` - כרטיס קטגוריה
  - `.rating-stars` - הצגת כוכבים
  - `.rating-progress-bar` - progress bar לכל מדד
  - `.rating-tip` - כרטיס טיפ לשיפור

---

## עיצוב ה-UI

```
┌─────────────────────────────────────────┐
│          ⭐ דירוג חברת התעופה            │
│                                         │
│         ┌──────────────┐                │
│         │    4.2/5     │  ← ציון כולל   │
│         │  ⭐⭐⭐⭐☆   │                │
│         │  "חברה מצוינת"│                │
│         └──────────────┘                │
│                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐            │
│  │בטיחות│ │רווחיות│ │יעילות│            │
│  │ 4.5  │ │ 3.8  │ │ 4.0  │            │
│  │⭐⭐⭐⭐½│ │⭐⭐⭐⭐ │ │⭐⭐⭐⭐ │            │
│  └──────┘ └──────┘ └──────┘            │
│  ┌──────┐ ┌──────┐ ┌──────┐            │
│  │מוניטין│ │פעילות│ │נוסעים│            │
│  │ 3.5  │ │ 4.8  │ │ 4.2  │            │
│  └──────┘ └──────┘ └──────┘            │
│                                         │
│  💡 טיפ לשיפור: שפרו את הרווחיות       │
│     על ידי הגדלת מחירי כרטיסים ב-5%    │
└─────────────────────────────────────────┘
```

---

## לוגיקת חישוב

```javascript
// Map value to 1-5 stars
function ratingScore(value, minFor1, maxFor5) {
  const clamped = Math.max(minFor1, Math.min(maxFor5, value));
  return 1 + 4 * (clamped - minFor1) / (maxFor5 - minFor1);
}

// Category = average of its metrics
// Overall = weighted average of categories
```

## תוויות ציון כולל
| ציון | תווית |
|------|-------|
| 4.5+ | "חברת תעופה מצטיינת" |
| 3.5-4.4 | "חברת תעופה מצוינת" |
| 2.5-3.4 | "חברת תעופה טובה" |
| 1.5-2.4 | "חברת תעופה מתפתחת" |
| < 1.5 | "חברת תעופה מתחילה" |

---

## Verification
1. פתח את הטאב "דירוג חברה" - ציון כולל מוצג
2. בדוק שכל 6 הקטגוריות מציגות ציון תקין (1-5)
3. **בדוק צריכת דלק** - צריכה להראות ציון בהתאם לנוסחה המתקדמת (CI, occupancy, altitude)
4. בדוק שטיפ לשיפור מופיע ומתאים לקטגוריה הנמוכה
5. הוסף טיסה חדשה - חזור לטאב - ציון מתעדכן
6. בדוק responsive על מסך צר

## 📝 הערות יישום
- **צריכת דלק**: משתמשת בנוסחה מתקדמת עם 4 גורמים התאמה (CI, occupancy, altitude)
- **ברירת מחדל**: אם חסרים נתונים לחישוב, קבל ציון 4 (טוב)
- **משקל כולל**: OEW (מ-SimBrief) + passengers×80 + cargo_kg
- **Occupancy**: passengers / max_seats × 100%
