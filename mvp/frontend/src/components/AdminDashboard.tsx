import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Form {
  id: string;
  title: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface FormStats {
  form_id: string;
  response_count: number;
  last_response?: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [token, setToken] = useState<string | null>(null);
  
  const [forms, setForms] = useState<Form[]>([]);
  const [formStats, setFormStats] = useState<Map<string, FormStats>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if there's a saved token in sessionStorage
    const savedToken = sessionStorage.getItem('admin_token');
    if (savedToken) {
      setToken(savedToken);
      setIsAuthenticated(true);
      setLoading(true);
      fetchDashboardData(savedToken);
    }
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    // Use the password as the token directly
    setToken(password);
    setIsAuthenticated(true);
    setLoading(true);
    
    // Try to fetch data with this token
    fetchDashboardData(password);
  };

  const fetchDashboardData = async (authToken: string) => {
    try {
      // First, get all forms using the v2 API
      const formsRes = await fetch('/api/v2/forms');
      if (!formsRes.ok) {
        throw new Error('Failed to load forms');
      }
      const formsData = await formsRes.json();
      setForms(formsData);

      // Then get stats for each form
      const statsPromises = formsData.map(async (form: Form) => {
        try {
          const statsRes = await fetch(`/api/admin/stats?token=${authToken}&form_id=${form.id}`);
          if (statsRes.ok) {
            const stats = await statsRes.json();
            return {
              form_id: form.id,
              response_count: stats.total_responses || 0,
              last_response: stats.recent_responses?.[0]?.submitted_at
            };
          }
        } catch {
          // If stats fail for a form, just return 0 responses
        }
        return {
          form_id: form.id,
          response_count: 0
        };
      });

      const allStats = await Promise.all(statsPromises);
      const statsMap = new Map(allStats.map(s => [s.form_id, s]));
      setFormStats(statsMap);
      
      // Save successful token
      sessionStorage.setItem('admin_token', authToken);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      if (errorMessage.includes('401') || errorMessage === 'Invalid password') {
        setAuthError('Invalid password. Please try again.');
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_token');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setToken(null);
    setPassword('');
    setForms([]);
    setFormStats(new Map());
  };

  const navigateToFormResults = (formId: string) => {
    // Navigate to form-specific results page, passing the token
    navigate(`/admin/forms/${formId}`, { state: { token } });
  };

  // Show password form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="bg-gradient-to-r from-cambridge-blue to-cerulean text-white">
            <CardTitle className="text-2xl">Admin Access</CardTitle>
            <CardDescription className="text-cream/90">
              Enter your admin password to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password" className="text-gunmetal font-semibold">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="mt-2 border-2 border-cambridge-blue/30 focus:border-cerulean bg-white/80 focus:bg-white"
                  autoFocus
                />
              </div>
              {authError && (
                <p className="text-rose-quartz text-sm font-medium">{authError}</p>
              )}
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-cerulean to-cambridge-blue hover:from-cerulean/90 hover:to-cambridge-blue/90 text-white"
                disabled={!password.trim()}
              >
                Access Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 flex items-center justify-center">
        <div className="text-lg text-gunmetal">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button 
              onClick={handleLogout} 
              className="mt-4 bg-gunmetal hover:bg-gunmetal/90"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gunmetal">Admin Dashboard</h1>
          <Button 
            onClick={handleLogout}
            variant="outline"
            className="border-gunmetal text-gunmetal hover:bg-gunmetal hover:text-white"
          >
            Logout
          </Button>
        </div>

        {forms.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No forms available</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {forms.map(form => {
              const stats = formStats.get(form.id);
              const responseCount = stats?.response_count || 0;
              const lastResponse = stats?.last_response;
              
              return (
                <Card 
                  key={form.id} 
                  className="hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => navigateToFormResults(form.id)}
                >
                  <CardHeader className="bg-gradient-to-r from-cambridge-blue/10 to-cerulean/10">
                    <CardTitle className="text-lg">{form.title}</CardTitle>
                    {form.description && (
                      <CardDescription className="mt-2">
                        {form.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className={`text-sm font-medium px-2 py-1 rounded ${
                          form.status === 'published' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {form.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Responses:</span>
                        <span className="text-sm font-bold text-gunmetal">
                          {responseCount}
                        </span>
                      </div>
                      {lastResponse && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Last response:</span>
                          <span className="text-sm text-gray-700">
                            {new Date(lastResponse).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button 
                      className="w-full mt-4 bg-gradient-to-r from-cerulean to-cambridge-blue hover:from-cerulean/90 hover:to-cambridge-blue/90 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToFormResults(form.id);
                      }}
                    >
                      View Results
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}