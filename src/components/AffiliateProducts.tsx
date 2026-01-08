import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  imageUrl: string;
  productUrl: string;
  brand: string;
  category: string;
}

export function AffiliateProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("fetch-affiliate-products", {
        body: { pageSize: 12 }
      });

      if (error) throw error;
      
      setProducts(data.products || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Kunde inte hämta produkter");
    } finally {
      setLoading(false);
    }
  };

  const visibleProducts = products.slice(currentIndex, currentIndex + 4);
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex + 4 < products.length;

  const handlePrev = () => {
    if (canGoBack) setCurrentIndex(prev => prev - 4);
  };

  const handleNext = () => {
    if (canGoForward) setCurrentIndex(prev => prev + 4);
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Rekommenderade produkter</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border/50 bg-gradient-to-br from-card to-card/80">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Rekommenderade produkter</h3>
            <Badge variant="secondary" className="text-xs">Sponsrat</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return null; // don't show if no products
  }

  return (
    <Card className="border-border/50 bg-gradient-to-br from-card to-card/80">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Rekommenderade produkter</h3>
            <Badge variant="secondary" className="text-xs">Sponsrat</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handlePrev}
              disabled={!canGoBack}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleNext}
              disabled={!canGoForward}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {visibleProducts.map((product) => (
            <a
              key={product.id}
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="group block"
            >
              <div className="bg-background rounded-lg border border-border/50 overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg">
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-primary text-primary-foreground rounded-full p-1.5">
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">{product.brand}</p>
                  <h4 className="font-medium text-sm line-clamp-2 leading-tight">
                    {product.name}
                  </h4>
                  <p className="text-primary font-bold">
                    {product.price} {product.currency}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
