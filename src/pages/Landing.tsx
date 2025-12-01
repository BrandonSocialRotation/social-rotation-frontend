import { Link } from 'react-router-dom'
import './Landing.css'

export default function Landing() {
  return (
    <div className="landing-page">
      {/* Header with Login Button */}
      <header className="landing-header">
        <div className="landing-header-content">
          <div className="landing-logo">
            <h1>Social Rotation</h1>
          </div>
          <nav className="landing-nav">
            <Link to="/login" className="login-button">
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <h2>Manage All Your Social Media in One Place</h2>
          <p className="landing-subtitle">
            Schedule posts, rotate content, and grow your presence across multiple platforms
          </p>
          <div className="landing-cta">
            <Link to="/register" className="cta-button primary">
              Get Started Free
            </Link>
            <Link to="/login" className="cta-button secondary">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-features">
        <div className="landing-features-content">
          <h3>Everything You Need to Manage Your Social Media</h3>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📅</div>
              <h4>Schedule Posts</h4>
              <p>Plan and schedule your content across all your social media accounts</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔄</div>
              <h4>Content Rotation</h4>
              <p>Automatically rotate through your image buckets for consistent posting</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h4>Analytics</h4>
              <p>Track your performance and engagement across all platforms</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔗</div>
              <h4>Multi-Platform</h4>
              <p>Connect Facebook, Instagram, Twitter, LinkedIn, and more</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div className="footer-links">
            <Link to="/terms-of-service">Terms of Service</Link>
            <Link to="/privacy-policy">Privacy Policy</Link>
          </div>
          <p className="footer-copyright">
            © {new Date().getFullYear()} Social Rotation. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

