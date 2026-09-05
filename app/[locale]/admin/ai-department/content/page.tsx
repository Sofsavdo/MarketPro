import { listContentIdeas } from "@/lib/ai-department/data-actions";
import { ContentIdeaCard } from "@/components/admin/content-idea-card";

const BRAND_LABELS: Record<string, string> = {
  amaliy_biznes: "@amaliy.biznes",
  izdosh_academy: "@izdosh.academy",
};

export default async function ContentIdeasPage() {
  const ideas = await listContentIdeas();

  return (
    <div className="flex flex-col gap-3">
      {ideas.length === 0 ? (
        <p className="text-sm text-slate-500">
          Hozircha kontent g&apos;oyasi yo&apos;q. Chat&apos;da AI&apos;dan g&apos;oya so&apos;rang — u shu yerda
          paydo bo&apos;ladi.
        </p>
      ) : (
        ideas.map((idea) => (
          <ContentIdeaCard key={idea.id} idea={idea} brandLabel={BRAND_LABELS[idea.brand] ?? idea.brand} />
        ))
      )}
    </div>
  );
}
