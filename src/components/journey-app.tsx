"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  Home,
  Route,
  BriefcaseBusiness,
  FolderKanban,
  HeartPulse,
  Wallet,
  NotebookPen,
  CircleHelp,
  Settings2,
  Search,
  Bell,
  ChevronLeft,
  ChevronDown,
  ArrowLeft,
  ArrowUpLeft,
  CalendarDays,
  Sparkles,
  Leaf,
  Clock3,
  Check,
  History,
  Flame,
  Zap,
  Menu,
  X,
  UserRound,
  Download,
  CheckCircle2,
  CircleAlert,
  Compass,
  Sprout,
} from "lucide-react";
import {
  categoryLabels,
  fa,
  todayKey,
  type Workspace,
  type View,
  type Mutation,
  type Note,
} from "@/lib/types";
import { Modal, type Mutate, TaskRow } from "@/components/ui";
import {
  RoadmapView,
  CareerView,
  ProjectsView,
  HealthView,
  FinanceView,
  NotesView,
  GuideView,
  ProjectDetails,
} from "@/components/views";
import { ProgressView } from "@/components/progress";
import { AssistantView } from "@/components/assistant";
import { DevelopmentView } from "@/components/development";
import { TodayView } from "@/components/today";
import { TimelineView } from "@/components/timeline";

const NAV_GROUPS_KEY = "robeh-rah:nav-groups";

const navGroups: Array<{
  id: string;
  title: string;
  items: Array<{ id: View; title: string; icon: typeof Home; badge?: string }>;
}> = [
  {
    id: "today",
    title: "امروز",
    items: [
      { id: "today", title: "امروز من", icon: Home },
      { id: "development", title: "چالش ۷۵ روزه", icon: Zap },
      { id: "assistant", title: "دستیار هوشمند", icon: Sparkles, badge: "جمینا" },
    ],
  },
  {
    id: "path",
    title: "مسیر من",
    items: [
      { id: "roadmap", title: "نقشه راه", icon: Route, badge: "۹۰ روز" },
      { id: "projects", title: "پروژه‌های من", icon: FolderKanban },
      { id: "career", title: "مسیر شغلی", icon: BriefcaseBusiness },
    ],
  },
  {
    id: "me",
    title: "خودت",
    items: [
      { id: "progress", title: "پیشرفت من", icon: Flame },
      { id: "timeline", title: "تغییرات من", icon: History },
      { id: "health", title: "حال خوب و عادت‌ها", icon: HeartPulse },
      { id: "finance", title: "مدیریت مالی", icon: Wallet },
      { id: "notes", title: "یادداشت‌های من", icon: NotebookPen },
    ],
  },
];

const navigation = navGroups.flatMap((group) => group.items);
const viewTitles: Record<View, { title: string; subtitle: string }> = {
  assistant: {
    title: "دستیار هوشمند",
    subtitle: "هرچه می‌خواهی را بگو؛ جمینا انجامش می‌دهد و منتظر تأیید تو می‌ماند.",
  },
  today: {
    title: "امروز من",
    subtitle: "یک امروز، یک صفحه؛ از قدم بعدی شروع کن.",
  },
  roadmap: { title: "نقشه راه ۹۰ روزه تو", subtitle: "از ثبات امروز تا فرصت‌های فردا؛ یک مسیر واقعی و قابل تغییر." },
  career: { title: "مسیر شغلی تو", subtitle: "تجربه‌هایی که داری، می‌تونن نقطه شروع شغل بعدی باشن." },
  projects: {
    title: "ایده‌هایت را به نتیجه برسان",
    subtitle: "کمتر شروع کن، بیشتر تمام کن؛ یک پروژه واقعی در هر قدم.",
  },
  progress: { title: "پیشرفت من", subtitle: "نمودار روزانه، زنجیره نظمت و دستاوردهایی که باز کرده‌ای." },
  health: { title: "کمی بیشتر، کنار خودت باش", subtitle: "حال تو مهمه؛ حتی وقتی همه‌چیز طبق برنامه پیش نمی‌ره." },
  finance: { title: "قدم‌های کوچک، خیال آسوده‌تر", subtitle: "پولت را روشن‌تر ببین و متناسب با توانت، آرام جلو برو." },
  timeline: {
    title: "تغییرات من",
    subtitle: "هر چیزی که در مسیرت عوض شد — تیک‌ها، برنامه، مالی و حال — یک‌جا و به ترتیب.",
  },
  development: {
    title: "چالش ۷۵ روزه روبه‌راه",
    subtitle: "برنامه‌ای استاندارد و سخت‌گیرانه برای بازگرداندن انضباط، آرامش و اختیار؛ هم روحی و روانی، هم مالی.",
  },
  notes: { title: "فضایی برای فکرهای تو", subtitle: "از فکرهای پراکنده تا یک قدم روشن؛ بنویس تا سبک‌تر بشی." },
  guide: { title: "همراه مسیر تو", subtitle: "منطق این برنامه، منابع معتبر و چیزهایی که خوب است بدانی." },
};

