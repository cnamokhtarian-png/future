"use client";

import { Flag, ShieldCheck, Sparkles, Sprout, ChevronLeft, Clock3, Target, Info, Check, Plus } from "lucide-react";
import { phases } from "@/lib/content";
import { fa, todayKey, journeyDay, type Workspace } from "@/lib/types";
import { IconBox, type Mutate } from "@/components/ui";

export function RoadmapView({
  data,
  mutate,
  busy,
  selected,
  onSelect,
}: {
  data: Workspace;
  mutate: Mutate;
  busy: boolean;
  selected: number;
  onSelect: (index: number) => void;
}) {
  const phase = phases[selected];
  const day = journeyDay(data.settings.startedOn);
  const icons = [ShieldCheck, Sparkles, Sprout];
  return (
    <div className="view-stack">
      <div className="info-banner">
        <span className="info-banner-icon">
          <Flag size={24} />
        </span>
        <div>
          <h3>یک مسیر منعطف، نه یک مسابقه</h3>
          <p>بازه‌ها پیشنهادی‌اند. اگر روز سختی داشتی، برنامه را کوچک‌تر کن؛ لازم نیست از اول شروع کنی.</p>
        </div>
        <span className="pill purple">روز {fa(day)} از ۹۰</span>
      </div>
      <div className="roadmap-tabs">
        {phases.map((item, index) => (
          <button
            key={item.title}
            className={`phase-tab ${selected === index ? "active" : ""}`}
            onClick={() => onSelect(index)}
          >
            <IconBox icon={icons[index]} color={item.color} />
            <div>
              <span className="eyebrow">
                مرحله {fa(index + 1)} · {item.period}
              </span>
              <h3>{item.title}</h3>
              <p>{item.subtitle}</p>
            </div>
            <ChevronLeft size={17} />
          </button>
        ))}
      </div>
      <section className="panel roadmap-detail">
        <div className="section-heading">
          <div>
            <span className="eyebrow purple-text">قدم‌های مرحله {fa(selected + 1)}</span>
            <h2>{phase.title}</h2>
            <p>{phase.description}</p>
          </div>
          <IconBox icon={icons[selected]} color={phase.color} />
        </div>
        <div className="milestones">
          {phase.milestones.map((item, index) => {
            const added = data.tasks.some((task) => task.day === todayKey() && task.title === item.title);
            return (
              <article className="milestone" key={item.title}>
                <span className="step-number">{fa(index + 1)}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                  <span className="duration">
                    <Clock3 size={13} /> حدود {fa(item.minutes)} دقیقه
                  </span>
                </div>
                <button
                  className={`button ${added ? "soft-green" : "outline"} small`}
                  disabled={busy || added}
                  onClick={() =>
                    mutate(
                      { action: "task.create", title: item.title, category: item.category, minutes: item.minutes },
                      "به قدم‌های امروزت اضافه شد.",
                    )
                  }
                >
                  {added ? <Check size={14} /> : <Plus size={14} />}
                  {added ? "در برنامه امروز" : "افزودن به امروز"}
                </button>
              </article>
            );
          })}
        </div>
        <div className="outcome">
          <Target size={20} />
          <p>{phase.result}</p>
        </div>
      </section>
      <p className="page-footnote">
        <Info size={14} /> پایان یک بازه زمانی به معنی تکمیل مرحله نیست؛ با خروجی‌های واقعی خودت پیش برو.
      </p>
    </div>
  );
}
