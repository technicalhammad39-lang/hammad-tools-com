import { redirect } from 'next/navigation';

export default function LegacyBlogRedirectPage() {
  redirect('/blogs');
}
