import { Sidebar } from '@/components/sidebar';
import { MobileNav } from '@/components/mobile-nav';
import { Toaster } from 'sonner';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex grain-bg">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileNav />
        <main className="flex-1 px-4 sm:px-6 md:px-10 py-6 md:py-10">
          {children}
        </main>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#FDFBF7',
            border: '1px solid #E8DFCF',
            color: '#1A1A18',
          },
        }}
      />
    </div>
  );
}
