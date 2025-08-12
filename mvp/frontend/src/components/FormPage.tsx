import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { FormData, AnswerInput } from '@/types';

const likertOptions = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
];

const questionSections = [
  { start: 0, end: 4, title: "Part I: Organizational Leadership" },
  { start: 4, end: 8, title: "Part II: Strategic Planning & Management" },
  { start: 8, end: 12, title: "Leadership & Governance" },
  { start: 12, end: 16, title: "Programming & Operations" },
  { start: 16, end: 20, title: "Fundraising & Financial Management" },
  { start: 20, end: 24, title: "Community Engagement & Advocacy" },
  { start: 24, end: 30, title: "Part III: Core Values" },
  { start: 30, end: 35, title: "Executive Competencies" },
  { start: 35, end: 40, title: "Part IV: Overall Performance" },
];

export default function FormPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState<Map<number, AnswerInput>>(new Map());

  useEffect(() => {
    fetchForm();
  }, []);

  const fetchForm = async () => {
    try {
      const response = await fetch('/api/form');
      if (!response.ok) throw new Error('Failed to load form');
      const data = await response.json();
      setFormData(data);
      
      const initialAnswers = new Map<number, AnswerInput>();
      data.questions.forEach((q: any) => {
        initialAnswers.set(q.id, {
          question_id: q.id,
          likert_value: null,
          comment: '',
        });
      });
      setAnswers(initialAnswers);
    } catch (err) {
      setError('Failed to load form. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleLikertChange = (questionId: number, value: string) => {
    const current = answers.get(questionId)!;
    setAnswers(new Map(answers.set(questionId, {
      ...current,
      likert_value: parseInt(value),
    })));
  };

  const handleCommentChange = (questionId: number, comment: string) => {
    const current = answers.get(questionId)!;
    setAnswers(new Map(answers.set(questionId, {
      ...current,
      comment,
    })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim()) {
      setError('Please provide your name and email');
      return;
    }

    const requiredQuestions = formData?.questions.filter(q => q.is_required) || [];
    const missingRequired = requiredQuestions.some(q => {
      const answer = answers.get(q.id);
      return !answer || answer.likert_value === null;
    });

    if (missingRequired) {
      setError('Please answer all required questions');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          respondent_name: name,
          respondent_email: email,
          answers: Array.from(answers.values()),
        }),
      });

      if (!response.ok) throw new Error('Failed to submit form');
      
      navigate('/success');
    } catch (err) {
      setError('Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading form...</div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{formData.title}</CardTitle>
            <CardDescription className="text-base mt-2">
              {formData.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="space-y-8">
                {questionSections.map((section) => (
                  <div key={section.title} className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      {section.title}
                    </h3>
                    {formData.questions.slice(section.start, section.end).map((question, idx) => (
                      <div key={question.id} className="space-y-3 p-4 bg-white rounded-lg border">
                        <div className="flex items-start gap-2">
                          <span className="text-sm font-medium text-gray-500 mt-1">
                            {section.start + idx + 1}.
                          </span>
                          <Label className="text-base">
                            {question.question_text}
                            {question.is_required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                        </div>
                        
                        <RadioGroup
                          value={answers.get(question.id)?.likert_value?.toString() || ''}
                          onValueChange={(value) => handleLikertChange(question.id, value)}
                          className="flex flex-col sm:flex-row sm:gap-6 gap-3 ml-6"
                        >
                          {likertOptions.map((option) => (
                            <div key={option.value} className="flex items-center space-x-2">
                              <RadioGroupItem value={option.value.toString()} id={`q${question.id}-${option.value}`} />
                              <Label 
                                htmlFor={`q${question.id}-${option.value}`} 
                                className="text-sm cursor-pointer"
                              >
                                {option.value} - {option.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>

                        {question.allow_comment && (
                          <div className="ml-6">
                            <Label htmlFor={`comment-${question.id}`} className="text-sm text-gray-600">
                              Comments (optional)
                            </Label>
                            <Textarea
                              id={`comment-${question.id}`}
                              value={answers.get(question.id)?.comment || ''}
                              onChange={(e) => handleCommentChange(question.id, e.target.value)}
                              placeholder="Add any additional context or feedback..."
                              className="mt-1"
                              rows={3}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}