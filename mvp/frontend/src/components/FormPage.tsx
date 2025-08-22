import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient, FormWithSections, Question, Answer, FormResponse } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import LikertScale from './LikertScale';
import TextInput from './TextInput';
import TextAreaInput from './TextAreaInput';
import Logo from './Logo';
import MultipleChoice from './MultipleChoice';
import CheckboxGroup from './CheckboxGroup';
import DropdownSelect from './DropdownSelect';
import YesNoQuestion from './YesNoQuestion';
import RatingScale from './RatingScale';
import NumberInput from './NumberInput';
import DateTimePicker from './DateTimePicker';
import { toast } from '@/hooks/use-toast';

interface FormData {
  [questionId: string]: {
    value: any;
    comment?: string;
  };
}

export default function FormPage() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  
  const [form, setForm] = useState<FormWithSections | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [currentSection, setCurrentSection] = useState(-2); // Start with instructions
  const [formData, setFormData] = useState<FormData>({});
  const [respondentName, setRespondentName] = useState('');
  const [respondentEmail, setRespondentEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!formId) return;
    loadForm();
    loadSavedData();
  }, [formId]);

  useEffect(() => {
    // Auto-save to localStorage
    if (form && Object.keys(formData).length > 0) {
      const saveData = {
        formData,
        respondentName,
        respondentEmail,
        currentSection,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(`form_${formId}_progress`, JSON.stringify(saveData));
    }
  }, [formData, respondentName, respondentEmail, currentSection, formId]);

  const loadForm = async () => {
    try {
      const formData = await apiClient.getForm(formId!);
      
      // Check if form is finished
      if (formData.status === 'finished') {
        setError('This form is no longer accepting responses.');
        setForm(null);
      } else {
        setForm(formData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedData = () => {
    const saved = localStorage.getItem(`form_${formId}_progress`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // Check if saved data is less than 24 hours old
        const savedTime = new Date(data.timestamp);
        const now = new Date();
        const hoursDiff = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          setFormData(data.formData || {});
          setRespondentName(data.respondentName || '');
          setRespondentEmail(data.respondentEmail || '');
          setCurrentSection(data.currentSection ?? -2);
        } else {
          localStorage.removeItem(`form_${formId}_progress`);
        }
      } catch {
        // Invalid saved data
      }
    }
  };

  const handleAnswerChange = (questionId: string, value: any, comment?: string) => {
    setFormData(prev => ({
      ...prev,
      [questionId]: {
        value,
        comment: comment ?? prev[questionId]?.comment,
      },
    }));
  };

  const validateSection = (sectionIndex: number): boolean => {
    if (sectionIndex === -2) return true; // Instructions page
    if (sectionIndex === -1) {
      // Personal info page
      return respondentName.trim() !== '' && respondentEmail.trim() !== '';
    }

    const section = form?.sections[sectionIndex];
    if (!section) return false;

    // Check all required questions in section
    for (const question of section.questions || []) {
      if (question.features.required) {
        const answer = formData[question.id];
        if (!answer || answer.value === undefined || answer.value === null || answer.value === '') {
          return false;
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateSection(currentSection)) {
      const maxSection = form?.sections.length || 0;
      if (currentSection < maxSection - 1) {
        setCurrentSection(currentSection + 1);
        window.scrollTo(0, 0);
      }
    } else {
      toast({
        title: "Incomplete form",
        description: "Please answer all required questions before proceeding.",
        variant: "destructive",
      });
    }
  };

  const handlePrevious = () => {
    if (currentSection > -2) {
      setCurrentSection(currentSection - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    // Validate all sections
    for (let i = -1; i < (form?.sections.length || 0); i++) {
      if (!validateSection(i)) {
        toast({
          title: "Incomplete section",
          description: `Please complete all required fields in section ${i + 2}`,
          variant: "destructive",
        });
        setCurrentSection(i);
        return;
      }
    }

    setSubmitting(true);
    try {
      // Prepare submission data
      const answers: Answer[] = [];
      for (const [questionId, data] of Object.entries(formData)) {
        const answer: Answer = {
          question_id: questionId,
          value: data.value,
        };
        
        // For likert questions with comments, include in value
        const question = form?.sections
          .flatMap(s => s.questions || [])
          .find(q => q.id === questionId);
        
        if (question?.type === 'likert' && data.comment) {
          answer.value = {
            rating: data.value,
            comment: data.comment,
          };
        }
        
        answers.push(answer);
      }

      const response: FormResponse = {
        respondent_name: respondentName,
        respondent_email: respondentEmail,
        answers,
      };

      await apiClient.submitForm(formId!, response);
      
      // Clear saved progress
      localStorage.removeItem(`form_${formId}_progress`);
      
      // Redirect to success page
      navigate(`/form/${formId}/success`);
    } catch (err) {
      toast({
        title: "Submission failed",
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question: Question) => {
    const value = formData[question.id]?.value;
    const comment = formData[question.id]?.comment || '';

    switch (question.type) {
      case 'likert':
        return (
          <div key={question.id} className="mb-8">
            <div className="mb-4">
              <Label className="text-base font-medium text-gray-700 mb-2 block">
                {question.title}
                {question.features.required && <span className="text-red-500 ml-1">*</span>}
              </Label>
              {question.description && (
                <p className="text-sm text-gray-600 mb-3">{question.description}</p>
              )}
              <LikertScale
                value={value}
                onChange={(val) => handleAnswerChange(question.id, val)}
                min={question.features.scale?.min || 1}
                max={question.features.scale?.max || 5}
                minLabel={question.features.scale?.minLabel || 'Strongly Disagree'}
                maxLabel={question.features.scale?.maxLabel || 'Strongly Agree'}
              />
            </div>
            {question.features.allowComment && (
              <div className="mt-4">
                <label className="block text-sm text-gray-600 mb-1">
                  Comments (optional)
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => handleAnswerChange(question.id, value, e.target.value)}
                  rows={3}
                  maxLength={question.features.charLimit || 500}
                  placeholder={question.features.placeholder}
                  className="w-full"
                />
                {question.features.charLimit && (
                  <p className="text-xs text-gray-500 mt-1">
                    {comment.length}/{question.features.charLimit} characters
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 'text':
        return (
          <TextInput
            key={question.id}
            label={question.title}
            value={value || ''}
            onChange={(val) => handleAnswerChange(question.id, val)}
            required={question.features.required}
            placeholder={question.features.placeholder}
            maxLength={question.features.charLimit}
            helpText={question.features.helpText}
          />
        );

      case 'textarea':
        return (
          <TextAreaInput
            key={question.id}
            label={question.title}
            value={value || ''}
            onChange={(val) => handleAnswerChange(question.id, val)}
            required={question.features.required}
            placeholder={question.features.placeholder}
            maxLength={question.features.charLimit}
            rows={question.features.rows || 5}
            helpText={question.features.helpText}
          />
        );

      case 'section_header':
        return (
          <div key={question.id} className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">{question.title}</h3>
            {question.description && (
              <p className="text-gray-600">{question.description}</p>
            )}
          </div>
        );

      case 'multiple_choice':
        return (
          <MultipleChoice
            key={question.id}
            questionId={question.id}
            question={question.title}
            options={question.features.options || []}
            value={value}
            comment={comment}
            allowComment={question.features.allowComment}
            isRequired={question.features.required}
            onChange={(val) => handleAnswerChange(question.id, val)}
            onCommentChange={(val) => handleAnswerChange(question.id, value, val)}
          />
        );

      case 'checkbox':
        return (
          <CheckboxGroup
            key={question.id}
            questionId={question.id}
            question={question.title}
            options={question.features.options || []}
            value={value || []}
            comment={comment}
            allowComment={question.features.allowComment}
            isRequired={question.features.required}
            onChange={(val) => handleAnswerChange(question.id, val)}
            onCommentChange={(val) => handleAnswerChange(question.id, value, val)}
          />
        );

      case 'dropdown':
        return (
          <DropdownSelect
            key={question.id}
            questionId={question.id}
            question={question.title}
            options={question.features.options || []}
            value={value}
            comment={comment}
            allowComment={question.features.allowComment}
            isRequired={question.features.required}
            placeholder={question.features.placeholder}
            onChange={(val) => handleAnswerChange(question.id, val)}
            onCommentChange={(val) => handleAnswerChange(question.id, value, val)}
          />
        );

      case 'yes_no':
        return (
          <YesNoQuestion
            key={question.id}
            questionId={question.id}
            question={question.title}
            value={value}
            comment={comment}
            allowComment={question.features.allowComment}
            isRequired={question.features.required}
            onChange={(val) => handleAnswerChange(question.id, val)}
            onCommentChange={(val) => handleAnswerChange(question.id, value, val)}
          />
        );

      case 'rating':
        return (
          <RatingScale
            key={question.id}
            questionId={question.id}
            question={question.title}
            value={value}
            comment={comment}
            allowComment={question.features.allowComment}
            isRequired={question.features.required}
            min={question.features.scale?.min || 1}
            max={question.features.scale?.max || 5}
            ratingStyle={question.features.ratingStyle || 'stars'}
            onChange={(val) => handleAnswerChange(question.id, val)}
            onCommentChange={(val) => handleAnswerChange(question.id, value, val)}
          />
        );

      case 'number':
        return (
          <NumberInput
            key={question.id}
            questionId={question.id}
            question={question.title}
            value={value}
            comment={comment}
            allowComment={question.features.allowComment}
            isRequired={question.features.required}
            min={typeof question.features.min === 'number' ? question.features.min : undefined}
            max={typeof question.features.max === 'number' ? question.features.max : undefined}
            step={question.features.step}
            placeholder={question.features.placeholder}
            onChange={(val) => handleAnswerChange(question.id, val)}
            onCommentChange={(val) => handleAnswerChange(question.id, value, val)}
          />
        );

      case 'date':
      case 'time':
      case 'datetime':
        return (
          <DateTimePicker
            key={question.id}
            questionId={question.id}
            question={question.title}
            value={value}
            comment={comment}
            allowComment={question.features.allowComment}
            isRequired={question.features.required}
            type={question.type as 'date' | 'time' | 'datetime'}
            min={typeof question.features.min === 'string' ? question.features.min : undefined}
            max={typeof question.features.max === 'string' ? question.features.max : undefined}
            onChange={(val) => handleAnswerChange(question.id, val)}
            onCommentChange={(val) => handleAnswerChange(question.id, value, val)}
          />
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>Error: {error || 'Form not found'}</p>
        </div>
      </div>
    );
  }

  const totalSections = form.sections.length;
  const progress = currentSection === -2 ? 0 : ((currentSection + 2) / (totalSections + 2)) * 100;

  return (
    <div className="min-h-screen bg-stone-300">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Logo className="w-32 h-32" />
        </div>
        
        {/* Header Card */}
        <Card className="mb-6 shadow-lg border-green-400">
          <CardHeader className="bg-gradient-to-r from-blue-800 to-blue-600 text-white">
            <CardTitle className="text-2xl">{form.title}</CardTitle>
            {form.description && (
              <CardDescription className="text-gray-100">{form.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-4">
          
            {/* Progress bar */}
            {form.settings.progressBar !== false && currentSection >= -1 && (
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Card */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
          {/* Instructions Page */}
          {currentSection === -2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Welcome</h2>
              
              {form.settings.reviewPeriod && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                  <p className="font-medium text-blue-900">Review Period</p>
                  <p className="text-blue-800">{form.settings.reviewPeriod}</p>
                </div>
              )}
              
              {form.settings.jobDescription && (
                <div className="prose max-w-none">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Position Description</h3>
                  <p className="text-gray-700">{form.settings.jobDescription}</p>
                </div>
              )}
              
              {form.settings.confidentialityNotice && (
                <div className="bg-stone-100 border-l-4 border-stone-400 p-4">
                  <p className="font-medium text-stone-700">Confidentiality Notice</p>
                  <p className="text-stone-600">{form.settings.confidentialityNotice}</p>
                </div>
              )}
              
              {form.settings.estimatedTime && (
                <p className="text-sm text-gray-600">
                  Estimated completion time: {form.settings.estimatedTime}
                </p>
              )}
              
              <div className="pt-4">
                <Button
                  onClick={handleNext}
                  className="w-full sm:w-auto bg-blue-800 hover:bg-blue-600 text-white"
                  size="lg"
                >
                  Begin Review
                </Button>
              </div>
            </div>
          )}

          {/* Personal Information Page */}
          {currentSection === -1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Your Information</h2>
              
              <div>
                <Label htmlFor="name">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={respondentName}
                  onChange={(e) => setRespondentName(e.target.value)}
                  placeholder="Enter your full name"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={respondentEmail}
                  onChange={(e) => setRespondentEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="mt-1"
                />
              </div>
              
              {form.settings.autoSave !== false && (
                <p className="text-sm text-gray-600 italic">
                  Your progress is automatically saved and will be restored if you return within 24 hours.
                </p>
              )}
            </div>
          )}

          {/* Question Sections */}
          {currentSection >= 0 && currentSection < totalSections && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {form.sections[currentSection].title}
              </h2>
              
              {form.sections[currentSection].description && (
                <p className="text-gray-600">{form.sections[currentSection].description}</p>
              )}
              
              <div className="space-y-6">
                {form.sections[currentSection].questions?.map(renderQuestion)}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              onClick={handlePrevious}
              disabled={currentSection === -2}
              variant="outline"
            >
              Previous
            </Button>
            
            {currentSection < totalSections - 1 ? (
              <Button
                onClick={handleNext}
                className="bg-blue-800 hover:bg-blue-600 text-white"
              >
                Next
              </Button>
            ) : currentSection === totalSections - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            ) : null}
          </div>
          </CardContent>
        </Card>

        {/* Section indicators */}
        {currentSection >= 0 && (
          <div className="flex justify-center mt-6 space-x-2">
            {form.sections.map((_, index) => (
              <button
                key={index}
                onClick={() => validateSection(currentSection) && setCurrentSection(index)}
                className={`w-2 h-2 rounded-full ${
                  index === currentSection ? 'bg-blue-600' : 'bg-gray-300'
                } ${index < currentSection ? 'bg-green-500' : ''}`}
                aria-label={`Go to section ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}