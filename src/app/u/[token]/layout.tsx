import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  return {
    manifest: `/u/${token}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: "Shop", statusBarStyle: "default" },
  };
}

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
