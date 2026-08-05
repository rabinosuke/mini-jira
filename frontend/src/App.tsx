// アプリ全体のまとめ役（状態と処理を持ち、各コンポーネントに渡す）。
import { useCallback, useEffect, useState } from "react";
import type { Task, User, Project } from "./types";
import {
  getUsers,
  createUser,
  getTasks,
  createTask,
  updateTaskStatus,
  deleteTask,
  getMe,
  logout,
  getProjects,
  createProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
  setUnauthorizedHandler,
} from "./api";
import Login from "./Login";
import TaskModal from "./TaskModal";
import Header from "./components/Header";
import NewTaskForm from "./components/NewTaskForm";
import Board from "./components/Board";
import AdminPanel from "./components/AdminPanel";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "エラーが発生しました";
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  // members = 現在のプロジェクトのメンバー（担当者候補・フィルタに使う）
  const [members, setMembers] = useState<User[]>([]);
  // allUsers = 全ユーザー（管理者パネルのユーザー一覧・メンバー追加候補に使う）
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filterUser, setFilterUser] = useState<number | "all">("all");
  const [editing, setEditing] = useState<Task | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
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

  // ログインしたらプロジェクトを取得
  useEffect(() => {
    if (!currentUser) return;
    getProjects()
      .then((ps) => {
        setProjects(ps);
        if (ps.length > 0) setCurrentProjectId((prev) => prev ?? ps[0].id);
      })
      .catch((e) => setErrorMsg(errMsg(e)));
  }, [currentUser]);

  // 管理者だけ全ユーザーを取得（管理者パネル用）
  useEffect(() => {
    if (!currentUser || currentUser.role !== "manager") {
      setAllUsers([]);
      return;
    }
    getUsers()
      .then(setAllUsers)
      .catch((e) => setErrorMsg(errMsg(e)));
  }, [currentUser]);

  // プロジェクトを選ぶたびに、そのプロジェクトのメンバーを取得
  useEffect(() => {
    if (!currentUser || !currentProjectId) {
      setMembers([]);
      return;
    }
    getProjectMembers(currentProjectId)
      .then(setMembers)
      .catch((e) => setErrorMsg(errMsg(e)));
  }, [currentUser, currentProjectId]);

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
    setMembers([]);
    setAllUsers([]);
    setFilterUser("all");
    setProjects([]);
    setCurrentProjectId(null);
    setShowAdmin(false);
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

  // 管理者パネル：ユーザー作成（作成後は全ユーザー一覧に反映）
  async function handleCreateUser(data: {
    name: string;
    email: string;
    password: string;
    role: string;
  }) {
    const u = await createUser(data);
    setAllUsers((prev) => [...prev, u]);
  }

  // 現在プロジェクトのメンバーを取り直す
  async function refreshMembers() {
    if (!currentProjectId) return;
    const m = await getProjectMembers(currentProjectId);
    setMembers(m);
  }

  async function handleAddMember(userId: number) {
    if (!currentProjectId) return;
    await addProjectMember(currentProjectId, userId);
    await refreshMembers();
  }

  async function handleRemoveMember(userId: number) {
    if (!currentProjectId) return;
    await removeProjectMember(currentProjectId, userId);
    await refreshMembers();
  }

  if (checking) return <div className="app">読み込み中...</div>;
  if (!currentUser) return <Login onLoggedIn={onLoggedIn} />;

  const isManager = currentUser.role === "manager";
  const currentProject = projects.find((p) => p.id === currentProjectId) ?? null;

  return (
    <div className="app">
      <Header
        currentUser={currentUser}
        isManager={isManager}
        projects={projects}
        currentProjectId={currentProjectId}
        onSelectProject={setCurrentProjectId}
        onToggleNewProject={() => setShowNewProject((v) => !v)}
        onOpenAdmin={() => setShowAdmin(true)}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        users={members}
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

      {isManager && <NewTaskForm users={members} onCreate={handleCreateTask} />}

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
          users={members}
          canEdit={isManager || editing.assigneeId === currentUser.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}

      {isManager && showAdmin && (
        <AdminPanel
          project={currentProject}
          allUsers={allUsers}
          members={members}
          onCreateUser={handleCreateUser}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          onClose={() => setShowAdmin(false)}
        />
      )}
    </div>
  );
}
