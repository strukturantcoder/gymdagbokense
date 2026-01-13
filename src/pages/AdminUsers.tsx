import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Search, KeyRound, Loader2, Users, Dumbbell, Activity, Mail } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  display_name: string | null;
  avatar_url: string | null;
  workout_count: number;
  cardio_count: number;
  email_confirmed_at: string | null;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sendingReset, setSendingReset] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      toast.error("Du har inte behörighet att visa denna sida");
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, user, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: null,
        method: "GET",
      });

      // Use query params via URL
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?page=${page}&limit=50&search=${encodeURIComponent(search)}`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const result = await response.json();
      setUsers(result.users || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Kunde inte hämta användare");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleSendResetPassword = async (email: string) => {
    setSendingReset(email);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { email },
      });

      if (error) throw error;

      toast.success(`Återställningslänk skickad till ${email}`);
    } catch (error) {
      console.error("Error sending reset password:", error);
      toast.error("Kunde inte skicka återställningslänk");
    } finally {
      setSendingReset(null);
    }
  };

  const filteredUsers = search
    ? users.filter(
        (u) =>
          u.email?.toLowerCase().includes(search.toLowerCase()) ||
          u.display_name?.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Laddar...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/challenges")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Användarhantering</h1>
            <p className="text-muted-foreground">Hantera användare och skicka lösenordsåterställning</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Totalt användare</p>
                  <p className="text-2xl font-bold">{total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Dumbbell className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Med träningspass</p>
                  <p className="text-2xl font-bold">{users.filter((u) => u.workout_count > 0).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Activity className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Med konditionspass</p>
                  <p className="text-2xl font-bold">{users.filter((u) => u.cardio_count > 0).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Sök på e-post eller namn..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Sök</Button>
            </form>
          </CardContent>
        </Card>

        {/* Users table */}
        <Card>
          <CardHeader>
            <CardTitle>Användare</CardTitle>
            <CardDescription>
              Visar {filteredUsers.length} av {total} användare
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Användare</TableHead>
                      <TableHead>E-post</TableHead>
                      <TableHead>Senaste inloggning</TableHead>
                      <TableHead className="text-center">Träningspass</TableHead>
                      <TableHead className="text-center">Konditionspass</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Åtgärder</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={u.avatar_url || undefined} />
                              <AvatarFallback>
                                {(u.display_name || u.email || "?")[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{u.display_name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{u.email}</span>
                        </TableCell>
                        <TableCell>
                          {u.last_sign_in_at ? (
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(u.last_sign_in_at), {
                                addSuffix: true,
                                locale: sv,
                              })}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Aldrig</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={u.workout_count > 0 ? "default" : "secondary"}>
                            {u.workout_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={u.cardio_count > 0 ? "default" : "secondary"}>
                            {u.cardio_count}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.email_confirmed_at ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Verifierad
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              Ej verifierad
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendResetPassword(u.email)}
                            disabled={sendingReset === u.email}
                          >
                            {sendingReset === u.email ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <KeyRound className="h-4 w-4 mr-1" />
                                Återställ lösenord
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {total > 50 && (
              <div className="flex justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Föregående
                </Button>
                <span className="flex items-center px-3 text-sm text-muted-foreground">
                  Sida {page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={users.length < 50}
                >
                  Nästa
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
