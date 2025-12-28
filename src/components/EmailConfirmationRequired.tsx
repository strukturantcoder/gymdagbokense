import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft, RefreshCw, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function EmailConfirmationRequired() {
  const { user, resendConfirmationEmail } = useAuth();
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    const { error } = await resendConfirmationEmail();
    setIsResending(false);
    
    if (error) {
      toast.error('Kunde inte skicka bekräftelsemailet. Försök igen senare.');
    } else {
      setEmailSent(true);
      toast.success('Bekräftelsemailet har skickats!');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Bekräfta din e-postadress</CardTitle>
          <CardDescription>
            För att kunna starta träningspass behöver du bekräfta din e-postadress först.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-center">
            <p className="text-muted-foreground">
              Vi har skickat ett bekräftelsemail till:
            </p>
            <p className="font-medium mt-1">{user?.email}</p>
          </div>
          
          {emailSent ? (
            <div className="flex items-center gap-2 text-green-600 justify-center">
              <CheckCircle className="h-5 w-5" />
              <span>Nytt bekräftelsemail skickat!</span>
            </div>
          ) : (
            <Button 
              onClick={handleResend} 
              variant="outline" 
              className="w-full gap-2"
              disabled={isResending}
            >
              {isResending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Skicka bekräftelsemailet igen
            </Button>
          )}
          
          <Button 
            onClick={() => navigate('/training')} 
            variant="ghost" 
            className="w-full gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Tillbaka till träningssidan
          </Button>
          
          <p className="text-xs text-muted-foreground text-center">
            Du kan fortfarande skapa träningsprogram medan du väntar på att bekräfta din e-post.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
