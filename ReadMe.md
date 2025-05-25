# 📅 Smart Calendar

> An intelligent calendar application powered by AI for efficient schedule management

[![React](https://img.shields.io/badge/React-19.1.0-blue.svg)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-4.18.2-green.svg)](https://expressjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-11.7.3-orange.svg)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4.17-blue.svg)](https://tailwindcss.com/)

## 🚀 Features

- **🤖 AI-Powered Suggestions**: Get intelligent recommendations for event planning using Google Gemini AI
- **📊 Smart Summaries**: Automatic generation of schedule overviews with priorities and preparations
- **🔐 Secure Authentication**: Email/password and Google OAuth login with Firebase
- **🌙 Dark Mode**: Full dark/light theme support
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices
- **🎨 Color-Coded Events**: Smart categorization with AI-suggested colors
- **⚡ Real-time Sync**: Instant synchronization across all devices
- **📋 Multiple Views**: Month, week, and day calendar views

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern UI library
- **React Router 7** - Client-side routing
- **React Big Calendar** - Interactive calendar component
- **Tailwind CSS** - Utility-first CSS framework
- **Firebase SDK** - Authentication and database
- **Axios** - HTTP client
- **Vite** - Fast build tool

### Backend
- **Express.js** - Node.js web framework
- **Google Generative AI (Gemini 2.0)** - AI-powered suggestions
- **Firebase Firestore** - NoSQL cloud database
- **CORS** - Cross-origin resource sharing

## 📦 Installation

### Prerequisites
- Node.js 18+
- Firebase project
- Google Gemini API key

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/anro772/smart-calendar.git
cd smart-calendar
```

2. **Backend Setup**
```bash
cd server
npm install

# Create .env file
cat > .env << EOF
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
EOF
```

3. **Frontend Setup**
```bash
cd ../smart-calendar-client
npm install

# Create .env file
cat > .env << EOF
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_URL=http://localhost:5000/api
EOF
```

4. **Start the Application**
```bash
# Start backend (in server directory)
npm start

# Start frontend (in smart-calendar-client directory)
npm run dev
```

Visit `http://localhost:5173` to use the application.

## 🔧 Configuration

### Firebase Setup
1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password and Google)
3. Create a Firestore database
4. Add your domain to authorized domains
5. Copy configuration to `.env` files

### Google Gemini API
1. Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add the key to your backend `.env` file

## 🌐 API Endpoints

### AI Suggestions
```http
POST /api/suggestions
Content-Type: application/json

{
  "description": "Team meeting for sprint planning"
}
```

**Response:**
```json
{
  "suggestions": "Prepare agenda beforehand. Request updates from each team member. Allocate time for blocker discussions.",
  "color": "#8b5cf6"
}
```

### Event Summary
```http
POST /api/summary
Content-Type: application/json

{
  "events": [
    {
      "id": "1",
      "title": "Team Meeting",
      "start": "2025-05-21T09:00:00",
      "end": "2025-05-21T10:00:00",
      "description": "Sprint planning"
    }
  ]
}
```

## 📁 Project Structure

```
smart-calendar/
├── smart-calendar-client/          # React frontend
│   ├── public/
│   │   └── calendar-favicon.svg
│   ├── src/
│   │   ├── components/             # Reusable components
│   │   │   ├── EventModal.jsx
│   │   │   └── Navbar.jsx
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx     # Authentication context
│   │   ├── pages/                  # Application pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Calendar.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── services/
│   │   │   └── aiService.js        # AI API service
│   │   ├── styles/                 # CSS modules
│   │   ├── App.jsx
│   │   ├── firebase.js
│   │   └── main.jsx
│   ├── .env
│   └── package.json
├── server/                         # Express backend
│   ├── index.js                    # Main server file
│   ├── .env
│   └── package.json
└── README.md
```

## 🚀 Deployment

### Recommended Platforms
- **Frontend & Backend**: [Render](https://render.com/)
- **Database**: Firebase Firestore (automatically managed)

### Production Environment Variables
Update your `.env` files with production URLs and ensure all API keys are properly configured.

## 🎯 Usage

1. **Sign Up/Login**: Create an account or sign in with Google
2. **Dashboard**: View your upcoming events and AI-generated summaries
3. **Add Events**: Click "Add Event" and describe your activity
4. **Get AI Suggestions**: Let AI suggest improvements and categorize your events
5. **Calendar Views**: Switch between month, week, and day views
6. **Dark Mode**: Toggle between light and dark themes


## 🔮 Future Enhancements

- [ ] Google Calendar integration
- [ ] Push notifications
- [ ] Calendar sharing and collaboration
- [ ] Advanced event recurrence
- [ ] Import/export functionality
- [ ] Mobile app (React Native)
- [ ] Voice commands integration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Google Generative AI](https://ai.google.dev/) for intelligent suggestions
- [Firebase](https://firebase.google.com/) for authentication and database
- [Tailwind CSS](https://tailwindcss.com/) for styling

## 📞 Contact

**Ștefan Andrei** - Grupa 1132

- 🐱 GitHub: [@anro772](https://github.com/anro772)

---

⭐ **If you found this project helpful, please give it a star!** ⭐