import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClinicSync | Appointment coordination for clinics",
  description:
    "ClinicSync helps medical clinics coordinate appointment requests with thoughtful scheduling rules and a secure booking workflow.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
