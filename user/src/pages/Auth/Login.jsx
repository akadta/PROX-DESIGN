import { useState, useEffect, useCallback } from "react";
import {
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import api from "../../api/Axios";
import { useNavigate } from "react-router-dom";
// adjust this path to wherever your axios instance actually lives

/* ---------- sliding puzzle (3x3, one blank cell) ---------- */

const GRID = 3;
const BLANK = GRID * GRID - 1;

const PUZZLE_IMAGES = [
  "https://picsum.photos/seed/nova/600/600",
  "https://picsum.photos/seed/atlas/600/600",
  "https://picsum.photos/seed/quartz/600/600",
  "https://picsum.photos/seed/drift/600/600",
  "https://picsum.photos/seed/ember/600/600",
];

function shuffledTiles() {
  // start solved, then perform random valid slides so it's always solvable
  let tiles = Array.from({ length: GRID * GRID }, (_, i) => i);
  let blank = BLANK;
  for (let i = 0; i < 120; i++) {
    const neighbors = [];
    const row = Math.floor(blank / GRID);
    const col = blank % GRID;
    if (row > 0) neighbors.push(blank - GRID);
    if (row < GRID - 1) neighbors.push(blank + GRID);
    if (col > 0) neighbors.push(blank - 1);
    if (col < GRID - 1) neighbors.push(blank + 1);
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    [tiles[blank], tiles[pick]] = [tiles[pick], tiles[blank]];
    blank = pick;
  }
  return tiles;
}

function isSolved(tiles) {
  return tiles.every((v, i) => v === i);
}

function SlidingPuzzle() {
  const [imgIndex, setImgIndex] = useState(() =>
    Math.floor(Math.random() * PUZZLE_IMAGES.length),
  );
  const [tiles, setTiles] = useState(shuffledTiles);
  const [solved, setSolved] = useState(false);

  const reshuffle = useCallback(() => {
    setImgIndex((i) => (i + 1) % PUZZLE_IMAGES.length);
    setTiles(shuffledTiles());
    setSolved(false);
  }, []);

  useEffect(() => {
    if (isSolved(tiles)) {
      setSolved(true);
      const t = setTimeout(reshuffle, 1600);
      return () => clearTimeout(t);
    }
  }, [tiles, reshuffle]);

  const moveTile = (idx) => {
    if (solved) return;
    const blank = tiles.indexOf(BLANK);
    const row = Math.floor(idx / GRID);
    const col = idx % GRID;
    const blankRow = Math.floor(blank / GRID);
    const blankCol = blank % GRID;
    const adjacent =
      (row === blankRow && Math.abs(col - blankCol) === 1) ||
      (col === blankCol && Math.abs(row - blankRow) === 1);
    if (!adjacent) return;
    const next = [...tiles];
    [next[idx], next[blank]] = [next[blank], next[idx]];
    setTiles(next);
  };

  const url = PUZZLE_IMAGES[imgIndex];

  return (
    <div className="puzzle-wrap">
      <div className={`puzzle-grid ${solved ? "is-solved" : ""}`}>
        {tiles.map((value, idx) => {
          const isBlank = value === BLANK;
          const vRow = Math.floor(value / GRID);
          const vCol = value % GRID;
          return (
            <button
              key={idx}
              type="button"
              className={`puzzle-tile ${isBlank ? "is-blank" : ""}`}
              onClick={() => moveTile(idx)}
              aria-label={isBlank ? "empty" : `piece ${value + 1}`}
              style={
                isBlank
                  ? undefined
                  : {
                      backgroundImage: `url(${url})`,
                      backgroundSize: `${GRID * 100}% ${GRID * 100}%`,
                      backgroundPosition: `${
                        (vCol * 100) / (GRID - 1)
                      }% ${(vRow * 100) / (GRID - 1)}%`,
                    }
              }
            />
          );
        })}
      </div>
      <p className="puzzle-caption">
        <Sparkles size={13} strokeWidth={2} />
        {solved ? "assembled — reshuffling" : "slide the tiles into place"}
      </p>
    </div>
  );
}

/* ---------------------- login page ---------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const errs = {};
    if (!email.trim()) errs.email = "Email is required.";
    else if (!EMAIL_RE.test(email.trim()))
      errs.email = "Enter a valid email address.";
    if (!password) errs.password = "Password is required.";
    else if (password.length < 6)
      errs.password = "Password must be at least 6 characters.";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
const { data } = await api.post("/main/login", {
          email: email.trim(),
        password,
      });

      const storage = remember ? localStorage : sessionStorage;
      storage.setItem("token", data.token);
      // storage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
      // no redirect — just confirm success in place
      // setSuccess(true);
    } catch (err) {
      const status = err.response?.status;
      const serverMessage = err.response?.data?.message;

      if (status === 400)
        setError(serverMessage || "Email and password are required.");
      else if (status === 401)
        setError(serverMessage || "Invalid email or password.");
      else if (status === 403)
        setError(serverMessage || "Your account has been deactivated.");
      else if (status === 404)
        setError(serverMessage || "Invalid email or password.");
      else if (err.request && !err.response)
        setError("Can't reach the server. Check your connection.");
      else setError(serverMessage || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <style>{`
        .login-page {
          --ink: #0a0a0a;
          --paper: #ffffff;
          --line: #e7e5e2;
          --muted: #79746c;
          --gold: #b6924a;
          --gold-soft: #f4ecd9;
          height: 100vh;
          width: 100%;
          overflow: hidden;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
          background: var(--paper);
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: var(--ink);
        }

        /* ---- left: black premium panel with puzzle ---- */
        .stage {
          position: relative;
          height: 100vh;
          background: radial-gradient(circle at 20% 15%, #1a1a1a 0%, #0a0a0a 55%, #000 100%);
          color: #f5f3ee;
          padding: 48px 48px 36px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .stage::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 26px 26px;
          opacity: 0.5;
          pointer-events: none;
        }
        .stage-brand {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: "Fraunces", "Georgia", serif;
          font-size: 20px;
          letter-spacing: 0.02em;
        }
        .stage-mark {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--gold), #8a6d2f);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          color: #0a0a0a;
        }
        .stage-copy {
          position: relative;
          max-width: 380px;
          // margin-top: 10px;
        }
        .stage-copy h1 {
          font-family: "Fraunces", "Georgia", serif;
          font-weight: 500;
          font-size: clamp(28px, 3vw, 38px);
          line-height: 1.15;
          margin: 0 0 14px;
        }
        .stage-copy p {
          color: #b9b4aa;
          font-size: 14.5px;
          line-height: 1.6;
          margin: 0;
        }
        .puzzle-wrap {
          position: relative;
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
        }
        .puzzle-grid {
          width: 236px;
          height: 236px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(3, 1fr);
          gap: 4px;
          padding: 8px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          transition: box-shadow 0.4s ease;
        }
        .puzzle-grid.is-solved {
          box-shadow: 0 0 0 1px var(--gold), 0 0 34px -6px rgba(182,146,74,0.65);
        }
        .puzzle-tile {
          border: none;
          border-radius: 5px;
          background-color: #1c1c1c;
          background-repeat: no-repeat;
          cursor: pointer;
          padding: 0;
          transition: transform 0.15s ease, filter 0.3s ease;
        }
        .puzzle-tile:hover:not(.is-blank) { filter: brightness(1.08); }
        .puzzle-tile.is-blank {
          background: transparent;
          cursor: default;
        }
        .puzzle-grid.is-solved .puzzle-tile { filter: saturate(1.1); }
        .puzzle-caption {
          display: flex;
          align-items: center;
          gap: 6px;
          margin: 0;
          font-size: 12px;
          color: #a39d90;
          letter-spacing: 0.01em;
        }

        /* ---- right: white login form ---- */
        .panel {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px;
          overflow: hidden;
        }
        .form-card {
          width: 100%;
          max-width: 360px;
        }
        .form-card h2 {
          font-family: "Fraunces", "Georgia", serif;
          font-weight: 500;
          font-size: 27px;
          margin: 0 0 6px;
        }
        .form-card .sub {
          color: var(--muted);
          font-size: 14px;
          margin: 0 0 32px;
        }
        .field {
          margin-bottom: 18px;
        }
        .field label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: #4c4842;
          margin-bottom: 7px;
        }
        .input-shell {
          display: flex;
          align-items: center;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: #fff;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .input-shell:focus-within {
          border-color: var(--ink);
          box-shadow: 0 0 0 3px rgba(10,10,10,0.06);
        }
        .input-shell input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          padding: 12px 14px;
          font-size: 14.5px;
          color: var(--ink);
          font-family: inherit;
        }
        .input-shell button {
          border: none;
          background: transparent;
          padding: 0 12px;
          display: flex;
          align-items: center;
          color: var(--muted);
          cursor: pointer;
        }
        .row-between {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 4px 0 26px;
        }
        .remember {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          color: #4c4842;
          cursor: pointer;
          user-select: none;
        }
        .remember input {
          width: 15px;
          height: 15px;
          accent-color: var(--ink);
          cursor: pointer;
        }
        .forgot {
          font-size: 13.5px;
          color: var(--muted);
          text-decoration: none;
        }
        .forgot:hover { color: var(--ink); }
        .error-msg {
          font-size: 13px;
          color: #a12b2b;
          background: #fbeaea;
          border: 1px solid #f0caca;
          padding: 9px 12px;
          border-radius: 8px;
          margin-bottom: 18px;
        }
        .input-shell.has-error {
          border-color: #c94040;
        }
        .field-error {
          margin: 6px 2px 0;
          font-size: 12.5px;
          color: #a12b2b;
        }
        .spin {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .success-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 12px 0;
        }
        .success-icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #eaf6ee;
          color: #1f7a3d;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        .success-card h2 { margin-bottom: 6px; }
        .success-card .sub { margin-bottom: 0; }
        .submit-btn {
          width: 100%;
          border: none;
          border-radius: 10px;
          background: var(--ink);
          color: #fff;
          font-size: 14.5px;
          font-weight: 600;
          padding: 13px 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease;
        }
        .submit-btn:hover { background: #1c1c1c; }
        .submit-btn:active { transform: translateY(1px); }
        .submit-btn:disabled { opacity: 0.6; cursor: default; }
        .foot-note {
          margin-top: 26px;
          font-size: 12.5px;
          color: var(--muted);
          text-align: center;
        }

        /* ---- responsive: puzzle/stage hidden on small screens ---- */
        @media (max-width: 860px) {
          .login-page {
            grid-template-columns: 1fr;
          }
          .stage {
            display: none;
          }
          .panel {
            padding: 24px;
          }
        }
      `}</style>

      <div className="stage">
        <div className="stage-copy">
          <h1>Every piece, in its place.</h1>
          <p>
            Manage content, media and publishing workflows from one calm,
            considered workspace.
          </p>
        </div>

        <SlidingPuzzle />
      </div>

      <div className="panel">
        {success ? (
          <div className="form-card success-card">
            <div className="success-icon">
              <CheckCircle2 size={26} />
            </div>
            <h2>Signed in</h2>
            <p className="sub">You're logged in successfully.</p>
          </div>
        ) : (
          <form className="form-card" onSubmit={handleSubmit} noValidate>
            <h2>Sign in</h2>
            <p className="sub">Welcome back. Enter your details to continue.</p>

            {error && <div className="error-msg">{error}</div>}

            <div className="field">
              <label htmlFor="email">Email</label>
              <div
                className={`input-shell ${fieldErrors.email ? "has-error" : ""}`}
              >
                <input
                  id="email"
                  type="email"
                  autoComplete="off"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email)
                      setFieldErrors((f) => ({ ...f, email: "" }));
                  }}
                />
              </div>
              {fieldErrors.email && (
                <p className="field-error">{fieldErrors.email}</p>
              )}
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div
                className={`input-shell ${fieldErrors.password ? "has-error" : ""}`}
              >
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password)
                      setFieldErrors((f) => ({ ...f, password: "" }));
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="field-error">{fieldErrors.password}</p>
              )}
            </div>

            <div className="row-between">
              <label className="remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>
              {/* <a className="forgot" href="#">
                Forgot password?
              </a> */}
            </div>

            <button className="submit-btn" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* <p className="foot-note">Access is by invitation only.</p> */}
          </form>
        )}
      </div>
    </div>
  );
}
