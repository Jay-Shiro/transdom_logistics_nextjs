"use client";

import { useState, FormEvent, useMemo, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { getSafeRedirect, withRedirect } from "@/lib/auth";

const QUOTATION_STORAGE_KEY = "transdom_quotation_form";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Set when the user was sent here from a gated page, e.g. /sign-up?redirect=booking
  const redirectParam = searchParams.get("redirect");
  const redirectTo = getSafeRedirect(redirectParam);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
    country: "",
    gender: "",
    userType: "Individual",
  });

  // Calculate form completion progress
  const formProgress = useMemo(() => {
    const requiredFields = [
      "firstName",
      "lastName",
      "email",
      "phoneNumber",
      "password",
      "confirmPassword",
      "gender",
      "country",
      "userType",
    ];
    const filledFields = requiredFields.filter(
      (field) => formData[field as keyof typeof formData].length > 0,
    );
    return Math.round((filledFields.length / requiredFields.length) * 100);
  }, [formData]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    if (!formData.gender || !formData.country) {
      setError("Please select gender and country");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: formData.firstName,
          lastname: formData.lastName,
          email: formData.email,
          gender: formData.gender,
          country: formData.country,
          password: formData.password,
          phone_number: formData.phoneNumber || undefined,
          referral_code: formData.referralCode || undefined,
          user_type: formData.userType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Check if there's a quotation in localStorage
        const quotationData = localStorage.getItem(QUOTATION_STORAGE_KEY);

        if (redirectTo) {
          // Came from a gated page (e.g. BOOK NOW) - send them back to it
          window.location.href = redirectTo;
        } else if (quotationData) {
          // Quotation exists, redirect to dashboard with quotation
          window.location.href = "/dashboard?from=quotation";
        } else {
          // No quotation, just go to dashboard
          window.location.href = "/dashboard";
        }
      } else {
        setError(data.detail || "Signup failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="signup-page">
      <div className="signup-container">
        {/* Left Side - Form */}
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
            <h1 className="signup-title">Create your account</h1>
            <p className="signup-subtitle">
              Fill the form below with valid details to continue
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

            {error && (
              <div
                style={{
                  padding: "12px",
                  marginBottom: "16px",
                  backgroundColor: "#fee",
                  border: "1px solid #fcc",
                  borderRadius: "4px",
                  color: "#c33",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="signup-form">
              <div className="form-row-signup">
                <div
                  className={`form-group-signup animated-input ${focusedField === "firstName" ? "focused" : ""} ${formData.firstName ? "filled" : ""}`}
                >
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("firstName")}
                    onBlur={() => setFocusedField(null)}
                    required
                    placeholder=" "
                  />
                  <label htmlFor="firstName">First Name</label>
                  <span className="input-border"></span>
                </div>
                <div
                  className={`form-group-signup animated-input ${focusedField === "lastName" ? "focused" : ""} ${formData.lastName ? "filled" : ""}`}
                >
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("lastName")}
                    onBlur={() => setFocusedField(null)}
                    required
                    placeholder=" "
                  />
                  <label htmlFor="lastName">Last Name</label>
                  <span className="input-border"></span>
                </div>
              </div>

              <div
                className={`form-group-signup animated-input ${focusedField === "email" ? "focused" : ""} ${formData.email ? "filled" : ""}`}
              >
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  required
                  placeholder=" "
                />
                <label htmlFor="email">Email Address</label>
                <span className="input-border"></span>
              </div>

              <div
                className={`form-group-signup animated-input ${focusedField === "phoneNumber" ? "focused" : ""} ${formData.phoneNumber ? "filled" : ""}`}
              >
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("phoneNumber")}
                  onBlur={() => setFocusedField(null)}
                  required
                  placeholder=" "
                />
                <label htmlFor="phoneNumber">Phone Number</label>
                <span className="input-border"></span>
              </div>

              <div className="form-group-signup">
                <label htmlFor="gender">Gender</label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("gender")}
                  onBlur={() => setFocusedField(null)}
                  required
                >
                  <option value="">Select your gender</option>
                  <option value="m">Male</option>
                  <option value="f">Female</option>
                </select>
              </div>

              <div className="form-group-signup">
                <label htmlFor="country">Country</label>
                <select
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("country")}
                  onBlur={() => setFocusedField(null)}
                  required
                >
                  <option value="">Select your country</option>
                  <option value="nigeria">Nigeria</option>
                  <option value="ghana">Ghana</option>
                  <option value="kenya">Kenya</option>
                  <option value="usa">United States</option>
                  <option value="uk">United Kingdom</option>
                  <option value="canada">Canada</option>
                </select>
              </div>

              <div className="form-group-signup">
                <label htmlFor="userType">Account Type</label>
                <select
                  id="userType"
                  name="userType"
                  value={formData.userType}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("userType")}
                  onBlur={() => setFocusedField(null)}
                  required
                >
                  <option value="Individual">Individual</option>
                  <option value="Business">Business</option>
                </select>
              </div>

              <div
                className={`form-group-signup animated-input ${focusedField === "password" ? "focused" : ""} ${formData.password ? "filled" : ""}`}
              >
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    required
                    placeholder=" "
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

              <div
                className={`form-group-signup animated-input ${focusedField === "confirmPassword" ? "focused" : ""} ${formData.confirmPassword ? "filled" : ""}`}
              >
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("confirmPassword")}
                    onBlur={() => setFocusedField(null)}
                    required
                    placeholder=" "
                  />
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <span className="input-border"></span>
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <Eye size={18} />
                    ) : (
                      <EyeOff size={18} />
                    )}
                  </button>
                </div>
              </div>

              <div
                className={`form-group-signup animated-input ${focusedField === "referralCode" ? "focused" : ""} ${formData.referralCode ? "filled" : ""}`}
              >
                <input
                  type="text"
                  id="referralCode"
                  name="referralCode"
                  value={formData.referralCode}
                  onChange={handleChange}
                  onFocus={() => setFocusedField("referralCode")}
                  onBlur={() => setFocusedField(null)}
                  placeholder=" "
                />
                <label htmlFor="referralCode">Referral Code (Optional)</label>
                <span className="input-border"></span>
              </div>

              <button
                type="submit"
                className="btn-signup-submit"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Proceed"}
              </button>
            </form>

            <div className="signup-divider">
              <span>Or</span>
            </div>

            <p className="signup-login-link">
              Already have an account?{" "}
              <Link href={withRedirect("/sign-in", redirectParam)}>Log In</Link>
            </p>
          </div>
        </div>

        {/* Right Side - Illustrations */}
        <div className="signup-illustration-section">
          <div className="illustration-bg"></div>
          <div
            className={`illustration-content ${formProgress > 50 ? "active" : ""}`}
          >
            <h2>Welcome to Transdom Logistics</h2>
            <p>
              Connect your business to the world with our reliable, fast, and
              affordable shipping services
            </p>

            {/* Animated progress circles */}
            <div className="illustration-progress">
              <div
                className={`progress-circle ${formProgress >= 20 ? "active" : ""}`}
              ></div>
              <div
                className={`progress-circle ${formProgress >= 40 ? "active" : ""}`}
              ></div>
              <div
                className={`progress-circle ${formProgress >= 60 ? "active" : ""}`}
              ></div>
              <div
                className={`progress-circle ${formProgress >= 80 ? "active" : ""}`}
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

export default function SignUpPage() {
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
      <SignUpForm />
    </Suspense>
  );
}
