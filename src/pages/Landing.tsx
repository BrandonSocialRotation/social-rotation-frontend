import { Link } from 'react-router-dom'
import './Landing.css'

export default function Landing() {
  return (
    <div className="landing-page">
      {/* Header with Login Button */}
      <header className="landing-header">
        <div className="landing-header-content">
          <div className="landing-logo">
            {/* Logo placeholder - add logo_negative.png here when available */}
            <img 
              src="/logo_negative.png" 
              alt="Social Rotation" 
              className="logo-image"
              onError={(e) => {
                // Fallback to text if logo not found
                e.currentTarget.style.display = 'none'
                const textLogo = e.currentTarget.nextElementSibling as HTMLElement
                if (textLogo) textLogo.style.display = 'block'
              }}
            />
            <h1 style={{ display: 'none' }}>Social Rotation</h1>
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
          <h2>Social Media Automation & Marketing Tool</h2>
          <p className="landing-subtitle">
            A Software as a Service (SaaS) platform that helps you automate your social media presence. 
            Schedule posts, rotate content, and manage all your accounts from one powerful dashboard.
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
          <h3>Everything You Need to Automate Your Social Media</h3>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📅</div>
              <h4>Smart Scheduling</h4>
              <p>Schedule posts for specific dates, set up rotation schedules, or post immediately across all your connected platforms</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔄</div>
              <h4>Content Rotation</h4>
              <p>Create image buckets and automatically rotate through your content for consistent, fresh posts</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔗</div>
              <h4>Multi-Platform Posting</h4>
              <p>Connect and post to Facebook, Instagram, Twitter, LinkedIn, TikTok, YouTube, and Google My Business</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📰</div>
              <h4>RSS Feed Integration</h4>
              <p>Automatically pull content from RSS feeds and create posts with images from your favorite sources</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🖼️</div>
              <h4>Watermarking</h4>
              <p>Add custom watermarks to your images with adjustable size, opacity, and positioning</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h4>Analytics & Insights</h4>
              <p>Track your performance, reach, and engagement across all your social media accounts</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h4>Agency Features</h4>
              <p>Manage multiple sub-accounts, perfect for agencies managing multiple clients</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🛒</div>
              <h4>Content Marketplace</h4>
              <p>Browse and purchase pre-made content buckets or sell your own content to other users</p>
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

