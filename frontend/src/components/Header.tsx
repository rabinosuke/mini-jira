// ヘッダー：プロジェクト選択・検索・担当者フィルタ・ログイン中ユーザー・ログアウト
import type { Project, User } from "../types";

const ROLE_LABEL: Record<string, string> = { manager: "管理者", developer: "開発者" };

type Props = {
  currentUser: User;
  isManager: boolean;
  projects: Project[];
  currentProjectId: number | null;
  onSelectProject: (id: number) => void;
  onToggleNewProject: () => void;
  onOpenAdmin: () => void;
  searchInput: string;
  onSearchChange: (value: string) => void;
  users: User[];
  filterUser: number | "all";
  onFilterChange: (value: number | "all") => void;
  onLogout: () => void;
};

export default function Header({
  currentUser,
  isManager,
  projects,
  currentProjectId,
  onSelectProject,
  onToggleNewProject,
  onOpenAdmin,
  searchInput,
  onSearchChange,
  users,
  filterUser,
  onFilterChange,
  onLogout,
}: Props) {
  return (
    <header className="header">
      <div className="header-left">
        <h1>mini-Jira</h1>
        <select
          className="project-select"
          value={currentProjectId ?? ""}
          onChange={(e) => onSelectProject(Number(e.target.value))}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}（{p.key}）
            </option>
          ))}
        </select>
        {isManager && (
          <button className="logout-btn" onClick={onToggleNewProject}>
            ＋ プロジェクト
          </button>
        )}
        {isManager && (
          <button className="logout-btn" onClick={onOpenAdmin}>
            👤 管理
          </button>
        )}
      </div>

      <div className="header-right">
        <input
          className="search-box"
          type="search"
          placeholder="タイトル・説明で検索"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <label className="filter">
          担当者で絞り込み:
          <select
            value={filterUser}
            onChange={(e) =>
              onFilterChange(e.target.value === "all" ? "all" : Number(e.target.value))
            }
          >
            <option value="all">全員</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <span className="current-user">
          {currentUser.name}（{ROLE_LABEL[currentUser.role]}）
        </span>
        <button className="logout-btn" onClick={onLogout}>
          ログアウト
        </button>
      </div>
    </header>
  );
}
