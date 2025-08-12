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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading admin dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button onClick={handleExport}>Export to CSV</Button>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Total Responses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total_responses}</div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Recent Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.recent_responses.map((r) => (
                    <div key={r.id} className="flex justify-between text-sm">
                      <span>{r.respondent_name}</span>
                      <span className="text-gray-500">
                        {new Date(r.submitted_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Average Scores by Question</CardTitle>
            <CardDescription>Scale: 1 (Strongly Disagree) to 5 (Strongly Agree)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.average_scores.map((score, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-sm flex-1 mr-4">
                      {idx + 1}. {score.question_text}
                    </span>
                    <div className="text-right">
                      <span className="font-semibold">
                        {score.average_score.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({score.response_count} responses)
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(score.average_score / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Responses</CardTitle>
            <CardDescription>Click on a response to view details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {responses.map((r) => (
                <div
                  key={r.response.id}
                  className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedResponse(r)}
                >
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium">{r.response.respondent_name}</div>
                      <div className="text-sm text-gray-500">{r.response.respondent_email}</div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(r.response.submitted_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedResponse && (
          <Card>
            <CardHeader>
              <CardTitle>Response Details</CardTitle>
              <CardDescription>
                {selectedResponse.response.respondent_name} - {selectedResponse.response.respondent_email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedResponse(null)}
                className="mb-4"
              >
                Close Details
              </Button>
              <div className="space-y-4">
                {selectedResponse.answers.map((answer, idx) => (
                  <div key={idx} className="border-b pb-3">
                    <div className="font-medium text-sm mb-1">
                      {idx + 1}. {answer.question_text}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">
                        Score: <span className="font-semibold">{answer.likert_value || 'N/A'}</span>
                      </span>
                      {answer.comment && (
                        <span className="text-sm text-gray-600 italic">
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