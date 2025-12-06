import { Dumbbell, Instagram } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();

  const links = {
    product: [
      { labelKey: "footer.features", href: "#features" },
      { labelKey: "footer.howItWorks", href: "#how-it-works" },
      { labelKey: "footer.pricing", href: "#pricing" },
      { labelKey: "footer.contact", href: "/contact", isRoute: true },
    ],
    legal: [
      { labelKey: "footer.privacy", href: "/privacy" },
      { labelKey: "footer.terms", href: "/terms" },
      { labelKey: "footer.cookies", href: "/cookies" },
    ],
  };

  return (
    <footer className="bg-gym-charcoal border-t border-border">
      <div className="container px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-gym-orange to-gym-amber rounded-lg flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold tracking-tight">
                GYMDAGBOKEN
              </span>
            </div>
            <p className="text-muted-foreground text-sm mb-6">
              {t('footer.tagline')}
            </p>
            <div className="flex gap-4">
              <a 
                href="https://www.instagram.com/gymdagboken.se/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-gym-orange transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="font-display font-semibold mb-4">{t('footer.product')}</h4>
            <ul className="space-y-2">
              {links.product.map((link) => (
                <li key={link.labelKey}>
                  {link.isRoute ? (
                    <Link
                      to={link.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {t(link.labelKey)}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {t(link.labelKey)}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="font-display font-semibold mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-2">
              {links.legal.map((link) => (
                <li key={link.labelKey}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 text-center text-muted-foreground text-sm">
          <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;