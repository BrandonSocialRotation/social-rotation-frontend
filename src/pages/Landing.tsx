import { Link } from 'react-router-dom'
import './Landing.css'
import {
  CalendarIcon,
  BucketIcon,
  GlobeIcon,
  ChartIcon,
  RefreshIcon,
  UsersIcon,
  LinkIcon,
  FolderIcon,
  ClockIcon,
  TrendingUpIcon,
  DashboardIcon
} from '../components/LandingIcons'

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

      {/* What is Social Rotation Section */}
      <section className="landing-about">
        <div className="landing-about-content">
          <div className="about-text">
            <h2>What is Social Rotation?</h2>
            <p className="lead">
              Social Rotation is an all-in-one social media management platform that helps you schedule, 
              publish, and manage content across multiple social networks from one central dashboard.
            </p>
            <p>
              Whether you're a small business owner, content creator, or marketing agency, Social Rotation 
              simplifies your social media workflow by automating posting, organizing content into buckets, 
              and providing powerful scheduling tools.
            </p>
          </div>
          <div className="about-image">
            <div className="image-placeholder">
              <DashboardIcon />
              <span>Dashboard Preview</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-features">
        <div className="landing-features-content">
          <h3>Powerful Features for Social Media Success</h3>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <CalendarIcon />
              </div>
              <h4>Smart Scheduling</h4>
              <p>
                Schedule posts across all your social media platforms in advance. Set up recurring schedules 
                and never miss a post again.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <BucketIcon />
              </div>
              <h4>Content Buckets</h4>
              <p>
                Organize your images and videos into buckets for easy management. Create themed collections 
                and reuse content efficiently.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <GlobeIcon />
              </div>
              <h4>Multi-Platform Publishing</h4>
              <p>
                Post to Facebook, Instagram, Twitter, LinkedIn, TikTok, YouTube, Pinterest, and Google My Business 
                all from one place.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <ChartIcon />
              </div>
              <h4>Analytics & Insights</h4>
              <p>
                Track your performance with detailed analytics. Monitor engagement, reach, impressions, 
                and follower growth across platforms.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <RefreshIcon />
              </div>
              <h4>RSS Feed Automation</h4>
              <p>
                Automatically import and schedule content from RSS feeds. Keep your social media active 
                with fresh content from your favorite sources.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <UsersIcon />
              </div>
              <h4>Team Collaboration</h4>
              <p>
                Manage multiple client accounts with sub-accounts. Perfect for agencies and teams 
                working with multiple brands.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="landing-how-it-works">
        <div className="landing-how-it-works-content">
          <h3>How It Works</h3>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>Connect Your Accounts</h4>
                <p>Link your social media accounts securely with OAuth. We support Facebook, Instagram, Twitter, LinkedIn, and more.</p>
              </div>
              <div className="step-image">
                <div className="image-placeholder">
                  <LinkIcon />
                  <span>Connect</span>
                </div>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>Organize Your Content</h4>
                <p>Upload images and videos to buckets. Organize by theme, campaign, or content type for easy access.</p>
              </div>
              <div className="step-image">
                <div className="image-placeholder">
                  <FolderIcon />
                  <span>Organize</span>
                </div>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>Schedule & Publish</h4>
                <p>Create schedules for your content. Set specific times, dates, and platforms. Let Social Rotation handle the rest.</p>
              </div>
              <div className="step-image">
                <div className="image-placeholder">
                  <span>⏰ Schedule</span>
                </div>
              </div>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h4>Analyze & Optimize</h4>
                <p>Review your analytics to see what's working. Track engagement and optimize your content strategy.</p>
              </div>
              <div className="step-image">
                <div className="image-placeholder">
                  <span>📈 Analyze</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="landing-cta-section">
        <div className="landing-cta-section-content">
          <h2>Ready to Transform Your Social Media?</h2>
          <p>Join thousands of businesses and creators using Social Rotation to streamline their social media management.</p>
          <div className="landing-cta">
            <Link to="/register" className="cta-button primary">
              Start Free Trial
            </Link>
            <Link to="/login" className="cta-button secondary">
              Sign In
            </Link>
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

