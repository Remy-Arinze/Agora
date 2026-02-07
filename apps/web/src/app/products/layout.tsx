import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Products | AI-Powered School Management Tools',
  description: "Explore Agora's suite of products: Socrates AI, PrepMaster, GradeForge, RollCall, and Bursary Pro. Transforming every aspect of African school management.",
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
