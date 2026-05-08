import { redirect } from 'next/navigation';

export default async function TableEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ org?: string }>;
}) {
  const { slug } = await params;
  const { org } = await searchParams;

  const query = new URLSearchParams();
  query.set('mesa', slug);
  if (org) query.set('org', org);

  redirect(`/guest/register?${query.toString()}`);
}
