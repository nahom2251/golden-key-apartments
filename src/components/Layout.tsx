import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LayoutDashboard, Receipt, Users, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, isAdmin } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const navItems = [
    { to: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { to: '/billing', label: t('billing'), icon: Receipt },
    { to: '/tenants', label: t('tenants'), icon: Users },
    { to: '/settings', label: t('settings'), icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <nav className="gold-navbar sticky top-0 z-50 px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/dashboard" className="font-display text-lg font-bold text-accent-foreground tracking-tight">
          AS Apt
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border bg-background/80 p-1">
            <Button
              type="button"
              size="sm"
              variant={language === 'en' ? 'secondary' : 'ghost'}
              className="h-8 px-2"
              onClick={() => setLanguage('en')}
            >
              EN
            </Button>
            <Button
              type="button"
              size="sm"
              variant={language === 'am' ? 'secondary' : 'ghost'}
              className="h-8 px-2"
              onClick={() => setLanguage('am')}
            >
              አማ
            </Button>
          </div>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-md text-accent-foreground hover:bg-accent/20 transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute right-0 top-14 w-64 bg-card rounded-lg shadow-xl border border-border m-2 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-border">
              <p className="text-sm font-medium text-foreground truncate">{user?.email}</p>
              {isAdmin && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary-foreground font-medium">
                  {t('admin')}
                </span>
              )}
            </div>
            <div className="p-2">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.to)
                      ? 'bg-primary/15 text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="p-2 border-t border-border">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 w-full transition-colors"
              >
                <LogOut size={18} />
                {t('signOut')}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 p-4 max-w-5xl mx-auto w-full">
        {children}
      </main>

      <footer id="luxfoot" className="text-center py-4 text-sm text-muted-foreground border-t border-border">
        {t('poweredBy')} <span className="font-semibold text-foreground">NUN Technologies</span>
      </footer>
    </div>
  );
}
