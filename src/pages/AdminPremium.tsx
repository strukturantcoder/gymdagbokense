import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ArrowLeft, Crown, Loader2, RefreshCw, Search, Users, ExternalLink, Ticket, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface PremiumUser {
  id: string;
  email: string;
  display_name: string | null;
  stripe_customer_id: string;
  subscription_id: string;
  subscription_status: string;
  subscription_end: string | null;
  price_id: string;
  created_at: string;
}

interface Coupon {
  id: string;
  name: string;
  percent_off: number | null;
  amount_off: number | null;
  duration: string;
}

export default function AdminPremium() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [users, setUsers] = useState<PremiumUser[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [couponDialogOpen, setCouponDialogOpen] = useState(false);
  const [createCouponDialogOpen, setCreateCouponDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PremiumUser | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<string>('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isCreatingCoupon, setIsCreatingCoupon] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    name: '',
    discountType: 'percent' as 'percent' | 'amount',
    discountValue: '',
    duration: 'once' as 'once' | 'repeating' | 'forever',
    durationMonths: '1',
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchPremiumUsers();
      fetchCoupons();
    }
  }, [isAdmin]);

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('list-coupons');
      if (error) throw error;
      setCoupons(data?.coupons || []);
    } catch (error) {
      console.error('Error fetching coupons:', error);
    }
  };

  const fetchPremiumUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-premium-users');
      
      if (error) throw error;
      
      setUsers(data?.users || []);
    } catch (error) {
      console.error('Error fetching premium users:', error);
      toast.error('Kunde inte hämta premium-användare');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPremiumUsers();
    setIsRefreshing(false);
    toast.success('Lista uppdaterad');
  };

  const handleOpenCouponDialog = (user: PremiumUser) => {
    setSelectedUser(user);
    setSelectedCoupon('');
    setCouponDialogOpen(true);
  };

  const handleApplyCoupon = async () => {
    if (!selectedUser || !selectedCoupon) return;
    
    setIsApplyingCoupon(true);
    try {
      const { data, error } = await supabase.functions.invoke('apply-coupon', {
        body: {
          subscription_id: selectedUser.subscription_id,
          coupon_id: selectedCoupon,
        },
      });
      
      if (error) throw error;
      
      toast.success(`Kupong applicerad på ${selectedUser.display_name || selectedUser.email}`);
      setCouponDialogOpen(false);
      await fetchPremiumUsers();
    } catch (error) {
      console.error('Error applying coupon:', error);
      toast.error('Kunde inte applicera kupongen');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleCreateCoupon = async () => {
    if (!newCoupon.name || !newCoupon.discountValue) {
      toast.error('Fyll i alla obligatoriska fält');
      return;
    }

    setIsCreatingCoupon(true);
    try {
      const body: Record<string, unknown> = {
        name: newCoupon.name,
        duration: newCoupon.duration,
      };

      if (newCoupon.discountType === 'percent') {
        body.percent_off = parseFloat(newCoupon.discountValue);
      } else {
        body.amount_off = parseFloat(newCoupon.discountValue) * 100; // Convert to öre
      }

      if (newCoupon.duration === 'repeating') {
        body.duration_in_months = parseInt(newCoupon.durationMonths);
      }

      const { data, error } = await supabase.functions.invoke('create-coupon', { body });
      
      if (error) throw error;
      
      toast.success(`Kupong "${newCoupon.name}" skapad`);
      setCreateCouponDialogOpen(false);
      setNewCoupon({
        name: '',
        discountType: 'percent',
        discountValue: '',
        duration: 'once',
        durationMonths: '1',
      });
      await fetchCoupons();
    } catch (error) {
      console.error('Error creating coupon:', error);
      toast.error('Kunde inte skapa kupongen');
    } finally {
      setIsCreatingCoupon(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Aktiv</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Avslutad</Badge>;
      case 'past_due':
        return <Badge className="bg-yellow-500">Förfallen</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500">Provperiod</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCouponLabel = (coupon: Coupon) => {
    if (coupon.percent_off) {
      return `${coupon.name} (${coupon.percent_off}% rabatt)`;
    }
    if (coupon.amount_off) {
      return `${coupon.name} (${coupon.amount_off / 100} kr rabatt)`;
    }
    return coupon.name;
  };

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-lg flex items-center justify-center">
                <Crown className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Premium</h1>
                <p className="text-xs text-muted-foreground">Premium-användare</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setCreateCouponDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Ny kupong</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Uppdatera</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 max-w-6xl mx-auto space-y-6">
        {/* Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Totalt premium</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.subscription_status === 'active').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Aktiva prenumerationer</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {users.filter(u => u.subscription_status === 'canceled').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Avslutade</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Premium-medlemmar</CardTitle>
                <CardDescription>Alla användare med aktiv eller tidigare prenumeration</CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Sök namn eller e-post..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Crown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Inga premium-användare hittades</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Användare</TableHead>
                      <TableHead>E-post</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Slutdatum</TableHead>
                      <TableHead>Startade</TableHead>
                      <TableHead className="text-right">Åtgärder</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.display_name || 'Okänd'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(user.subscription_status)}
                        </TableCell>
                        <TableCell>
                          {user.subscription_end 
                            ? format(new Date(user.subscription_end), 'PPP', { locale: sv })
                            : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(user.created_at), 'PPP', { locale: sv })}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          {user.subscription_status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCouponDialog(user)}
                              title="Applicera kupong"
                            >
                              <Ticket className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`https://dashboard.stripe.com/customers/${user.stripe_customer_id}`, '_blank')}
                            title="Öppna i Stripe"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Coupon Dialog */}
      <Dialog open={couponDialogOpen} onOpenChange={setCouponDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Applicera kupong</DialogTitle>
            <DialogDescription>
              Välj en kupong att applicera på {selectedUser?.display_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedCoupon} onValueChange={setSelectedCoupon}>
              <SelectTrigger>
                <SelectValue placeholder="Välj en kupong..." />
              </SelectTrigger>
              <SelectContent>
                {coupons.map((coupon) => (
                  <SelectItem key={coupon.id} value={coupon.id}>
                    {getCouponLabel(coupon)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCouponDialogOpen(false)}>
                Avbryt
              </Button>
              <Button 
                onClick={handleApplyCoupon} 
                disabled={!selectedCoupon || isApplyingCoupon}
              >
                {isApplyingCoupon && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Applicera
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Coupon Dialog */}
      <Dialog open={createCouponDialogOpen} onOpenChange={setCreateCouponDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Skapa ny kupong</DialogTitle>
            <DialogDescription>
              Skapa en ny rabattkupong som kan appliceras på prenumerationer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="coupon-name">Namn</Label>
              <Input
                id="coupon-name"
                placeholder="t.ex. Gratis månad"
                value={newCoupon.name}
                onChange={(e) => setNewCoupon({ ...newCoupon, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Rabattyp</Label>
              <Select 
                value={newCoupon.discountType} 
                onValueChange={(v: 'percent' | 'amount') => setNewCoupon({ ...newCoupon, discountType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Procent (%)</SelectItem>
                  <SelectItem value="amount">Belopp (SEK)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount-value">
                {newCoupon.discountType === 'percent' ? 'Rabatt (%)' : 'Rabatt (SEK)'}
              </Label>
              <Input
                id="discount-value"
                type="number"
                placeholder={newCoupon.discountType === 'percent' ? 't.ex. 50' : 't.ex. 100'}
                value={newCoupon.discountValue}
                onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Varaktighet</Label>
              <Select 
                value={newCoupon.duration} 
                onValueChange={(v: 'once' | 'repeating' | 'forever') => setNewCoupon({ ...newCoupon, duration: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">En gång</SelectItem>
                  <SelectItem value="repeating">Upprepande</SelectItem>
                  <SelectItem value="forever">För alltid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newCoupon.duration === 'repeating' && (
              <div className="space-y-2">
                <Label htmlFor="duration-months">Antal månader</Label>
                <Input
                  id="duration-months"
                  type="number"
                  min="1"
                  value={newCoupon.durationMonths}
                  onChange={(e) => setNewCoupon({ ...newCoupon, durationMonths: e.target.value })}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setCreateCouponDialogOpen(false)}>
                Avbryt
              </Button>
              <Button 
                onClick={handleCreateCoupon} 
                disabled={!newCoupon.name || !newCoupon.discountValue || isCreatingCoupon}
              >
                {isCreatingCoupon && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Skapa kupong
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}