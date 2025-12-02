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
          <div className="landing-cta">
            <Link to="/register" className="cta-button primary">
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="landing-coming-soon">
        <div className="landing-coming-soon-content">
          <h3>Coming Soon</h3>
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

