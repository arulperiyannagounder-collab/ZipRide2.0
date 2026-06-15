const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/components/DashboardView.tsx',
  'src/components/BookingView.tsx',
  'src/components/DriverConsoleView.tsx',
  'src/components/RideHistoryView.tsx',
  'src/components/DisputesView.tsx',
  'src/components/FarePolicyView.tsx',
  'src/components/RideTrackerView.tsx',
  'src/components/LoginView.tsx',
  'src/components/ErrorBoundary.tsx',
  'src/components/NotFoundView.tsx',
  'src/components/LiveJourneyMap.tsx'
];

const baseDir = 'c:/Users/HEMANTH/Downloads/ZipRide';

const replacements = [
  // Specific complex matches
  [/\bbg-white\/60\b/g, 'bg-theme-card/60'],
  [/\bbg-white\/90\b/g, 'bg-theme-card/90'],
  [/\bbg-white\/95\b/g, 'bg-theme-card/95'],
  [/\bbg-slate-50\/80\b/g, 'bg-theme-bg/80'],
  [/\bbg-slate-50\/40\b/g, 'bg-theme-bg/40'],
  [/\bbg-slate-50\/50\b/g, 'bg-theme-bg/50'],
  [/\bbg-slate-100\/50\b/g, 'bg-theme-bg/50'],
  [/\bhover:bg-slate-50\/50\b/g, 'hover:bg-theme-hover-bg/50'],
  [/\bhover:bg-slate-100\/50\b/g, 'hover:bg-theme-hover-bg/50'],
  [/\bborder-slate-200\/80\b/g, 'border-theme-border/80'],
  [/\bborder-slate-200\/50\b/g, 'border-theme-border/50'],
  [/\bborder-slate-200\/40\b/g, 'border-theme-border/40'],
  [/\bborder-slate-200\/85\b/g, 'border-theme-border/85'],
  [/\bborder-slate-100\/90\b/g, 'border-theme-border/90'],
  [/\bborder-slate-100\/80\b/g, 'border-theme-border/80'],
  [/\bborder-slate-100\/50\b/g, 'border-theme-border/50'],
  [/\bdivide-slate-100\b/g, 'divide-theme-border'],
  [/\bdivide-slate-200\b/g, 'divide-theme-border'],
  
  // Backgrounds
  [/\bbg-white\b/g, 'bg-theme-card'],
  [/\bbg-slate-50\b/g, 'bg-theme-bg'],
  [/\bbg-slate-100\b/g, 'bg-theme-bg'],
  
  // Borders
  [/\bborder-slate-100\b/g, 'border-theme-border'],
  [/\bborder-slate-150\b/g, 'border-theme-border'],
  [/\bborder-slate-200\b/g, 'border-theme-border'],
  [/\bborder-slate-250\b/g, 'border-theme-border'],
  [/\bborder-slate-300\b/g, 'border-theme-border'],
  
  // Text Slate Primary/High Contrast
  [/\btext-slate-900\b/g, 'text-theme-text-primary'],
  [/\btext-slate-850\b/g, 'text-theme-text-primary'],
  [/\btext-slate-800\b/g, 'text-theme-text-primary'],
  [/\btext-slate-700\b/g, 'text-theme-text-primary'],
  
  // Text Slate Secondary
  [/\btext-slate-655\b/g, 'text-theme-text-secondary'],
  [/\btext-slate-650\b/g, 'text-theme-text-secondary'],
  [/\btext-slate-600\b/g, 'text-theme-text-secondary'],
  [/\btext-slate-500\b/g, 'text-theme-text-secondary'],
  [/\btext-slate-400\b/g, 'text-theme-text-secondary'],
  [/\btext-slate-350\b/g, 'text-theme-text-secondary'],
  
  // Hover and transitions
  [/\bhover:bg-slate-50\b/g, 'hover:bg-theme-hover-bg'],
  [/\bhover:bg-slate-100\b/g, 'hover:bg-theme-hover-bg']
];

filesToUpdate.forEach(file => {
  const filePath = path.join(baseDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`Processing ${file}...`);
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    replacements.forEach(([regex, replacement]) => {
      content = content.replace(regex, replacement);
    });
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${file}`);
    } else {
      console.log(`No changes for ${file}`);
    }
  } else {
    console.error(`File not found: ${filePath}`);
  }
});

console.log('Theme replacement script finished.');
