import React, { useState } from "react";
import { GraduationCap, LoaderCircle } from "lucide-react";
import { loginAccount, registerAccount } from "../services/api";
import "./AuthScreen.css";

export default function AuthScreen({ onAuthenticated, error: initialError = "" }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const authenticate = isRegistering ? registerAccount : loginAccount;
      const session = await authenticate(email, password);
      onAuthenticated(session);
    } catch (requestError) {
      setError(requestError.message || "Could not sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">
          <div className="auth-logo"><GraduationCap size={25} /></div>
          <div>
            <div className="auth-brand-name">StudyMate <span>AI</span></div>
            <p>Your personal AI study buddy</p>
          </div>
        </div>

        <h1 id="auth-title">{isRegistering ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-subtitle">
          Your study sessions and progress sync securely with your account.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            maxLength={254}
            required
          />

          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            autoComplete={isRegistering ? "new-password" : "current-password"}
            value={password}
            onChange={event => setPassword(event.target.value)}
            minLength={isRegistering ? 8 : undefined}
            maxLength={128}
            required
          />
          {isRegistering && <small>Use at least 8 characters.</small>}

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting && <LoaderCircle className="auth-spinner" size={17} />}
            {isRegistering ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="auth-toggle">
          {isRegistering ? "Already have an account?" : "New to StudyMate?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError("");
            }}
          >
            {isRegistering ? "Sign in" : "Create an account"}
          </button>
        </p>
      </section>
    </main>
  );
}
