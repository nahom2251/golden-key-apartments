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
      toast.error('Please fill required fields'); return;
    }
    if (editing) {
      const { error } = await supabase.from('tenants').update(payload).eq('id', editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Tenant updated');
    } else {
      const { error } = await supabase.from('tenants').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Tenant added');
    }
    setOpen(false); resetForm(); load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this tenant?')) return;
    await supabase.from('tenants').update({ is_active: false }).eq('id', id);
    toast.success('Tenant removed');
    load();
  };

  const openEdit = (t: Tenant) => {
    setEditing(t);
    setForm({
      name: t.name, phone: t.phone, apartment_id: t.apartment_id ?? '',
      move_in_date: t.move_in_date, rent_price: String(t.rent_price),
      payment_period_months: String(t.payment_period_months),
    });
    setOpen(true);
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Tenants</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-gold border-0 gap-1" size="sm"><Plus size={16} /> Add</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editing ? 'Edit Tenant' : 'Add Tenant'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div>
                <Label>Apartment</Label>
                <Select value={form.apartment_id} onValueChange={(v) => setForm({ ...form, apartment_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select apartment" /></SelectTrigger>
                  <SelectContent>
                    {apartments.map((a) => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Move-in Date *</Label><Input type="date" value={form.move_in_date} onChange={(e) => setForm({ ...form, move_in_date: e.target.value })} /></div>
              <div><Label>Rent Price (ETB) *</Label><Input type="number" value={form.rent_price} onChange={(e) => setForm({ ...form, rent_price: e.target.value })} /></div>
              <div>
                <Label>Payment Period (months)</Label>
                <Select value={form.payment_period_months} onValueChange={(v) => setForm({ ...form, payment_period_months: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <SelectItem key={m} value={String(m)}>{m} month{m > 1 ? 's' : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full btn-gold border-0">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {tenants.length === 0 && <p className="text-muted-foreground text-sm card-luxury p-6 text-center">No tenants yet. Add your first tenant.</p>}
        {tenants.map((t) => {
          const next = getNextPaymentDate(t.move_in_date, t.payment_period_months);
          const daysLeft = differenceInDays(next, new Date());
          const isOverdue = daysLeft < 0;
          return (
            <div key={t.id} className="card-luxury p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{t.name}</h3>
                  <p className="text-xs text-muted-foreground">{t.apartments?.label ?? 'Unassigned'} · {t.phone}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Move-in: {format(parseISO(t.move_in_date), 'MMM d, yyyy')} · {t.rent_price.toLocaleString()} ETB / {t.payment_period_months}mo
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full mr-2 ${isOverdue ? 'status-overdue' : 'status-paid'}`}>
                    {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                  </span>
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded hover:bg-muted"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
