'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function AboutUs() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="about-page">
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
      <section className="about-hero">
        <div className="about-hero-content">
          <h1>Easiest way for businesses to send packages</h1>
          <p>Transdom Logistics is the easiest way for businesses to ship Worldwide. We are building the Infrastructure for Logistics to enable businesses to access the global economy.</p>
        </div>
      </section>

      {/* Who We Are Section */}
      <section className="about-section">
        <div className="about-container">
          <div className="about-content">
            <h2>Who are we?</h2>
            <p>We are a digital platform built for businesses and people to send parcels to anyone anywhere in the world⚡️. Transdom Logistics is the easiest way for businesses to ship Worldwide. We are building the Infrastructure for Logistics to enable businesses to access the global economy.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="about-container">
          <h2 className="section-title-center">We are giving you a seamless experience</h2>
          
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-icon">1</div>
              <h3>Create an Account and Profile</h3>
              <p>Sign up for an account if you haven&apos;t already. Complete your profile with accurate and up-to-date information, including your contact details, shipping preferences, and any other required information.</p>
            </div>

            <div className="step-card">
              <div className="step-icon">2</div>
              <h3>Enter Shipment Details</h3>
              <p>Enter comprehensive details about your shipment, including the origin and destination addresses, package dimensions, weight, and any special handling instructions. Ensure that you provide accurate information to receive accurate shipping quotes.</p>
            </div>

            <div className="step-card">
              <div className="step-icon">3</div>
              <h3>Select Shipping Options</h3>
              <p>Choose the shipping method and service level that best suits your needs. Different carriers and services may be available, each with varying costs, delivery times, and additional features.</p>
            </div>

            <div className="step-card">
              <div className="step-icon">4</div>
              <h3>Payment and Confirmation</h3>
              <p>Review the summary of your shipment details and the associated costs. Provide payment information and complete the transaction. Once the payment is processed, you should receive confirmation of your shipment, along with tracking details.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission and Vision Section */}
      <section className="mission-vision">
        <div className="about-container">
          <h2 className="section-title-center">What We Strive For</h2>
          <p className="section-subtitle">Our mission is to provide an easy and reliable shipping solution, enabling businesses and individuals to send parcels to any destination across the globe.</p>
          
          <div className="mission-vision-grid">
            <div className="mission-card">
              <div className="mission-icon">🎯</div>
              <h3>Our Mission</h3>
              <p>Our mission is to simplify the shipping process for businesses to access the global economy.</p>
            </div>

            <div className="mission-card">
              <div className="mission-icon">🚀</div>
              <h3>Our Vision</h3>
              <p>Transdom Logistics aims to be the leading logistics infrastructure provider, bridging the gap between businesses and the global economy.</p>
            </div>

            <div className="mission-card">
              <div className="mission-icon">🌍</div>
              <h3>Global Reach</h3>
              <p>Send parcels to any destination across the globe with our extensive network covering over 200 countries.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-cta">
        <div className="about-container">
          <div className="cta-content">
            <h2>Do it all, Do it now</h2>
            <p>Transdom Logistics takes pride in delivering exceptional customer service. Our dedicated support team is available to assist customers with any queries or concerns they may have. We strive to provide prompt and effective solutions, ensuring a seamless shipping experience for all our clients.</p>
            <button className="btn-primary" onClick={() => window.location.href='/sign-up'}>Get Started</button>
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
