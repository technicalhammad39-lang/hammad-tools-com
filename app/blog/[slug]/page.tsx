import { redirect } from 'next/navigation';

export default async function LegacyBlogSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/blogs/${slug}`);
}
