// アプリ全体のまとめ役（状態と処理を持ち、各コンポーネントに渡す）。
import { useCallback, useEffect, useState } from "react";
import type { Task, User, Project } from "./types";
import {
  getUsers,
  getTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
  getMe,
  logout,
  getProjects,
  createProject,
  setUnauthorizedHandler,
} from "./api";
import Login from "./Login";
import TaskModal from "./TaskModal";
import Header from "./components/Header";
import NewTaskForm from "./components/NewTaskForm";
import Board from "./components/Board";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "エラーが発生しました";
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filterUser, setFilterUser] = useState<number | "all">("all");
  const [editing, setEditing] = useState<Task | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjKey, setNewProjKey] = useState("");
  const [projError, setProjError] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingTasks, setLoadingTasks] = useState(false);

  // 起動時：401（セッション切れ）ハンドラ登録＋ログイン状態の確認
  useEffect(() => {
    setUnauthorizedHandler(() => setCurrentUser(null));
    getMe().then((u) => {
      setCurrentUser(u);
      if (u && u.role === "developer") setFilterUser(u.id);
      setChecking(false);
    });
  }, []);

  // タスク一覧を取り直す（ログイン中＆プロジェクト選択中のみ）
  const reload = useCallback(async () => {
    if (!currentUser || !currentProjectId) return;
    setLoadingTasks(true);
    try {
      const data = await getTasks({
        projectId: currentProjectId,
        assigneeId: filterUser === "all" ? undefined : filterUser,
        q: search || undefined,
      });
      setTasks(data);
    } catch (e) {
      setErrorMsg(errMsg(e));
    } finally {
      setLoadingTasks(false);
    }
  }, [currentUser, currentProjectId, filterUser, search]);

  // 検索入力のデバウンス（300ms）
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ログインしたらユーザー・プロジェクトを取得
  useEffect(() => {
    if (!currentUser) return;
    getUsers()
      .then(setUsers)
      .catch((e) => setErrorMsg(errMsg(e)));
    getProjects()
      .then((ps) => {
        setProjects(ps);
        if (ps.length > 0) setCurrentProjectId((prev) => prev ?? ps[0].id);
      })
      .catch((e) => setErrorMsg(errMsg(e)));
  }, [currentUser]);

  useEffect(() => {
    reload();
  }, [reload]);

  // エラーメッセージは5秒で自動的に消える
  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(""), 5000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  function onLoggedIn(u: User) {
    setCurrentUser(u);
    if (u.role === "developer") setFilterUser(u.id);
  }

  async function onLogout() {
    await logout();
    setCurrentUser(null);
    setTasks([]);
    setUsers([]);
    setFilterUser("all");
    setProjects([]);
    setCurrentProjectId(null);
  }

  async function handleCreateTask(data: {
    title: string;
    assigneeId: number | null;
    priority: string;
    type: string;
  }) {
    if (!currentProjectId) return;
    try {
      await createTask({ ...data, projectId: currentProjectId });
      reload();
    } catch (e) {
      setErrorMsg(errMsg(e));
    }
  }

  async function handleMove(task: Task, newStatus: string) {
    // 楽観的更新：先に画面を動かす
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    try {
      await updateTaskStatus(task.id, newStatus);
      reload();
    } catch (e) {
      setErrorMsg(errMsg(e));
      reload(); // 失敗したらサーバーの状態に戻す
    }
  }

  async function handleDelete(task: Task) {
    if (!confirm(`「${task.title}」を削除しますか？`)) return;
    try {
      await deleteTask(task.id);
      reload();
    } catch (e) {
      setErrorMsg(errMsg(e));
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    setProjError("");
    if (!newProjName.trim() || !newProjKey.trim()) return;
    try {
      const p = await createProject(newProjName.trim(), newProjKey.trim().toUpperCase());
      setProjects((prev) => [...prev, p]);
      setCurrentProjectId(p.id);
      setNewProjName("");
      setNewProjKey("");
      setShowNewProject(false);
    } catch (err) {
      setProjError(errMsg(err));
    }
  }

  if (checking) return <div className="app">読み込み中...</div>;
  if (!currentUser) return <Login onLoggedIn={onLoggedIn} />;

  const isManager = currentUser.role === "manager";

  return (
    <div className="app">
      <Header
        currentUser={currentUser}
        isManager={isManager}
        projects={projects}
        currentProjectId={currentProjectId}
        onSelectProject={setCurrentProjectId}
        onToggleNewProject={() => setShowNewProject((v) => !v)}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        users={users}
        filterUser={filterUser}
        onFilterChange={setFilterUser}
        onLogout={onLogout}
      />

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      {isManager && showNewProject && (
        <form className="new-task" onSubmit={handleCreateProject}>
          <input
            type="text"
            placeholder="プロジェクト名（例: モバイルアプリ）"
            value={newProjName}
            onChange={(e) => setNewProjName(e.target.value)}
          />
          <input
            type="text"
            placeholder="キー（例: MOB）"
            value={newProjKey}
            onChange={(e) => setNewProjKey(e.target.value)}
            style={{ maxWidth: 140 }}
          />
          <button type="submit">作成</button>
          {projError && <span className="login-error">{projError}</span>}
        </form>
      )}

      {isManager && <NewTaskForm users={users} onCreate={handleCreateTask} />}

      {loadingTasks && tasks.length === 0 ? (
        <div className="loading">読み込み中...</div>
      ) : (
        <Board
          tasks={tasks}
          isManager={isManager}
          currentUserId={currentUser.id}
          onCardClick={setEditing}
          onMove={handleMove}
          onDelete={handleDelete}
        />
      )}

      {editing && (
        <TaskModal
          task={editing}
          users={users}
          canEdit={isManager || editing.assigneeId === currentUser.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
