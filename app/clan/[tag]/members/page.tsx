import MemberGrid from "@/app/components/MemberGrid";
import getClan from "@/app/lib/getClan";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;

  const clan = await getClan(tag);

  return (
    <section>
      <h1 className="mb-6 text-3xl font-bold">
        👥 Leden
      </h1>

      <MemberGrid members={clan.memberList} />
    </section>
  );
}