import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Download } from 'lucide-react';

interface Response {
  id: number;
  form_id: string;
  respondent_info: any;
  answers: any;
  submitted_at: string;
  completed: boolean;
}

interface Question {
  id: number;
  form_id: string;
  section_id: string;
  position: number;
  question_type: string;
  title: string;
  description?: string;
  features: any;
}

interface Section {
  id: string;
  title: string;
  description?: string;
  position: number;
}

interface Form {
  id: string;
  title: string;
  description?: string;
}

export default function FormResults() {
  const { formId } = useParams<{ formId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const token = location.state?.token;

  const [form, setForm] = useState<Form | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/admin');
      return;
    }
    fetchFormData();
  }, [formId, token]);

  const fetchFormData = async () => {
    try {
      setLoading(true);
      
      // Fetch form details with sections and questions
      const formRes = await fetch(`/api/v2/forms/${formId}`);
      if (!formRes.ok) throw new Error('Failed to load form');
      const formData = await formRes.json();
      
      // Extract form, sections, and questions from the response
      setForm({
        id: formData.id,
        title: formData.title,
        description: formData.description
      });

      // Extract sections and questions from the nested structure
      const allSections: Section[] = [];
      const allQuestions: Question[] = [];
      
      if (formData.sections) {
        formData.sections.forEach((section: any) => {
          allSections.push({
            id: section.id,
            title: section.title,
            description: section.description,
            position: section.position
          });
          
          if (section.questions) {
            section.questions.forEach((q: any) => {
              allQuestions.push(q);
            });
          }
        });
      }
      
      setSections(allSections.sort((a, b) => a.position - b.position));
      setQuestions(allQuestions.sort((a, b) => a.position - b.position));

      // Fetch responses
      const responsesRes = await fetch(`/api/admin/responses?token=${token}&form_id=${formId}`);
      if (!responsesRes.ok) {
        if (responsesRes.status === 401) {
          navigate('/admin');
          return;
        }
        throw new Error('Failed to load responses');
      }
      const responsesData = await responsesRes.json();
      setResponses(responsesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (responses.length === 0) return;

    // Create CSV headers
    const headers = ['Response ID', 'Submitted At', 'Completed'];
    
    // Add question headers
    questions.forEach(q => {
      headers.push(`Q${q.position}: ${q.title}`);
      if (q.question_type === 'likert' && q.features?.allowComment) {
        headers.push(`Q${q.position} Comment`);
      }
    });

    // Create CSV rows
    const rows = responses.map(response => {
      const row = [
        response.id,
        new Date(response.submitted_at).toLocaleString(),
        response.completed ? 'Yes' : 'No'
      ];

      // Add answers for each question
      questions.forEach(q => {
        const answer = response.answers[q.id];
        if (!answer) {
          row.push('');
          if (q.question_type === 'likert' && q.features?.allowComment) {
            row.push('');
          }
        } else {
          if (q.question_type === 'likert') {
            row.push(answer.likert_value || '');
            if (q.features?.allowComment) {
              row.push(answer.comment || '');
            }
          } else {
            row.push(answer.text_value || '');
          }
        }
      });

      return row;
    });

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => 
        typeof cell === 'string' && cell.includes(',') 
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell
      ).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formId}-responses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 flex items-center justify-center">
        <div className="text-lg text-gunmetal">Loading results...</div>
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
              onClick={() => navigate('/admin')} 
              className="mt-4 bg-gunmetal hover:bg-gunmetal/90"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin', { state: { token } })}
            className="mb-4 text-gunmetal hover:text-gunmetal/80"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gunmetal">{form?.title}</h1>
              {form?.description && (
                <p className="text-gray-600 mt-2">{form.description}</p>
              )}
            </div>
            <Button
              onClick={exportToCSV}
              disabled={responses.length === 0}
              className="bg-cerulean hover:bg-cerulean/90 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Responses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gunmetal">{responses.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Completed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {responses.filter(r => r.completed).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>In Progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {responses.filter(r => !r.completed).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Completion Rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cambridge-blue">
                {responses.length > 0 
                  ? `${Math.round((responses.filter(r => r.completed).length / responses.length) * 100)}%`
                  : '0%'
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Question Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Question Analysis</CardTitle>
            <CardDescription>
              Average responses and distribution for each question
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sections.map(section => {
              const sectionQuestions = questions.filter(q => q.section_id === section.id);
              if (sectionQuestions.length === 0) return null;

              return (
                <div key={section.id} className="mb-8 last:mb-0">
                  <h3 className="text-lg font-semibold text-gunmetal mb-4">
                    {section.title}
                  </h3>
                  <div className="space-y-4">
                    {sectionQuestions.map(question => {
                      const questionResponses = responses.map(r => r.answers[question.id]).filter(Boolean);
                      
                      if (question.question_type === 'likert') {
                        const values = questionResponses.map(a => a.likert_value).filter(v => v != null);
                        const average = values.length > 0 
                          ? (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2)
                          : 'N/A';
                        
                        const distribution = [1, 2, 3, 4, 5].map(val => ({
                          value: val,
                          count: values.filter(v => v === val).length
                        }));

                        return (
                          <div key={question.id} className="border-l-4 border-cambridge-blue/30 pl-4">
                            <p className="font-medium text-gunmetal mb-2">
                              {question.title}
                            </p>
                            <div className="flex items-center gap-6 text-sm">
                              <div>
                                <span className="text-gray-600">Average: </span>
                                <span className="font-bold text-cambridge-blue">{average}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Responses: </span>
                                <span className="font-bold">{values.length}</span>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                              {distribution.map(d => (
                                <div key={d.value} className="flex-1 text-center">
                                  <div 
                                    className="bg-cambridge-blue/20 rounded"
                                    style={{
                                      height: '40px',
                                      marginTop: `${40 - (d.count / Math.max(...distribution.map(x => x.count)) * 40)}px`
                                    }}
                                  />
                                  <div className="text-xs mt-1">{d.value}</div>
                                  <div className="text-xs text-gray-600">({d.count})</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      } else {
                        const textResponses = questionResponses.filter(a => a.text_value);
                        return (
                          <div key={question.id} className="border-l-4 border-cerulean/30 pl-4">
                            <p className="font-medium text-gunmetal mb-2">
                              {question.title}
                            </p>
                            <div className="text-sm">
                              <span className="text-gray-600">Responses: </span>
                              <span className="font-bold">{textResponses.length}</span>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Individual Responses */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Individual Responses</CardTitle>
            <CardDescription>
              Detailed view of all submitted responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {responses.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No responses yet</p>
            ) : (
              <div className="space-y-4">
                {responses.map(response => (
                  <Card key={response.id} className="border-cambridge-blue/20">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-sm font-medium">Response #{response.id}</span>
                          <span className={`ml-2 px-2 py-1 text-xs rounded ${
                            response.completed 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {response.completed ? 'Completed' : 'In Progress'}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {new Date(response.submitted_at).toLocaleString()}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const details = document.getElementById(`response-${response.id}`);
                          if (details) {
                            details.classList.toggle('hidden');
                          }
                        }}
                      >
                        View Details
                      </Button>
                      <div id={`response-${response.id}`} className="hidden mt-4 space-y-2">
                        {questions.map(q => {
                          const answer = response.answers[q.id];
                          if (!answer) return null;
                          
                          return (
                            <div key={q.id} className="text-sm">
                              <span className="font-medium">{q.title}: </span>
                              {q.question_type === 'likert' ? (
                                <>
                                  <span className="text-cambridge-blue">{answer.likert_value}</span>
                                  {answer.comment && (
                                    <span className="text-gray-600 ml-2">({answer.comment})</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-700">{answer.text_value}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}