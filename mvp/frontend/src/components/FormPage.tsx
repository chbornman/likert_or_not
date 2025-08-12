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

const STORAGE_KEY = 'likert-form-progress';

export default function FormPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentSection, setCurrentSection] = useState(-1); // Start with personal info page
  const [validationErrors, setValidationErrors] = useState<Set<number>>(new Set());
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [showRestoredMessage, setShowRestoredMessage] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState<Map<number, AnswerInput>>(new Map());

  // Save to local storage whenever form data changes
  useEffect(() => {
    if (!loading && formData) {
      const dataToSave = {
        name,
        email,
        currentSection,
        answers: Array.from(answers.entries()),
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      setLastSaved(new Date());
    }
  }, [name, email, answers, currentSection, loading, formData]);

  useEffect(() => {
    fetchForm();
  }, []);

  const fetchForm = async () => {
    try {
      const response = await fetch('/api/form');
      if (!response.ok) throw new Error('Failed to load form');
      const data = await response.json();
      setFormData(data);
      
      // Try to restore saved progress from local storage
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          const savedDate = new Date(parsed.savedAt);
          const hoursSinceSaved = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60);
          
          // Only restore if saved within last 24 hours
          if (hoursSinceSaved < 24) {
            setName(parsed.name || '');
            setEmail(parsed.email || '');
            setCurrentSection(parsed.currentSection ?? -1);
            
            // Restore answers
            const restoredAnswers = new Map<number, AnswerInput>();
            data.questions.forEach((q: any) => {
              restoredAnswers.set(q.id, {
                question_id: q.id,
                likert_value: null,
                comment: '',
              });
            });
            
            // Override with saved answers
            if (parsed.answers && Array.isArray(parsed.answers)) {
              parsed.answers.forEach(([questionId, answer]: [number, AnswerInput]) => {
                if (restoredAnswers.has(questionId)) {
                  restoredAnswers.set(questionId, answer);
                }
              });
            }
            
            setAnswers(restoredAnswers);
            
            // Show a message that progress was restored
            if (parsed.name || parsed.email || parsed.answers?.length > 0) {
              setShowRestoredMessage(true);
              console.log('Form progress restored from', savedDate.toLocaleString());
            }
          } else {
            // Clear old saved data
            localStorage.removeItem(STORAGE_KEY);
            initializeEmptyForm(data);
          }
        } catch (e) {
          console.error('Failed to restore saved progress:', e);
          localStorage.removeItem(STORAGE_KEY);
          initializeEmptyForm(data);
        }
      } else {
        initializeEmptyForm(data);
      }
    } catch (err) {
      setError('Failed to load form. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const initializeEmptyForm = (data: any) => {
    const initialAnswers = new Map<number, AnswerInput>();
    data.questions.forEach((q: any) => {
      initialAnswers.set(q.id, {
        question_id: q.id,
        likert_value: null,
        comment: '',
      });
    });
    setAnswers(initialAnswers);
  };

  const handleLikertChange = (questionId: number, value: string) => {
    const current = answers.get(questionId)!;
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, {
      ...current,
      likert_value: parseInt(value),
    });
    setAnswers(newAnswers);
    
    // Clear validation error for this specific question
    if (validationErrors.has(questionId)) {
      const newErrors = new Set(validationErrors);
      newErrors.delete(questionId);
      setValidationErrors(newErrors);
    }
    
    // Clear the general error message if all required questions in current section are now answered
    if (error && formData) {
      const section = questionSections[currentSection];
      const sectionQuestions = formData.questions.slice(section.start, section.end);
      const allRequiredAnswered = sectionQuestions
        .filter(q => q.is_required)
        .every(q => {
          if (q.id === questionId) return true; // We just answered this one
          const answer = answers.get(q.id);
          return answer && answer.likert_value !== null;
        });
      
      if (allRequiredAnswered) {
        setError('');
      }
    }
  };

  const handleCommentChange = (questionId: number, comment: string) => {
    const current = answers.get(questionId)!;
    setAnswers(new Map(answers.set(questionId, {
      ...current,
      comment,
    })));
  };

  const validateSection = (sectionIndex: number): boolean => {
    if (!formData) return false;
    
    const section = questionSections[sectionIndex];
    const sectionQuestions = formData.questions.slice(section.start, section.end);
    const newErrors = new Set<number>();
    let isValid = true;

    sectionQuestions.forEach(q => {
      if (q.is_required) {
        const answer = answers.get(q.id);
        if (!answer || answer.likert_value === null) {
          newErrors.add(q.id);
          isValid = false;
        }
      }
    });

    setValidationErrors(newErrors);
    return isValid;
  };

  const validatePersonalInfo = (): boolean => {
    const newTouched = new Set(touchedFields);
    newTouched.add('name');
    newTouched.add('email');
    setTouchedFields(newTouched);
    
    return name.trim() !== '' && email.trim() !== '' && email.includes('@');
  };

  const handleNextSection = () => {
    if (currentSection === -1) {
      if (validatePersonalInfo()) {
        setCurrentSection(0);
        setError('');
      } else {
        setError('Please provide your name and valid email');
      }
    } else if (validateSection(currentSection)) {
      setCurrentSection(currentSection + 1);
      setError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setError('Please answer all required questions before proceeding');
    }
  };

  const handlePreviousSection = () => {
    setCurrentSection(currentSection - 1);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    // Validate current section first
    if (!validateSection(currentSection)) {
      setError('Please answer all required questions in this section');
      return;
    }

    // Validate ALL required questions across all sections
    if (!formData) return;
    
    const allRequiredAnswered = formData.questions
      .filter(q => q.is_required)
      .every(q => {
        const answer = answers.get(q.id);
        return answer && answer.likert_value !== null;
      });

    if (!allRequiredAnswered) {
      setError('Please complete all required questions in previous sections before submitting');
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
          answers: Array.from(answers.values()).filter(a => a.likert_value !== null),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Submission error:', errorText);
        throw new Error('Failed to submit form');
      }
      
      // Clear saved progress after successful submission
      localStorage.removeItem(STORAGE_KEY);
      navigate('/success');
    } catch (err) {
      setError('Failed to submit form. Please try again.');
      console.error('Submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldTouch = (field: string) => {
    setTouchedFields(new Set(touchedFields).add(field));
  };

  const clearSavedProgress = () => {
    localStorage.removeItem(STORAGE_KEY);
    setName('');
    setEmail('');
    setCurrentSection(-1);
    setTouchedFields(new Set());
    setValidationErrors(new Set());
    setShowRestoredMessage(false);
    if (formData) {
      initializeEmptyForm(formData);
    }
  };

  // Check which sections have incomplete required questions
  const getSectionCompletionStatus = (sectionIndex: number): boolean => {
    if (!formData) return false;
    const section = questionSections[sectionIndex];
    const sectionQuestions = formData.questions.slice(section.start, section.end);
    return sectionQuestions
      .filter(q => q.is_required)
      .every(q => {
        const answer = answers.get(q.id);
        return answer && answer.likert_value !== null;
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream via-white to-cambridge-blue/10 flex items-center justify-center">
        <div className="text-lg text-gunmetal">Loading form...</div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cream via-white to-cambridge-blue/10 flex items-center justify-center">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  const totalSections = questionSections.length;
  const progressPercentage = currentSection === -1 ? 0 : ((currentSection + 1) / (totalSections + 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-white to-cambridge-blue/10 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {showRestoredMessage && (
          <div className="mb-4 p-4 bg-cambridge-blue/20 border border-cambridge-blue rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-cerulean" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-gunmetal">Your previous progress has been restored.</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRestoredMessage(false)}
                className="text-sm px-3 py-1 text-gunmetal/70 hover:text-gunmetal"
              >
                Continue
              </button>
              <button
                onClick={clearSavedProgress}
                className="text-sm px-3 py-1 bg-rose-quartz/80 hover:bg-rose-quartz text-white rounded-md transition-colors"
              >
                Start Fresh
              </button>
            </div>
          </div>
        )}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gunmetal">{formData.title}</h1>
            <div className="flex items-center gap-4">
              {lastSaved && (
                <span className="text-xs text-gunmetal/50 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Auto-saved
                </span>
              )}
              <span className="text-sm text-gunmetal/70">
                {currentSection === -1 ? 'Personal Information' : `Section ${currentSection + 1} of ${totalSections}`}
              </span>
            </div>
          </div>
          <div className="w-full bg-rose-quartz/20 rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cerulean to-cambridge-blue transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur">
          <CardHeader className="bg-gradient-to-r from-cerulean to-cambridge-blue text-white rounded-t-lg">
            <CardTitle className="text-2xl">
              {currentSection === -1 ? 'Personal Information' : questionSections[currentSection].title}
            </CardTitle>
            <CardDescription className="text-cream/90 mt-2">
              {currentSection === -1 
                ? 'Please provide your contact information to begin the evaluation.'
                : `Answer all questions in this section. Required questions are marked with a red asterisk (*).`}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            {currentSection === -1 ? (
              <div className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-gunmetal font-semibold">
                    Name <span className="text-rose-quartz font-bold">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      // Clear error if both fields are now valid
                      if (error && e.target.value.trim() && email.trim() && email.includes('@')) {
                        setError('');
                      }
                    }}
                    onBlur={() => handleFieldTouch('name')}
                    required
                    className={`mt-2 border-2 transition-all ${
                      touchedFields.has('name') && !name.trim() 
                        ? 'border-rose-quartz ring-2 ring-rose-quartz/30' 
                        : 'border-cambridge-blue/30 focus:border-cerulean'
                    }`}
                    placeholder="Enter your full name"
                  />
                  {touchedFields.has('name') && !name.trim() && (
                    <p className="text-rose-quartz text-sm mt-1 font-medium">Name is required</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email" className="text-gunmetal font-semibold">
                    Email <span className="text-rose-quartz font-bold">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      // Clear error if both fields are now valid
                      if (error && name.trim() && e.target.value.trim() && e.target.value.includes('@')) {
                        setError('');
                      }
                    }}
                    onBlur={() => handleFieldTouch('email')}
                    required
                    className={`mt-2 border-2 transition-all ${
                      touchedFields.has('email') && (!email.trim() || !email.includes('@'))
                        ? 'border-rose-quartz ring-2 ring-rose-quartz/30' 
                        : 'border-cambridge-blue/30 focus:border-cerulean'
                    }`}
                    placeholder="your.email@example.com"
                  />
                  {touchedFields.has('email') && (!email.trim() || !email.includes('@')) && (
                    <p className="text-rose-quartz text-sm mt-1 font-medium">Valid email is required</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {formData.questions.slice(
                  questionSections[currentSection].start, 
                  questionSections[currentSection].end
                ).map((question, idx) => (
                  <div 
                    key={question.id} 
                    className={`space-y-3 p-5 rounded-xl transition-all ${
                      validationErrors.has(question.id) 
                        ? 'bg-rose-quartz/10 border-2 border-rose-quartz shadow-lg shadow-rose-quartz/20' 
                        : 'bg-gradient-to-r from-cream/30 to-cambridge-blue/10 border border-cambridge-blue/20'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-bold text-white bg-cerulean rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {questionSections[currentSection].start + idx + 1}
                      </span>
                      <Label className="text-base text-gunmetal leading-relaxed">
                        {question.question_text}
                        {question.is_required && <span className="text-rose-quartz ml-1 font-bold">*</span>}
                      </Label>
                    </div>
                    
                    {validationErrors.has(question.id) && (
                      <div className="ml-11 text-rose-quartz text-sm font-medium bg-rose-quartz/20 px-3 py-1 rounded-md inline-block">
                        This question is required
                      </div>
                    )}
                    
                    <RadioGroup
                      value={answers.get(question.id)?.likert_value?.toString() || ''}
                      onValueChange={(value) => handleLikertChange(question.id, value)}
                      className="flex flex-col sm:flex-row sm:gap-4 gap-2 ml-11"
                    >
                      {likertOptions.map((option) => (
                        <Label
                          key={option.value}
                          htmlFor={`q${question.id}-${option.value}`}
                          className="flex items-center space-x-2 p-2 rounded-lg hover:bg-cambridge-blue/10 transition-colors cursor-pointer"
                        >
                          <RadioGroupItem 
                            value={option.value.toString()} 
                            id={`q${question.id}-${option.value}`}
                            className="border-2 border-cerulean text-cerulean"
                          />
                          <span className="text-sm text-gunmetal/80 hover:text-gunmetal select-none">
                            {option.value} - {option.label}
                          </span>
                        </Label>
                      ))}
                    </RadioGroup>

                    {question.allow_comment && (
                      <div className="ml-11">
                        <Label htmlFor={`comment-${question.id}`} className="text-sm text-gunmetal/70 font-medium">
                          Comments (optional)
                        </Label>
                        <Textarea
                          id={`comment-${question.id}`}
                          value={answers.get(question.id)?.comment || ''}
                          onChange={(e) => handleCommentChange(question.id, e.target.value)}
                          placeholder="Add any additional context or feedback..."
                          className="mt-2 border-cambridge-blue/30 focus:border-cerulean bg-white/80"
                          rows={3}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-rose-quartz/10 border-l-4 border-rose-quartz text-gunmetal rounded-md">
                {error}
              </div>
            )}

            <div className="flex justify-between mt-8 gap-4">
              {currentSection > -1 && (
                <Button 
                  type="button" 
                  onClick={handlePreviousSection}
                  className="bg-rose-quartz hover:bg-rose-quartz/80 text-white font-semibold px-6 py-3 rounded-lg transition-all"
                >
                  ← Previous Section
                </Button>
              )}
              
              <div className="flex-1" />
              
              {currentSection < questionSections.length - 1 ? (
                <Button 
                  type="button" 
                  onClick={handleNextSection}
                  className="bg-gradient-to-r from-cerulean to-cambridge-blue hover:from-cerulean/90 hover:to-cambridge-blue/90 text-white font-semibold px-6 py-3 rounded-lg transition-all shadow-lg"
                >
                  Next Section →
                </Button>
              ) : currentSection === questionSections.length - 1 ? (
                <Button 
                  type="button" 
                  onClick={handleSubmit} 
                  disabled={submitting}
                  className="bg-gradient-to-r from-cambridge-blue to-cerulean hover:from-cambridge-blue/90 hover:to-cerulean/90 text-white font-bold px-8 py-3 rounded-lg transition-all shadow-xl"
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </Button>
              ) : (
                <Button 
                  type="button" 
                  onClick={handleNextSection}
                  className="bg-gradient-to-r from-cerulean to-cambridge-blue hover:from-cerulean/90 hover:to-cambridge-blue/90 text-white font-semibold px-6 py-3 rounded-lg transition-all shadow-lg"
                >
                  Begin Evaluation →
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-center space-x-2">
          {[-1, ...Array.from({ length: totalSections }, (_, i) => i)].map((sectionIdx) => {
            const isComplete = sectionIdx === -1 
              ? (name.trim() !== '' && email.trim() !== '' && email.includes('@'))
              : getSectionCompletionStatus(sectionIdx);
            
            return (
              <button
                key={sectionIdx}
                onClick={() => {
                  if (sectionIdx < currentSection || (sectionIdx === currentSection)) {
                    setCurrentSection(sectionIdx);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                disabled={sectionIdx > currentSection}
                className={`relative rounded-full transition-all ${
                  sectionIdx === currentSection 
                    ? 'w-8 h-3 bg-cerulean' 
                    : sectionIdx < currentSection 
                      ? `w-3 h-3 cursor-pointer hover:scale-110 ${
                          isComplete ? 'bg-cambridge-blue' : 'bg-rose-quartz animate-pulse'
                        }` 
                      : 'w-2 h-2 bg-rose-quartz/30'
                }`}
                aria-label={`Go to ${sectionIdx === -1 ? 'Personal Information' : questionSections[sectionIdx]?.title || ''}`}
                title={
                  sectionIdx < currentSection && !isComplete 
                    ? 'This section has incomplete required questions' 
                    : ''
                }
              >
                {sectionIdx < currentSection && !isComplete && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-quartz rounded-full animate-ping" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}