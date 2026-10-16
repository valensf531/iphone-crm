import { redirect } from 'next/navigation';
import { getSession } from '../../lib/auth-server'
import { AppSidebar } from '@/components/AppSidebar';
import { DolarIsland } from '@/components/DolarIsland';
import { AppToaster } from '@/components/AppToaster';

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-dvh bg-background text-foreground antialiased">
      <AppSidebar />
      <main id="contenido" tabIndex={-1} className="pb-28 outline-none lg:pb-20 lg:pl-64">
        <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
      <DolarIsland />
      <AppToaster />
    </div>
  )
}