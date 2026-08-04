// 変更履歴メッセージ用の日本語ラベル
export const STATUS_LABEL: Record<string, string> = {
  todo: "未着手",
  in_progress: "作業中",
  in_review: "レビュー",
  done: "完了",
};

export const PRIORITY_LABEL: Record<string, string> = { high: "高", medium: "中", low: "低" };

export const TYPE_LABEL: Record<string, string> = {
  task: "タスク",
  bug: "バグ",
  story: "ストーリー",
  epic: "エピック",
};
