import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './App.css'
import LoginModal from './LoginModal'
import CoffeeIcon from './assets/BuyMe.png'
import GcashQR from './assets/BuyMe.jpg'

const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:3001/api'
axios.defaults.withCredentials = true


function App() {
  const [settings, setSettings] = useState({
    email: '',
    job_query: 'Software Engineer',
    expected_salary: 100000,
    match_threshold: 7,
    job_limit: 30,
    auto_run: false
  })
  const [results, setResults] = useState([])
  const [resume, setResume] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [status, setStatus] = useState({ message: '', type: '' })
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [elapsedTime, setElapsedTime] = useState(0)
  const [subscription, setSubscription] = useState({ status: 'free', limit: 50 })
  const [showDonate, setShowDonate] = useState(false)
  const progressRef = useRef(null)
  const timerRef = useRef(null)

  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [loginIntent, setLoginIntent] = useState(null)

  useEffect(() => {
    loadUser()
    loadSettings()
    loadResults()
    loadResume()
    loadSubscription()

    const params = new URLSearchParams(window.location.search)
    if (params.get('login') === 'success') {
      setStatus({ message: 'Successfully logged in!', type: 'success' })
      const action = params.get('action')
      if (action === 'upgrade') {
        setShowUpgrade(true)
      }
      // Clean URL and reload user data after slight delay to ensure session is ready
      window.history.replaceState({}, '', window.location.pathname)
      setTimeout(() => {
        loadUser()
        loadSettings()
        loadResume()
        loadResults()
      }, 500)
    } else if (params.get('payment') === 'success') {
      verifyPayment()
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('payment') === 'failed') {
      setStatus({ message: 'Payment was cancelled', type: 'error' })
      window.history.replaceState({}, '', window.location.pathname)
    }

    return () => {
      if (progressRef.current) clearInterval(progressRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const loadUser = async () => {
    try {
      const res = await axios.get(`${API_URL}/user`)
      setUser(res.data)
      if (res.data?.email) {
        setSettings(s => ({ ...s, email: res.data.email }))
      }
    } catch (e) {
      console.error('Failed to load user', e)
    }
  }

  const loadSubscription = async () => {
    try {
      const res = await axios.get(`${API_URL}/subscription`)
      setSubscription(res.data)
    } catch (e) { console.error(e) }
  }

  const verifyPayment = async () => {
    try {
      const res = await axios.post(`${API_URL}/verify-payment`)
      if (res.data.success) {
        setSubscription({ status: 'pro', limit: 500, expiresAt: res.data.expiresAt })
        setStatus({ message: 'Pro activated! You now have 500 job limit.', type: 'success' })
      }
    } catch (e) {
      console.error('Payment verification error:', e)
    }
  }

  const loadSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/settings`)
      if (res.data) setSettings(s => ({ ...s, ...res.data }))
    } catch (e) { console.error(e) }
  }

  const loadResults = async () => {
    try {
      const res = await axios.get(`${API_URL}/results`)
      setResults(res.data || [])
    } catch (e) { console.error(e) }
  }

  const loadResume = async () => {
    try {
      const res = await axios.get(`${API_URL}/resume`)
      setResume(res.data)
    } catch (e) { console.error(e) }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    let newValue = type === 'checkbox' ? checked : type === 'number' ? Number(value) : value

    // Enforce job limit based on subscription
    if (name === 'job_limit') {
      newValue = Math.min(newValue, subscription.limit)
    }

    setSettings(s => ({ ...s, [name]: newValue }))
  }

  const saveSettings = async () => {
    try {
      await axios.post(`${API_URL}/settings`, settings)
      setStatus({ message: 'Settings saved', type: 'success' })
      setTimeout(() => setStatus({ message: '', type: '' }), 3000)
    } catch (e) {
      setStatus({ message: 'Failed to save', type: 'error' })
    }
  }

  const uploadFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const form = new FormData()
    form.append('resume', file)
    setLoading(true)
    setLoadingMessage('Uploading...')
    try {
      await axios.post(`${API_URL}/upload`, form)
      setStatus({ message: 'Resume uploaded', type: 'success' })
      loadResume()
    } catch (e) {
      setStatus({ message: 'Upload failed', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const runWorkflow = async () => {
    setLoading(true)
    setLoadingMessage('Saving...')
    setProgress({ current: 0, total: settings.job_limit })
    setElapsedTime(0)

    try {
      await axios.post(`${API_URL}/settings`, settings)
    } catch (e) {
      setStatus({ message: 'Failed to save settings', type: 'error' })
      setLoading(false)
      return
    }

    setLoadingMessage('Searching...')

    timerRef.current = setInterval(() => setElapsedTime(t => t + 1), 1000)
    progressRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/progress`)
        setProgress({ current: res.data.current, total: res.data.total })
        setLoadingMessage(res.data.status)
        if (!res.data.running) {
          clearInterval(progressRef.current)
          clearInterval(timerRef.current)
        }
      } catch (e) { }
    }, 500)

    try {
      const res = await axios.post(`${API_URL}/run`)
      let msg = ''
      if (res.data.emailSent) {
        msg = `Found ${res.data.jobsMatched} matches. Email sent.`
      } else if (res.data.jobsMatched === 0) {
        msg = `No matches found. Try lowering the minimum score.`
      } else {
        msg = `Found ${res.data.jobsMatched} matches.`
      }
      setStatus({ message: msg, type: res.data.emailSent ? 'success' : 'info' })
      loadResults()
    } catch (e) {
      setStatus({ message: 'Something went wrong', type: 'error' })
    } finally {
      setLoading(false)
      clearInterval(progressRef.current)
      clearInterval(timerRef.current)
    }
  }

  const cancelWorkflow = async () => {
    try {
      await axios.post(`${API_URL}/cancel`)
      setLoadingMessage('Cancelling...')
    } catch (e) { }
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="app">
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <div className="loading-text">{loadingMessage}</div>
          {progress.total > 0 && (
            <div className="progress-info">
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
              </div>
              <div className="progress-stats">
                <span>{progress.current} / {progress.total}</span>
                <span>{formatTime(elapsedTime)}</span>
              </div>
            </div>
          )}
          <button className="btn-cancel" onClick={cancelWorkflow}>Cancel</button>
        </div>
      )}

      <header className="header">
        <h1>JobHunt</h1>
        <span className="header-sep">|</span>
        <p>Automated Job Matching</p>

        <div className="header-actions">
          {user ? (
            <div className="user-profile">
              <span className="user-name">{user.display_name?.split(' ')[0]}</span>
              {user.profile_picture ? (
                <img src={user.profile_picture} alt="Profile" className="user-avatar" />
              ) : (
                <div className="user-avatar-placeholder">{user.display_name?.[0]}</div>
              )}
              <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/auth/logout`} className="logout-link">Logout</a>
            </div>
          ) : (
            <button className="login-header-btn" onClick={() => setShowLogin(true)}>Sign In</button>
          )}

          <span className="coming-soon-badge">Pro Coming Soon</span>

          <button className="coffee-btn" onClick={() => setShowDonate(true)}>
            <img src={CoffeeIcon} alt="" className="coffee-icon" />
            Buy me a coffee
          </button>
        </div>
      </header>

      {showDonate && (
        <div className="donate-overlay" onClick={() => setShowDonate(false)}>
          <div className="donate-modal" onClick={e => e.stopPropagation()}>
            <button className="donate-close" onClick={() => setShowDonate(false)}>×</button>
            <h2>Support JobHunt</h2>
            <p>Scan the QR code with GCash or any InstaPay app</p>
            <img src={GcashQR} alt="GCash QR Code" className="gcash-qr" />
            <p className="donate-thanks">Thank you for your support! ☕</p>
          </div>
        </div>
      )}

      {showLogin && <LoginModal onClose={() => {
        setShowLogin(false)
        setLoginIntent(null)
      }} intent={loginIntent} />}

      <main className="main">
        <section className="settings-panel">
          <h2>Settings</h2>

          <div className="form-group">
            <label>Resume</label>
            <input type="file" accept=".pdf" onChange={uploadFile} />
            {resume && <span className="file-info">{resume.filename}</span>}
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={settings.email} onChange={handleChange} placeholder="you@email.com" />
          </div>

          <div className="form-group">
            <label>Job Search</label>
            <input type="text" name="job_query" value={settings.job_query} onChange={handleChange} />
          </div>

          <div className="form-row-3">
            <div className="form-group">
              <label>Min Salary</label>
              <input type="number" name="expected_salary" value={settings.expected_salary} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Min Score</label>
              <div className="input-with-info">
                <input type="number" name="match_threshold" value={settings.match_threshold} onChange={handleChange} min="0" max="10" />
                <span className="info-icon" data-tip="Jobs must score at least this value to qualify. Only qualified jobs are sent to your email. 7+ recommended.">i</span>
              </div>
            </div>
            <div className="form-group">
              <label>Limit <span className="limit-cap">(max {subscription.limit})</span></label>
              <input
                type="number"
                name="job_limit"
                value={settings.job_limit}
                onChange={handleChange}
                min="1"
                max={subscription.limit}
              />
            </div>
          </div>

          <div className="button-row">
            <button className="btn-secondary" onClick={saveSettings}>Save</button>
            <button className="btn-primary" onClick={runWorkflow} disabled={loading || !resume}>
              {loading ? 'Running...' : 'Find Jobs'}
            </button>
          </div>
        </section>

        <section className="results-panel">
          <div className="results-header">
            <h2>Results <span className="results-count">{results.length}</span></h2>
            {status.message && <span className={`status-inline ${status.type}`}>{status.message}</span>}
          </div>
          {results.length === 0 ? (
            <div className="empty-state">
              <p>No jobs yet</p>
              <span>Upload your resume and click Find Jobs</span>
            </div>
          ) : (
            <div className="job-list">
              {results.sort((a, b) => b.match_score - a.match_score).map((job, i) => (
                <JobCard key={i} job={job} threshold={settings.match_threshold} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function JobCard({ job, threshold }) {
  const [open, setOpen] = useState(false)
  const isMatch = job.match_score >= threshold
  const scoreClass = job.match_score >= 7 ? 'high' : job.match_score >= 4 ? 'medium' : 'low'

  const formatMatchReason = (reason) => {
    if (!reason) return null
    let formatted = reason
      .replace(/\[SALARY:(.*?)\]/gi, '<div class="analysis-item"><span class="analysis-label">Salary</span>$1</div>')
      .replace(/\[SKILLS:(.*?)\]/gi, '<div class="analysis-item"><span class="analysis-label">Skills</span>$1</div>')
      .replace(/\[EXPERIENCE:(.*?)\]/gi, '<div class="analysis-item"><span class="analysis-label">Experience</span>$1</div>')
      .replace(/\[OVERALL:(.*?)\]/gi, '<div class="analysis-item"><span class="analysis-label">Summary</span>$1</div>')
      .replace(/missing|lack|need|require|gap/gi, '<mark class="warn">$&</mark>')
      .replace(/match|strong|excellent|good fit/gi, '<mark class="good">$&</mark>')
    return formatted
  }

  return (
    <div className={`job-card ${isMatch ? 'match' : 'below'}`}>
      <div className="job-summary" onClick={() => setOpen(!open)}>
        <div className="job-main">
          <div className="job-title">{job.job_title || 'Unknown Title'}</div>
          <div className="job-company">{job.company || 'Unknown Company'}</div>
          <div className="job-meta">
            <span>{job.employment_type || 'N/A'}</span>
            <span>{job.remote === 'Yes' ? 'Remote' : 'On-site'}</span>
            {job.salary && <span className="salary">{job.salary}</span>}
          </div>
        </div>
        <div className={`job-score ${scoreClass}`}>{job.match_score || 0}</div>
        <span className="expand-icon">{open ? '−' : '+'}</span>
      </div>

      {open && (
        <div className="job-details">
          {job.match_reason && (
            <div className="detail-section">
              <h4>Analysis</h4>
              <div className="analysis" dangerouslySetInnerHTML={{ __html: formatMatchReason(job.match_reason) }} />
            </div>
          )}
          {job.qualifications && (
            <div className="detail-section">
              <h4>Requirements</h4>
              <p>{job.qualifications}</p>
            </div>
          )}
          {job.apply_link && (
            <div className="apply-links" dangerouslySetInnerHTML={{ __html: job.apply_link.replace(/[;,]\s*/g, ' ') }} />
          )}
        </div>
      )}
    </div>
  )
}

export default App
