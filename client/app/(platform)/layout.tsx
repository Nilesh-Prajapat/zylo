import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zylo-warm text-zylo-text">
      {/* Fixed Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area Viewport */}
      <div className="flex flex-1 flex-col min-w-0 h-screen overflow-hidden">
        <TopBar />
        <main className="flex-1 min-h-0 overflow-y-auto pb-20 lg:pb-0">{children}</main>
      </div>

      {/* Mobile Navigation */}
      <MobileBottomNav />
    </div>
  );
}
