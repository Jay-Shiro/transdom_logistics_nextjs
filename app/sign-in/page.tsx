"use client";

import { useState, FormEvent, useMemo, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import { getSafeRedirect, withRedirect } from "@/lib/auth";

const QUOTATION_STORAGE_KEY = "transdom_quotation_form";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Set when the user was sent here from a gated page, e.g. /sign-in?redirect=booking
  const redirectParam = searchParams.get("redirect");
  const redirectTo = getSafeRedirect(redirectParam);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    password: "",
  });

  // Calculate form completion progress
  const formProgress = useMemo(() => {
    const activeField = loginMethod === "email" ? "email" : "phone";
    const filledFields = [formData[activeField], formData.password].filter(
      (field) => field.length > 0,
    );
    return Math.round((filledFields.length / 2) * 100);
  }, [formData, loginMethod]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{
    type: string;
    message: string;
    showContactSupport?: boolean;
  } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const payload = {
        email: loginMethod === "email" ? formData.email : formData.phone,
        password: formData.password,
      };

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Ensure cookies are sent/received
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        // Check if there's a quotation in localStorage
        const quotationData = localStorage.getItem(QUOTATION_STORAGE_KEY);

        // Wait to ensure cookies are fully set before redirecting
        setTimeout(() => {
          if (redirectTo) {
            // Came from a gated page (e.g. BOOK NOW) - send them back to it
            router.push(redirectTo);
          } else if (quotationData) {
            // Quotation exists, redirect to dashboard with quotation
            router.push("/dashboard?from=quotation");
          } else {
            // No quotation, just go to dashboard
            router.push("/dashboard");
          }
        }, 1000);
      } else {
        // Handle specific error types
        if (data.error_code === "ACCOUNT_SUSPENDED") {
          setError({
            type: "suspended",
            message: data.detail,
            showContactSupport: data.contact_support,
          });
        } else {
          setError({ type: "general", message: data.detail || "Login failed" });
        }
      }
    } catch (error) {
      setError({ type: "general", message: "An error occurred during login" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        {/* Left Side - Sign In Form */}
        <div className="signup-form-section">
          <div className="signup-header">
            <Link href="/">
              <Image
                src="/assets/transdom_logo.svg"
                alt="Transdom Logistics"
                width={50}
                height={50}
              />
            </Link>
          </div>

          <div className="signup-form-wrapper">
            <h1 className="signup-title">Welcome Back</h1>
            <p className="signup-subtitle">
              Sign in to your account to continue
            </p>

            {/* Progress Bar */}
            <div className="form-progress-container">
              <div className="form-progress-bar">
                <div
                  className="form-progress-fill"
                  style={{ width: `${formProgress}%` }}
                >
                  <span className="form-progress-text">{formProgress}%</span>
                </div>
              </div>
            </div>

            {/* Login Method Toggle */}
            <div className="login-method-toggle">
              <button
                type="button"
                className={`toggle-btn ${loginMethod === "email" ? "active" : ""}`}
                onClick={() => setLoginMethod("email")}
              >
                Email
              </button>
              <button
                type="button"
                className={`toggle-btn ${loginMethod === "phone" ? "active" : ""}`}
                onClick={() => setLoginMethod("phone")}
              >
                Phone Number
              </button>
            </div>

            <form className="signup-form" onSubmit={handleSubmit}>
              {loginMethod === "email" ? (
                <div
                  className={`form-group-signup animated-input ${focusedField === "email" ? "focused" : ""} ${formData.email ? "filled" : ""}`}
                >
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder=" "
                    value={formData.email}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    required
                  />
                  <label htmlFor="email">Email Address</label>
                  <span className="input-border"></span>
                </div>
              ) : (
                <div
                  className={`form-group-signup animated-input ${focusedField === "phone" ? "focused" : ""} ${formData.phone ? "filled" : ""}`}
                >
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    placeholder=" "
                    value={formData.phone}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("phone")}
                    onBlur={() => setFocusedField(null)}
                    required
                  />
                  <label htmlFor="phone">Phone Number</label>
                  <span className="input-border"></span>
                </div>
              )}

              <div
                className={`form-group-signup animated-input ${focusedField === "password" ? "focused" : ""} ${formData.password ? "filled" : ""}`}
              >
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder=" "
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    required
                  />
                  <label htmlFor="password">Password</label>
                  <span className="input-border"></span>
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              <div className="signin-options">
                <label className="remember-me">
                  <input type="checkbox" />
                  <span>Remember me</span>
                </label>
                <Link href="/forgot-password" className="forgot-password-link">
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                className="btn-signup-submit"
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Sign In"}
              </button>
            </form>
            {error && (
              <div
                className="error-message"
                style={{
                  color: "white",
                  backgroundColor:
                    error.type === "suspended" ? "#f59e0b" : "#dc2626",
                  padding: "16px",
                  borderRadius: "8px",
                  marginTop: "10px",
                  textAlign: "center",
                  fontWeight: "500",
                  border:
                    error.type === "suspended" ? "2px solid #d97706" : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <AlertTriangle size={16} />
                    <strong>
                      {error.type === "suspended"
                        ? "Account Suspended"
                        : "Login Failed"}
                    </strong>
                  </span>
                  <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.4" }}>
                    {error.message}
                  </p>
                  {error.showContactSupport && (
                    <div
                      style={{
                        marginTop: "8px",
                        fontSize: "13px",
                        opacity: 0.9,
                      }}
                    >
                      <strong>Need help?</strong> Contact our support team:
                      <br />
                      📧 support@transdom.com | 📞 +234-800-TRANSDOM
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="signup-divider">
              <span>Or</span>
            </div>

            <p className="signup-login-link">
              Don&apos;t have an account?{" "}
              <Link href={withRedirect("/sign-up", redirectParam)}>Sign Up</Link>
            </p>
          </div>
        </div>

        {/* Right Side - Illustrations */}
        <div className="signup-illustration-section">
          <div className="illustration-bg"></div>
          <div
            className={`illustration-content ${formProgress === 100 ? "active" : ""}`}
          >
            <h2>Continue Your Journey</h2>
            <p>
              Access your dashboard and manage your shipments with ease. Welcome
              back to Transdom Logistics!
            </p>

            {/* Animated progress circles */}
            <div className="illustration-progress">
              <div
                className={`progress-circle ${formProgress >= 50 ? "active" : ""}`}
              ></div>
              <div
                className={`progress-circle ${formProgress === 100 ? "active" : ""}`}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense
      fallback={
        <div className="signup-page">
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100vh",
            }}
          >
            <p>Loading...</p>
          </div>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
