"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

export default function Home() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <>
      <Header />

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-text">
            <h1 className="hero-title">
              Seamless Global
              <span className="hero-highlight">Shipping Solutions</span>
            </h1>
            <p className="hero-description">
              Connect your business to the world with our reliable, fast, and
              affordable shipping services. Reach over 200 countries with
              confidence.
            </p>
            <div className="hero-cta">
              <button
                className="btn-primary"
                onClick={() => (window.location.href = "/quotation")}
              >
                Get Pricing
              </button>
              <button className="btn-secondary">Learn More</button>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <Image
            src="/assets/hero_image.svg"
            alt="Global Shipping Illustration"
            className="hero-image"
            width={900}
            height={600}
          />
          <div className="hero-decoration"></div>
        </div>
        <div className="stats-container hero-stats">
          <div className="stat">
            <div className="stat-number">200+</div>
            <div className="stat-label">Countries Covered</div>
          </div>
          <div className="stat">
            <div className="stat-number">50k+</div>
            <div className="stat-label">Happy Customers</div>
          </div>
          <div className="stat">
            <div className="stat-number">99%</div>
            <div className="stat-label">On-Time Delivery</div>
          </div>
          <div className="stat">
            <div className="stat-number">24/7</div>
            <div className="stat-label">Customer Support</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <h2 className="section-title">Why Choose Transdom Logistics?</h2>
        <p className="section-subtitle">
          Industry-leading shipping solutions for your business
        </p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🌍</div>
            <h3>Global Reach</h3>
            <p>
              Access shipping to over 200 countries worldwide with our extensive
              network of logistics partners
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h3>Discounted Rates</h3>
            <p>
              Save up to 55% on shipping costs with our competitive pricing and
              special bulk discounts
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📦</div>
            <h3>Multiple Options</h3>
            <p>
              Choose from express, standard, or economy delivery options based
              on your timeline and budget
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🚚</div>
            <h3>Door-to-Door Service</h3>
            <p>
              Convenient pickup and delivery directly from your location with
              professional handling
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📍</div>
            <h3>Real-Time Tracking</h3>
            <p>
              Monitor your shipments 24/7 with live tracking updates and
              transparency throughout delivery
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">✅</div>
            <h3>Reliability</h3>
            <p>
              Trusted by thousands of businesses for secure, timely, and
              damage-free deliveries
            </p>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="services">
        <h2 className="section-title">Our Shipping Services</h2>
        <p className="section-subtitle">
          Tailored solutions for every shipping need
        </p>
        <div className="services-grid">
          <div className="service-box">
            <h3>EXPRESS DELIVERY</h3>
            <p>3-5 Working Days</p>
            <p style={{ marginTop: "1rem", fontSize: "0.95rem" }}>
              Fast and reliable international shipping for urgent deliveries.
              Perfect for time-sensitive shipments.
            </p>
            <span className="service-tag">FASTEST</span>
          </div>
          <div className="service-box">
            <h3>STANDARD DELIVERY</h3>
            <p>5-8 Working Days</p>
            <p style={{ marginTop: "1rem", fontSize: "0.95rem" }}>
              Balanced shipping option offering good speed and competitive
              pricing for regular shipments.
            </p>
            <span className="service-tag">POPULAR</span>
          </div>
          <div className="service-box">
            <h3>ECONOMY DELIVERY</h3>
            <p>8-12 Working Days</p>
            <p style={{ marginTop: "1rem", fontSize: "0.95rem" }}>
              Our most affordable shipping option ideal for non-urgent,
              cost-conscious shipments.
            </p>
            <span className="service-tag">ECONOMICAL</span>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="stats-container">
          <div className="stat">
            <div className="stat-number">200+</div>
            <div className="stat-label">Countries Covered</div>
          </div>
          <div className="stat">
            <div className="stat-number">50k+</div>
            <div className="stat-label">Happy Customers</div>
          </div>
          <div className="stat">
            <div className="stat-number">99%</div>
            <div className="stat-label">On-Time Delivery</div>
          </div>
          <div className="stat">
            <div className="stat-number">24/7</div>
            <div className="stat-label">Customer Support</div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="testimonials">
        <h2 className="section-title">What Our Customers Say</h2>
        <p className="section-subtitle">
          Real experiences from satisfied shippers
        </p>
        <div className="testimonials-grid">
          <div className="testimonial">
            <p className="testimonial-text">
              &quot;Transdom Logistics made shipping overseas incredibly simple.
              The rates are unbeatable and the customer service team was
              extremely helpful throughout the entire process.&quot;
            </p>
            <div className="testimonial-author">John Okonkwo</div>
            <div style={{ fontSize: "0.9rem", color: "#999" }}>
              E-commerce Business Owner
            </div>
          </div>
          <div className="testimonial">
            <p className="testimonial-text">
              &quot;I&apos;ve been using Transdom for my business shipments for
              over a year now. Their reliability and transparent pricing have
              made them my go-to logistics partner.&quot;
            </p>
            <div className="testimonial-author">Chioma Adeyemi</div>
            <div style={{ fontSize: "0.9rem", color: "#999" }}>
              Import/Export Specialist
            </div>
          </div>
          <div className="testimonial">
            <p className="testimonial-text">
              &quot;The tracking system is fantastic! I can see exactly where my
              packages are at any time. Highly recommended for anyone needing
              international shipping.&quot;
            </p>
            <div className="testimonial-author">Michael Chen</div>
            <div style={{ fontSize: "0.9rem", color: "#999" }}>
              Small Business Owner
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq">
        <h2 className="section-title">Frequently Asked Questions</h2>
        <p className="section-subtitle">
          Get answers to common questions about our services
        </p>
        <div className="faq-container">
          {[
            {
              question: "How much will my delivery cost?",
              answer:
                "Pricing depends on factors like package weight, destination, and delivery speed. Use our online calculator for an instant quote, or contact our team for personalized rates.",
            },
            {
              question: "How does Transdom Logistics work?",
              answer:
                "We're a logistics aggregator partnering with multiple local and international couriers. You provide shipment details, choose your delivery option, and we handle the rest through our network of trusted partners.",
            },
            {
              question: "Is Transdom Logistics right for me?",
              answer:
                "Absolutely! Whether you're an e-commerce seller, business, or individual, we offer solutions tailored to your needs. We simplify logistics for anyone shipping domestically or internationally.",
            },
            {
              question: "Are there any hidden fees?",
              answer:
                "No! We pride ourselves on transparent pricing. All costs are included in your quote with no surprise charges. What you see is what you pay.",
            },
            {
              question: "Can I track my shipment in real-time?",
              answer:
                "Yes! Track your packages 24/7 through our platform. You'll receive updates at every stage of delivery, from pickup to final destination.",
            },
            {
              question: "What items can't be shipped?",
              answer:
                "Some items are restricted for international shipping including hazardous materials, weapons, and certain regulated items. Our team can advise you on specific restrictions for your shipment.",
            },
          ].map((faq, index) => (
            <div key={index} className="faq-item">
              <div className="faq-question" onClick={() => toggleFAQ(index)}>
                <span>{faq.question}</span>
                <span className="faq-toggle">
                  {openFaqIndex === index ? "−" : "+"}
                </span>
              </div>
              <div
                className={`faq-answer ${openFaqIndex === index ? "active" : ""}`}
              >
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="final-cta" id="contact">
        <h2>Ready to Ship with Transdom?</h2>
        <p>
          Start shipping today and experience the difference of world-class
          logistics
        </p>
        <button
          className="btn-primary"
          onClick={() => (window.location.href = "/quotation")}
        >
          Get Started Now
        </button>
      </section>

      {/* Footer */}
      <Footer />
    </>
  );
}
