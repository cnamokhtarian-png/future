import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/vazirmatn";
import "./globals.css";

export const metadata: Metadata = {
  title: "روبه‌راه | هر روز، یک قدم رو به جلو",
  description: "فضای شخصی تو برای ساختن مسیر زندگی؛ نقشه راه ۹۰ روزه، فرصت‌های شغلی، پروژه‌ها، مراقبت روزانه و قدم‌های کوچک مالی.",
  applicationName: "روبه‌راه",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
