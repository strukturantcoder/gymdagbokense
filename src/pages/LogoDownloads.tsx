import appIcon1024 from "@/assets/app-icon-1024.png";

const LogoDownloads = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold mb-8">Logo Downloads</h1>
      <div className="bg-card rounded-xl p-8 shadow-lg flex flex-col items-center gap-6 max-w-md w-full">
        <img
          src={appIcon1024}
          alt="Gymdagboken App Icon 1024x1024"
          className="w-64 h-64 rounded-2xl"
        />
        <p className="text-muted-foreground text-sm">1024 × 1024 px</p>
        <a
          href={appIcon1024}
          download="gymdagboken-icon-1024.png"
          className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition"
        >
          Ladda ner logga (1024×1024)
        </a>
      </div>
    </div>
  );
};

export default LogoDownloads;
