import MagnifyingGlass from './assets/magnifying-glass.png'
import './LandingPage.css'

function LandingPage({ onGetStarted }) {
    return (
        <div className="landing-page">
            {/* Header */}
            <header className="landing-header">
                <div className="landing-logo">JobHunt</div>
                <nav className="landing-nav">
                    <a href="#features">Features</a>
                    <a href="#how-it-works">How it Works</a>
                </nav>
                <button className="landing-login-btn" onClick={onGetStarted}>
                    Get Started
                </button>
            </header>

            {/* Hero Section */}
            <main className="landing-hero">
                <div className="hero-content">
                    <h1 className="hero-title">
                        Find your<br />
                        <span className="hero-highlight">dream job</span>
                    </h1>
                    <p className="hero-subtitle">
                        AI-powered job matching that finds the perfect opportunities for you.
                        Upload your resume and let us do the rest.
                    </p>
                    <div className="hero-buttons">
                        <button className="hero-primary-btn" onClick={onGetStarted}>
                            Get Started
                        </button>
                        <a href="#how-it-works" className="hero-secondary-btn">
                            Learn More
                        </a>
                    </div>
                </div>

                <div className="hero-visual">
                    <div className="floating-image">
                        <img src={MagnifyingGlass} alt="Job Search" />
                    </div>
                    <div className="glow-effect"></div>
                </div>
            </main>

            {/* Features Section */}
            <section id="features" className="landing-features">
                <div className="feature">
                    <div className="feature-icon">📄</div>
                    <h3>Resume Parsing</h3>
                    <p>AI extracts your skills and experience automatically</p>
                </div>
                <div className="feature">
                    <div className="feature-icon">🎯</div>
                    <h3>Smart Matching</h3>
                    <p>Get scored job matches based on your profile</p>
                </div>
                <div className="feature">
                    <div className="feature-icon">📧</div>
                    <h3>Email Alerts</h3>
                    <p>Receive curated job listings in your inbox</p>
                </div>
            </section>

            {/* How it Works */}
            <section id="how-it-works" className="landing-how">
                <h2>How it Works</h2>
                <div className="steps">
                    <div className="step">
                        <div className="step-number">1</div>
                        <h4>Upload Resume</h4>
                        <p>Upload your PDF resume</p>
                    </div>
                    <div className="step">
                        <div className="step-number">2</div>
                        <h4>Set Preferences</h4>
                        <p>Choose job title and minimum score</p>
                    </div>
                    <div className="step">
                        <div className="step-number">3</div>
                        <h4>Get Matches</h4>
                        <p>AI finds and scores jobs for you</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <p>© 2024 JobHunt. AI-powered job matching.</p>
            </footer>
        </div>
    )
}

export default LandingPage
