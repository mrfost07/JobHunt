<div align="center">

# 🎯 JobHunt

### AI-Powered Job Matching Platform

[![Live Demo](https://img.shields.io/badge/demo-live-4ecdc4?style=for-the-badge)](https://jobhunt-fost.vercel.app/)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge)](CONTRIBUTING.md)

[Live Demo](https://jobhunt-fost.vercel.app/) • [Report Bug](https://github.com/mrfost07/JobHunt/issues) • [Request Feature](https://github.com/mrfost07/JobHunt/issues)

</div>

---

## ✨ Overview

JobHunt automates your job search by leveraging AI to match your resume with relevant job postings. Upload your resume, set your preferences, and receive personalized job matches scored on compatibility.

<div align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/AI-Mistral-FF6B6B?logo=ai&logoColor=white" alt="Mistral AI" />
</div>

---

## 🚀 Features

| Feature | Description |
|---------|-------------|
| **Resume Parsing** | AI extracts skills, experience, and qualifications from your PDF |
| **Smart Matching** | Jobs are scored 1-10 based on compatibility with your profile |
| **Email Alerts** | Receive curated job listings directly in your inbox |
| **Google OAuth** | Secure authentication with your Google account |
| **Dark Theme** | Modern, elegant dark UI design |
| **Rate Limiting** | 5 emails per user per day to prevent abuse |

---

## 🛠️ Tech Stack

**Frontend**
- React 18 + Vite
- Vanilla CSS (Dark Theme)
- Axios

**Backend**
- Node.js + Express
- PostgreSQL (Neon)
- Passport.js (Google OAuth)
- JWT Authentication

**APIs & Services**
- Mistral AI (Job Matching)
- JSearch API (Job Listings)
- Resend (Email Delivery)

---

## 📦 Installation

### Prerequisites

- Node.js 18+
- PostgreSQL database (or [Neon](https://neon.tech) account)
- API keys for Mistral AI, JSearch, Resend

### 1. Clone the repository

```bash
git clone https://github.com/mrfost07/JobHunt.git
cd JobHunt
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:

```env
DATABASE_URL=your_neon_database_url
JWT_SECRET=your_jwt_secret
MISTRAL_API_KEY=your_mistral_key
JSEARCH_API_KEY=your_jsearch_key
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` file:

```env
VITE_API_URL=http://localhost:3001
```

```bash
npm run dev
```

---

## 🌐 Deployment

**Backend:** Deploy to [Render](https://render.com)
- Set environment variables in Render dashboard
- Use `npm start` as start command

**Frontend:** Deploy to [Vercel](https://vercel.com)
- Connect GitHub repository
- Set `VITE_API_URL` to your Render backend URL

---

## 🤝 Contributing

Contributions are what make the open-source community amazing! Any contributions you make are **greatly appreciated**.

### How to Contribute

1. **Fork** the repository
2. **Create** your feature branch
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit** your changes
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push** to the branch
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open** a Pull Request

### Contribution Ideas

- [ ] Add more job sources (LinkedIn, Indeed scraping)
- [ ] Implement saved jobs feature
- [ ] Add job application tracking
- [ ] Create mobile-responsive improvements
- [ ] Add dark/light theme toggle
- [ ] Implement notification preferences

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👤 Author

**Mark Renier Fostanes**

- GitHub: [@mrfost07](https://github.com/mrfost07)
- LinkedIn: [Mark Renier Fostanes](https://linkedin.com/in/mark-renier-fostanes)

---

## ⭐ Show Your Support

Give a ⭐ if this project helped you!

---

<div align="center">
  <sub>Built with ❤️ using React, Node.js, and AI</sub>
</div>
