"use client";

import Link from "next/link";

export function HeroCTA() {
  return (
    <div className="hero-cta">
      <Link href="/quotation" className="btn-primary">
        Get Pricing
      </Link>
      <Link href="/about-us" className="btn-secondary">
        Learn More
      </Link>
    </div>
  );
}

export function FinalCTA() {
  return (
    <Link href="/quotation" className="btn-primary">
      Get Started Now
    </Link>
  );
}
