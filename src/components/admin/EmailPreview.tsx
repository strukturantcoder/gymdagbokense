import { Card } from "@/components/ui/card";

interface AffiliateLink {
  id: string;
  label: string;
  url: string;
  imageUrl?: string;
}

interface EmailPreviewProps {
  subject: string;
  content: string;
  affiliateLinks?: AffiliateLink[];
}

export const EmailPreview = ({ subject, content, affiliateLinks = [] }: EmailPreviewProps) => {
  // Convert markdown-like syntax to HTML
  const formatContent = (text: string) => {
    if (!text) return "";
    
    let formatted = text;
    
    // Convert markdown links [text](url) to HTML links - use a more robust regex
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      return `<a href="${url}" style="color: #3b82f6; text-decoration: underline;">${linkText}</a>`;
    });
    
    // Convert bold and italic
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Convert newlines
    formatted = formatted.replace(/\n/g, '<br/>');
    
    return formatted;
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white text-black">
      {/* Email header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-center">
        <h1 className="text-2xl font-bold text-white">🏋️ Gymdagboken</h1>
      </div>

      {/* Email body */}
      <div className="p-6 space-y-4">
        {subject ? (
          <h2 className="text-xl font-semibold text-gray-800">{subject}</h2>
        ) : (
          <h2 className="text-xl font-semibold text-gray-400 italic">Ämne saknas...</h2>
        )}

        <div className="border-t pt-4">
          {content ? (
            <div 
              className="text-gray-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatContent(content) }}
            />
          ) : (
            <p className="text-gray-400 italic">Skriv innehåll för att se förhandsgranskning...</p>
          )}
        </div>

        {/* Sample stats section */}
        <div className="bg-gray-50 rounded-lg p-4 mt-6">
          <p className="text-sm text-gray-500 text-center">
            [Personlig statistik visas här för varje användare]
          </p>
        </div>

        {/* Affiliate Links Section */}
        {affiliateLinks.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <p className="text-sm text-gray-500 mb-3 text-center">Rekommendationer</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {affiliateLinks.map((link) => (
                <div 
                  key={link.id}
                  className="inline-block bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all"
                >
                  {link.label} →
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA Button */}
        <div className="text-center pt-4">
          <div className="inline-block bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold">
            Öppna Gymdagboken →
          </div>
        </div>
      </div>

      {/* Email footer */}
      <div className="bg-gray-100 p-4 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} Gymdagboken</p>
        <p className="text-xs mt-1">Du får detta mejl för att du har ett konto på Gymdagboken</p>
      </div>
    </div>
  );
};
