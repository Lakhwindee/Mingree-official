import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const stat = fs.statSync(dirPath);
    if (stat.isDirectory()) {
      walkDir(dirPath, callback);
    } else if (stat.isFile() && (f.endsWith('.tsx') || f.endsWith('.ts'))) {
      callback(dirPath);
    }
  });
}

const iconNames = new Set([
  'Shield', 'ShieldAlert', 'ShieldCheck', 'AlertTriangle', 'Users', 'Clock', 'RefreshCw', 'Filter', 'Search', 'Lock', 'Unlock', 'Activity', 'Layers', 'CheckCircle2', 'XCircle', 'FileText',
  'Building', 'Download', 'Plus', 'Receipt', 'ChevronRight', 'PlusCircle', 'X', 'Check', 'Calculator', 'User', 'Wallet', 'ArrowDownCircle', 'ArrowUpCircle', 'CheckCircle', 'CreditCard', 'Banknote', 'Building2', 'Trash2', 'AlertCircle', 'Globe', 'Ticket', 'Gift',
  'Mail', 'KeyRound', 'Sparkles', 'LogOut', 'ExternalLink', 'Camera', 'MapPin', 'Save', 'Edit3', 'HelpCircle', 'Crown', 'ChevronLeft', 'ChevronDown', 'ChevronUp', 'ArrowRight', 'ArrowLeft', 'PanelLeftIcon', 'GripVertical', 'Circle', 'Minus', 'Loader2', 'Loader2Icon', 'Film', 'BadgeCheck', 'Rocket', 'Upload', 'Star', 'Share2', 'Copy', 'Send', 'Info', 'Eye', 'EyeOff', 'Menu', 'Sliders', 'TrendingUp', 'DollarSign', 'Percent', 'Tag', 'Hash', 'Bookmark', 'Heart', 'MessageCircle', 'ThumbsUp', 'Calendar', 'Briefcase', 'Folder', 'File', 'Settings', 'Bell', 'UserCheck', 'UserPlus', 'UserX', 'UserMinus', 'UserCog', 'HelpCircle', 'Help', 'AlertOctagon', 'CheckSquare', 'Square', 'Radio', 'CheckCircle2'
]);

walkDir('./src', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Remove import lines from lucide-react
  const lucideRegex = /import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['"]lucide-react['"];?/g;
  if (lucideRegex.test(content)) {
    content = content.replace(lucideRegex, '');
    modified = true;
  }

  // Also remove specific icon element tags if any remain, e.g. <Shield className="..." /> or <Shield>...</Shield>
  for (const icon of iconNames) {
    // self-closing tag: <IconName ... />
    const selfClosingRegex = new RegExp(`<${icon}\\b[^>]*\\/?>`, 'g');
    if (selfClosingRegex.test(content)) {
      content = content.replace(selfClosingRegex, '');
      modified = true;
    }
    // wrapping tag: <IconName ...>...</IconName>
    const openingRegex = new RegExp(`<${icon}\\b[^>]*>`, 'g');
    const closingRegex = new RegExp(`</${icon}>`, 'g');
    if (openingRegex.test(content)) {
      content = content.replace(openingRegex, '').replace(closingRegex, '');
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cleaned icons from: ${filePath}`);
  }
});
console.log('Icon cleaning complete.');
