import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronLeft, 
  Save, 
  Plus, 
  Trash2, 
  GripVertical
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
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

interface Question {
  id: string;
  title: string;
  question_type: 'likert' | 'text' | 'textarea' | 'multiple_choice' | 'checkbox' | 'dropdown' | 'yes_no' | 'rating' | 'number' | 'datetime';
  is_required: boolean;
  allow_comment?: boolean;
  help_text?: string;
  position: number;
  placeholder?: string;
  charLimit?: number;
  rows?: number;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

interface Section {
  id: string;
  title: string;
  description?: string;
  position: number;
  questions: Question[];
}

interface FormData {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  welcome_message?: string;
  closing_message?: string;
  status: 'draft' | 'published' | 'archived';
  settings?: {
    allowAnonymous?: boolean;
    requireEmail?: boolean;
    estimatedTime?: string;
    confidentialityNotice?: string;
    reviewPeriod?: string;
  };
  sections: Section[];
}

export default function FormEditor() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  useEffect(() => {
    if (formId && formId !== 'new') {
      loadForm();
    } else {
      // Create new form
      setForm({
        id: `form-${Date.now()}`,
        title: 'New Form',
        description: '',
        instructions: '',
        welcome_message: '',
        closing_message: '',
        status: 'draft',
        settings: {
          allowAnonymous: false,
          requireEmail: true,
          estimatedTime: '15-20 minutes'
        },
        sections: [
          {
            id: 'section-1',
            title: 'Section 1',
            description: '',
            position: 1,
            questions: []
          }
        ]
      });
      setLoading(false);
      setHasChanges(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  const loadForm = async () => {
    try {
      const response = await fetch(`/api/forms/${formId}`);
      if (!response.ok) throw new Error('Failed to load form');
      const data = await response.json();
      
      // Transform API response to editor format
      const formData: FormData = {
        id: data.id,
        title: data.title,
        description: data.description,
        instructions: data.instructions,
        welcome_message: data.welcome_message,
        closing_message: data.closing_message,
        status: data.status || 'draft',
        settings: data.settings || {},
        sections: data.sections.map((section: any) => ({
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
            help_text: q.description,
            position: q.position,
            placeholder: q.features?.placeholder,
            charLimit: q.features?.charLimit,
            rows: q.features?.rows
          }))
        }))
      };
      
      setForm(formData);
    } catch (err) {
      setError('Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  const saveForm = async () => {
    if (!form) return;
    
    setSaving(true);
    setError('');
    
    try {
      const token = sessionStorage.getItem('admin_token');
      const response = await fetch(`/api/admin/forms/${form.id}?token=${token}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save form');
      }
      
      setHasChanges(false);
      // Show success message
      toast({
        title: "Form saved",
        description: "Your changes have been saved successfully.",
        variant: "success",
      });
    } catch (err) {
      setError('Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (updates: Partial<FormData>) => {
    if (!form) return;
    setForm({ ...form, ...updates });
    setHasChanges(true);
  };

  const updateSection = (sectionId: string, updates: Partial<Section>) => {
    if (!form) return;
    setForm({
      ...form,
      sections: form.sections.map(s => 
        s.id === sectionId ? { ...s, ...updates } : s
      )
    });
    setHasChanges(true);
  };

  const addSection = () => {
    if (!form) return;
    const newSection: Section = {
      id: `section-${Date.now()}`,
      title: `Section ${form.sections.length + 1}`,
      description: '',
      position: form.sections.length + 1,
      questions: []
    };
    setForm({
      ...form,
      sections: [...form.sections, newSection]
    });
    setHasChanges(true);
  };

  const deleteSection = (sectionId: string) => {
    if (!form) return;
    if (form.sections.length === 1) {
      toast({
        title: "Cannot delete",
        description: "Cannot delete the last section",
        variant: "destructive",
      });
      return;
    }
    setForm({
      ...form,
      sections: form.sections.filter(s => s.id !== sectionId)
    });
    setHasChanges(true);
  };

  const addQuestion = (sectionId: string) => {
    if (!form) return;
    const section = form.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      title: 'New Question',
      question_type: 'likert',
      is_required: false,
      position: section.questions.length + 1
    };
    
    updateSection(sectionId, {
      questions: [...section.questions, newQuestion]
    });
  };

  const updateQuestion = (sectionId: string, questionId: string, updates: Partial<Question>) => {
    if (!form) return;
    const section = form.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    updateSection(sectionId, {
      questions: section.questions.map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      )
    });
  };

  const deleteQuestion = (sectionId: string, questionId: string) => {
    if (!form) return;
    const section = form.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    updateSection(sectionId, {
      questions: section.questions.filter(q => q.id !== questionId)
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 flex items-center justify-center">
        <div className="text-lg text-gray-800">Loading form...</div>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || 'Form not found'}</p>
            <Button 
              onClick={() => navigate('/admin')} 
              className="mt-4"
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => {
                if (hasChanges) {
                  setPendingNavigation('/admin');
                  setShowUnsavedDialog(true);
                } else {
                  navigate('/admin');
                }
              }}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-gray-800">
              {formId === 'new' ? 'Create New Form' : 'Edit Form'}
            </h1>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <span className="text-sm text-amber-600 flex items-center">
                <span className="w-2 h-2 bg-amber-600 rounded-full mr-2"></span>
                Unsaved changes
              </span>
            )}
            <Button
              onClick={saveForm}
              disabled={saving || !hasChanges}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Form'}
            </Button>
          </div>
        </div>

        {/* Form Metadata */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Form Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Form Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => updateForm({ title: e.target.value })}
                  placeholder="Enter form title"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => updateForm({ status: e.target.value as FormData['status'] })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description || ''}
                onChange={(e) => updateForm({ description: e.target.value })}
                placeholder="Brief description of the form"
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="instructions">Initial Instructions</Label>
              <Textarea
                id="instructions"
                value={form.instructions || ''}
                onChange={(e) => updateForm({ instructions: e.target.value })}
                placeholder="Instructions shown at the beginning of the form (e.g., review period, context, etc.)"
                rows={4}
              />
            </div>
            
            <div>
              <Label htmlFor="welcome">Welcome Message</Label>
              <Textarea
                id="welcome"
                value={form.welcome_message || ''}
                onChange={(e) => updateForm({ welcome_message: e.target.value })}
                placeholder="Message shown when starting the form"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="closing">Closing Message</Label>
              <Textarea
                id="closing"
                value={form.closing_message || ''}
                onChange={(e) => updateForm({ closing_message: e.target.value })}
                placeholder="Message shown after submission"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="space-y-6">
          {form.sections.map((section) => (
            <Card key={section.id}>
              <CardHeader className="bg-gradient-to-r from-cambridge-blue/10 to-cerulean/10">
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={section.title}
                      onChange={(e) => updateSection(section.id, { title: e.target.value })}
                      className="text-lg font-semibold"
                      placeholder="Section title"
                    />
                    <Textarea
                      value={section.description || ''}
                      onChange={(e) => updateSection(section.id, { description: e.target.value })}
                      placeholder="Section description (optional)"
                      rows={2}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSection(section.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {/* Questions */}
                <div className="space-y-4">
                  {section.questions.map((question, questionIndex) => (
                    <div key={question.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-600">
                            Question {questionIndex + 1}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={question.question_type}
                            onChange={(e) => updateQuestion(section.id, question.id, { 
                              question_type: e.target.value as Question['question_type'] 
                            })}
                            className="text-sm px-2 py-1 border rounded"
                          >
                            <optgroup label="Rating">
                              <option value="likert">Likert Scale</option>
                              <option value="rating">Star Rating</option>
                            </optgroup>
                            <optgroup label="Text">
                              <option value="text">Text Input</option>
                              <option value="textarea">Text Area</option>
                            </optgroup>
                            <optgroup label="Selection">
                              <option value="multiple_choice">Multiple Choice</option>
                              <option value="checkbox">Checkbox Group</option>
                              <option value="dropdown">Dropdown</option>
                              <option value="yes_no">Yes/No</option>
                            </optgroup>
                            <optgroup label="Numeric">
                              <option value="number">Number Input</option>
                            </optgroup>
                            <optgroup label="Date/Time">
                              <option value="datetime">Date & Time</option>
                            </optgroup>
                          </select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteQuestion(section.id, question.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Input
                          value={question.title}
                          onChange={(e) => updateQuestion(section.id, question.id, { title: e.target.value })}
                          placeholder="Question text"
                        />
                        
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={question.is_required}
                              onChange={(e) => updateQuestion(section.id, question.id, { 
                                is_required: e.target.checked 
                              })}
                            />
                            <span className="text-sm">Required</span>
                          </label>
                        </div>
                        
                        <Input
                          value={question.help_text || ''}
                          onChange={(e) => updateQuestion(section.id, question.id, { help_text: e.target.value })}
                          placeholder="Help text (optional)"
                          className="text-sm"
                        />
                        
                        {(question.question_type === 'text' || question.question_type === 'textarea') && (
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={question.placeholder || ''}
                              onChange={(e) => updateQuestion(section.id, question.id, { 
                                placeholder: e.target.value 
                              })}
                              placeholder="Placeholder text"
                              className="text-sm"
                            />
                            <Input
                              type="number"
                              value={question.charLimit || ''}
                              onChange={(e) => updateQuestion(section.id, question.id, { 
                                charLimit: parseInt(e.target.value) || undefined 
                              })}
                              placeholder="Character limit"
                              className="text-sm"
                            />
                          </div>
                        )}
                        
                        {/* Options for selection-based questions */}
                        {(question.question_type === 'multiple_choice' || 
                          question.question_type === 'checkbox' || 
                          question.question_type === 'dropdown') && (
                          <div className="space-y-2">
                            <Label className="text-sm">Options (one per line)</Label>
                            <Textarea
                              value={question.options?.join('\n') || ''}
                              onChange={(e) => {
                                const options = e.target.value.split('\n').filter(o => o.trim());
                                updateQuestion(section.id, question.id, { options });
                              }}
                              placeholder={`Option 1\nOption 2\nOption 3`}
                              rows={4}
                              className="text-sm font-mono"
                            />
                          </div>
                        )}
                        
                        {/* Number input configuration */}
                        {question.question_type === 'number' && (
                          <div className="grid grid-cols-3 gap-2">
                            <Input
                              type="number"
                              value={question.min ?? ''}
                              onChange={(e) => updateQuestion(section.id, question.id, { 
                                min: e.target.value ? parseInt(e.target.value) : undefined 
                              })}
                              placeholder="Min value"
                              className="text-sm"
                            />
                            <Input
                              type="number"
                              value={question.max ?? ''}
                              onChange={(e) => updateQuestion(section.id, question.id, { 
                                max: e.target.value ? parseInt(e.target.value) : undefined 
                              })}
                              placeholder="Max value"
                              className="text-sm"
                            />
                            <Input
                              type="number"
                              value={question.step ?? ''}
                              onChange={(e) => updateQuestion(section.id, question.id, { 
                                step: e.target.value ? parseFloat(e.target.value) : undefined 
                              })}
                              placeholder="Step"
                              className="text-sm"
                            />
                          </div>
                        )}
                        
                        {/* Allow comment for certain question types */}
                        {(question.question_type === 'multiple_choice' || 
                          question.question_type === 'checkbox' || 
                          question.question_type === 'dropdown' ||
                          question.question_type === 'yes_no' ||
                          question.question_type === 'rating') && (
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={question.allow_comment || false}
                              onChange={(e) => updateQuestion(section.id, question.id, { 
                                allow_comment: e.target.checked 
                              })}
                            />
                            <span className="text-sm">Allow Comment</span>
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button
                  onClick={() => addQuestion(section.id)}
                  variant="outline"
                  className="mt-4 w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Button
          onClick={addSection}
          className="mt-6 w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Section
        </Button>
      </div>
      
      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnsavedDialog(false)}>
              Stay
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowUnsavedDialog(false);
                if (pendingNavigation) {
                  navigate(pendingNavigation);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Leave Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}