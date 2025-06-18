import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Smartphone, Calculator } from 'lucide-react';

export const MobileGuard: React.FC = () => {
  const [, setLocation] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-var(--topbar-h))] text-center px-6 gap-6 animate-in fade-in-50 duration-500">
      <div className="relative">
        <Smartphone size={48} className="text-terminal-accent" />
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-terminal-warn rounded-full flex items-center justify-center">
          <span className="text-xs text-white font-bold">✕</span>
        </div>
      </div>
      
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-terminal-accent">Use a larger screen</h2>
        <p className="text-sm text-terminal-txt/70 max-w-sm">
          Bond Builder is optimised for larger screens.<br />
          Please open this page on a laptop or desktop.
        </p>
      </div>
      
      <div className="space-y-3">
        <Button 
          onClick={() => setLocation('/calculator')}
          className="bg-terminal-accent text-terminal-bg hover:bg-terminal-accent/90 font-medium px-6 touch-target"
          size="lg"
        >
          <Calculator className="w-4 h-4 mr-2" />
          Back to Calculator
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => setLocation('/')}
          className="border-terminal-line text-terminal-txt hover:bg-terminal-panel px-6 touch-target"
          size="lg"
        >
          Back to Home
        </Button>
      </div>
      
      <div className="text-xs text-terminal-txt/50 mt-8">
        <p>Screen width: {typeof window !== 'undefined' ? window.innerWidth : 0}px</p>
        <p>Builder requires: 768px minimum</p>
      </div>
    </div>
  );
};