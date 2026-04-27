export function generateProjectCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Extract YYYY-MM-DD from a Date/ISO string without applying the local timezone,
// so dates chosen in <input type="date"> (wall-clock days) don't shift -1 on display.
export function toDateOnlyString(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function formatDate(date) {
  if (!date) return "";
  const [y, m, d] = toDateOnlyString(date).split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

export function formatDateTime(date) {
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getPriorityColor(priority) {
  const colors = {
    LOW: "bg-blue-100 text-blue-800",
    MEDIUM: "bg-yellow-100 text-yellow-800",
    HIGH: "bg-orange-100 text-orange-800",
    CRITICAL: "bg-red-100 text-red-800",
  };
  return colors[priority] || colors.MEDIUM;
}

export function getPriorityLabel(priority) {
  const labels = {
    LOW: "Baixa",
    MEDIUM: "Média",
    HIGH: "Alta",
    CRITICAL: "Crítica",
  };
  return labels[priority] || "Média";
}

export function isOverdue(dueDate) {
  if (!dueDate) return false;
  const due = toDateOnlyString(dueDate);
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return due < localToday;
}

export function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// YYYY-MM-DD for "today" in local time. Used to validate date inputs (reminder/due)
// against the user's calendar day, not UTC midnight.
export function localTodayString() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

// Checklist syntax in card description: lines starting with `- [ ]` or `- [x]`.
// Parser is forgiving (extra spaces, capital X) but the canonical form below is what we write back.
const CHECKLIST_LINE = /^(\s*)-\s\[([ xX])\]\s?(.*)$/;

export function parseChecklist(description) {
  if (!description) return [];
  const items = [];
  const lines = description.split(/\r?\n/);
  lines.forEach((line, idx) => {
    const m = line.match(CHECKLIST_LINE);
    if (m) {
      items.push({
        index: idx,
        checked: m[2].toLowerCase() === "x",
        text: m[3],
      });
    }
  });
  return items;
}

// Toggle the checklist item at `lineIndex`, returning { description, item } where
// `item` describes the toggled item (text + new state) for activity logging.
export function toggleChecklistItem(description, lineIndex) {
  if (!description) return { description, item: null };
  const lines = description.split(/\r?\n/);
  if (lineIndex < 0 || lineIndex >= lines.length) {
    return { description, item: null };
  }
  const line = lines[lineIndex];
  const m = line.match(CHECKLIST_LINE);
  if (!m) return { description, item: null };

  const [, indent, mark, text] = m;
  const wasChecked = mark.toLowerCase() === "x";
  const nextMark = wasChecked ? " " : "x";
  lines[lineIndex] = `${indent}- [${nextMark}] ${text}`;

  return {
    description: lines.join("\n"),
    item: { text, checked: !wasChecked },
  };
}
