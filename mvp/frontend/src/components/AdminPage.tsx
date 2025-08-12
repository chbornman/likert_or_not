import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponseWithAnswers, Stats } from '@/types';

const questionSections = [
  { start: 1, end: 5, title: "Organizational Leadership" },
  { start: 5, end: 9, title: "Strategic Planning & Management" },
  { start: 9, end: 13, title: "Leadership & Governance" },
  { start: 13, end: 17, title: "Programming & Operations" },
  { start: 17, end: 21, title: "Fundraising & Financial Management" },
  { start: 21, end: 25, title: "Community Engagement & Advocacy" },
  { start: 25, end: 31, title: "Core Values" },
  { start: 31, end: 36, title: "Executive Competencies" },
  { start: 36, end: 41, title: "Overall Performance" },
];

export default function AdminPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [responses, setResponses] = useState<ResponseWithAnswers[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedResponse, setSelectedResponse] = useState<ResponseWithAnswers | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!token) {
      setError('Access token required');
      setLoading(false);
      return;
    }
    
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchData = async () => {
    try {
      const [responsesRes, statsRes] = await Promise.all([
        fetch(`/api/admin/responses?token=${token}`),
        fetch(`/api/admin/stats?token=${token}`),
      ]);

      if (!responsesRes.ok || !statsRes.ok) {
        throw new Error('Unauthorized or server error');
      }

      const [responsesData, statsData] = await Promise.all([
        responsesRes.json(),
        statsRes.json(),
      ]);

      setResponses(responsesData);
      setStats(statsData);
    } catch (err) {
      setError('Failed to load admin data. Check your access token.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    window.location.href = `/api/admin/export?token=${token}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 flex items-center justify-center">
        <div className="text-lg text-gunmetal">Loading admin dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 flex items-center justify-center">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 py-4 sm:py-8 px-0 sm:px-4">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex justify-between items-center mb-6 sm:mb-8 px-4 sm:px-0">
          <h1 className="text-2xl sm:text-4xl font-bold text-gunmetal">Admin Dashboard</h1>
          <Button 
            onClick={handleExport}
            className="bg-gradient-to-r from-cerulean to-cambridge-blue hover:from-cerulean/90 hover:to-cambridge-blue/90 text-white font-semibold px-6 py-3 rounded-lg transition-all shadow-lg"
          >
            Export to CSV
          </Button>
        </div>



        <Card className="shadow-none sm:shadow-xl border-0 bg-white sm:bg-white/95 backdrop-blur overflow-hidden rounded-none sm:rounded-lg">
          <CardHeader className="bg-gradient-to-r from-cerulean to-cambridge-blue text-white rounded-none sm:rounded-t-lg px-4 sm:px-6">
            <CardTitle>Results</CardTitle>
            <CardDescription className="text-cream/90">Scale: 1 (Strongly Disagree) to 5 (Strongly Agree)</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="space-y-2 sm:space-y-4">
              {/* Debug: Show what data we have */}
              {!stats?.questions_with_comments && stats?.average_scores && (
                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  Note: Using average_scores data (comments not available yet - backend may need restart)
                </div>
              )}
              
              {questionSections.map((section, sectionIdx) => {
                // Try questions_with_comments first, fall back to average_scores
                const questionsData = stats?.questions_with_comments || stats?.average_scores || [];
                
                // For average_scores, positions are 0-indexed in the array
                const sectionQuestions = stats?.questions_with_comments 
                  ? questionsData.filter(q => q.position >= section.start && q.position < section.end)
                  : questionsData.slice(section.start - 1, section.end - 1);
                
                if (sectionQuestions.length === 0) return null;
                
                const sectionAverage = sectionQuestions.reduce((sum, q) => sum + q.average_score, 0) / sectionQuestions.length;
                
                const isExpanded = expandedSections.has(sectionIdx);
                
                return (
                  <div key={sectionIdx} className="border border-cambridge-blue/20 rounded-lg overflow-hidden">
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedSections);
                        if (isExpanded) {
                          newExpanded.delete(sectionIdx);
                        } else {
                          newExpanded.add(sectionIdx);
                        }
                        setExpandedSections(newExpanded);
                      }}
                      className="w-full p-4 bg-gradient-to-r from-cream/30 to-cambridge-blue/10 hover:from-cream/40 hover:to-cambridge-blue/20 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <h3 className="font-bold text-lg text-gunmetal text-left">
                          {section.title}
                        </h3>
                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gunmetal/60">Section Avg:</span>
                            <span className="font-bold text-xl text-cerulean">
                              {sectionAverage.toFixed(2)}
                            </span>
                          </div>
                          <svg 
                            className={`w-5 h-5 text-cerulean transition-transform flex-shrink-0 ${
                              isExpanded ? 'rotate-180' : ''
                            }`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="p-4 space-y-4 border-t border-cambridge-blue/20">
                        {sectionQuestions.map((question, idx) => (
                          <div key={question.question_id || `q-${section.start + idx}`} className="p-4 rounded-lg bg-gradient-to-r from-cream/30 to-cambridge-blue/10">
                            <div className="space-y-3">
                              {/* Question text with number */}
                              <div className="flex gap-3">
                                <span className="font-bold text-cerulean text-sm flex-shrink-0">
                                  {question.position || (section.start + idx)}.
                                </span>
                                <span className="text-sm text-gunmetal flex-1">
                                  {question.question_text}
                                </span>
                              </div>
                              
                              {/* Score and responses - centered */}
                              <div className="flex justify-center items-center gap-3">
                                <span className="font-bold text-lg text-gunmetal">
                                  {question.average_score.toFixed(2)}
                                </span>
                                <span className="text-xs text-gunmetal/60">
                                  ({question.response_count} responses)
                                </span>
                              </div>
                              
                              {/* Progress bar */}
                              <div className="w-full bg-rose-quartz/20 rounded-full h-3 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-cerulean to-cambridge-blue h-3 rounded-full transition-all duration-500"
                                  style={{ width: `${(question.average_score / 5) * 100}%` }}
                                />
                              </div>
                              
                              {/* Comments if available */}
                              {'comments' in question && Array.isArray((question as any).comments) && (question as any).comments.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  <p className="text-xs font-semibold text-gunmetal/70">Comments:</p>
                                  <div className="space-y-1">
                                    {(question as any).comments.map((comment: string, commentIdx: number) => (
                                      <div key={commentIdx} className="text-xs text-gunmetal/60 bg-white/50 p-2 rounded italic">
                                        "{comment}"
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none sm:shadow-xl border-0 bg-white sm:bg-white/95 backdrop-blur overflow-hidden rounded-none sm:rounded-lg">
          <CardHeader className="bg-gradient-to-r from-cerulean to-cambridge-blue text-white rounded-none sm:rounded-t-lg px-4 sm:px-6">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>All Responses</CardTitle>
                <CardDescription className="text-cream/90 mt-1">Click on a response to view details</CardDescription>
              </div>
              {stats && (
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">{stats.total_responses}</div>
                  <div className="text-xs text-cream/70">Total</div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {responses.map((r) => (
                <div key={r.response.id} className="space-y-3">
                  <div
                    className="p-4 border-2 border-cambridge-blue/20 rounded-xl cursor-pointer hover:bg-gradient-to-r hover:from-cambridge-blue/10 hover:to-cerulean/10 transition-all hover:border-cerulean/40 hover:shadow-lg"
                    onClick={() => setSelectedResponse(selectedResponse?.response.id === r.response.id ? null : r)}
                  >
                    <div className="flex justify-between">
                      <div>
                        <div className="font-semibold text-gunmetal">{r.response.respondent_name}</div>
                        <div className="text-sm text-gunmetal/60">{r.response.respondent_email}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-gunmetal/60">
                          {new Date(r.response.submitted_at).toLocaleString()}
                        </div>
                        <svg 
                          className={`w-5 h-5 text-cerulean transition-transform ${
                            selectedResponse?.response.id === r.response.id ? 'rotate-180' : ''
                          }`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {selectedResponse?.response.id === r.response.id && (
                    <div className="ml-4 mr-4 p-4 bg-gradient-to-r from-cream/30 to-cambridge-blue/10 rounded-lg">
                      <div className="space-y-4">
                        {selectedResponse.answers.map((answer, idx) => (
                          <div key={idx} className="border-b border-cambridge-blue/20 pb-4 last:border-0">
                            <div className="flex gap-3">
                              <span className="text-cerulean font-bold flex-shrink-0 text-sm">{idx + 1}.</span>
                              <div className="flex-1 space-y-2">
                                <div className="text-sm text-gunmetal">
                                  {answer.question_text}
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="text-xs bg-cambridge-blue/20 px-2 py-1 rounded-full">
                                    Score: <span className="font-bold text-gunmetal">{answer.likert_value || 'N/A'}</span>
                                  </span>
                                  {answer.comment && (
                                    <span className="text-xs text-gunmetal/70 italic bg-cream/30 px-2 py-1 rounded">
                                      "{answer.comment}"
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}