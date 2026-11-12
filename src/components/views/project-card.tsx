"use client";

import { ShoppingBag, BookOpen, Bot, ArrowUpLeft } from "lucide-react";
import { fa, projectProgress, type Project } from "@/lib/types";
import { IconBox, Progress } from "@/components/ui";

export function ProjectCard({
  project,
  onClick,
  compact = false,
}: {
  project: Project;
  onClick: () => void;
  compact?: boolean;
}) {
  const icon = project.id === "pearl" ? ShoppingBag : project.id === "daneshbook" ? BookOpen : Bot;
  const color = project.id === "pearl" ? "peach" : project.id === "daneshbook" ? "blue" : "purple";
  const percent = projectProgress(project);
  return (
    <button className={`panel project-card ${compact ? "compact" : ""}`} onClick={onClick}>
      <div className="card-top">
        <IconBox icon={icon} color={color} className="project-icon" />
        <span className={`project-status ${project.status}`}>
          {project.status === "active" ? "در اولویت" : project.status === "queued" ? "قدم بعدی" : "فعلاً آزمایشی"}
        </span>
        <ArrowUpLeft size={18} className="project-arrow" />
      </div>
      <span className="eyebrow">{project.kind}</span>
      <h3>{project.name}</h3>
      <p>{project.description}</p>
      <div className="project-progress-label">
        <span>
          {fa(project.steps.filter((step) => step.done).length)} از {fa(project.steps.length)} مرحله
        </span>
        <strong>{fa(percent)}٪</strong>
      </div>
      <Progress value={percent} color={color} />
    </button>
  );
}
