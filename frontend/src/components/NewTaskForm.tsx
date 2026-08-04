// タスク作成フォーム（管理者のみ表示される）。入力状態はこの中で持つ。
import { useState } from "react";
import type { User } from "../types";

type Props = {
  users: User[];
  onCreate: (data: {
    title: string;
    assigneeId: number | null;
    priority: string;
    type: string;
  }) => void;
};

export default function NewTaskForm({ users, onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState<number | "">("");
  const [priority, setPriority] = useState("medium");
  const [type, setType] = useState("task");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onCreate({
      title: title.trim(),
      assigneeId: assigneeId === "" ? null : Number(assigneeId),
      priority,
      type,
    });
    setTitle("");
    setAssigneeId("");
    setPriority("medium");
    setType("task");
  }

  return (
    <form className="new-task" onSubmit={submit}>
      <input
        type="text"
        placeholder="新しいタスクのタイトル"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <select
        value={assigneeId}
        onChange={(e) => setAssigneeId(e.target.value === "" ? "" : Number(e.target.value))}
      >
        <option value="">担当者なし</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="task">タスク</option>
        <option value="bug">バグ</option>
        <option value="story">ストーリー</option>
        <option value="epic">エピック</option>
      </select>
      <select value={priority} onChange={(e) => setPriority(e.target.value)}>
        <option value="high">優先度: 高</option>
        <option value="medium">優先度: 中</option>
        <option value="low">優先度: 低</option>
      </select>
      <button type="submit">追加</button>
    </form>
  );
}
