"use client";

import { Sparkles, FileText, Check } from "lucide-react";
import type { Workspace } from "@/lib/types";
import { IconBox } from "@/components/ui";
import { ProjectCard } from "./project-card";

export function ProjectsView({ data, onProject }: { data: Workspace; onProject: (id: string) => void }) {
  return <div className="view-stack"><div className="info-banner"><IconBox icon={Sparkles} /><div><h3>سه ایده داری؛ فعلاً فقط یکی را جلو ببر.</h3><p>فروشگاه کیف، نزدیک‌ترین پروژه به یک نمونه‌کار قابل نمایش است. تمام‌کردن یک نسخه کوچک، از شروع چند پروژه تازه مهم‌تر است.</p></div></div><div className="project-grid">{data.projects.map((project) => <ProjectCard key={project.id} project={project} onClick={() => onProject(project.id)} />)}</div><section className="panel portfolio-guide"><IconBox icon={FileText} color="blue" /><div><h3>پروژه با کمک AI هم می‌تواند نمونه‌کار باشد.</h3><p>نقش خودت و ابزارها را شفاف توضیح بده. لینک نسخه قابل اجرا، چند تصویر، مسئله‌ای که حل کرده‌ای و نتیجه تست‌ها را کنار هم بگذار. قبل از ارائه، ثبت فرم، خطاها، موبایل و ذخیره‌سازی واقعی را خودت بررسی کن.</p><div className="portfolio-chips"><span><Check size={13} /> نسخه قابل اجرا</span><span><Check size={13} /> توضیح نقش خودت</span><span><Check size={13} /> تست و مستندات</span><span><Check size={13} /> بدون کلید و اطلاعات محرمانه</span></div></div></section></div>;
}
