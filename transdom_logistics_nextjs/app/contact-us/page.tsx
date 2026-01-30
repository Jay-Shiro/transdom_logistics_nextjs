'use client';

import { useState, FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function ContactUs() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log('Contact form submitted:', formData);
    alert('Thank you for contacting us! We will get back to you within 24 hours.');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="contact-page">
      {/* Header/Navigation */}
      <header>
        <nav>
          <div className="logo-section">
            <Link href="/">
              <Image src="/assets/transdom_logo.svg" alt="Transdom Logistics" className="logo-img" width={40} height={40} />
            </Link>
            <span className="logo-text">Transdom Logistics</span>
          </div>
          <button className={`hamburger ${mobileMenuOpen ? 'active' : ''}`} onClick={toggleMobileMenu}>
            <span></span>
            <span></span>
            <span></span>
          </button>
          <ul className={`nav-links ${mobileMenuOpen ? 'active' : ''}`}>
            <li><Link href="/about-us" onClick={closeMobileMenu}>About Us</Link></li>
            <li><Link href="/faq" onClick={closeMobileMenu}>FAQs</Link></li>
            <li><Link href="/contact-us" onClick={closeMobileMenu}>Contact Us</Link></li>
          </ul>
          <div className={`nav-buttons ${mobileMenuOpen ? 'active' : ''}`}>
            <button className="btn-sign-in" onClick={() => window.location.href='/sign-in'}>Sign In</button>
            <button className="btn-get-started" onClick={() => window.location.href='/sign-up'}>Get Started</button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="contact-hero">
        <div className="contact-hero-content">
          <h1>Get in Touch</h1>
          <p>We&apos;d love to hear from you. Our team is here to help.</p>
        </div>
      </section>

      {/* Contact Content Section */}
      <section className="contact-content">
        <div className="contact-container">
          <div className="contact-grid">
            {/* Contact Information */}
            <div className="contact-info">
              <h2>Contact Information</h2>
              
              <div className="contact-info-item">
                <div className="contact-icon">🌐</div>
                <div>
                  <h3>Website</h3>
                  <Link href="/">www.transdomlogistics.com</Link>
                </div>
              </div>

              <div className="contact-info-item">
                <div className="contact-icon">✉️</div>
                <div>
                  <h3>Email</h3>
                  <a href="mailto:support@transdomlogistics.com">support@transdomlogistics.com</a>
                </div>
              </div>

              <div className="contact-info-item">
                <div className="contact-icon">📞</div>
                <div>
                  <h3>Phone</h3>
                  <a href="tel:+15551234567">+1 (555) 123-4567</a>
                </div>
              </div>

              <div className="contact-info-item">
                <div className="contact-icon">📍</div>
                <div>
                  <h3>Corporate Office</h3>
                  <p>123 Logistics Way, Business District<br />New York, NY 10001, USA</p>
                </div>
              </div>

              <div className="contact-info-item">
                <div className="contact-icon">🕐</div>
                <div>
                  <h3>Business Hours</h3>
                  <p>Monday - Friday: 9:00 AM - 6:00 PM<br />Saturday: 10:00 AM - 4:00 PM<br />Sunday: Closed</p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="contact-form-wrapper">
              <h2>Send us a message</h2>
              <p>Do you have a question or an inquiry? Write us and we will get back to you within 24 hours.</p>
              
              <form onSubmit={handleSubmit} className="contact-form">
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Subject</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="What is this regarding?"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us more about your inquiry..."
                    rows={6}
                    required
                  ></textarea>
                </div>

                <button type="submit" className="btn-primary">Send Message</button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <Image src="/assets/transdom_logo.svg" alt="Transdom Logistics" width={40} height={40} />
            </div>
            <p style={{ color: '#aaa', marginBottom: '1rem' }}>Leading logistics platform simplifying shipping to 200+ countries worldwide.</p>
            <div className="social-links">
              <a href="#" className="social-icon">f</a>
              <a href="#" className="social-icon">t</a>
              <a href="#" className="social-icon">in</a>
              <a href="#" className="social-icon">ig</a>
            </div>
          </div>
          <div className="footer-section">
            <h4>Services</h4>
            <ul>
              <li><a href="#">International Shipping</a></li>
              <li><a href="#">Local Delivery</a></li>
              <li><a href="#">Cargo Services</a></li>
              <li><a href="#">Tracking</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Company</h4>
            <ul>
              <li><Link href="/about-us">About Us</Link></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Careers</a></li>
              <li><Link href="/contact-us">Contact Us</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li><a href="#">Help Center</a></li>
              <li><Link href="/faq">FAQ</Link></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 Transdom Logistics. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
