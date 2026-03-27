# Smart Logbook Airline Manager

Virtual Airline Management System built with Express.js, PostgreSQL, and Vercel.

## 🚀 Quick Start

### Prerequisites
- Node.js 18.x or higher
- npm or yarn
- PostgreSQL database (Vercel Postgres recommended)

### Installation

```bash
# Clone repository
git clone https://github.com/maor561/SmartLogBook.git
cd SmartLogBook

# Install dependencies
npm install
cd backend && npm install && cd ..

# Create .env file
cp backend/.env.example backend/.env

# Add your PostgreSQL connection string to backend/.env
POSTGRES_URL=postgresql://user:password@host:5432/database
```

### Database Setup

```bash
# Create tables in your PostgreSQL database
# Run the SQL commands from db/schema.sql in your database

# Or use psql:
psql -U username -d database_name -f db/schema.sql
```

### Development

```bash
# Start development server (runs on http://localhost:3000)
npm run dev
```

### Build & Deploy

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
SmartLogBook/
├── backend/                 # Express.js API server
│   ├── server.js           # Main server file
│   ├── db.js               # PostgreSQL connection
│   ├── routes/             # API route handlers
│   │   ├── flights.js
│   │   ├── settings.js
│   │   ├── stats.js
│   │   ├── pricing.js
│   │   └── simbrief.js
│   └── package.json
├── public/                 # Frontend files
│   ├── index.html
│   ├── js/app.js          # Main application logic
│   ├── css/style.css
│   └── lib/               # Third-party libraries
├── db/
│   └── schema.sql         # Database schema
├── vercel.json            # Vercel configuration
└── package.json           # Root package config
```

## 🔌 API Endpoints

### Flights
- `GET /api/flights` - Get all flights
- `POST /api/flights` - Create new flight
- `PUT /api/flights/:id` - Update flight
- `DELETE /api/flights/:id` - Delete flight

### Settings
- `GET /api/settings` - Get all settings
- `GET /api/settings/:key` - Get single setting
- `PUT /api/settings/:key` - Update setting

### Statistics
- `GET /api/stats` - Get aggregated statistics

### Pricing
- `GET /api/pricing/history?days=30` - Get pricing history
- `POST /api/pricing/history` - Record pricing
- `POST /api/pricing/update` - Update dynamic pricing

### SimBrief
- `GET /api/simbrief?userid=12345` - Fetch flight from SimBrief

## 🗄️ Database

PostgreSQL tables:
- `flights` - Flight records
- `settings` - User settings and pricing configuration
- `pricing_history` - Historical pricing data

See `db/schema.sql` for full schema.

## 🌐 Deployment on Vercel

1. Push to GitHub
2. Connect GitHub repository to Vercel
3. Set environment variables in Vercel dashboard:
   - `POSTGRES_URL` - Your PostgreSQL connection string
   - `NODE_ENV` - Set to `production`
4. Deploy automatically on push to main branch

## 📱 Features

- ✈️ Flight management (CRUD operations)
- 📊 Flight statistics and analytics
- 💰 Dynamic pricing based on fuel costs
- 📁 Excel import/export
- 🎖️ Special missions system (18 unique missions)
- 🗺️ Interactive flight route map with Leaflet.js
- 📈 Pricing history charts
- 🌙 Dark/light theme support
- 🇮🇱 Hebrew language support (RTL)
- 📱 Progressive Web App (PWA)
- ✈️ SimBrief integration

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Leaflet.js, Chart.js
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Hosting**: Vercel (serverless)
- **Version Control**: GitHub

## 📄 License

MIT

## 👨‍💼 Author

Maor

---

**Updated:** March 2025
**Version:** 2.0.0 (Express.js + PostgreSQL)
