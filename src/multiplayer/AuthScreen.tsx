import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const emailSchema = z.string().trim().email().max(255);
const passwordSchema = z.string().min(6).max(72);
const usernameSchema = z
  .string()
  .trim()
  .min(2)
  .max(20)
  .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, underscore only");

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    try {
      const e = emailSchema.parse(email);
      const p = passwordSchema.parse(password);
      if (mode === "signup") {
        const u = usernameSchema.parse(username);
        setBusy(true);
        const { error } = await supabase.auth.signUp({
          email: e,
          password: p,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username: u, gender },
          },
        });
        if (error) throw error;
      } else {
        setBusy(true);
        const { error } = await supabase.auth.signInWithPassword({
          email: e,
          password: p,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(ellipse at center, oklch(0.18 0.04 270) 0%, oklch(0.05 0.02 270) 80%)",
      }}
    >
      <div className="panel rounded-lg p-8 max-w-md w-full">
        <h1
          className="font-display text-5xl text-glow text-center"
          style={{ color: "var(--accent)" }}
        >
          DEAD CITY
        </h1>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mt-1 text-center">
          NYC · Multiplayer
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("login")}
            className={`rounded-md py-2 font-mono text-xs uppercase tracking-wider ${
              mode === "login" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`rounded-md py-2 font-mono text-xs uppercase tracking-wider ${
              mode === "signup" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            Create account
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {mode === "signup" && (
            <>
              <Field label="Username">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={20}
                  placeholder="StreetKing"
                  className="w-full rounded-md bg-input px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </Field>
              <Field label="Avatar">
                <div className="grid grid-cols-2 gap-2">
                  {(["male", "female"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`rounded-md border-2 p-3 transition-all ${
                        gender === g
                          ? "border-primary bg-primary/10"
                          : "border-border opacity-60"
                      }`}
                    >
                      <div className="text-2xl">{g === "male" ? "🧔" : "👩"}</div>
                      <div className="font-display text-sm capitalize">{g}</div>
                    </button>
                  ))}
                </div>
              </Field>
            </>
          )}
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              placeholder="you@example.com"
              className="w-full rounded-md bg-input px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={72}
              placeholder="At least 6 characters"
              className="w-full rounded-md bg-input px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </Field>
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
            {error}
          </div>
        )}

        <button
          disabled={busy}
          onClick={submit}
          className="mt-5 w-full rounded-md py-3 font-display text-xl tracking-widest disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--primary))",
            color: "var(--background)",
            boxShadow: "0 0 30px color-mix(in oklab, var(--accent) 50%, transparent)",
          }}
        >
          {busy ? "..." : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
        </button>

        {mode === "signup" && (
          <p className="mt-3 text-center text-[10px] font-mono text-muted-foreground">
            You may need to confirm your email before signing in.
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
