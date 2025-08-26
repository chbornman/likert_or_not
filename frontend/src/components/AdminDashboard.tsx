import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileSpreadsheet, Upload, Download, FileJson, Edit, Copy, Trash2, Archive, Eye, EyeOff, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

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
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  
  // Dialog states
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<{ id: string; title: string; responseCount?: number } | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{ formId: string; newStatus: string } | null>(null);

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
      // First, get all forms
      const formsRes = await fetch('/api/forms');
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

  const handleCloneClick = (formId: string, formTitle: string) => {
    setSelectedForm({ id: formId, title: formTitle });
    setCloneDialogOpen(true);
  };

  const cloneForm = async () => {
    if (!selectedForm) return;
    
    try {
      const response = await fetch(`/api/admin/forms/${selectedForm.id}/clone?token=${token}`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to clone form');
      }
      
      const result = await response.json();
      toast({
        title: "Form cloned successfully",
        description: `Created "${result.title}"`,
        variant: "success",
      });
      
      // Refresh the forms list
      await fetchDashboardData(token!);
      setCloneDialogOpen(false);
    } catch (error) {
      console.error('Clone error:', error);
      toast({
        title: "Failed to clone form",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStatusClick = (formId: string, newStatus: string) => {
    setPendingStatusChange({ formId, newStatus });
    setStatusDialogOpen(true);
  };

  const updateFormStatus = async () => {
    if (!pendingStatusChange) return;
    
    try {
      const response = await fetch(`/api/admin/forms/${pendingStatusChange.formId}/status?token=${token}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: pendingStatusChange.newStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update form status');
      }
      
      toast({
        title: "Status updated",
        description: `Form status changed to ${pendingStatusChange.newStatus}`,
        variant: "success",
      });
      
      // Refresh the forms list
      await fetchDashboardData(token!);
      setStatusDialogOpen(false);
    } catch (error) {
      console.error('Status update error:', error);
      toast({
        title: "Failed to update form status",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusMessage = () => {
    if (!pendingStatusChange) return '';
    
    const statusMessages = {
      published: 'Publishing this form will make it available to users.',
      finished: 'Marking this form as finished will stop accepting new responses but keep it visible.',
      archived: 'Archiving this form will hide it completely from users.',
      draft: 'Moving this form to draft will hide it from users.'
    };
    
    return statusMessages[pendingStatusChange.newStatus as keyof typeof statusMessages] || '';
  };

  const handleDeleteClick = (formId: string, formTitle: string, responseCount?: number) => {
    setSelectedForm({ id: formId, title: formTitle, responseCount });
    setDeleteDialogOpen(true);
  };

  const deleteForm = async () => {
    if (!selectedForm) return;
    
    try {
      const response = await fetch(`/api/admin/forms/${selectedForm.id}?token=${token}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete form');
      }
      
      toast({
        title: "Form deleted",
        description: `"${selectedForm.title}" has been deleted successfully`,
        variant: "success",
      });
      
      // Refresh the forms list
      await fetchDashboardData(token!);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Failed to delete form",
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: "destructive",
      });
    }
  };

  const exportFormAsJSON = async (formId: string, formTitle: string) => {
    try {
      // Fetch full form data
      const formRes = await fetch(`/api/forms/${formId}`);
      if (!formRes.ok) throw new Error('Failed to load form');
      const formData = await formRes.json();
      
      // Transform to import format
      const exportData = {
        id: formData.id,
        title: formData.title,
        description: formData.description,
        welcome_message: formData.welcome_message,
        closing_message: formData.closing_message,
        status: formData.status || 'draft',
        settings: formData.settings || {},
        sections: formData.sections.map((section: any) => ({
          id: section.id,
          title: section.title,
          description: section.description,
          position: section.position,
          questions: section.questions.map((q: any) => ({
            id: q.id,
            title: q.title,
            question_type: q.type,
            is_required: q.features?.required || false,
            allow_comment: q.features?.allowComment || false,
            help_text: q.description || '',
            position: q.position,
            placeholder: q.features?.placeholder,
            charLimit: q.features?.charLimit,
            rows: q.features?.rows
          }))
        }))
      };
      
      // Download as JSON
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `${formId}-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast({
        title: "Form exported",
        description: `Downloaded ${formTitle} as JSON`,
        variant: "success",
      });
    } catch (error) {
      console.error('Failed to export form:', error);
      toast({
        title: "Export failed",
        description: "Failed to export form. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportFormToExcel = async (formId: string, formTitle: string) => {
    try {
      // Fetch full form data
      const formRes = await fetch(`/api/forms/${formId}`);
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
      
      const s2ab = (s: string) => {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
        return buf;
      };
      
      const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formId}-quick-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Excel exported",
        description: `Downloaded ${formTitle} data as Excel`,
        variant: "success",
      });
    } catch (error) {
      console.error('Failed to export Excel:', error);
      toast({
        title: "Export failed",
        description: "Failed to export Excel file. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Show password form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/20 flex items-center justify-center px-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardHeader className="bg-gradient-to-r from-cambridge-blue to-cerulean text-white">
            <CardTitle className="text-2xl">Admin Access</CardTitle>
            <CardDescription className="text-white/90">
              Enter your admin password to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password" className="text-gray-800 font-semibold">
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
        <div className="text-lg text-gray-800">Loading dashboard...</div>
      </div>
    );
  }

  // Don't show error state for "Failed to load forms" - just show empty state
  if (error && error !== 'Failed to load forms') {
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
              className="mt-4 bg-gray-800 hover:bg-gray-700"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const downloadTemplate = async () => {
    try {
      // Fetch the template from the backend
      const response = await fetch('/api/template');
      if (!response.ok) {
        throw new Error('Failed to fetch template');
      }
      
      const template = await response.json();
      
      // Create and download the JSON file
      const dataStr = JSON.stringify(template, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = 'form-template.json';
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.style.display = 'none';
      document.body.appendChild(linkElement);
      
      linkElement.click();
      
      document.body.removeChild(linkElement);
      
      toast({
        title: "Template Downloaded",
        description: "The comprehensive form template has been downloaded.",
      });
    } catch (error) {
      console.error('Error downloading template:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the template. Please try again.",
        variant: "destructive",
      });
    }
  };

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

      let result;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        // If not JSON, get the text response
        const text = await response.text();
        result = { error: text };
      }
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to import form');
      }

      setUploadSuccess(`Form "${config.title}" imported successfully!`);
      // Refresh the forms list after a short delay to ensure DB is updated
      setTimeout(async () => {
        await fetchDashboardData(token!);
        setUploadSuccess('');
      }, 1500);
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
    <div className="min-h-screen bg-gradient-to-b from-white via-cerulean/10 to-cerulean/20 py-4 sm:py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">Admin Dashboard</h1>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              id="form-upload"
            />
            <Button
              onClick={() => navigate('/admin/forms/new')}
              className="bg-cerulean hover:bg-cerulean/90 text-white flex-1 sm:flex-initial"
            >
              <Plus className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Create Form</span>
              <span className="sm:hidden">Create</span>
            </Button>
            <Button
              onClick={downloadTemplate}
              variant="outline"
              className="bg-white border-cambridge-blue text-cambridge-blue hover:bg-cambridge-blue hover:text-white flex-1 sm:flex-initial"
            >
              <Download className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Template</span>
              <span className="sm:hidden">Template</span>
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-initial"
            >
              <Upload className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Import</span>
              <span className="sm:hidden">Import</span>
            </Button>
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="border-gray-800 text-gray-800 hover:bg-gray-800 hover:text-white flex-1 sm:flex-initial"
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

        {/* Status Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 sm:space-x-8">
            <button
              onClick={() => setActiveTab('active')}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'active'
                  ? 'border-cerulean text-cerulean'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className="hidden sm:inline">Active Forms</span>
              <span className="sm:hidden">Active</span>
              {forms.filter(f => f.status !== 'archived').length > 0 && (
                <span className={`ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs rounded-full ${
                  activeTab === 'active'
                    ? 'bg-cerulean text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {forms.filter(f => f.status !== 'archived').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('archived')}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'archived'
                  ? 'border-cerulean text-cerulean'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className="hidden sm:inline">Archived</span>
              <span className="sm:hidden">Archived</span>
              {forms.filter(f => f.status === 'archived').length > 0 && (
                <span className={`ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs rounded-full ${
                  activeTab === 'archived'
                    ? 'bg-cerulean text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {forms.filter(f => f.status === 'archived').length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {(() => {
          const filteredForms = activeTab === 'active' 
            ? forms.filter(f => f.status !== 'archived')  // draft, published, and finished are all "active"
            : forms.filter(f => f.status === 'archived');
          
          if (forms.length === 0) {
            return (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="text-center py-12">
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 text-lg font-medium mb-2">No forms available yet</p>
              <p className="text-gray-500 mb-6">Get started by downloading a template or importing a form configuration</p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={downloadTemplate}
                  variant="outline"
                  className="bg-white border-cambridge-blue text-cambridge-blue hover:bg-cambridge-blue hover:text-white"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Form
                </Button>
              </div>
              <p className="text-gray-400 text-sm mt-4">
                Download the template, customize it with your questions, then import it back
              </p>
            </CardContent>
              </Card>
            );
          }
          
          if (filteredForms.length === 0) {
            return (
              <Card className="border-2 border-dashed border-gray-300">
                <CardContent className="text-center py-12">
                  <p className="text-gray-500">No {activeTab} forms</p>
                </CardContent>
              </Card>
            );
          }
          
          const selectedForm = forms.find(f => f.id === selectedFormId);
          const selectedStats = selectedFormId ? formStats.get(selectedFormId) : null;
          const selectedResponseCount = selectedStats?.response_count || 0;
          
          return (
            <div className="space-y-4">
              {/* Persistent Action Bar - Always visible, like Google Drive */}
              <Card className="p-3 border-b-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-4">
                    {selectedForm && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800 line-clamp-1">{selectedForm.title}</h3>
                        <p className="text-xs text-gray-500">
                          {selectedResponseCount} responses
                        </p>
                      </div>
                    )}
                    {!selectedForm && (
                      <p className="text-sm text-gray-500">Select a form to perform actions</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Button 
                      className={`text-xs sm:text-sm ${
                        selectedForm 
                          ? 'bg-gradient-to-r from-cerulean to-cambridge-blue hover:from-cerulean/90 hover:to-cambridge-blue/90 text-white' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      onClick={() => selectedForm && navigateToFormResults(selectedForm.id)}
                      disabled={!selectedForm}
                    >
                      <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">View Results</span>
                      <span className="sm:hidden">Results</span>
                    </Button>
                    <Button
                      variant="outline"
                      className={`text-xs sm:text-sm ${
                        selectedForm && selectedForm.status !== 'archived'
                          ? 'border-cambridge-blue text-cambridge-blue hover:bg-cambridge-blue hover:text-white'
                          : 'border-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                      onClick={() => selectedForm && navigate(`/admin/forms/${selectedForm.id}/edit`)}
                      disabled={!selectedForm || selectedForm?.status === 'archived'}
                    >
                      <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      Edit
                    </Button>
                    
                    <div className="h-6 w-px bg-gray-300 mx-1 hidden sm:block" />
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-8 w-8 sm:h-10 sm:w-10 ${selectedForm ? '' : 'text-gray-400 cursor-not-allowed'}`}
                      onClick={() => selectedForm && exportFormAsJSON(selectedForm.id, selectedForm.title)}
                      disabled={!selectedForm}
                      title="Export as JSON"
                    >
                      <FileJson className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-8 w-8 sm:h-10 sm:w-10 ${selectedForm ? '' : 'text-gray-400 cursor-not-allowed'}`}
                      onClick={() => selectedForm && exportFormToExcel(selectedForm.id, selectedForm.title)}
                      disabled={!selectedForm}
                      title="Export Excel"
                    >
                      <FileSpreadsheet className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-8 w-8 sm:h-10 sm:w-10 ${selectedForm ? '' : 'text-gray-400 cursor-not-allowed'}`}
                      onClick={() => selectedForm && handleCloneClick(selectedForm.id, selectedForm.title)}
                      disabled={!selectedForm}
                      title="Clone Form"
                    >
                      <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                    
                    <div className="h-6 w-px bg-gray-300 mx-1" />
                    
                    {/* Status change buttons - show the relevant ones based on current status */}
                    {selectedForm?.status === 'draft' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleStatusClick(selectedForm.id, 'published')}
                        title="Publish Form"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    {selectedForm?.status === 'published' && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleStatusClick(selectedForm.id, 'finished')}
                          title="Mark as Finished"
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleStatusClick(selectedForm.id, 'draft')}
                          title="Move to Draft"
                        >
                          <EyeOff className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {selectedForm?.status === 'finished' && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleStatusClick(selectedForm.id, 'published')}
                          title="Reopen Form"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleStatusClick(selectedForm.id, 'archived')}
                          title="Archive Form"
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {selectedForm?.status === 'archived' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleStatusClick(selectedForm.id, 'draft')}
                        title="Move to Draft"
                      >
                        <EyeOff className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <div className="h-6 w-px bg-gray-300 mx-1" />
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => selectedForm && handleDeleteClick(selectedForm.id, selectedForm.title, selectedResponseCount)}
                      disabled={!selectedForm}
                      title="Delete Form"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
              
              {/* Mobile Card View (shown on small screens) */}
              <div className="sm:hidden space-y-3">
                {filteredForms.map(form => {
                  const stats = formStats.get(form.id);
                  const responseCount = stats?.response_count || 0;
                  const lastResponse = stats?.last_response;
                  const isSelected = selectedFormId === form.id;
                  
                  return (
                    <Card 
                      key={form.id}
                      onClick={() => setSelectedFormId(isSelected ? null : form.id)}
                      className={`cursor-pointer transition-all ${
                        isSelected 
                          ? 'ring-2 ring-cerulean bg-cerulean/5' 
                          : 'hover:shadow-md'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 line-clamp-2">
                              {form.title}
                            </h3>
                            {form.description && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                {form.description}
                              </p>
                            )}
                          </div>
                          <span className={`ml-2 inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${
                            form.status === 'published' 
                              ? 'bg-green-100 text-green-800' 
                              : form.status === 'draft'
                              ? 'bg-gray-100 text-gray-600'
                              : form.status === 'finished'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {form.status}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{responseCount} responses</span>
                          <span>
                            {lastResponse 
                              ? `Last: ${new Date(lastResponse).toLocaleDateString()}` 
                              : 'No responses'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop Table View (hidden on small screens) */}
              <Card className="hidden sm:block">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Form Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Responses
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Response
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Updated
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredForms.map(form => {
                        const stats = formStats.get(form.id);
                        const responseCount = stats?.response_count || 0;
                        const lastResponse = stats?.last_response;
                        const isSelected = selectedFormId === form.id;
                        
                        return (
                          <tr 
                            key={form.id}
                            onClick={() => setSelectedFormId(isSelected ? null : form.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-cerulean/10' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {form.title}
                                </div>
                                {form.description && (
                                  <div className="text-sm text-gray-500">
                                    {form.description}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex text-xs font-medium px-2.5 py-0.5 rounded-full ${
                                form.status === 'published' 
                                  ? 'bg-green-100 text-green-800' 
                                  : form.status === 'draft'
                                  ? 'bg-gray-100 text-gray-600'
                                  : form.status === 'finished'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {form.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="text-sm font-semibold text-gray-900">
                                {responseCount}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {lastResponse 
                                ? new Date(lastResponse).toLocaleDateString() 
                                : '—'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(form.updated_at).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredForms.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No forms to display
                    </div>
                  )}
                </div>
              </Card>
            </div>
          );
        })()}
      </div>
      
      {/* Clone Dialog */}
      <AlertDialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clone Form</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clone "{selectedForm?.title}"? This will create a duplicate of the form with all its questions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={cloneForm}>Clone</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Form</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {selectedForm?.responseCount && selectedForm.responseCount > 0 ? (
                  <div className="space-y-3">
                    <p className="text-red-600 font-semibold">
                      ⚠️ Warning: This form has {selectedForm.responseCount} response{selectedForm.responseCount > 1 ? 's' : ''}.
                    </p>
                    <p>
                      Are you sure you want to delete "{selectedForm?.title}"? This will permanently delete:
                    </p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li>The form and all its questions</li>
                      <li>All {selectedForm.responseCount} submitted response{selectedForm.responseCount > 1 ? 's' : ''}</li>
                      <li>All associated data</li>
                    </ul>
                    <p className="font-semibold text-red-600">
                      This action cannot be undone!
                    </p>
                  </div>
                ) : (
                  <p>
                    Are you sure you want to delete "{selectedForm?.title}"? This will permanently delete the form and all its questions. This action cannot be undone.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteForm}
              className="bg-red-600 hover:bg-red-700"
            >
              {selectedForm?.responseCount && selectedForm.responseCount > 0 
                ? `Delete Form and ${selectedForm.responseCount} Response${selectedForm.responseCount > 1 ? 's' : ''}`
                : 'Delete Form'
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Status Change Dialog */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Form Status</AlertDialogTitle>
            <AlertDialogDescription>
              {getStatusMessage()} Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={updateFormStatus}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}