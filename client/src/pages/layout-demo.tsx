import { AppLayout } from "@/layouts/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LayoutDemo() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto mt-8">
        <Card className="bg-gray-900/50 border-green-900/30">
          <CardHeader>
            <CardTitle className="text-green-400">Universal Top Bar Demo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-gray-400">
              <p className="mb-4">✅ The universal top bar is now implemented with:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>48px (3rem) height on desktop, 40px (2.5rem) on mobile</li>
                <li>Translucent background with backdrop blur</li>
                <li>Fixed position that stays on top when scrolling</li>
                <li>Navigation links with active state highlighting</li>
                <li>Terminal/Bloomberg aesthetic with green accents</li>
                <li>Content area properly offset using pt-[var(--topbar-h)]</li>
              </ul>
            </div>
            
            <div className="mt-6 p-4 bg-green-900/10 border border-green-900/30 rounded">
              <p className="text-green-400 font-mono text-sm">
                Next steps: Update the router to use AppLayout as the wrapper for all routes
              </p>
            </div>
            
            <div className="mt-4">
              <p className="text-gray-500 text-sm">
                Scroll down to see the fixed header in action...
              </p>
            </div>
            
            {/* Add some content to enable scrolling */}
            {Array.from({ length: 20 }, (_, i) => (
              <div key={i} className="py-2 border-b border-gray-800">
                <p className="text-gray-600">Line {i + 1} - The top bar stays fixed while scrolling</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}