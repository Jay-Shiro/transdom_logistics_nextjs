'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer>
      <div className="footer-content">
        <div className="footer-section">
          <h4>About Transdom</h4>
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
            <li><Link href="/#about">About Us</Link></li>
            <li><a href="#">Blog</a></li>
            <li><a href="#">Careers</a></li>
            <li><Link href="/#contact">Contact Us</Link></li>
          </ul>
        </div>
        <div className="footer-section">
          <h4>Support</h4>
          <ul>
            <li><a href="#">Help Center</a></li>
            <li><Link href="/#faq">FAQ</Link></li>
            <li><a href="#">Terms of Service</a></li>
            <li><a href="#">Privacy Policy</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2026 Transdom Logistics. All rights reserved.</p>
      </div>
    </footer>
  );
}
