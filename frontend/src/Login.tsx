// ログイン / 新規登録 画面。未ログイン時に App がこれを表示する。
import { useState } from "react";
import type { User } from "./types";
import { login, register } from "./api";

type Props = {
  onLoggedIn: (user: User) => void; // ログイン/登録成功を親(App)に知らせる
};

// 新規登録を表示するか（本番ビルドでは未設定＝非表示）
const allowRegistration = import.meta.env.VITE_ALLOW_REGISTRATION === "true";

export default function Login({ onLoggedIn }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isRegister = mode === "register";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = isRegister
        ? await register(name, email, password)
        : await login(email, password);
      onLoggedIn(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "失敗しました");
    } finally {
      setBusy(false);
    }
  }

  function toggleMode() {
    setMode(isRegister ? "login" : "register");
    setError("");
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>mini-Jira</h1>
        <p className="login-sub">{isRegister ? "新規登録" : "ログイン"}</p>

        {error && <div className="login-error">{error}</div>}

        {isRegister && (
          <label className="field">
            <span>名前</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="山田太郎" />
          </label>
        )}

        <label className="field">
          <span>メールアドレス</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="username"
          />
        </label>

        <label className="field">
          <span>パスワード{isRegister && "（6文字以上）"}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
        </label>

        <button className="btn-save" type="submit" disabled={busy}>
          {busy ? "処理中..." : isRegister ? "登録してはじめる" : "ログイン"}
        </button>

        {allowRegistration && (
          <button type="button" className="login-toggle" onClick={toggleMode}>
            {isRegister ? "アカウントを持っている → ログイン" : "アカウントを作る → 新規登録"}
          </button>
        )}
      </form>
    </div>
  );
}
