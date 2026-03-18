import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, CheckCircle, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { downloadBillReceipt } from '@/lib/pdf';

interface Tenant { id: string; name: string; }
interface ElecBill { id: string; tenant_id: string; kwh_used: number; rate: number; total: number; billing_date: string; is_paid: boolean; paid_at?: string | null; tenants: { name: string } | null; }
interface WaterBill { id: string; tenant_id: string; amount: number; billing_date: string; is_paid: boolean; paid_at?: string | null; tenants: { name: string } | null; }

export default function Billing() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [elecBills, setElecBills] = useState<ElecBill[]>([]);
  const [waterBills, setWaterBills] = useState<WaterBill[]>([]);
  const [elecOpen, setElecOpen] = useState(false);
  const [waterOpen, setWaterOpen] = useState(false);
  const [elecForm, setElecForm] = useState({ tenant_id: '', kwh_used: '', rate: '', billing_date: new Date().toISOString().slice(0, 10) });
  const [waterForm, setWaterForm] = useState({ tenant_id: '', amount: '', billing_date: new Date().toISOString().slice(0, 10) });
  const { language, t } = useLanguage();

  const load = async () => {
    const { data: tenantData } = await supabase.from('tenants').select('id, name').eq('is_active', true);
    setTenants(tenantData ?? []);
    const { data: electricityData } = await supabase.from('electricity_bills').select('*, tenants(name)').order('billing_date', { ascending: false });
    setElecBills((electricityData ?? []) as ElecBill[]);
    const { data: waterData } = await supabase.from('water_bills').select('*, tenants(name)').order('billing_date', { ascending: false });
    setWaterBills((waterData ?? []) as WaterBill[]);
  };

  useEffect(() => { load(); }, []);

  const calcElecTotal = (kwh: number, rate: number) => {
    return ((kwh * rate) + 16 + 10) * 1.155;
  };

  const handleAddElec = async () => {
    const kwh = Number(elecForm.kwh_used);
    const rate = Number(elecForm.rate);
    if (!elecForm.tenant_id || !kwh || !rate || !elecForm.billing_date) { toast.error(t('fillAllFields')); return; }
    const total = calcElecTotal(kwh, rate);
    const { error } = await supabase.from('electricity_bills').insert({
      tenant_id: elecForm.tenant_id,
      kwh_used: kwh,
      rate,
      total,
      billing_date: elecForm.billing_date,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(t('electricityBillAdded')); setElecOpen(false);
    setElecForm({ tenant_id: '', kwh_used: '', rate: '', billing_date: new Date().toISOString().slice(0, 10) }); load();
  };

  const handleAddWater = async () => {
    const amount = Number(waterForm.amount);
    if (!waterForm.tenant_id || !amount || !waterForm.billing_date) { toast.error(t('fillAllFields')); return; }
    const { error } = await supabase.from('water_bills').insert({ tenant_id: waterForm.tenant_id, amount, billing_date: waterForm.billing_date });
    if (error) { toast.error(error.message); return; }
    toast.success(t('waterBillAdded')); setWaterOpen(false);
    setWaterForm({ tenant_id: '', amount: '', billing_date: new Date().toISOString().slice(0, 10) }); load();
  };

  const downloadReceipt = (bill: ElecBill | WaterBill, type: 'electricity' | 'water') => {
    downloadBillReceipt({
      amount: type === 'electricity' ? (bill as ElecBill).total : (bill as WaterBill).amount,
      billingDate: bill.billing_date,
      billType: type === 'electricity' ? t('electricity') : t('water'),
      language,
      paidAt: bill.paid_at ?? new Date().toISOString(),
      tenantName: bill.tenants?.name ?? 'Tenant',
    });
    toast.success(t('receiptDownloaded'));
  };

  const markPaid = async (table: 'electricity_bills' | 'water_bills', id: string) => {
    const paidAt = new Date().toISOString();
    const { error } = await supabase.from(table).update({ is_paid: true, paid_at: paidAt }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(t('markedAsPaid'));
    await load();
  };

  const previewTotal = elecForm.kwh_used && elecForm.rate
    ? calcElecTotal(Number(elecForm.kwh_used), Number(elecForm.rate)).toFixed(2)
    : null;

  return (
    <Layout>
      <h1 className="font-display text-2xl font-bold mb-6">{t('billing')}</h1>
      <Tabs defaultValue="electricity">
        <TabsList className="mb-4">
          <TabsTrigger value="electricity">⚡ {t('electricity')}</TabsTrigger>
          <TabsTrigger value="water">💧 {t('water')}</TabsTrigger>
        </TabsList>

        <TabsContent value="electricity">
          <div className="flex justify-end mb-4">
            <Dialog open={elecOpen} onOpenChange={setElecOpen}>
              <DialogTrigger asChild>
                <Button className="btn-gold border-0 gap-1" size="sm"><Plus size={16} /> {t('addBill')}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>{t('addElectricityBill')}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>{t('tenant')}</Label>
                    <Select value={elecForm.tenant_id} onValueChange={(value) => setElecForm({ ...elecForm, tenant_id: value })}>
                      <SelectTrigger><SelectValue placeholder={t('selectTenant')} /></SelectTrigger>
                      <SelectContent>{tenants.map((tenant) => <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>{t('billingDate')}</Label><Input type="date" value={elecForm.billing_date} onChange={(e) => setElecForm({ ...elecForm, billing_date: e.target.value })} /></div>
                  <div><Label>{t('kwhUsed')}</Label><Input type="number" value={elecForm.kwh_used} onChange={(e) => setElecForm({ ...elecForm, kwh_used: e.target.value })} /></div>
                  <div><Label>{t('rate')}</Label><Input type="number" step="0.01" value={elecForm.rate} onChange={(e) => setElecForm({ ...elecForm, rate: e.target.value })} /></div>
                  {previewTotal && (
                    <div id="elec_tax" className="p-3 rounded-lg bg-muted text-sm">
                      <p>{t('formula')}: ((kWh × rate) + 16 + 10) × 1.155</p>
                      <p className="font-bold mt-1">{t('total')}: {previewTotal} ETB</p>
                    </div>
                  )}
                  <Button onClick={handleAddElec} className="w-full btn-gold border-0">{t('addBill')}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {elecBills.length === 0 && <p className="text-muted-foreground text-sm card-luxury p-6 text-center">{t('noElectricityBills')}</p>}
            {elecBills.map((bill) => (
              <div key={bill.id} className="card-luxury p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{bill.tenants?.name}</p>
                  <p className="text-xs text-muted-foreground">{bill.kwh_used} kWh · {format(parseISO(bill.billing_date), 'MMM d, yyyy')}</p>
                  <p className="text-sm font-semibold mt-1">{bill.total.toFixed(2)} ETB</p>
                </div>
                <div className="flex items-center gap-2">
                  {bill.is_paid ? (
                    <>
                      <span className="status-paid text-xs font-semibold px-2.5 py-1 rounded-full">{t('paid')}</span>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => downloadReceipt(bill, 'electricity')}>
                        <FileDown size={14} /> {t('downloadPdf')}
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => markPaid('electricity_bills', bill.id)}>
                      <CheckCircle size={14} /> {t('pay')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="water">
          <div className="flex justify-end mb-4">
            <Dialog open={waterOpen} onOpenChange={setWaterOpen}>
              <DialogTrigger asChild>
                <Button className="btn-gold border-0 gap-1" size="sm"><Plus size={16} /> {t('addBill')}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>{t('addWaterBill')}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>{t('tenant')}</Label>
                    <Select value={waterForm.tenant_id} onValueChange={(value) => setWaterForm({ ...waterForm, tenant_id: value })}>
                      <SelectTrigger><SelectValue placeholder={t('selectTenant')} /></SelectTrigger>
                      <SelectContent>{tenants.map((tenant) => <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>{t('billingDate')}</Label><Input type="date" value={waterForm.billing_date} onChange={(e) => setWaterForm({ ...waterForm, billing_date: e.target.value })} /></div>
                  <div><Label>{t('amount')}</Label><Input type="number" value={waterForm.amount} onChange={(e) => setWaterForm({ ...waterForm, amount: e.target.value })} /></div>
                  <Button onClick={handleAddWater} className="w-full btn-gold border-0">{t('addBill')}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {waterBills.length === 0 && <p className="text-muted-foreground text-sm card-luxury p-6 text-center">{t('noWaterBills')}</p>}
            {waterBills.map((bill) => (
              <div key={bill.id} className="card-luxury p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{bill.tenants?.name}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(bill.billing_date), 'MMM d, yyyy')}</p>
                  <p className="text-sm font-semibold mt-1">{bill.amount.toFixed(2)} ETB</p>
                </div>
                <div className="flex items-center gap-2">
                  {bill.is_paid ? (
                    <>
                      <span className="status-paid text-xs font-semibold px-2.5 py-1 rounded-full">{t('paid')}</span>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => downloadReceipt(bill, 'water')}>
                        <FileDown size={14} /> {t('downloadPdf')}
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => markPaid('water_bills', bill.id)}>
                      <CheckCircle size={14} /> {t('pay')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
