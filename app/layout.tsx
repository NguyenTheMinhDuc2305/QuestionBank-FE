import type { Metadata } from "next";
import "./style.css";
export const metadata: Metadata = { title: "QuestionBank Studio", description: "Internal question generation POC" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="vi"><body>{children}</body></html>;
}
