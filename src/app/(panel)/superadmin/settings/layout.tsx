import { SectionTabs } from "@/components/SectionTabs";

/** Settings has three parts, switched with the tabs on top: Store, Team, Data reset. */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SectionTabs section="settings" />
      {children}
    </>
  );
}
