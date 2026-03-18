import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t('registrationSuccess'));
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="card-luxury p-8 w-full max-w-sm animate-fade-in">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground">{t('registerTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('registerSubtitle')}</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <Label htmlFor="name">{t('fullName')}</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Your name" />
          </div>
          <div>
            <Label htmlFor="email">{t('email')}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" />
          </div>
          <div>
            <Label htmlFor="password">{t('password')}</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
          </div>
          <Button type="submit" disabled={loading} className="w-full btn-gold border-0">
            {loading ? t('registering') : t('register')}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          {t('alreadyHaveAccount')}{' '}
          <Link to="/login" className="text-accent-foreground font-medium hover:underline">
            {t('signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
