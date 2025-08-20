import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient, Form } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from './Logo';

export default function FormList() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadForms = async () => {
      try {
        const formList = await apiClient.listForms();
        // Filter to only show published forms
        const publishedForms = formList.filter(f => f.status === 'published');
        
        // If there's only one form, redirect directly to it
        if (publishedForms.length === 1) {
          window.location.href = `/form/${publishedForms[0].id}`;
          return;
        }
        
        setForms(publishedForms);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load forms');
      } finally {
        setLoading(false);
      }
    };

    loadForms();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading forms...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No forms available at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF5E1] via-[#FFEFD5] to-[#FFE4C4] py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col items-center mb-8">
          <Logo className="w-32 h-32 mb-4" />
          <h1 className="text-3xl font-bold text-[#1E5C8B] mb-2">Available Forms</h1>
          <p className="text-gray-600 text-center">Select a form below to begin</p>
        </div>
        
        <div className="space-y-4">
          {forms.map(form => (
            <Link
              key={form.id}
              to={`/form/${form.id}`}
              className="block group"
            >
              <Card className="shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 border-[#A4C2A8]/30">
                <CardHeader className="bg-gradient-to-r from-[#1E5C8B]/10 to-[#005EB8]/10">
                  <CardTitle className="text-xl text-[#1E5C8B] group-hover:text-[#005EB8] transition-colors">
                    {form.title}
                  </CardTitle>
                  {form.description && (
                    <CardDescription className="text-gray-600 mt-2">
                      {form.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    {form.settings.estimatedTime && (
                      <p className="text-sm text-gray-500">
                        <span className="inline-flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {form.settings.estimatedTime}
                        </span>
                      </p>
                    )}
                    <span className="text-[#7FB069] group-hover:text-[#6FA058] transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}