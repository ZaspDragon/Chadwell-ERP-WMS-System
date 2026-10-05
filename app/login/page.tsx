"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole, Mail, Warehouse } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/receiving";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) {
        router.replace(next);
      }
    });

    return () => {
      mounted = false;
    };
  }, [next, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.replace(next);
    router.refresh();
  }

  return (
    <main className="loginShell">
      <section className="loginCard">
        <div className="loginBrand">
          <div className="loginLogo">
            <Warehouse size={24} />
          </div>
          <div>
            <strong>Chadwell WMS</strong>
            <span>Warehouse Operations</span>
          </div>
        </div>

        <h1>Sign in</h1>
        <p className="loginSubtitle">
          Use your authorized warehouse account.
        </p>

        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <div className="loginInput">
            <Mail size={18} />
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
            />
          </div>

          <label>Password</label>
          <div className="loginInput">
            <LockKeyhole size={18} />
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
          </div>

          {error ? (
            <div className="loginError">{error}</div>
          ) : null}

          <button
            className="loginButton"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
