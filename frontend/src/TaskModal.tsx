// タスクの詳細/編集モーダル（App.tsx から呼ばれる「子部品」）。
// 親(App)から props で task と users を受け取り、保存したら onSaved を呼んで親に知らせる。
import { useEffect, useState } from "react";
import type { Task, User, Comment, Activity } from "./types";
import { updateTask, getComments, addComment, getActivities } from "./api";

const STATUSES = [
  { key: "todo", label: "未着手" },
  { key: "in_progress", label: "作業中" },
  { key: "in_review", label: "レビュー" },
  { key: "done", label: "完了" },
];

const TYPES = [
  { key: "task", label: "タスク" },
  { key: "bug", label: "バグ" },
  { key: "story", label: "ストーリー" },
  { key: "epic", label: "エピック" },
];

// この部品が親から受け取るデータの形（props の型）
type Props = {
  task: Task;
  users: User[];
  canEdit: boolean; // false のときは閲覧のみ（入力を無効化・保存を隠す）
  onClose: () => void; // 閉じるとき親に知らせる
  onSaved: () => void; // 保存できたとき親に知らせる
};

export default function TaskModal({ task, users, canEdit, onClose, onSaved }: Props) {
  // 各入力欄の状態を、渡された task の値で初期化する
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [type, setType] = useState(task.type);
  const [assigneeId, setAssigneeId] = useState<number | "">(task.assigneeId ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [status, setStatus] = useState(task.status);
  // 日付入力は "YYYY-MM-DD" 形式。ISO文字列の先頭10文字を切り出す。
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 10) : "");
  const [saving, setSaving] = useState(false);

  // コメント（ログイン中なら誰でも閲覧・投稿できる＝閲覧のみモードでも使える）
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  // 変更履歴
  const [activities, setActivities] = useState<Activity[]>([]);

  // モーダルを開いた（＝このタスクの）ときにコメントと変更履歴を読み込む
  useEffect(() => {
    getComments(task.id).then(setComments);
    getActivities(task.id).then(setActivities);
  }, [task.id]);

  async function onSave() {
    setSaving(true);
    await updateTask(task.id, {
      title,
      description,
      type,
      assigneeId: assigneeId === "" ? null : Number(assigneeId),
      priority,
      status,
      dueDate: dueDate === "" ? null : dueDate,
    });
    setSaving(false);
    onSaved();
  }

  async function onAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPosting(true);
    const added = await addComment(task.id, newComment.trim());
    setComments((prev) => [...prev, added]);
    setNewComment("");
    setPosting(false);
  }

  return (
    // 背景（暗い部分）。クリックで閉じる。
    <div className="modal-backdrop" onClick={onClose}>
      {/* モーダル本体。中のクリックが背景に伝わって閉じないよう stopPropagation */}
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-key">MJ-{task.id}</span>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {!canEdit && (
          <div className="modal-readonly">閲覧のみ（自分の担当タスクではありません）</div>
        )}

        <label className="field">
          <span>タイトル</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} />
        </label>

        <label className="field">
          <span>説明</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="タスクの詳細を書く"
            disabled={!canEdit}
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>種別</span>
            <select value={type} onChange={(e) => setType(e.target.value)} disabled={!canEdit}>
              {TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>担当者</span>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value === "" ? "" : Number(e.target.value))}
              disabled={!canEdit}
            >
              <option value="">未割当</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>状態</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={!canEdit}>
              {STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>優先度</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              disabled={!canEdit}
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </label>
        </div>

        <label className="field">
          <span>期限</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={!canEdit}
          />
        </label>

        <div className="modal-meta">作成者: {task.reporter ? task.reporter.name : "-"}</div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>
            {canEdit ? "キャンセル" : "閉じる"}
          </button>
          {canEdit && (
            <button className="btn-save" onClick={onSave} disabled={saving || !title.trim()}>
              {saving ? "保存中..." : "保存"}
            </button>
          )}
        </div>

        {/* ===== コメント欄 ===== */}
        <div className="comments">
          <h3 className="comments-title">コメント（{comments.length}）</h3>
          {comments.length === 0 && <p className="comments-empty">まだコメントはありません</p>}
          {comments.map((cm) => (
            <div className="comment" key={cm.id}>
              <div className="comment-head">
                <span className="comment-user">{cm.user.name}</span>
                <span className="comment-date">
                  {new Date(cm.createdAt).toLocaleString("ja-JP")}
                </span>
              </div>
              <div className="comment-body">{cm.body}</div>
            </div>
          ))}

          <form className="comment-form" onSubmit={onAddComment}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              placeholder="コメントを書く"
            />
            <button className="btn-save" type="submit" disabled={posting || !newComment.trim()}>
              {posting ? "投稿中..." : "投稿"}
            </button>
          </form>
        </div>

        {/* ===== 変更履歴 ===== */}
        <div className="activities">
          <h3 className="comments-title">変更履歴（{activities.length}）</h3>
          {activities.length === 0 && <p className="comments-empty">まだ履歴はありません</p>}
          {activities.map((a) => (
            <div className="activity" key={a.id}>
              <span className="activity-user">{a.user.name}</span>
              <span className="activity-msg">{a.message}</span>
              <span className="activity-date">{new Date(a.createdAt).toLocaleString("ja-JP")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
