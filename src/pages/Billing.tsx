import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface Tenant { id: string; name: string; }
interface ElecBill { id: string; tenant_id: string; kwh_used: number; rate: number; total: number; billing_date: string; is_paid: boolean; tenants: { name: string } | null; }
interface WaterBill { id: string; tenant_id: string; amount: number; billing_date: string; is_paid: boolean; tenants: { name: string } | null; }

export default function Billing() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [elecBills, setElecBills] = useState<ElecBill[]>([]);
  const [waterBills, setWaterBills] = useState<WaterBill[]>([]);
  const [elecOpen, setElecOpen] = useState(false);
  const [waterOpen, setWaterOpen] = useState(false);
  const [elecForm, setElecForm] = useState({ tenant_id: '', kwh_used: '', rate: '' });
  const [waterForm, setWaterForm] = useState({ tenant_id: '', amount: '' });

  const load = async () => {
    const { data: t } = await supabase.from('tenants').select('id, name').eq('is_active', true);
    setTenants(t ?? []);
    const { data: eb } = await supabase.from('electricity_bills').select('*, tenants(name)').order('billing_date', { ascending: false });
    setElecBills((eb ?? []) as ElecBill[]);
    const { data: wb } = await supabase.from('water_bills').select('*, tenants(name)').order('billing_date', { ascending: false });
    setWaterBills((wb ?? []) as WaterBill[]);
  };

  useEffect(() => { load(); }, []);

  const calcElecTotal = (kwh: number, rate: number) => {
    return ((kwh * rate) + 16 + 10) * 1.155;
  };

  const handleAddElec = async () => {
    const kwh = Number(elecForm.kwh_used);
    const rate = Number(elecForm.rate);
    if (!elecForm.tenant_id || !kwh || !rate) { toast.error('Fill all fields'); return; }
    const total = calcElecTotal(kwh, rate);
    const { error } = await supabase.from('electricity_bills').insert({
      tenant_id: elecForm.tenant_id, kwh_used: kwh, rate, total,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Electricity bill added'); setElecOpen(false);
    setElecForm({ tenant_id: '', kwh_used: '', rate: '' }); load();
  };

  const handleAddWater = async () => {
    const amount = Number(waterForm.amount);
    if (!waterForm.tenant_id || !amount) { toast.error('Fill all fields'); return; }
    const { error } = await supabase.from('water_bills').insert({ tenant_id: waterForm.tenant_id, amount });
    if (error) { toast.error(error.message); return; }
    toast.success('Water bill added'); setWaterOpen(false);
    setWaterForm({ tenant_id: '', amount: '' }); load();
  };

  const markPaid = async (table: 'electricity_bills' | 'water_bills', id: string) => {
    await supabase.from(table).update({ is_paid: true, paid_at: new Date().toISOString() }).eq('id', id);
    toast.success('Marked as paid'); load();
  };

  const previewTotal = elecForm.kwh_used && elecForm.rate
    ? calcElecTotal(Number(elecForm.kwh_used), Number(elecForm.rate)).toFixed(2)
    : null;

  return (
    <Layout>
      <h1 className="font-display text-2xl font-bold mb-6">Billing</h1>
      <Tabs defaultValue="electricity">
        <TabsList className="mb-4">
          <TabsTrigger value="electricity">⚡ Electricity</TabsTrigger>
          <TabsTrigger value="water">💧 Water</TabsTrigger>
        </TabsList>

        <TabsContent value="electricity">
          <div className="flex justify-end mb-4">
            <Dialog open={elecOpen} onOpenChange={setElecOpen}>
              <DialogTrigger asChild>
                <Button className="btn-gold border-0 gap-1" size="sm"><Plus size={16} /> Add Bill</Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>Add Electricity Bill</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Tenant</Label>
                    <Select value={elecForm.tenant_id} onValueChange={(v) => setElecForm({ ...elecForm, tenant_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
                      <SelectContent>{tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>kWh Used</Label><Input type="number" value={elecForm.kwh_used} onChange={(e) => setElecForm({ ...elecForm, kwh_used: e.target.value })} /></div>
                  <div><Label>Rate (ETB/kWh)</Label><Input type="number" step="0.01" value={elecForm.rate} onChange={(e) => setElecForm({ ...elecForm, rate: e.target.value })} /></div>
                  {previewTotal && (
                    <div id="elec_tax" className="p-3 rounded-lg bg-muted text-sm">
                      <p>Formula: ((kWh × rate) + 16 + 10) × 1.155</p>
                      <p className="font-bold mt-1">Total: {previewTotal} ETB</p>
                    </div>
                  )}
                  <Button onClick={handleAddElec} className="w-full btn-gold border-0">Add Bill</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {elecBills.length === 0 && <p className="text-muted-foreground text-sm card-luxury p-6 text-center">No electricity bills yet.</p>}
            {elecBills.map((b) => (
              <div key={b.id} className="card-luxury p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{b.tenants?.name}</p>
                  <p className="text-xs text-muted-foreground">{b.kwh_used} kWh · {format(parseISO(b.billing_date), 'MMM d, yyyy')}</p>
                  <p className="text-sm font-semibold mt-1">{b.total.toFixed(2)} ETB</p>
                </div>
                {b.is_paid ? (
                  <span className="status-paid text-xs font-semibold px-2.5 py-1 rounded-full">Paid</span>
                ) : (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => markPaid('electricity_bills', b.id)}>
                    <CheckCircle size={14} /> Pay
                  </Button>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="water">
          <div className="flex justify-end mb-4">
            <Dialog open={waterOpen} onOpenChange={setWaterOpen}>
              <DialogTrigger asChild>
                <Button className="btn-gold border-0 gap-1" size="sm"><Plus size={16} /> Add Bill</Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>Add Water Bill</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Tenant</Label>
                    <Select value={waterForm.tenant_id} onValueChange={(v) => setWaterForm({ ...waterForm, tenant_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
                      <SelectContent>{tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Amount (ETB)</Label><Input type="number" value={waterForm.amount} onChange={(e) => setWaterForm({ ...waterForm, amount: e.target.value })} /></div>
                  <Button onClick={handleAddWater} className="w-full btn-gold border-0">Add Bill</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {waterBills.length === 0 && <p className="text-muted-foreground text-sm card-luxury p-6 text-center">No water bills yet.</p>}
            {waterBills.map((b) => (
              <div key={b.id} className="card-luxury p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{b.tenants?.name}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(b.billing_date), 'MMM d, yyyy')}</p>
                  <p className="text-sm font-semibold mt-1">{b.amount.toFixed(2)} ETB</p>
                </div>
                {b.is_paid ? (
                  <span className="status-paid text-xs font-semibold px-2.5 py-1 rounded-full">Paid</span>
                ) : (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => markPaid('water_bills', b.id)}>
                    <CheckCircle size={14} /> Pay
                  </Button>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
