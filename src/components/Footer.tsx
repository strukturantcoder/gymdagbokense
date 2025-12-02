import { Dumbbell, Instagram } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  const links = {
    product: [
      { label: "Funktioner", href: "#features" },
      { label: "Så fungerar det", href: "#how-it-works" },
      { label: "Priser", href: "#pricing" },
      { label: "Kontakt", href: "/contact", isRoute: true },
    ],
    legal: [
      { label: "Integritetspolicy", href: "/privacy" },
      { label: "Användarvillkor", href: "/terms" },
      { label: "Cookies", href: "/cookies" },
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
              Din digitala träningskompis. Spåra, analysera och förbättra din träning.
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
            <h4 className="font-display font-semibold mb-4">PRODUKT</h4>
            <ul className="space-y-2">
              {links.product.map((link) => (
                <li key={link.label}>
                  {link.isRoute ? (
                    <Link
                      to={link.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="font-display font-semibold mb-4">JURIDISKT</h4>
            <ul className="space-y-2">
              {links.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8 text-center text-muted-foreground text-sm">
          <p>© {new Date().getFullYear()} Gymdagboken. Alla rättigheter förbehållna.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
