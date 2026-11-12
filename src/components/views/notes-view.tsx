"use client";

import { useState } from "react";
import { Search, Plus, FileText, ArrowLeft, Trash2, Lightbulb } from "lucide-react";
import type { Workspace, Note, Mutation } from "@/lib/types";
import { PersianDate, EmptyState, IconBox } from "@/components/ui";

export function NotesView({
  data,
  onEdit,
  onDelete,
}: {
  data: Workspace;
  onEdit: (note?: Note) => void;
  onDelete: (action: Mutation, message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const notes = data.notes.filter((note) => `${note.title} ${note.body}`.includes(query));
  return (
    <div className="view-stack">
      <div className="notes-toolbar">
        <div className="local-search">
          <Search size={17} />
          <input
            placeholder="جست‌وجو در یادداشت‌ها..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="جست‌وجوی یادداشت"
          />
        </div>
        <button className="button primary" onClick={() => onEdit()}>
          <Plus size={16} /> یادداشت تازه
        </button>
      </div>
      {!notes.length ? (
        <section className="panel">
          <EmptyState
            icon={FileText}
            title={query ? "یادداشتی با این عبارت پیدا نشد" : "اینجا برای فکرهای ناتمام تو جا هست"}
            text={
              query
                ? "عبارت کوتاه‌تری را جست‌وجو کن."
                : "لازم نیست مرتب یا بی‌نقص بنویسی. از چیزی که امروز ذهنت را درگیر کرده شروع کن."
            }
          >
            {!query && (
              <button className="button outline" onClick={() => onEdit()}>
                <Plus size={15} /> نوشتن اولین یادداشت
              </button>
            )}
          </EmptyState>
        </section>
      ) : (
        <div className="notes-grid">
          {notes.map((note) => (
            <article className="panel note-card" key={note.id}>
              <div className="card-top">
                <IconBox icon={FileText} />
                <PersianDate value={note.createdAt} />
                <button
                  className="icon-button danger-hover"
                  onClick={() => onDelete({ action: "note.delete", id: note.id }, "این یادداشت حذف شود؟")}
                  aria-label={`حذف یادداشت ${note.title}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <button className="note-content" onClick={() => onEdit(note)}>
                <h3>{note.title}</h3>
                <p>{note.body}</p>
                <span>
                  ادامه و ویرایش <ArrowLeft size={14} />
                </span>
              </button>
            </article>
          ))}
        </div>
      )}
      <div className="notice">
        <Lightbulb size={19} />
        <p>
          <strong>اگر نمی‌دانی از کجا شروع کنی:</strong> امروز چه چیزی انرژی‌ام را گرفت؟ چه چیزی حتی کمی کمکم کرد؟ فردا
          کوچک‌ترین قدم ممکن چیست؟
        </p>
      </div>
    </div>
  );
}
