import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="card-luxury p-8 w-full max-w-sm animate-fade-in">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground">AS Apt</h1>
          <p className="text-sm text-muted-foreground mt-1">Alehegne Sewnet Apartment</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full btn-gold border-0">
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Don't have an account?{' '}
          <Link to="/register" className="text-accent-foreground font-medium hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
