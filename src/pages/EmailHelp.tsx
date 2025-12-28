import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const EmailHelp = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl py-8 px-4">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back')}
          </Link>
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{t('emailHelp.title')}</h1>
        </div>

        <p className="text-muted-foreground mb-8">
          {t('emailHelp.description')}
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('emailHelp.selectClient')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="gmail">
                <AccordionTrigger className="text-left">Gmail</AccordionTrigger>
                <AccordionContent className="space-y-3 text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>{t('emailHelp.gmail.step1')}</li>
                    <li>{t('emailHelp.gmail.step2')}</li>
                    <li>{t('emailHelp.gmail.step3')}</li>
                    <li>{t('emailHelp.gmail.step4')}</li>
                  </ol>
                  <p className="text-sm bg-muted p-3 rounded-md">
                    <strong>{t('emailHelp.tip')}:</strong> {t('emailHelp.gmail.tip')}
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="outlook">
                <AccordionTrigger className="text-left">Outlook / Hotmail</AccordionTrigger>
                <AccordionContent className="space-y-3 text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>{t('emailHelp.outlook.step1')}</li>
                    <li>{t('emailHelp.outlook.step2')}</li>
                    <li>{t('emailHelp.outlook.step3')}</li>
                    <li>{t('emailHelp.outlook.step4')}</li>
                    <li>{t('emailHelp.outlook.step5')}</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="apple">
                <AccordionTrigger className="text-left">Apple Mail (iPhone/Mac)</AccordionTrigger>
                <AccordionContent className="space-y-3 text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>{t('emailHelp.apple.step1')}</li>
                    <li>{t('emailHelp.apple.step2')}</li>
                    <li>{t('emailHelp.apple.step3')}</li>
                    <li>{t('emailHelp.apple.step4')}</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="yahoo">
                <AccordionTrigger className="text-left">Yahoo Mail</AccordionTrigger>
                <AccordionContent className="space-y-3 text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>{t('emailHelp.yahoo.step1')}</li>
                    <li>{t('emailHelp.yahoo.step2')}</li>
                    <li>{t('emailHelp.yahoo.step3')}</li>
                    <li>{t('emailHelp.yahoo.step4')}</li>
                    <li>{t('emailHelp.yahoo.step5')}</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="other">
                <AccordionTrigger className="text-left">{t('emailHelp.other.title')}</AccordionTrigger>
                <AccordionContent className="space-y-3 text-muted-foreground">
                  <p>{t('emailHelp.other.description')}</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>{t('emailHelp.other.tip1')}</li>
                    <li>{t('emailHelp.other.tip2')}</li>
                    <li>{t('emailHelp.other.tip3')}</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {t('emailHelp.senderAddress')}: <code className="bg-muted px-2 py-1 rounded">noreply@gymdagboken.se</code>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailHelp;
