import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResponseWithAnswers, Stats } from '@/types';

export default function AdminPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [responses, setResponses] = useState<ResponseWithAnswers[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedResponse, setSelectedResponse] = useState<ResponseWithAnswers | null>(null);

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
    <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gunmetal">Admin Dashboard</h1>
          <Button 
            onClick={handleExport}
            className="bg-gradient-to-r from-cerulean to-cambridge-blue hover:from-cerulean/90 hover:to-cambridge-blue/90 text-white font-semibold px-6 py-3 rounded-lg transition-all shadow-lg"
          >
            Export to CSV
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-xl border-0 bg-white/95 backdrop-blur overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-cerulean to-cambridge-blue text-white">
                <CardTitle>Total Responses</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-gunmetal">{stats.total_responses}</div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 shadow-xl border-0 bg-white/95 backdrop-blur overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-cambridge-blue to-cerulean text-white">
                <CardTitle>Recent Submissions</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {stats.recent_responses.map((r) => (
                    <div key={r.id} className="flex justify-between text-sm p-2 rounded-lg hover:bg-cambridge-blue/10 transition-colors">
                      <span className="font-medium text-gunmetal">{r.respondent_name}</span>
                      <span className="text-gunmetal/60">
                        {new Date(r.submitted_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur">
          <CardHeader className="bg-gradient-to-r from-rose-quartz to-cambridge-blue text-white">
            <CardTitle>Average Scores by Question</CardTitle>
            <CardDescription className="text-cream/90">Scale: 1 (Strongly Disagree) to 5 (Strongly Agree)</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {stats?.average_scores.map((score, idx) => (
                <div key={idx} className="space-y-2 p-3 rounded-lg bg-gradient-to-r from-cream/30 to-cambridge-blue/10">
                  <div className="flex justify-between items-start">
                    <span className="text-sm flex-1 mr-4 text-gunmetal">
                      <span className="font-bold text-cerulean">{idx + 1}.</span> {score.question_text}
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-lg text-gunmetal">
                        {score.average_score.toFixed(2)}
                      </span>
                      <span className="text-xs text-gunmetal/60 ml-2">
                        ({score.response_count} responses)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-rose-quartz/20 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cerulean to-cambridge-blue h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(score.average_score / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur">
          <CardHeader className="bg-gradient-to-r from-gunmetal to-cerulean text-white">
            <CardTitle>All Responses</CardTitle>
            <CardDescription className="text-cream/90">Click on a response to view details</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {responses.map((r) => (
                <div
                  key={r.response.id}
                  className="p-4 border-2 border-cambridge-blue/20 rounded-xl cursor-pointer hover:bg-gradient-to-r hover:from-cambridge-blue/10 hover:to-cerulean/10 transition-all hover:border-cerulean/40 hover:shadow-lg"
                  onClick={() => setSelectedResponse(r)}
                >
                  <div className="flex justify-between">
                    <div>
                      <div className="font-semibold text-gunmetal">{r.response.respondent_name}</div>
                      <div className="text-sm text-gunmetal/60">{r.response.respondent_email}</div>
                    </div>
                    <div className="text-sm text-gunmetal/60">
                      {new Date(r.response.submitted_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedResponse && (
          <Card className="shadow-xl border-0 bg-white/95 backdrop-blur">
            <CardHeader className="bg-gradient-to-r from-rose-quartz to-cerulean text-white">
              <CardTitle>Response Details</CardTitle>
              <CardDescription className="text-cream/90">
                {selectedResponse.response.respondent_name} - {selectedResponse.response.respondent_email}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button
                onClick={() => setSelectedResponse(null)}
                className="mb-6 bg-rose-quartz hover:bg-rose-quartz/80 text-white font-semibold px-4 py-2 rounded-lg transition-all"
              >
                Close Details
              </Button>
              <div className="space-y-4">
                {selectedResponse.answers.map((answer, idx) => (
                  <div key={idx} className="border-b border-cambridge-blue/20 pb-4">
                    <div className="font-medium text-gunmetal mb-2">
                      <span className="text-cerulean font-bold">{idx + 1}.</span> {answer.question_text}
                    </div>
                    <div className="flex items-center gap-4 ml-6">
                      <span className="text-sm bg-cambridge-blue/20 px-3 py-1 rounded-full">
                        Score: <span className="font-bold text-gunmetal">{answer.likert_value || 'N/A'}</span>
                      </span>
                      {answer.comment && (
                        <span className="text-sm text-gunmetal/70 italic bg-cream/30 px-3 py-1 rounded-lg">
                          Comment: {answer.comment}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}