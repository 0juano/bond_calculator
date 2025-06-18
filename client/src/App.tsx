import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/layouts/AppLayout";
import BondBuilder from "@/pages/bond-builder";
import BondCalculator from "@/pages/bond-calculator";
import NotFound from "@/pages/not-found";
import RouterTest from "@/pages/router-test";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={BondCalculator} />
        <Route path="/builder" component={BondBuilder} />
        <Route path="/calculator/:bondId?" component={BondCalculator} />
        <Route path="/router-test" component={RouterTest} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300} skipDelayDuration={0}>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
