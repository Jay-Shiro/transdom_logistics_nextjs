"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { getAuthUser, hasValidAuth, clearAuthSession } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Update auth state from cookies and listen for changes
  useEffect(() => {
    const updateAuthState = () => {
      const isAuth = hasValidAuth();
      const currentUser = getAuthUser();
      setToken(isAuth ? "authenticated" : null);
      setUser(currentUser);
    };

    // Initial check
    updateAuthState();
    setMounted(true);

    // Check periodically for auth changes (cookie updates)
    const interval = setInterval(updateAuthState, 500);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    clearAuthSession();
    setToken(null);
    setUser(null);
    closeMobileMenu();
    router.push("/");
  };

  if (!mounted) {
    return (
      <header>
        <nav></nav>
      </header>
    );
  }

  const handleSignIn = () => {
    closeMobileMenu();
    router.push("/sign-in");
  };

  const handleGetStarted = () => {
    closeMobileMenu();
    router.push("/sign-up");
  };

  return (
    <header>
      <nav>
        <div className="logo-section">
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <Image
              src="/assets/transdom_logo.svg"
              alt="Transdom Logistics"
              className="logo-img"
              width={40}
              height={40}
            />
            <span className="logo-text">Transdom Logistics</span>
          </Link>
        </div>
        <button
          className={`hamburger ${mobileMenuOpen ? "active" : ""}`}
          onClick={toggleMobileMenu}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <ul className={`nav-links ${mobileMenuOpen ? "active" : ""}`}>
          <li>
            <Link href="/#about" onClick={closeMobileMenu}>
              About Us
            </Link>
          </li>
          <li>
            <Link href="/#faq" onClick={closeMobileMenu}>
              FAQs
            </Link>
          </li>
          <li>
            <Link href="/#contact" onClick={closeMobileMenu}>
              Contact Us
            </Link>
          </li>
          {token && (
            <li>
              <Link href="/dashboard" onClick={closeMobileMenu}>
                Dashboard
              </Link>
            </li>
          )}
          {token && (
            <li>
              <Link href="/quotation" onClick={closeMobileMenu}>
                Quotation
              </Link>
            </li>
          )}
        </ul>
        <div className={`nav-buttons ${mobileMenuOpen ? "active" : ""}`}>
          {token && user ? (
            <>
              <button
                className="btn-sign-in"
                onClick={closeMobileMenu}
                style={{ cursor: "default" }}
              >
                {user.firstname}
              </button>
              <button className="btn-get-started" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <button className="btn-sign-in" onClick={handleSignIn}>
                Sign In
              </button>
              <button className="btn-get-started" onClick={handleGetStarted}>
                Get Started
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
