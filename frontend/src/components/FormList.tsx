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
        // Filter to show published and finished forms (not draft or archived)
        const visibleForms = formList.filter(f => f.status === 'published' || f.status === 'finished');
        
        // If there's only one published form (not finished), redirect directly to it
        const publishedOnly = visibleForms.filter(f => f.status === 'published');
        if (publishedOnly.length === 1 && visibleForms.length === 1) {
          window.location.href = `/form/${publishedOnly[0].id}`;
          return;
        }
        
        setForms(visibleForms);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cerulean mx-auto"></div>
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
    <div className="min-h-screen bg-stone-300 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex flex-col items-center mb-8">
          <Logo className="w-32 h-32 mb-4" />
          <h1 className="text-3xl font-bold text-gunmetal mb-2">Available Forms</h1>
          <p className="text-gray-600 text-center">Select a form below to begin</p>
        </div>
        
        <div className="space-y-4">
          {forms.map(form => {
            const isFinished = form.status === 'finished';
            
            if (isFinished) {
              return (
                <div
                  key={form.id}
                  className="block opacity-75 cursor-not-allowed"
                >
                <Card className={`shadow-lg ${!isFinished ? 'hover:shadow-xl transform hover:-translate-y-1' : ''} transition-all duration-200 border-green-400/30`}>
                  <CardHeader className={`bg-gradient-to-r ${isFinished ? 'from-gray-400/10 to-gray-300/10' : 'from-cerulean/10 to-cambridge-blue/10'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className={`text-xl ${isFinished ? 'text-gray-600' : 'text-gunmetal group-hover:text-cerulean'} transition-colors`}>
                          {form.title}
                        </CardTitle>
                        {form.description && (
                          <CardDescription className="text-gray-600 mt-2">
                            {form.description}
                          </CardDescription>
                        )}
                      </div>
                      {isFinished && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Closed
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {isFinished ? (
                          <p className="text-sm text-gray-500 font-medium">
                            This form is no longer accepting responses
                          </p>
                        ) : form.settings?.estimatedTime ? (
                          <p className="text-sm text-gray-500">
                            <span className="inline-flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {form.settings.estimatedTime}
                            </span>
                          </p>
                        ) : null}
                      </div>
                      {!isFinished && (
                        <span className="text-green-600 group-hover:text-green-700 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
            }
            
            return (
              <Link
                key={form.id}
                to={`/form/${form.id}`}
                className="block group"
              >
                <Card className={`shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 border-green-400/30`}>
                  <CardHeader className={`bg-gradient-to-r from-cerulean/10 to-cambridge-blue/10`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className={`text-xl text-gunmetal group-hover:text-cerulean transition-colors`}>
                          {form.title}
                        </CardTitle>
                        {form.description && (
                          <CardDescription className="text-gray-600 mt-2">
                            {form.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {form.settings?.estimatedTime ? (
                          <p className="text-sm text-gray-500">
                            <span className="inline-flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {form.settings.estimatedTime}
                            </span>
                          </p>
                        ) : null}
                      </div>
                      <span className="text-green-600 group-hover:text-green-700 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}