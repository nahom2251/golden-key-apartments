import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays, addMonths, parseISO, format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

interface Apartment { id: string; label: string; }
interface Tenant {
  id: string; name: string; phone: string; apartment_id: string | null;
  move_in_date: string; rent_price: number; payment_period_months: number; is_active: boolean;
  apartments: { label: string } | null;
}

function getNextPaymentDate(moveIn: string, periodMonths: number): Date {
  const start = parseISO(moveIn);
  let next = addMonths(start, periodMonths);
  while (next < new Date()) next = addMonths(next, periodMonths);
  return next;
}

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', apartment_id: '', move_in_date: '', rent_price: '', payment_period_months: '1' });
  const { t } = useLanguage();

  const load = async () => {
    const { data } = await supabase.from('tenants').select('*, apartments(label)').eq('is_active', true).order('created_at', { ascending: false });
    setTenants((data ?? []) as Tenant[]);
    const { data: apts } = await supabase.from('apartments').select('id, label').order('floor');
    setApartments(apts ?? []);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ name: '', phone: '', apartment_id: '', move_in_date: '', rent_price: '', payment_period_months: '1' }); setEditing(null); };

  const handleSave = async () => {
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      apartment_id: form.apartment_id || null,
      move_in_date: form.move_in_date,
      rent_price: Number(form.rent_price),
      payment_period_months: Number(form.payment_period_months),
    };
    if (!payload.name || !payload.move_in_date || !payload.rent_price) {
      toast.error(t('fillRequiredFields')); return;
    }
    if (editing) {
      const { error } = await supabase.from('tenants').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success(t('tenantUpdated'));
    } else {
      const { error } = await supabase.from('tenants').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success(t('tenantAdded'));
    }
    setOpen(false); resetForm(); load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('removeTenantConfirm'))) return;
    await supabase.from('tenants').update({ is_active: false }).eq('id', id);
    toast.success(t('tenantRemoved'));
    load();
  };

  const openEdit = (tenant: Tenant) => {
    setEditing(tenant);
    setForm({
      name: tenant.name, phone: tenant.phone, apartment_id: tenant.apartment_id ?? '',
      move_in_date: tenant.move_in_date, rent_price: String(tenant.rent_price),
      payment_period_months: String(tenant.payment_period_months),
    });
    setOpen(true);
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">{t('tenants')}</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-gold border-0 gap-1" size="sm"><Plus size={16} /> {t('add')}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editing ? t('editTenant') : t('addTenant')}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{t('name')} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>{t('phone')}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div>
                <Label>{t('apartment')}</Label>
                <Select value={form.apartment_id} onValueChange={(v) => setForm({ ...form, apartment_id: v })}>
                  <SelectTrigger><SelectValue placeholder={t('selectApartment')} /></SelectTrigger>
                  <SelectContent>
                    {apartments.map((a) => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t('moveInDate')} *</Label><Input type="date" value={form.move_in_date} onChange={(e) => setForm({ ...form, move_in_date: e.target.value })} /></div>
              <div><Label>{t('rentPrice')} (ETB) *</Label><Input type="number" value={form.rent_price} onChange={(e) => setForm({ ...form, rent_price: e.target.value })} /></div>
              <div>
                <Label>{t('paymentPeriod')}</Label>
                <Select value={form.payment_period_months} onValueChange={(v) => setForm({ ...form, payment_period_months: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <SelectItem key={m} value={String(m)}>{m} month{m > 1 ? 's' : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full btn-gold border-0">{t('save')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {tenants.length === 0 && <p className="text-muted-foreground text-sm card-luxury p-6 text-center">{t('noTenantsYet')}</p>}
        {tenants.map((tenant) => {
          const next = getNextPaymentDate(tenant.move_in_date, tenant.payment_period_months);
          const daysLeft = differenceInDays(next, new Date());
          const isOverdue = daysLeft < 0;
          return (
            <div key={tenant.id} className="card-luxury p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{tenant.name}</h3>
                  <p className="text-xs text-muted-foreground">{tenant.apartments?.label ?? t('unassigned')} · {tenant.phone}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('moveInDate')}: {format(parseISO(tenant.move_in_date), 'MMM d, yyyy')} · {tenant.rent_price.toLocaleString()} ETB / {tenant.payment_period_months}mo
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full mr-2 ${isOverdue ? 'status-overdue' : 'status-paid'}`}>
                    {isOverdue ? `${Math.abs(daysLeft)} ${t('daysOverdue')}` : `${daysLeft} ${t('daysLeft')}`}
                  </span>
                  <button onClick={() => openEdit(tenant)} className="p-1.5 rounded hover:bg-muted"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(tenant.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
