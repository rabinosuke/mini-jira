// 管理者パネル（管理者のみ）。2タブ構成：
//  - ユーザー: 全ユーザー一覧＋新規ユーザー作成（本人は初期パスワードでログインできる）
//  - メンバー: 現在のプロジェクトのメンバー追加・削除（担当者に指名できる範囲を決める）
import { useState } from "react";
import type { User, Project } from "../types";

const ROLE_LABEL: Record<string, string> = { manager: "管理者", developer: "開発者" };

type Props = {
  project: Project | null;
  allUsers: User[]; // 全ユーザー（メンバー追加の候補・ユーザー一覧に使う）
  members: User[]; // 現在のプロジェクトのメンバー
  onCreateUser: (data: {
    name: string;
    email: string;
    password: string;
    role: string;
  }) => Promise<void>;
  onAddMember: (userId: number) => Promise<void>;
  onRemoveMember: (userId: number) => Promise<void>;
  onClose: () => void;
};

export default function AdminPanel({
  project,
  allUsers,
  members,
  onCreateUser,
  onAddMember,
  onRemoveMember,
  onClose,
}: Props) {
  const [tab, setTab] = useState<"users" | "members">("users");

  // 新規ユーザー作成フォーム
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("developer");
  const [userErr, setUserErr] = useState("");
  const [userMsg, setUserMsg] = useState("");

  // メンバー追加
  const [addUserId, setAddUserId] = useState<number | "">("");
  const [memberErr, setMemberErr] = useState("");

  const [busy, setBusy] = useState(false);

  const memberIds = new Set(members.map((m) => m.id));
  const nonMembers = allUsers.filter((u) => !memberIds.has(u.id));

  async function submitUser(e: React.FormEvent) {
    e.preventDefault();
    setUserErr("");
    setUserMsg("");
    if (!name.trim() || !email.trim() || password.length < 6) {
      setUserErr("名前・メール・6文字以上のパスワードを入力してください");
      return;
    }
    setBusy(true);
    try {
      await onCreateUser({ name: name.trim(), email: email.trim(), password, role });
      setUserMsg(`ユーザー「${name.trim()}」を作成しました`);
      setName("");
      setEmail("");
      setPassword("");
      setRole("developer");
    } catch (err) {
      setUserErr(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function submitAddMember(e: React.FormEvent) {
    e.preventDefault();
    setMemberErr("");
    if (addUserId === "") return;
    setBusy(true);
    try {
      await onAddMember(Number(addUserId));
      setAddUserId("");
    } catch (err) {
      setMemberErr(err instanceof Error ? err.message : "追加に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(userId: number) {
    setMemberErr("");
    setBusy(true);
    try {
      await onRemoveMember(userId);
    } catch (err) {
      setMemberErr(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-key">管理者パネル</span>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="admin-tabs">
          <button
            className={tab === "users" ? "admin-tab active" : "admin-tab"}
            onClick={() => setTab("users")}
          >
            ユーザー
          </button>
          <button
            className={tab === "members" ? "admin-tab active" : "admin-tab"}
            onClick={() => setTab("members")}
          >
            メンバー{project ? `（${project.name}）` : ""}
          </button>
        </div>

        {tab === "users" && (
          <div className="admin-section">
            <form className="admin-form" onSubmit={submitUser}>
              <h3 className="comments-title">新規ユーザー作成</h3>
              <input
                type="text"
                placeholder="名前"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                type="email"
                placeholder="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="password"
                placeholder="初期パスワード（6文字以上）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="developer">開発者</option>
                <option value="manager">管理者</option>
              </select>
              <button className="btn-save" type="submit" disabled={busy}>
                作成
              </button>
              {userErr && <span className="login-error">{userErr}</span>}
              {userMsg && <span className="admin-ok">{userMsg}</span>}
            </form>

            <h3 className="comments-title">ユーザー一覧（{allUsers.length}）</h3>
            <ul className="admin-list">
              {allUsers.map((u) => (
                <li key={u.id}>
                  <span className="admin-name">{u.name}</span>
                  <span className="admin-muted">{u.email}</span>
                  <span className="admin-role">{ROLE_LABEL[u.role] ?? u.role}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "members" && (
          <div className="admin-section">
            {!project ? (
              <p className="comments-empty">プロジェクトを選択してください</p>
            ) : (
              <>
                <form className="admin-form" onSubmit={submitAddMember}>
                  <h3 className="comments-title">メンバー追加</h3>
                  <select
                    value={addUserId}
                    onChange={(e) =>
                      setAddUserId(e.target.value === "" ? "" : Number(e.target.value))
                    }
                  >
                    <option value="">ユーザーを選択</option>
                    {nonMembers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}（{u.email}）
                      </option>
                    ))}
                  </select>
                  <button className="btn-save" type="submit" disabled={busy || addUserId === ""}>
                    追加
                  </button>
                  {memberErr && <span className="login-error">{memberErr}</span>}
                </form>

                <h3 className="comments-title">メンバー一覧（{members.length}）</h3>
                <ul className="admin-list">
                  {members.map((u) => (
                    <li key={u.id}>
                      <span className="admin-name">{u.name}</span>
                      <span className="admin-muted">{u.email}</span>
                      <span className="admin-role">{ROLE_LABEL[u.role] ?? u.role}</span>
                      <button
                        className="admin-remove"
                        onClick={() => removeMember(u.id)}
                        disabled={busy}
                      >
                        外す
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