const field = (form: FormData, name: string) => String(form.get(name) || "");

export function JourneyApp({ initialData }: { initialData: Workspace }) {
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<View>("today");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modal, setModal] = useState<"task" | "job" | "finance" | "settings" | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [noteEditor, setNoteEditor] = useState<{ open: boolean; note?: Note }>({ open: false });
  const [taskTime, setTaskTime] = useState("");
  const [confirmation, setConfirmation] = useState<{ action: Mutation; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [phase, setPhase] = useState(0);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchContainer = useRef<HTMLDivElement>(null);
  const notificationContainer = useRef<HTMLDivElement>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(window.localStorage.getItem(NAV_GROUPS_KEY) || "{}") as Record<string, boolean>;
    } catch {
      return {};
    }
  });
  const todayTasks = data.tasks.filter((task) => task.day === todayKey());
  const done = todayTasks.filter((task) => task.done).length;
  const todayCheckin = data.checkins.find((entry) => entry.day === todayKey());
  const activeProject = data.projects.find((project) => project.id === projectId);

  const toggleGroup = useCallback((id: string) => {
    setOpenGroups((current) => {
      const next = { ...current, [id]: current[id] === false };
      try {
        window.localStorage.setItem(NAV_GROUPS_KEY, JSON.stringify(next));
      } catch {
        // ignore storage failures (private mode)
      }
      return next;
    });
  }, []);

  // Keep the group that owns a view expanded whenever we enter it.
  const expandOwner = useCallback((id: View) => {
    const owner = navGroups.find((group) => group.items.some((item) => item.id === id));
    if (owner) {
      setOpenGroups((current) => (current[owner.id] === false ? { ...current, [owner.id]: true } : current));
    }
  }, []);

  const go = useCallback(
    (next: View) => {
      setView(next);
      expandOwner(next);
      setMobileOpen(false);
      setNotifications(false);
      setSearchOpen(false);
      window.history.replaceState(null, "", `#${next}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [expandOwner],
  );

  useEffect(() => {
    const sync = () => {
      let hash = window.location.hash.slice(1);
      if (hash === "overview") hash = "today"; // legacy link
      const target = hash as View;
      if (hash in viewTitles) {
        setView(target);
        expandOwner(target);
      }
    };
    // Defer the initial hash sync one frame so it is not a synchronous setState inside the effect.
    const frame = requestAnimationFrame(sync);
    window.addEventListener("hashchange", sync);
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        searchInput.current?.focus();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotifications(false);
        setMobileOpen(false);
      }
    };
    const outside = (event: MouseEvent) => {
      if (!searchContainer.current?.contains(event.target as Node)) setSearchOpen(false);
      if (!notificationContainer.current?.contains(event.target as Node)) setNotifications(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", outside);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", sync);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", outside);
    };
  }, [expandOwner]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  const closeModal = () => {
    setModal(null);
    setTaskTime("");
  };

  const mutate: Mutate = async (input, message = "تغییراتت ذخیره شد.") => {
    if (busy) return false;
    setBusy(true);
    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result = await response.json();
      if (!response.ok || !result.data) throw new Error(result.error || "ذخیره اطلاعات ممکن نشد.");
      setData(result.data);
      setToast({ message, error: false });
      return true;
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "اتصال برقرار نشد. دوباره تلاش کن.", error: true });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const askDelete = (action: Mutation, message: string) => setConfirmation({ action, message });
  const editNote = (note?: Note) => setNoteEditor({ open: true, note });
  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `roberah-${todayKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToast({ message: "نسخه پشتیبان اطلاعاتت دریافت شد.", error: false });
  };
  const searchResults = [
    ...data.tasks.map((item) => ({
      title: item.title,
      type: "قدم روزانه",
      view: "today" as View,
      project: undefined as string | undefined,
    })),
    ...data.projects.map((item) => ({
      title: item.name,
      type: "پروژه",
      view: "projects" as View,
      project: item.id as string | undefined,
    })),
    ...data.applications.map((item) => ({
      title: `${item.role} · ${item.company}`,
      type: "فرصت شغلی",
      view: "career" as View,
      project: undefined as string | undefined,
    })),
    ...data.notes.map((item) => ({
      title: item.title,
      type: "یادداشت",
      view: "notes" as View,
      project: undefined as string | undefined,
    })),
    ...navigation.map((item) => ({
      title: item.title,
      type: "بخش‌های مسیر",
      view: item.id,
      project: undefined as string | undefined,
    })),
  ]
    .filter((item) =>
      item.title.replace(/ي/g, "ی").replace(/ك/g, "ک").includes(query.trim().replace(/ي/g, "ی").replace(/ك/g, "ک")),
    )
    .slice(0, 7);

  const submitModal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    let input: Mutation;
    if (modal === "task")
      input = {
        action: "task.create",
        title: field(form, "title"),
        category: field(form, "category"),
        minutes: Number(form.get("minutes")),
        time: taskTime || null,
      };
    else if (modal === "job")
      input = {
        action: "job.create",
        company: field(form, "company"),
        role: field(form, "role"),
        status: field(form, "status"),
        url: field(form, "url"),
        note: field(form, "note"),
      };
    else if (modal === "finance")
      input = {
        action: "finance.create",
        title: field(form, "title"),
        type: field(form, "type"),
        amount: Number(form.get("amount")),
        category: field(form, "category") || "general",
      };
    else
      input = {
        action: "settings.update",
        name: field(form, "name"),
        startedOn: field(form, "startedOn"),
        savingGoal: Number(form.get("savingGoal")),
      };
    if (await mutate(input)) closeModal();
  };

  return (
    <div className="app-shell">
      {mobileOpen && <button className="sidebar-backdrop" aria-label="بستن منو" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <a
          href="#today"
          className="brand"
          onClick={(event) => {
            event.preventDefault();
            go("today");
          }}
          aria-label="روبه‌راه؛ صفحه اصلی"
        >
          <span className="brand-mark">
            <Route size={28} strokeWidth={2.1} />
          </span>
          <span>
            <strong>
              روبه‌راه<span className="brand-dot">.</span>
            </strong>
            <small>هر روز، یک قدم رو به جلو</small>
          </span>
        </a>
        <button className="mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label="بستن منو">
          <X size={20} />
        </button>
        <nav className="main-nav" aria-label="منوی اصلی">
          {navGroups.map((group) => {
            const open = openGroups[group.id] !== false;
            return (
              <div className="nav-group" key={group.id}>
                <button
                  className="nav-group-toggle"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={open}
                  aria-controls={`nav-group-${group.id}`}
                >
                  <span>{group.title}</span>
                  <ChevronDown size={14} strokeWidth={2} className={`nav-group-chevron ${open ? "" : "collapsed"}`} />
                </button>
                <div className={`nav-group-items ${open ? "" : "collapsed"}`} id={`nav-group-${group.id}`}>
                  {group.items.map(({ id, title, icon: Icon, badge }) => (
                    <button
                      key={id}
                      className={`nav-item ${view === id ? "active" : ""}`}
                      onClick={() => go(id)}
                      aria-current={view === id ? "page" : undefined}
                    >
                      <Icon size={19} strokeWidth={1.65} />
                      <span>{title}</span>
                      {badge && <small className="nav-badge">{badge}</small>}
                      {view === id && !badge && <span className="nav-active-dot" />}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-message">
            <div className="mini-journey" aria-hidden="true">
              <svg viewBox="0 0 180 66" fill="none">
                <path
                  d="M22 51C40 51 25 21 53 24C81 27 61 54 89 47C117 40 94 15 128 18C147 19 145 9 159 9"
                  stroke="#c9b8e3"
                  strokeWidth="2"
                  strokeDasharray="4 5"
                />
                <circle cx="22" cy="51" r="5" fill="#e6dcf3" stroke="#ac8bcf" strokeWidth="2" />
                <circle cx="159" cy="9" r="6" fill="#9872bf" />
                <path d="m153 9 4 4 8-8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M76 7v10M71 12h10" stroke="#d4c2e9" strokeWidth="2" strokeLinecap="round" />
                <path d="M141 45v8M137 49h8" stroke="#d4c2e9" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h3>تو از صفر شروع نمی‌کنی.</h3>
            <p>
              تجربه‌هات، نقطه قوت این مسیرن.
              <br />
              فقط کافیه بهشون جهت بدی.
            </p>
            <button onClick={() => go("career")}>
              نقطه قوتم رو پیدا کنم <ArrowLeft size={13} />
            </button>
          </div>
          <div className="sidebar-secondary">
            <button className={view === "guide" ? "selected" : ""} onClick={() => go("guide")}>
              <CircleHelp size={18} /> راهنما و منابع <ArrowUpLeft size={13} />
            </button>
            <button onClick={() => setModal("settings")}>
              <Settings2 size={18} /> تنظیمات مسیر
            </button>
          </div>
          <button className="profile" onClick={() => setModal("settings")}>
            <span className="avatar">
              <UserRound size={21} />
            </span>
            <span>
              <strong>مسیر شخصی من</strong>
              <small>برای یک شروع تازه</small>
            </span>
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumbs">
            <button className="mobile-toggle icon-button" aria-label="باز کردن منو" onClick={() => setMobileOpen(true)}>
              <Menu size={22} />
            </button>
            <Compass size={18} />
            <span>فضای شخصی من</span>
            <ChevronLeft size={13} />
            <strong>{navigation.find((item) => item.id === view)?.title || "راهنما"}</strong>
          </div>
          <div className="topbar-tools">
            <div className="global-search" ref={searchContainer}>
              <Search size={17} />
              <input
                ref={searchInput}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="جست‌وجو در مسیر من..."
                aria-label="جست‌وجو در مسیر من"
              />
              <kbd>⌘ K</kbd>
              {searchOpen && query.trim() && (
                <div className="search-popover">
                  <div className="popover-label">نتیجه‌های مسیر تو</div>
                  {searchResults.length ? (
                    searchResults.map((result, index) => (
                      <button
                        key={`${result.title}-${index}`}
                        onClick={() => {
                          go(result.view);
                          if (result.project) setProjectId(result.project);
                          setQuery("");
                        }}
                      >
                        <Search size={15} />
                        <span>
                          {result.title}
                          <small>{result.type}</small>
                        </span>
                        <ChevronLeft size={14} />
                      </button>
                    ))
                  ) : (
                    <p className="search-empty">چیزی پیدا نشد؛ عبارت کوتاه‌تری بنویس.</p>
                  )}
                </div>
              )}
            </div>
            <div className="topbar-date">
              <CalendarDays size={16} />
              <span suppressHydrationWarning>
                {new Intl.DateTimeFormat("fa-IR", { weekday: "long", day: "numeric", month: "long" }).format(
                  new Date(),
                )}
              </span>
            </div>
            <span className="topbar-divider" />
            <div className="notification-wrapper" ref={notificationContainer}>
              <button
                className={`notification-button icon-button ${notifications ? "selected" : ""}`}
                aria-label="یادآوری‌های امروز"
                aria-expanded={notifications}
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={20} strokeWidth={1.6} />
                {(!todayCheckin || done < todayTasks.length) && <span className="notification-dot" />}
              </button>
              {notifications && (
                <div className="notification-popover">
                  <h3>
                    یادآوری‌های آرام <Leaf size={15} />
                  </h3>
                  <button onClick={() => go("today")}>
                    <span className="reminder-dot purple" />
                    <span>
                      {done === todayTasks.length
                        ? "همه قدم‌های امروزت انجام شده؛ وقت استراحته."
                        : `${fa(todayTasks.length - done)} قدم کوچک برای امروزت داری.`}
                      <small>همین‌قدر هم کافی است.</small>
                    </span>
                    <ChevronLeft size={14} />
                  </button>
                  {!todayCheckin && (
                    <button onClick={() => go("health")}>
                      <span className="reminder-dot peach" />
                      <span>
                        یک لحظه به حال خودت توجه کن.<small>ثبت حال امروز هنوز خالیه.</small>
                      </span>
                      <ChevronLeft size={14} />
                    </button>
                  )}
                  <button onClick={() => go("career")}>
                    <span className="reminder-dot blue" />
                    <span>
                      فرصت بعدی را هم پیگیری کن.<small>منتظر نتیجه یک مصاحبه نمان.</small>
                    </span>
                    <ChevronLeft size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="main-content" id="main-content">
          <div className="main-heading">
            <div>
              {view === "today" ? (
                <h1>
                  سلام {data.settings.name}، خوش اومدی <span className="wave">👋🏻</span>
                </h1>
              ) : (
                <h1>{viewTitles[view].title}</h1>
              )}
              <p>{viewTitles[view].subtitle}</p>
            </div>
            {view !== "today" && (
              <button className="button outline small" onClick={() => go("today")}>
                بازگشت به امروز <ArrowUpLeft size={15} />
              </button>
            )}
          </div>
          <div className="view-content" key={view}>
            {view === "today" && (
              <TodayView
                data={data}
                mutate={mutate}
                busy={busy}
                onAddTask={() => setModal("task")}
                onOpenDevelopment={() => go("development")}
                onAskDelete={askDelete}
              />
            )}
            {view === "timeline" && <TimelineView data={data} go={go} />}
            {view === "assistant" && <AssistantView mutate={mutate} busy={busy} go={go} applyWorkspace={setData} />}
            {view === "roadmap" && (
              <RoadmapView data={data} mutate={mutate} busy={busy} selected={phase} onSelect={setPhase} />
            )}
            {view === "development" && <DevelopmentView data={data} mutate={mutate} busy={busy} />}
            {view === "career" && (
              <CareerView data={data} mutate={mutate} onAdd={() => setModal("job")} onDelete={askDelete} busy={busy} />
            )}
            {view === "projects" && <ProjectsView data={data} onProject={setProjectId} />}
            {view === "progress" && <ProgressView data={data} mutate={mutate} busy={busy} />}
            {view === "health" && <HealthView data={data} mutate={mutate} busy={busy} />}
            {view === "finance" && (
              <FinanceView
                data={data}
                onAdd={() => setModal("finance")}
                onDelete={askDelete}
                onSettings={() => setModal("settings")}
              />
            )}
            {view === "notes" && <NotesView data={data} onEdit={editNote} onDelete={askDelete} />}
            {view === "guide" && <GuideView go={go} />}
          </div>
          <footer className="page-footer">
            <Sprout size={14} />
            <span>روبه‌راه شدن، یک مسیر است؛ نه یک نقطه پایان.</span>
            <span className="footer-brand">با قدم‌های خودت، با سرعت خودت</span>
          </footer>
        </main>
      </div>
      {modal && (
        <Modal
          title={
            modal === "task"
              ? "یک قدم کوچک تازه"
              : modal === "job"
                ? "ثبت یک فرصت شغلی"
                : modal === "finance"
                  ? "ثبت دخل و خرج"
                  : "تنظیمات مسیر تو"
          }
          subtitle={
            modal === "task"
              ? "یک کار مشخص و کوچک انتخاب کن؛ چیزی که امروز شدنی باشد."
              : modal === "job"
                ? "برای پیگیری بهتر، اطلاعاتی را که واقعاً داری وارد کن."
                : modal === "finance"
                  ? "همه مبلغ‌ها به تومان ثبت می‌شوند."
                  : "این مسیر قرار است با شرایط تو هماهنگ باشد."
          }
          onClose={closeModal}
        >
          <form className="modal-form" onSubmit={submitModal}>
            {modal === "task" && (
              <>
                <label>
                  عنوان قدم امروز
                  <input name="title" placeholder="مثلاً: ارسال رزومه برای یک شرکت" required maxLength={250} />
                </label>
                <div className="form-grid">
                  <label>
                    بخش مسیر
                    <select name="category" defaultValue="personal">
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <option value={value} key={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    زمان تقریبی (دقیقه)
                    <input name="minutes" type="number" min={1} max={480} defaultValue={15} required />
                  </label>
                </div>
                <div className="time-picker">
                  <span className="time-picker-label">
                    <Clock3 size={14} /> این قدم را چه ساعتی انجام بدم؟ <small>(اختیاری)</small>
                  </span>
                  <div className="time-chips">
                    {[
                      ["06:00", "۶:۰۰"],
                      ["08:00", "۸:۰۰"],
                      ["10:00", "۱۰:۰۰"],
                      ["13:00", "۱۳:۰۰"],
                      ["16:00", "۱۶:۰۰"],
                      ["18:00", "۱۸:۰۰"],
                      ["21:00", "۲۱:۰۰"],
                    ].map(([value, label]) => (
                      <button
                        type="button"
                        key={value}
                        className={`time-chip ${taskTime === value ? "selected" : ""}`}
                        onClick={() => setTaskTime(taskTime === value ? "" : value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="time-manual">
                    ساعت دلخواه
                    <input type="time" value={taskTime} onChange={(event) => setTaskTime(event.target.value)} />
                  </label>
                </div>
              </>
            )}
            {modal === "job" && (
              <>
                <div className="form-grid">
                  <label>
                    عنوان شغل
                    <input name="role" required maxLength={250} placeholder="مثلاً مسئول دفتر" />
                  </label>
                  <label>
                    نام شرکت
                    <input name="company" required maxLength={250} placeholder="نام مجموعه" />
                  </label>
                </div>
                <label>
                  وضعیت فعلی
                  <select name="status" defaultValue="applied">
                    <option value="planned">برای اقدام</option>
                    <option value="applied">رزومه ارسال شده</option>
                    <option value="interview">مصاحبه انجام شده</option>
                    <option value="waiting">منتظر پاسخ</option>
                    <option value="offer">پیشنهاد همکاری</option>
                    <option value="rejected">بسته‌شده</option>
                  </select>
                </label>
                <label>
                  لینک آگهی (اختیاری)
                  <input name="url" type="url" dir="ltr" placeholder="https://..." maxLength={2000} />
                </label>
                <label>
                  یادداشت پیگیری (اختیاری)
                  <textarea
                    name="note"
                    rows={3}
                    maxLength={3000}
                    placeholder="تاریخ مصاحبه، نام مسئول یا زمان پیگیری بعدی..."
                  />
                </label>
              </>
            )}
            {modal === "finance" && (
              <>
                <div className="transaction-types">
                  {[
                    { value: "income", label: "درآمد" },
                    { value: "expense", label: "هزینه" },
                    { value: "saving", label: "پس‌انداز" },
                  ].map((type) => (
                    <label key={type.value}>
                      <input type="radio" name="type" value={type.value} defaultChecked={type.value === "expense"} />
                      <span>{type.label}</span>
                    </label>
                  ))}
                </div>
                <label>
                  شرح تراکنش
                  <input name="title" required maxLength={250} placeholder="مثلاً: هزینه رفت‌وآمد مصاحبه" />
                </label>
                <label>
                  مبلغ (تومان)
                  <input
                    name="amount"
                    type="number"
                    required
                    min={1}
                    max={2000000000}
                    step={1}
                    placeholder="مثلاً ۵۰۰۰۰"
                  />
                </label>
                <div className="form-grid">
                  <label>
                    دسته‌بندی
                    <select name="category" defaultValue="general">
                      <option value="general">عمومی</option>
                      <option value="cats">گربه‌ها (غذا، دام‌پزشک، وسایل)</option>
                    </select>
                  </label>
                </div>
                <p className="field-help">
                  پس‌انداز یعنی مبلغی که واقعاً از پول قابل خرج جدا کرده‌ای؛ نه درآمد احتمالی آینده. خرج‌های گربه‌ها را
                  با «گربه‌ها» ثبت کن تا هر ماه جمعش را ببینی.
                </p>
              </>
            )}
            {modal === "settings" && (
              <>
                <label>
                  دوست داری چه صدایت کنیم؟
                  <input name="name" required defaultValue={data.settings.name} maxLength={40} />
                </label>
                <div className="form-grid">
                  <label>
                    تاریخ شروع این مسیر
                    <input
                      type="date"
                      dir="ltr"
                      name="startedOn"
                      required
                      defaultValue={data.settings.startedOn}
                      min="2000-01-01"
                      max={todayKey()}
                    />
                  </label>
                  <label>
                    هدف صندوق اضطراری (تومان)
                    <input
                      type="number"
                      name="savingGoal"
                      required
                      min={1}
                      max={2000000000}
                      defaultValue={data.settings.savingGoal}
                    />
                  </label>
                </div>
                <label>
                  تعهد روزانه‌ام (تعداد قدم در روز)
                  <input
                    type="number"
                    name="dailyTarget"
                    required
                    min={1}
                    max={20}
                    defaultValue={data.settings.dailyTarget}
                  />
                </label>
                <div className="backup-row">
                  <div>
                    <strong>یک نسخه برای خودت نگه دار</strong>
                    <p>خروجی JSON از تمام اطلاعات ثبت‌شده.</p>
                  </div>
                  <button type="button" className="button outline small" onClick={downloadBackup}>
                    <Download size={15} /> دریافت خروجی
                  </button>
                </div>
                <p className="field-help">
                  این فضای شخصی تک‌کاربره است و ورود با رمز ندارد. از ثبت اطلاعات بانکی، رمزها و کلید API خودداری کن.
                </p>
              </>
            )}
            <div className="modal-actions">
              <button className="button primary" type="submit" disabled={busy}>
                {busy ? "در حال ذخیره..." : "ذخیره تغییرات"}
                <Check size={16} />
              </button>
              <button className="button outline" type="button" onClick={closeModal}>
                انصراف
              </button>
            </div>
          </form>
        </Modal>
      )}
      {activeProject && (
        <Modal title={activeProject.name} subtitle={activeProject.kind} wide onClose={() => setProjectId(null)}>
          <ProjectDetails project={activeProject} mutate={mutate} busy={busy} />
        </Modal>
      )}
      {noteEditor.open && (
        <Modal
          title={noteEditor.note ? "ادامه یک یادداشت" : "یک صفحه تازه برای فکرهایت"}
          subtitle="اینجا لازم نیست چیزی بی‌نقص باشد."
          onClose={() => setNoteEditor({ open: false })}
        >
          <form
            className="modal-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              if (
                await mutate(
                  {
                    action: "note.save",
                    id: noteEditor.note?.id,
                    title: field(form, "title"),
                    body: field(form, "body"),
                  },
                  "یادداشتت ذخیره شد.",
                )
              )
                setNoteEditor({ open: false });
            }}
          >
            <label>
              عنوان
              <input
                name="title"
                defaultValue={noteEditor.note?.title || ""}
                required
                maxLength={250}
                placeholder="امروز، از نگاه من..."
              />
            </label>
            <label>
              آنچه در ذهن توست
              <textarea
                name="body"
                defaultValue={noteEditor.note?.body || ""}
                rows={8}
                required
                maxLength={20000}
                placeholder="از همین‌جا شروع کن..."
              />
            </label>
            <div className="modal-actions">
              <button className="button primary" disabled={busy}>
                {busy ? "در حال ذخیره..." : "ذخیره یادداشت"}
                <Check size={15} />
              </button>
              <button type="button" className="button outline" onClick={() => setNoteEditor({ open: false })}>
                انصراف
              </button>
            </div>
          </form>
        </Modal>
      )}
      {confirmation && (
        <Modal title={confirmation.message} onClose={() => setConfirmation(null)}>
          <p className="modal-intro">این مورد از اطلاعات ثبت‌شده‌ات حذف می‌شود و قابل بازگردانی نیست.</p>
          <div className="modal-actions">
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                if (await mutate(confirmation.action, "مورد انتخاب‌شده حذف شد.")) setConfirmation(null);
              }}
            >
              بله، حذف شود
            </button>
            <button className="button outline" onClick={() => setConfirmation(null)}>
              نه، نگهش دار
            </button>
          </div>
        </Modal>
      )}
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toast && (
          <div className={`toast ${toast.error ? "error" : ""}`} key={toast.message}>
            {toast.error ? <CircleAlert size={20} /> : <CheckCircle2 size={20} />}
            <span>{toast.message}</span>
            <button aria-label="بستن پیام" onClick={() => setToast(null)}>
              <X size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
