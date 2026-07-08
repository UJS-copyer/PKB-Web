"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import type { ProjectRecord } from "@/lib/projects";

export function FeaturedProjects({ compact = false, projects }: { compact?: boolean; projects: ProjectRecord[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 160, damping: 22 });
  const springY = useSpring(mouseY, { stiffness: 160, damping: 22 });

  return (
    <section className={compact ? "" : "content-grid border-b border-border"}>
      <div className={compact ? "" : "py-16"}>
        {!compact ? (
          <div className="mb-10">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
              02 - Selected Projects
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">精选项目</h2>
          </div>
        ) : null}

        <div
          ref={containerRef}
          onMouseMove={(event) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            mouseX.set(event.clientX - rect.left);
            mouseY.set(event.clientY - rect.top);
          }}
          className="relative"
        >
          {projects.map((project, index) => (
            <motion.div
              key={project.slug}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="border-t border-border py-7 last:border-b"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <Link href={`/projects/${project.slug}`} className="group grid gap-5 md:grid-cols-[72px_1fr_auto] md:items-center">
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {project.year}
                </span>
                <div>
                  <h3 className="text-3xl font-semibold tracking-tight transition-colors group-hover:text-accent md:text-5xl">
                    {project.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {project.summary}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 md:max-w-xs md:justify-end">
                  {project.stack.map((tag) => (
                    <Badge key={tag} variant="outline" className="rounded-full font-mono">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Link>
            </motion.div>
          ))}

          <motion.div
            className="pointer-events-none absolute z-20 hidden h-44 w-72 overflow-hidden rounded-lg border border-border bg-card shadow-2xl lg:block"
            style={{
              x: springX,
              y: springY,
              translateX: "-50%",
              translateY: "-125%"
            }}
            animate={{
              opacity: hoveredIndex !== null ? 1 : 0,
              scale: hoveredIndex !== null ? 1 : 0.96
            }}
            transition={{ duration: 0.2 }}
          >
            {hoveredIndex !== null ? (
              <Image
                src={projects[hoveredIndex].cover ?? "/project-dashboard.jpg"}
                alt={projects[hoveredIndex].title}
                width={576}
                height={352}
                className="size-full object-cover grayscale-[35%] contrast-110"
              />
            ) : null}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
