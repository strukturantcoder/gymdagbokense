import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { Link } from "react-router-dom";

import instagramAiTraining from "@/assets/social/instagram-ai-training.png";
import instagramSocialFeatures from "@/assets/social/instagram-social-features.png";
import instagramStoryAiProgram from "@/assets/social/instagram-story-ai-program.png";
import instagramStoryStatistics from "@/assets/social/instagram-story-statistics.png";

const images = [
  { name: "Instagram AI Training", src: instagramAiTraining, filename: "instagram-ai-training.png" },
  { name: "Instagram Social Features", src: instagramSocialFeatures, filename: "instagram-social-features.png" },
  { name: "Instagram Story AI Program", src: instagramStoryAiProgram, filename: "instagram-story-ai-program.png" },
  { name: "Instagram Story Statistics", src: instagramStoryStatistics, filename: "instagram-story-statistics.png" },
];

const DownloadImages = () => {
  const handleDownload = (src: string, filename: string) => {
    const link = document.createElement("a");
    link.href = src;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link to="/" className="text-primary hover:underline">← Tillbaka</Link>
        </div>
        
        <h1 className="text-3xl font-bold mb-8">Ladda ner Instagram-bilder</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {images.map((image) => (
            <Card key={image.filename}>
              <CardHeader>
                <CardTitle className="text-lg">{image.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <img 
                  src={image.src} 
                  alt={image.name} 
                  className="w-full rounded-lg border"
                />
                <Button 
                  onClick={() => handleDownload(image.src, image.filename)}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Ladda ner
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DownloadImages;
