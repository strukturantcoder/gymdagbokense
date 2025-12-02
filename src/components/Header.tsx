import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Menu, X, Dumbbell, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { label: "Funktioner", href: "#features" },
    { label: "Priser", href: "#pricing" },
  ];

  const handleSignOut = async () => {
    await signOut();
    toast.success("Utloggad!");
    setIsMenuOpen(false);
  };

  const handleAuthClick = () => {
    navigate("/auth");
    setIsMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-gym-orange to-gym-amber rounded-lg flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">
              GYMDAGBOKEN
            </span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
          {!loading && (
              <>
                {user ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
                      Min Dashboard
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Logga ut
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" onClick={handleAuthClick}>
                      Logga in
                    </Button>
                    <Button variant="hero" size="sm" onClick={handleAuthClick}>
                      Kom igång
                    </Button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background border-b border-border"
          >
            <div className="container px-4 py-4">
              <nav className="flex flex-col gap-4">
                {navItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}
                <div className="flex flex-col gap-2 pt-4 border-t border-border">
                  {!loading && (
                    <>
                      {user ? (
                        <>
                          <p className="text-sm text-muted-foreground text-center mb-2">
                            {user.email}
                          </p>
                          <Button variant="ghost" className="w-full justify-center" onClick={handleSignOut}>
                            <LogOut className="w-4 h-4 mr-2" />
                            Logga ut
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" className="w-full justify-center" onClick={handleAuthClick}>
                            Logga in
                          </Button>
                          <Button variant="hero" className="w-full justify-center" onClick={handleAuthClick}>
                            Kom igång
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
