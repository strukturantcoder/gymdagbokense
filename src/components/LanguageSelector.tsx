import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

const LanguageSelector = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'sv' ? 'en' : 'sv';
    i18n.changeLanguage(newLang);
  };

  return (
    <Button 
      variant="ghost" 
      size="icon"
      onClick={toggleLanguage}
      className="relative w-9 h-9 rounded-full overflow-hidden"
      title={i18n.language === 'sv' ? 'Switch to English' : 'Byt till svenska'}
    >
      {i18n.language === 'sv' ? (
        // Swedish flag
        <svg viewBox="0 0 32 20" className="w-6 h-4 rounded-sm">
          <rect width="32" height="20" fill="#005BAA" />
          <rect x="10" width="4" height="20" fill="#FECC00" />
          <rect y="8" width="32" height="4" fill="#FECC00" />
        </svg>
      ) : (
        // UK flag
        <svg viewBox="0 0 60 30" className="w-6 h-4 rounded-sm">
          <clipPath id="s">
            <path d="M0,0 v30 h60 v-30 z" />
          </clipPath>
          <clipPath id="t">
            <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
          </clipPath>
          <g clipPath="url(#s)">
            <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
            <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
            <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4" />
            <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
            <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
          </g>
        </svg>
      )}
    </Button>
  );
};

export default LanguageSelector;
