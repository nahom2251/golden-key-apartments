import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Users, Zap, Droplets, AlertTriangle } from 'lucide-react';
import { differenceInDays, addMonths, parseISO } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

interface TenantWithApt {
  id: string;
  name: string;
  move_in_date: string;
  rent_price: number;
  payment_period_months: number;
  apartments: { label: string } | null;
}

function getNextPaymentDate(moveIn: string, periodMonths: number): Date {
  const start = parseISO(moveIn);
  let next = addMonths(start, periodMonths);
  while (next < new Date()) {
    next = addMonths(next, periodMonths);
  }
  return next;
}

export default function Dashboard() {
  const [tenants, setTenants] = useState<TenantWithApt[]>([]);
  const [elecCount, setElecCount] = useState(0);
  const [waterCount, setWaterCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    const load = async () => {
      const { data: tData } = await supabase
        .from('tenants')
        .select('id, name, move_in_date, rent_price, payment_period_months, apartments(label)')
        .eq('is_active', true);
      const tenantList = (tData ?? []) as TenantWithApt[];
      setTenants(tenantList);

      let overdue = 0;
      tenantList.forEach((tenant) => {
        const next = getNextPaymentDate(tenant.move_in_date, tenant.payment_period_months);
        if (differenceInDays(next, new Date()) < 0) overdue++;
      });
      setOverdueCount(overdue);

      const { count: ec } = await supabase.from('electricity_bills').select('*', { count: 'exact', head: true }).eq('is_paid', false);
      setElecCount(ec ?? 0);
      const { count: wc } = await supabase.from('water_bills').select('*', { count: 'exact', head: true }).eq('is_paid', false);
      setWaterCount(wc ?? 0);
    };
    load();
  }, []);

  return (
    <Layout>
      <h1 className="font-display text-2xl font-bold mb-6">{t('dashboard')}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label={t('activeTenants')} value={tenants.length} />
        <StatCard icon={Zap} label={t('unpaidElectric')} value={elecCount} color="text-amber-600" />
        <StatCard icon={Droplets} label={t('unpaidWater')} value={waterCount} color="text-blue-500" />
        <StatCard icon={AlertTriangle} label={t('overdue')} value={overdueCount} color="text-destructive" />
      </div>

      <div className="card-luxury p-4">
        <h2 className="font-display text-lg font-semibold mb-3">{t('tenantPaymentStatus')}</h2>
        <div className="space-y-3">
          {tenants.length === 0 && <p className="text-muted-foreground text-sm">{t('noActiveTenants')}</p>}
          {tenants.map((tenant) => {
            const next = getNextPaymentDate(tenant.move_in_date, tenant.payment_period_months);
            const daysLeft = differenceInDays(next, new Date());
            const isOverdue = daysLeft < 0;
            return (
              <div key={tenant.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium text-sm">{tenant.name}</p>
                  <p className="text-xs text-muted-foreground">{tenant.apartments?.label ?? t('unassigned')}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isOverdue ? 'status-overdue' : 'status-paid'}`}>
                  {isOverdue ? `${Math.abs(daysLeft)} ${t('daysOverdue')}` : `${daysLeft} ${t('daysLeft')}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color?: string }) {
  return (
    <div className="stat-card p-4 flex flex-col items-center text-center gap-2">
      <Icon size={24} className={color ?? 'text-accent'} />
      <span className="text-2xl font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

