// バックエンドから返ってくるデータの形（型）を定義する。
// これがあると、コードを書くときにエディタが補完・エラー検出してくれる。

export type User = {
  id: number;
  name: string;
  email?: string; // 一覧・メンバー管理では返るが、/me などでは省略される
  role: string; // "manager" or "developer"
};

export type Project = {
  id: number;
  name: string;
  key: string;
};

export type Task = {
  id: number;
  title: string;
  description: string;
  type: string; // task / bug / story / epic
  status: string; // todo / in_progress / in_review / done
  priority: string; // low / medium / high
  assigneeId: number | null;
  reporterId: number;
  assignee: User | null;
  reporter: User;
  projectId: number;
  dueDate: string | null;
};

export type Comment = {
  id: number;
  body: string;
  createdAt: string;
  user: User;
};

export type Activity = {
  id: number;
  message: string;
  createdAt: string;
  user: User;
};
