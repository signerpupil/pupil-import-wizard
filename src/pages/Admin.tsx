import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, LogOut, Home, Settings, Columns, FileCheck, Brain, Users, AlertCircle, ShieldAlert } from 'lucide-react';
import pupilLogo from '@/assets/pupil-logo.png';
import { AdminColumnDefinitions } from '@/components/admin/AdminColumnDefinitions';
import { AdminFormatRules } from '@/components/admin/AdminFormatRules';
import { AdminBusinessRules } from '@/components/admin/AdminBusinessRules';
import { AdminAISettings } from '@/components/admin/AdminAISettings';
import { AdminUserRoles } from '@/components/admin/AdminUserRoles';

export default function Admin() {
  const { user, isAdmin, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('columns');

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <ShieldAlert className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Zugriff verweigert</CardTitle>
            <CardDescription>
              Sie haben keine Administrator-Berechtigung.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Ihr Konto hat keine Admin-Rolle. Kontaktieren Sie einen Administrator, um Zugriff zu erhalten.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => navigate('/')}>
                <Home className="mr-2 h-4 w-4" />
                Zur Startseite
              </Button>
              <Button variant="ghost" className="flex-1" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-pupil-header text-pupil-header-foreground py-4 px-6 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={pupilLogo} alt="PUPIL Logo" className="h-8" />
            <div>
              <h1 className="text-xl font-bold">Admin-Bereich</h1>
              <p className="text-sm opacity-80">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-pupil-header-foreground hover:bg-white/10"
              onClick={() => navigate('/')}
            >
              <Home className="mr-2 h-4 w-4" />
              Import-Wizard
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-pupil-header-foreground hover:bg-white/10"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Abmelden
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="columns" className="flex items-center gap-2">
              <Columns className="h-4 w-4" />
              <span className="hidden sm:inline">Spalten</span>
            </TabsTrigger>
            <TabsTrigger value="format" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Format</span>
            </TabsTrigger>
            <TabsTrigger value="business" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Logik</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">KI</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Benutzer</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="columns">
            <AdminColumnDefinitions />
          </TabsContent>

          <TabsContent value="format">
            <AdminFormatRules />
          </TabsContent>

          <TabsContent value="business">
            <AdminBusinessRules />
          </TabsContent>

          <TabsContent value="ai">
            <AdminAISettings />
          </TabsContent>

          <TabsContent value="users">
            <AdminUserRoles />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
