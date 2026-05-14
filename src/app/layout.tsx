import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Nxt-Quiz",
  description:
    "A comprehensive general-purpose MCQ assessment platform for evaluating proficiency across various subjects and technologies.",
  openGraph: {
    title: "Nxt-Quiz Assessment Platform",
    description:
      "A comprehensive general-purpose MCQ assessment platform for evaluating proficiency across various subjects and technologies.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
