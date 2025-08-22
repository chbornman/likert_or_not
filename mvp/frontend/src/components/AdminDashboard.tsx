import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileSpreadsheet, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  
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
    navigate('/');
  };

  const navigateToFormResults = (formId: string) => {
    // Navigate to form-specific results page, passing the token
    navigate(`/admin/forms/${formId}`, { state: { token } });
  };

  const exportFormToExcel = async (formId: string, formTitle: string) => {
    try {
      // Fetch full form data
      const formRes = await fetch(`/api/v2/forms/${formId}`);
      if (!formRes.ok) throw new Error('Failed to load form');
      const formData = await formRes.json();
      
      // Fetch responses
      const responsesRes = await fetch(`/api/admin/responses?token=${token}&form_id=${formId}`);
      if (!responsesRes.ok) throw new Error('Failed to load responses');
      const responsesData = await responsesRes.json();
      
      // Extract sections and questions
      const sections: any[] = [];
      const questions: any[] = [];
      
      if (formData.sections) {
        formData.sections.forEach((section: any) => {
          sections.push({
            id: section.id,
            title: section.title,
            description: section.description,
            position: section.position
          });
          
          if (section.questions) {
            section.questions.forEach((q: any) => {
              questions.push(q);
            });
          }
        });
      }
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      
      // Summary sheet
      const summaryData: any[][] = [];
      summaryData.push(['Form Summary Report']);
      summaryData.push(['']);
      summaryData.push(['Form Title:', formTitle]);
      summaryData.push(['Form ID:', formId]);
      summaryData.push(['Generated:', new Date().toLocaleString()]);
      summaryData.push(['']);
      summaryData.push(['Response Statistics']);
      summaryData.push(['Total Responses:', responsesData.length]);
      summaryData.push(['Completed:', responsesData.filter((r: any) => r.completed).length]);
      summaryData.push(['In Progress:', responsesData.filter((r: any) => !r.completed).length]);
      summaryData.push(['']);
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 25 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
      
      // Responses sheet
      if (responsesData.length > 0) {
        const headers = ['Response ID', 'Submitted At', 'Completed'];
        questions.forEach((q: any) => {
          headers.push(q.title);
        });
        
        const rows = responsesData.map((response: any) => {
          const row = [
            response.id,
            new Date(response.submitted_at).toLocaleString(),
            response.completed ? 'Yes' : 'No'
          ];
          
          questions.forEach((q: any) => {
            const answer = response.answers[q.id];
            if (!answer) {
              row.push('');
            } else if (q.question_type === 'likert') {
              row.push(answer.likert_value || '');
            } else {
              row.push(answer.text_value || '');
            }
          });
          
          return row;
        });
        
        const responseData = [headers, ...rows];
        const responseSheet = XLSX.utils.aoa_to_sheet(responseData);
        XLSX.utils.book_append_sheet(wb, responseSheet, 'Responses');
      }
      
      // Generate and download
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
      
      function s2ab(s: string) {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
        return buf;
      }
      
      const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formId}-quick-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export Excel:', error);
      alert('Failed to export Excel file. Please try again.');
    }
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setUploadSuccess('');

    if (!file.name.endsWith('.json')) {
      setUploadError('Please upload a JSON file');
      return;
    }

    try {
      const text = await file.text();
      const config = JSON.parse(text);

      const response = await fetch(`/api/admin/import-form?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to import form');
      }

      setUploadSuccess(`Form "${config.title}" imported successfully!`);
      // Refresh the forms list
      setTimeout(() => {
        fetchDashboardData(token!);
        setUploadSuccess('');
      }, 2000);
    } catch (error) {
      console.error('Import error:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to import form configuration');
    }

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gunmetal">Admin Dashboard</h1>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              id="form-upload"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Form
            </Button>
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="border-gunmetal text-gunmetal hover:bg-gunmetal hover:text-white"
            >
              Logout
            </Button>
          </div>
        </div>

        {uploadError && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {uploadError}
          </div>
        )}
        
        {uploadSuccess && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {uploadSuccess}
          </div>
        )}

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
                    <div className="flex gap-2 mt-4">
                      <Button 
                        className="flex-1 bg-gradient-to-r from-cerulean to-cambridge-blue hover:from-cerulean/90 hover:to-cambridge-blue/90 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToFormResults(form.id);
                        }}
                      >
                        View Results
                      </Button>
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          exportFormToExcel(form.id, form.title);
                        }}
                        title="Quick Excel Export"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </Button>
                    </div>
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