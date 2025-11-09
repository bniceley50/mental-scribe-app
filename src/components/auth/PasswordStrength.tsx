import { useEffect, useMemo, useState } from "react";

/**
 * Password strength scorer - lightweight entropy-based algorithm
 * No external dependencies (zxcvbn-free)
 */
function scorePassword(pw: string) {
  if (!pw) return { score: 0, label: "empty", suggestions: ["Enter a password"] };
  
  // Length scoring: 0-3 points (every 4 chars)
  const lengthPts = Math.min(3, Math.floor(pw.length / 4));
  
  // Character variety: 0-4 points (lowercase, uppercase, digits, symbols)
  const varietyPts =
    (/[a-z]/.test(pw) ? 1 : 0) +
    (/[A-Z]/.test(pw) ? 1 : 0) +
    (/\d/.test(pw) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(pw) ? 1 : 0);

  // Penalty for common patterns
  const lower = pw.toLowerCase();
  const commonWords = ["password", "qwerty", "letmein", "welcome", "admin", "abc123"];
  const hasCommon = commonWords.some((word) => lower.includes(word));
  const hasRepeats = /(.)\1{2,}/.test(pw); // 3+ repeated chars
  const penalties = (hasCommon ? 2 : 0) + (hasRepeats ? 1 : 0);

  // Calculate raw score: -2 to 7
  let raw = lengthPts + varietyPts - penalties;
  raw = Math.max(0, Math.min(7, raw));
  
  // Map to 1-4 scale
  const score = raw <= 2 ? 1 : raw <= 4 ? 2 : raw <= 6 ? 3 : 4;

  const label = ["", "weak", "fair", "good", "strong"][score];
  const suggestions: string[] = [];
  
  if (score < 4) {
    if (lengthPts < 3) suggestions.push("Use 12+ characters");
    if (varietyPts < 3) suggestions.push("Mix upper/lower, numbers, symbols");
    if (hasCommon) suggestions.push("Avoid common words/phrases");
    if (hasRepeats) suggestions.push("Avoid repeated characters");
  }
  
  return { score, label, suggestions };
}

/**
 * SHA-1 hash for HIBP k-anonymity
 */
async function sha1Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

type HibpResult = {
  checking: boolean;
  pwned: boolean;
  count?: number;
  error?: boolean;
};

/**
 * HIBP breach checking hook using k-anonymity model
 * Only sends first 5 chars of SHA-1 hash to backend
 */
export function useHibp(password: string, enabled = true): HibpResult {
  const [state, setState] = useState<HibpResult>({ checking: false, pwned: false });

  useEffect(() => {
    let alive = true;
    
    // Only check when password is substantial enough
    const shouldCheck = enabled && password.length >= 8;
    
    if (!shouldCheck) {
      setState({ checking: false, pwned: false });
      return;
    }

    setState((prev) => ({ ...prev, checking: true }));
    
    // Debounce: wait for user to stop typing
    const timeoutId = setTimeout(async () => {
      try {
        const hash = await sha1Hex(password);
        const prefix = hash.slice(0, 5);
        const suffix = hash.slice(5);

        // Call our secure edge function (only sends hash prefix)
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hibp-range`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ prefix }),
          }
        );

        if (!response.ok) {
          throw new Error("HIBP API unavailable");
        }

        const text = await response.text();
        const lines = text.split("\n");
        
        // Check if our suffix appears in returned range
        const matchLine = lines.find((line) => line.startsWith(suffix));
        const count = matchLine ? parseInt(matchLine.split(":")[1], 10) || 0 : 0;

        if (alive) {
          setState({ checking: false, pwned: count > 0, count });
        }
      } catch (error) {
        // Fail open in UI: don't block signup if HIBP is down
        // But show "unavailable" state to user
        if (alive) {
          setState({ checking: false, pwned: false, error: true });
        }
      }
    }, 600); // 600ms debounce

    return () => {
      alive = false;
      clearTimeout(timeoutId);
    };
  }, [password, enabled]);

  return state;
}

export interface PasswordStrengthProps {
  password: string;
  className?: string;
  hibpEnabled?: boolean;
}

/**
 * Password strength meter with HIBP breach indicator
 * Uses semantic design tokens for accessibility and theming
 */
export default function PasswordStrength({
  password,
  className = "",
  hibpEnabled = true,
}: PasswordStrengthProps) {
  const { score, label, suggestions } = useMemo(() => scorePassword(password), [password]);
  const hibp = useHibp(password, hibpEnabled);

  // Progress bar width and color based on score
  const percent = (score / 4) * 100;
  const barClass =
    score <= 1
      ? "bg-destructive"
      : score === 2
      ? "bg-warning"
      : score === 3
      ? "bg-success"
      : "bg-success";

  return (
    <div className={className}>
      {/* Strength progress bar */}
      <div
        role="progressbar"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={score}
        aria-valuetext={label}
        className="h-2 w-full rounded bg-muted"
      >
        <div
          className={`h-2 rounded transition-all duration-200 ${barClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Strength label and breach status */}
      <div className="mt-2 flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground capitalize">{label || " "}</span>
        
        {hibp.checking ? (
          <span className="text-muted-foreground" aria-live="polite">
            Checking breaches…
          </span>
        ) : hibp.error ? (
          <span 
            className="text-muted-foreground" 
            title="Breach check temporarily unavailable"
          >
            Breach check unavailable
          </span>
        ) : hibp.pwned ? (
          <span className="font-medium text-destructive" aria-live="assertive">
            Known in breaches
            {typeof hibp.count === "number" ? ` (${hibp.count.toLocaleString()})` : ""} — 
            choose different password
          </span>
        ) : password.length > 0 ? (
          <span className="text-success">Not found in known breaches</span>
        ) : null}
      </div>

      {/* Improvement suggestions */}
      {suggestions.length > 0 && (
        <ul 
          className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground" 
          aria-live="polite"
        >
          {suggestions.map((suggestion) => (
            <li key={suggestion}>{suggestion}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
