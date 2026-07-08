import { FeaturedProjects } from "@/components/projects/featured-projects";
import { HomeAbout } from "@/components/home/home-about";
import { HomeHero } from "@/components/home/home-hero";
import { LatestNotes } from "@/components/home/latest-notes";
import { getRecentNotes } from "@/lib/content/source";
import { getFeaturedProjects } from "@/lib/projects";
import { getSiteSettings } from "@/lib/site-settings";

export const revalidate = 60;

export default async function HomePage() {
  const [recentNotes, settings, projects] = await Promise.all([getRecentNotes(6), getSiteSettings(), getFeaturedProjects()]);

  return (
    <main>
      <HomeHero settings={settings} />
      <HomeAbout settings={settings} />
      <LatestNotes notes={recentNotes} />
      <FeaturedProjects projects={projects.slice(0, 3)} />
    </main>
  );
}
