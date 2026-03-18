import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock, FileDown, Users, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Profile { user_id: string; full_name: string | null; is_approved: boolean; }

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);
  const { t } = useLanguage();

  useEffect(() => {
    if (isAdmin) loadPending();
  }, [isAdmin]);

  const loadPending = async () => {
    const { data } = await supabase.from('profiles').select('user_id, full_name, is_approved');
    setPendingUsers((data ?? []) as Profile[]);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error(t('passwordMin')); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success(t('passwordUpdated')); setNewPassword(''); }
  };

  const approveUser = async (userId: string) => {
    await supabase.from('profiles').update({ is_approved: true }).eq('user_id', userId);
    toast.success(t('userApproved'));
    loadPending();
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    const { data: tenants } = await supabase.from('tenants').select('*, apartments(label)').eq('is_active', true);
    const { data: elec } = await supabase.from('electricity_bills').select('*, tenants(name)');
    const { data: water } = await supabase.from('water_bills').select('*, tenants(name)');

    if (format === 'excel') {
      let csv = 'Tenant,Apartment,Rent Price,Payment Period,Move-in Date\n';
      (tenants ?? []).forEach((tenant: any) => {
        csv += `"${tenant.name}","${tenant.apartments?.label ?? ''}",${tenant.rent_price},${tenant.payment_period_months},"${tenant.move_in_date}"\n`;
      });
      csv += '\nElectricity Bills\nTenant,kWh,Total,Date,Paid\n';
      (elec ?? []).forEach((bill: any) => {
        csv += `"${bill.tenants?.name ?? ''}",${bill.kwh_used},${bill.total},"${bill.billing_date}",${bill.is_paid}\n`;
      });
      csv += '\nWater Bills\nTenant,Amount,Date,Paid\n';
      (water ?? []).forEach((bill: any) => {
        csv += `"${bill.tenants?.name ?? ''}",${bill.amount},"${bill.billing_date}",${bill.is_paid}\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'AS_Apt_Report.csv'; a.click();
      URL.revokeObjectURL(url);
      toast.success(t('csvExported'));
    } else {
      const printWindow = window.open('', '_blank');
      if (!printWindow) { toast.error(t('pleaseAllowPopups')); return; }
      let html = '<html><head><title>AS Apt Report</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:13px}th{background:#FAD689}</style></head><body>';
      html += '<h1>AS Apt Report</h1>';
      html += '<h2>Tenants</h2><table><tr><th>Name</th><th>Apartment</th><th>Rent</th><th>Period</th><th>Move-in</th></tr>';
      (tenants ?? []).forEach((tenant: any) => { html += `<tr><td>${tenant.name}</td><td>${tenant.apartments?.label ?? ''}</td><td>${tenant.rent_price}</td><td>${tenant.payment_period_months}mo</td><td>${tenant.move_in_date}</td></tr>`; });
      html += '</table>';
      html += '<h2>Electricity Bills</h2><table><tr><th>Tenant</th><th>kWh</th><th>Total</th><th>Date</th><th>Paid</th></tr>';
      (elec ?? []).forEach((bill: any) => { html += `<tr><td>${bill.tenants?.name ?? ''}</td><td>${bill.kwh_used}</td><td>${bill.total}</td><td>${bill.billing_date}</td><td>${bill.is_paid ? 'Yes' : 'No'}</td></tr>`; });
      html += '</table>';
      html += '<h2>Water Bills</h2><table><tr><th>Tenant</th><th>Amount</th><th>Date</th><th>Paid</th></tr>';
      (water ?? []).forEach((bill: any) => { html += `<tr><td>${bill.tenants?.name ?? ''}</td><td>${bill.amount}</td><td>${bill.billing_date}</td><td>${bill.is_paid ? 'Yes' : 'No'}</td></tr>`; });
      html += '</table></body></html>';
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
      toast.success(t('pdfExportOpened'));
    }
  };

  return (
    <Layout>
      <h1 className="font-display text-2xl font-bold mb-6">{t('settings')}</h1>

      <div className="card-luxury p-5 mb-6">
        <h2 className="font-semibold flex items-center gap-2 mb-3"><Lock size={18} /> {t('changePassword')}</h2>
        <div className="flex gap-2">
          <Input type="password" placeholder="New password (min 6 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="flex-1" />
          <Button onClick={handleChangePassword} disabled={loading} className="btn-gold border-0">{t('update')}</Button>
        </div>
      </div>

      <div className="card-luxury p-5 mb-6">
        <h2 className="font-semibold flex items-center gap-2 mb-3"><FileDown size={18} /> {t('exportReports')}</h2>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => handleExport('pdf')}>{t('exportPdf')}</Button>
          <Button variant="outline" onClick={() => handleExport('excel')}>{t('exportCsv')}</Button>
        </div>
      </div>

      {isAdmin && (
        <div className="card-luxury p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-3"><Users size={18} /> {t('userManagement')}</h2>
          <div className="space-y-2">
            {pendingUsers.length === 0 && <p className="text-muted-foreground text-sm">{t('noUsersFound')}</p>}
            {pendingUsers.map((user) => (
              <div key={user.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{user.full_name ?? 'Unknown'}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${user.is_approved ? 'status-paid' : 'status-unpaid'}`}>
                    {user.is_approved ? t('approved') : t('pending')}
                  </span>
                </div>
                {!user.is_approved && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => approveUser(user.user_id)}>
                    <CheckCircle size={14} /> {t('approve')}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
