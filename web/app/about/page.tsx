import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "关于"
};

export default function AboutPage() {
  redirect("/#about");
}
