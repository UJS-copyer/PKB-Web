import { FeaturedProjects } from "@/components/projects/featured-projects";
import { HomeHero } from "@/components/home/home-hero";
import { LatestNotes } from "@/components/home/latest-notes";
import { getRecentNotes } from "@/lib/content/source";

export const revalidate = 60;

export default async function HomePage() {
  const recentNotes = await getRecentNotes(6);

  return (
    <main>
      <HomeHero />
      <LatestNotes notes={recentNotes} />
      <FeaturedProjects />
    </main>
  );
}
