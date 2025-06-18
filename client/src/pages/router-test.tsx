import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

export default function RouterTest() {
  return (
    <div className="max-w-4xl mx-auto mt-8">
      <Card className="bg-gray-900/50 border-green-900/30">
        <CardHeader>
          <CardTitle className="text-green-400">🚀 Universal Router Architecture - Test Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-gray-400">
            <p className="mb-4">✅ Router architecture successfully updated:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>AppLayout wrapper</strong>: All routes now inherit the universal top bar</li>
              <li><strong>No duplicate headers</strong>: Pages only contain pure content</li>
              <li><strong>Consistent spacing</strong>: All pages use pt-[var(--topbar-h)] from AppLayout</li>
              <li><strong>Clean page components</strong>: Removed min-h-screen and bg-gradient classes</li>
            </ul>
          </div>
          
          <div className="mt-6 p-4 bg-green-900/10 border border-green-900/30 rounded">
            <p className="text-green-400 font-mono text-sm mb-2">✅ Phase 1 Complete - Test New Routing:</p>
            <div className="flex gap-4 flex-wrap">
              <Link href="/">
                <a className="text-blue-400 hover:text-blue-300 underline">Calculator (NEW default /)</a>
              </Link>
              <Link href="/builder">
                <a className="text-blue-400 hover:text-blue-300 underline">Bond Builder (/builder)</a>
              </Link>
              <Link href="/calculator/bond_1749486682344_9sgdd0cou">
                <a className="text-blue-400 hover:text-blue-300 underline">Calculator with bond ID</a>
              </Link>
              <Link href="/nonexistent">
                <a className="text-blue-400 hover:text-blue-300 underline">404 Test</a>
              </Link>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-green-800/20 border border-green-600/30 rounded">
            <p className="text-green-300 text-sm font-mono">
              🎉 Phase 1 COMPLETED: Calculator is now the default landing page!
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Next: Phase 2 - Update navigation flow between Calculator & Builder
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}