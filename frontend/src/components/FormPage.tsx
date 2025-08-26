import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormData, AnswerInput } from "@/types";
import MultipleChoice from "@/components/MultipleChoice";
import CheckboxGroup from "@/components/CheckboxGroup";
import DropdownSelect from "@/components/DropdownSelect";
import YesNoQuestion from "@/components/YesNoQuestion";
import RatingScale from "@/components/RatingScale";
import NumberInput from "@/components/NumberInput";
import DateTimePicker from "@/components/DateTimePicker";

const likertOptions = [
  { value: 1, label: "Strongly Disagree", shortLabel: "Strongly Disagree" },
  { value: 2, label: "Disagree", shortLabel: "Disagree" },
  { value: 3, label: "Neutral", shortLabel: "Neutral" },
  { value: 4, label: "Agree", shortLabel: "Agree" },
  { value: 5, label: "Strongly Agree", shortLabel: "Strongly Agree" },
];

// Dynamic sections will be loaded from the form data

export default function FormPage() {
  const navigate = useNavigate();
  const { formId } = useParams<{ formId: string }>();
  const STORAGE_KEY = `likert-form-progress-${formId}`;
  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentSection, setCurrentSection] = useState(-1); // Start with personal info page
  const [validationErrors, setValidationErrors] = useState<Set<string>>(
    new Set(),
  );
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [showRestoredMessage, setShowRestoredMessage] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draggingQuestion, setDraggingQuestion] = useState<number | null>(null);
  const [checkingSubmission, setCheckingSubmission] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [answers, setAnswers] = useState<Map<string, AnswerInput>>(new Map());

  // Save to local storage whenever form data changes
  useEffect(() => {
    if (!loading && formData) {
      // Only save if user has actually entered some data
      const hasData =
        name.trim() ||
        email.trim() ||
        role.trim() ||
        Array.from(answers.values()).some(
          (a) => a.likert_value !== null || a.comment,
        );

      if (hasData) {
        // Show saving indicator
        setIsSaving(true);

        // Save data
        const dataToSave = {
          name,
          email,
          role,
          currentSection,
          answers: Array.from(answers.entries()),
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));

        // Ensure saving indicator shows for at least 250ms
        setTimeout(() => {
          setIsSaving(false);
          setLastSaved(new Date());
        }, 250);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, email, role, answers, currentSection, loading, formData]);

  useEffect(() => {
    fetchForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchForm = async () => {
    if (!formId) {
      navigate("/");
      return;
    }

    try {
      const response = await fetch(`/api/forms/${formId}`);
      if (!response.ok) throw new Error("Failed to load form");
      const data = await response.json();
      // Transform v2 data to match original format - include ALL questions
      const transformedData = {
        title: data.title,
        description: data.description,
        instructions: data.instructions,
        welcome_message: data.welcome_message,
        closing_message: data.closing_message,
        sections: data.sections.map((section: any) => ({
          id: section.id,
          title: section.title,
          description: section.description,
          position: section.position,
          questions: section.questions.map((q: any) => ({
            id: q.id, // Use the string ID directly from backend
            question_text: q.title,
            question_type: q.type,
            is_required:
              q.features?.required === 1 || q.features?.required === true,
            allow_comment:
              q.features?.allowComment === 1 ||
              q.features?.allowComment === true,
            position: q.position,
            help_text: q.description,
            placeholder: q.features?.placeholder,
            rows: q.features?.rows,
            charLimit: q.features?.charLimit,
            options: q.features?.options,
            min: q.features?.min,
            max: q.features?.max,
            step: q.features?.step,
            ratingStyle: q.features?.ratingStyle,
            dateFormat: q.features?.dateFormat,
          })),
        })),
        // Also keep flattened questions for backward compatibility
        questions: data.sections.flatMap((section: any) =>
          section.questions.map((q: any) => ({
            id: q.id,
            question_text: q.title,
            question_type: q.type,
            is_required:
              q.features?.required === 1 || q.features?.required === true,
            allow_comment:
              q.features?.allowComment === 1 ||
              q.features?.allowComment === true,
            position: q.position,
            help_text: q.description,
            placeholder: q.features?.placeholder,
            rows: q.features?.rows,
            charLimit: q.features?.charLimit,
            options: q.features?.options,
            min: q.features?.min,
            max: q.features?.max,
            step: q.features?.step,
            ratingStyle: q.features?.ratingStyle,
            dateFormat: q.features?.dateFormat,
          })),
        ),
        settings: data.settings,
      };
      console.log(
        "Transformed questions:",
        transformedData.questions.length,
        "questions",
      );
      setFormData(transformedData);

      // Try to restore saved progress from local storage
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          const savedDate = new Date(parsed.savedAt);
          const hoursSinceSaved =
            (Date.now() - savedDate.getTime()) / (1000 * 60 * 60);

          // Only restore if saved within last 24 hours
          if (hoursSinceSaved < 24) {
            setName(parsed.name || "");
            setEmail(parsed.email || "");
            setRole(parsed.role || "");
            setCurrentSection(parsed.currentSection ?? -1);

            // Restore answers
            const restoredAnswers = new Map<string, AnswerInput>();
            transformedData.questions.forEach((q: any) => {
              restoredAnswers.set(q.id, {
                question_id: q.id,
                likert_value: q.question_type === "likert" ? null : undefined,
                comment: "",
                text_value:
                  q.question_type === "text" || q.question_type === "textarea"
                    ? ""
                    : undefined,
                selected_option:
                  q.question_type === "multiple_choice" ||
                  q.question_type === "dropdown" ||
                  q.question_type === "yes_no"
                    ? undefined
                    : undefined,
                selected_options:
                  q.question_type === "checkbox" ? [] : undefined,
                number_value:
                  q.question_type === "number" || q.question_type === "rating"
                    ? undefined
                    : undefined,
                date_value:
                  q.question_type === "datetime" ? undefined : undefined,
              });
            });

            // Override with saved answers
            if (parsed.answers && Array.isArray(parsed.answers)) {
              parsed.answers.forEach(
                ([questionId, answer]: [string | number, AnswerInput]) => {
                  // Convert old numeric IDs to string if needed
                  const qId = String(questionId);
                  // Only restore if the question still exists in the form
                  if (restoredAnswers.has(qId)) {
                    // Make sure we're not mixing up answer types
                    const question = transformedData.questions.find(
                      (q: any) => q.id === qId,
                    );
                    if (question) {
                      const cleanAnswer = {
                        question_id: qId,
                        likert_value:
                          question.question_type === "likert"
                            ? answer.likert_value
                            : undefined,
                        comment:
                          (question.question_type === "likert" ||
                            question.question_type === "rating" ||
                            question.question_type === "multiple_choice" ||
                            question.question_type === "yes_no") &&
                          question.allow_comment
                            ? answer.comment || ""
                            : "",
                        text_value:
                          question.question_type === "text" ||
                          question.question_type === "textarea"
                            ? answer.text_value || ""
                            : undefined,
                        selected_option:
                          question.question_type === "multiple_choice" ||
                          question.question_type === "dropdown" ||
                          question.question_type === "yes_no"
                            ? answer.selected_option
                            : undefined,
                        selected_options:
                          question.question_type === "checkbox"
                            ? answer.selected_options || []
                            : undefined,
                        number_value:
                          question.question_type === "number" ||
                          question.question_type === "rating"
                            ? answer.number_value
                            : undefined,
                        date_value:
                          question.question_type === "datetime"
                            ? answer.date_value
                            : undefined,
                      };
                      restoredAnswers.set(qId, cleanAnswer);
                    }
                  }
                },
              );
            }

            setAnswers(restoredAnswers);

            // Show a message that progress was restored
            if (parsed.name || parsed.email || parsed.answers?.length > 0) {
              setShowRestoredMessage(true);
              console.log(
                "Form progress restored from",
                savedDate.toLocaleString(),
              );
            }
          } else {
            // Clear old saved data
            localStorage.removeItem(STORAGE_KEY);
            initializeEmptyForm(transformedData);
          }
        } catch (e) {
          console.error("Failed to restore saved progress:", e);
          localStorage.removeItem(STORAGE_KEY);
          initializeEmptyForm(transformedData);
        }
      } else {
        initializeEmptyForm(transformedData);
      }
    } catch (err) {
      setError("Failed to load form. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const initializeEmptyForm = (data: any) => {
    const initialAnswers = new Map<string, AnswerInput>();
    data.questions.forEach((q: any) => {
      initialAnswers.set(q.id, {
        question_id: q.id,
        likert_value: q.question_type === "likert" ? null : undefined,
        comment:
          (q.question_type === "likert" ||
            q.question_type === "rating" ||
            q.question_type === "multiple_choice" ||
            q.question_type === "yes_no") &&
          q.allow_comment
            ? ""
            : "",
        text_value:
          q.question_type === "text" || q.question_type === "textarea"
            ? ""
            : undefined,
        selected_option:
          q.question_type === "multiple_choice" ||
          q.question_type === "dropdown" ||
          q.question_type === "yes_no"
            ? undefined
            : undefined,
        selected_options: q.question_type === "checkbox" ? [] : undefined,
        number_value:
          q.question_type === "number" || q.question_type === "rating"
            ? undefined
            : undefined,
        date_value: q.question_type === "datetime" ? undefined : undefined,
      });
    });
    setAnswers(initialAnswers);
  };

  const handleLikertChange = (questionId: string, value: string) => {
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
    if (error && formData && formData.sections) {
      const section = formData.sections[currentSection];
      if (section) {
        const sectionQuestions = section.questions;
        const allRequiredAnswered = sectionQuestions
          .filter((q) => q.is_required)
          .every((q) => {
            if (q.id === questionId) return true; // We just answered this one
            const answer = answers.get(q.id);
            return answer && answer.likert_value !== null;
          });
        if (allRequiredAnswered) {
          setError("");
        }
      }
    }
  };

  const MAX_COMMENT_LENGTH = 500;

  const handleCommentChange = (questionId: string, comment: string) => {
    // Limit comment length
    if (comment.length > MAX_COMMENT_LENGTH) {
      return;
    }

    const current = answers.get(questionId)!;
    setAnswers(
      new Map(
        answers.set(questionId, {
          ...current,
          comment,
        }),
      ),
    );
  };

  const handleTextChange = (
    questionId: string,
    value: string,
    charLimit?: number,
  ) => {
    // Apply character limit if specified
    if (charLimit && value.length > charLimit) {
      return;
    }

    const current = answers.get(questionId)!;
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, {
      ...current,
      text_value: value,
    });
    setAnswers(newAnswers);

    // Clear validation error for this question if it now has content
    if (value.trim() && validationErrors.has(questionId)) {
      const newErrors = new Set(validationErrors);
      newErrors.delete(questionId);
      setValidationErrors(newErrors);
    }
  };

  const validateSection = (sectionIndex: number): boolean => {
    if (!formData || !formData.sections) return false;

    const section = formData.sections[sectionIndex];
    if (!section) return false;

    const sectionQuestions = section.questions;
    const newErrors = new Set<string>();
    let isValid = true;

    sectionQuestions.forEach((q) => {
      if (q.is_required) {
        const answer = answers.get(q.id);
        if (!answer) {
          newErrors.add(q.id);
          isValid = false;
        } else if (q.question_type === "likert" || !q.question_type) {
          if (answer.likert_value === null) {
            newErrors.add(q.id);
            isValid = false;
          }
        } else if (
          q.question_type === "text" ||
          q.question_type === "textarea"
        ) {
          if (!answer.text_value || answer.text_value.trim() === "") {
            newErrors.add(q.id);
            isValid = false;
          }
        } else if (
          q.question_type === "multiple_choice" ||
          q.question_type === "dropdown" ||
          q.question_type === "yes_no"
        ) {
          if (!answer.selected_option) {
            newErrors.add(q.id);
            isValid = false;
          }
        } else if (q.question_type === "checkbox") {
          if (
            !answer.selected_options ||
            answer.selected_options.length === 0
          ) {
            newErrors.add(q.id);
            isValid = false;
          }
        } else if (
          q.question_type === "number" ||
          q.question_type === "rating"
        ) {
          if (
            answer.number_value === undefined ||
            answer.number_value === null
          ) {
            newErrors.add(q.id);
            isValid = false;
          }
        } else if (q.question_type === "datetime") {
          if (!answer.date_value) {
            newErrors.add(q.id);
            isValid = false;
          }
        }
      }
    });

    setValidationErrors(newErrors);
    return isValid;
  };

  const validatePersonalInfo = (): boolean => {
    const newTouched = new Set(touchedFields);
    newTouched.add("name");
    newTouched.add("email");
    newTouched.add("role");
    setTouchedFields(newTouched);

    // Check required fields based on settings
    const nameRequired = !formData?.settings?.allowAnonymous;
    const emailRequired = formData?.settings?.requireEmail !== false;

    const nameValid = !nameRequired || name.trim() !== "";
    const emailValid =
      !emailRequired || (email.trim() !== "" && email.includes("@"));

    return nameValid && emailValid && role !== "";
  };

  const handleNextSection = async () => {
    if (currentSection === -1) {
      if (validatePersonalInfo()) {
        // Check if email has already submitted this form
        setCheckingSubmission(true);
        setError("");
        try {
          const response = await fetch(
            `/api/forms/${formId}/check-submission`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ email }),
            },
          );

          if (response.ok) {
            const data = await response.json();
            if (data.has_submitted) {
              setError(
                "Thank you for your interest! Our records show you have already submitted a response for this form. To ensure fair participation, each person can only submit once. If you believe this is an error, please contact the form administrator.",
              );
              setCheckingSubmission(false);
              return;
            }
          }
          // If check passes or fails silently, continue
          setCurrentSection(0);
          setError("");
        } catch (err) {
          // If the check fails, still allow them to proceed (fail open)
          console.error("Failed to check for existing submission:", err);
          setCurrentSection(0);
          setError("");
        } finally {
          setCheckingSubmission(false);
        }
      } else {
        setError("Please provide your name and valid email");
      }
    } else if (validateSection(currentSection)) {
      setCurrentSection(currentSection + 1);
      setError("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setError("Please answer all required questions before proceeding");
    }
  };

  const handlePreviousSection = () => {
    setCurrentSection(currentSection - 1);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    // Validate current section first
    if (!validateSection(currentSection)) {
      setError("Please answer all required questions in this section");
      return;
    }

    // Validate ALL required questions across all sections
    if (!formData) return;

    const unansweredRequired = formData.questions
      .filter((q) => q.is_required)
      .filter((q) => {
        const answer = answers.get(q.id);
        if (!answer) return true;

        // Check based on question type
        if (q.question_type === "likert" || !q.question_type) {
          return answer.likert_value === null;
        } else if (
          q.question_type === "text" ||
          q.question_type === "textarea"
        ) {
          return !answer.text_value || answer.text_value.trim() === "";
        } else if (
          q.question_type === "multiple_choice" ||
          q.question_type === "dropdown" ||
          q.question_type === "yes_no"
        ) {
          return !answer.selected_option;
        } else if (q.question_type === "checkbox") {
          return (
            !answer.selected_options || answer.selected_options.length === 0
          );
        } else if (
          q.question_type === "number" ||
          q.question_type === "rating"
        ) {
          return (
            answer.number_value === undefined || answer.number_value === null
          );
        } else if (q.question_type === "datetime") {
          return !answer.date_value;
        }

        // Default to false if unknown type
        return false;
      });

    if (unansweredRequired.length > 0) {
      console.log("Unanswered required questions:", unansweredRequired);
      console.log(
        "Current answers map:",
        Array.from(answers.entries()).map(([id, a]) => ({
          id,
          likert: a.likert_value,
        })),
      );
      setError(
        "Please complete all required questions in previous sections before submitting",
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Transform answers to v2 format
      const v2Answers = Array.from(answers.entries())
        .filter(([qId, a]) => {
          const question = formData.questions.find((q) => q.id === qId);
          if (!question) return false;

          // Include answers based on question type
          if (question.question_type === "likert" || !question.question_type) {
            return a.likert_value !== null;
          } else if (
            question.question_type === "text" ||
            question.question_type === "textarea"
          ) {
            return a.text_value && a.text_value.trim() !== "";
          } else if (
            question.question_type === "multiple_choice" ||
            question.question_type === "dropdown" ||
            question.question_type === "yes_no"
          ) {
            return a.selected_option !== undefined;
          } else if (question.question_type === "checkbox") {
            return a.selected_options && a.selected_options.length > 0;
          } else if (
            question.question_type === "number" ||
            question.question_type === "rating"
          ) {
            return a.number_value !== undefined && a.number_value !== null;
          } else if (question.question_type === "datetime") {
            return a.date_value !== undefined;
          }
          return false;
        })
        .map(([qId, a]) => {
          const question = formData.questions.find((q) => q.id === qId);

          if (
            question?.question_type === "text" ||
            question?.question_type === "textarea"
          ) {
            return {
              question_id: qId,
              value: a.text_value,
            };
          } else if (
            question?.question_type === "multiple_choice" ||
            question?.question_type === "dropdown" ||
            question?.question_type === "yes_no"
          ) {
            return {
              question_id: qId,
              value: a.comment
                ? {
                    selection: a.selected_option,
                    comment: a.comment,
                  }
                : a.selected_option,
            };
          } else if (question?.question_type === "checkbox") {
            return {
              question_id: qId,
              value: a.selected_options,
            };
          } else if (question?.question_type === "number") {
            return {
              question_id: qId,
              value: a.number_value,
            };
          } else if (question?.question_type === "rating") {
            return {
              question_id: qId,
              value: a.comment
                ? {
                    rating: a.number_value,
                    comment: a.comment,
                  }
                : a.number_value,
            };
          } else if (question?.question_type === "datetime") {
            return {
              question_id: qId,
              value: a.date_value,
            };
          }

          // Likert question (default)
          return {
            question_id: qId,
            value: a.comment
              ? {
                  rating: a.likert_value,
                  comment: a.comment,
                }
              : a.likert_value,
          };
        });

      const response = await fetch(`/api/forms/${formId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          respondent_name: name,
          respondent_email: email,
          role: role,
          answers: v2Answers,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Submission error:", errorText);
        throw new Error("Failed to submit form");
      }

      // Clear saved progress after successful submission
      localStorage.removeItem(STORAGE_KEY);
      // Store closing message for success page
      if (formData.closing_message) {
        sessionStorage.setItem(
          "form_closing_message",
          formData.closing_message,
        );
      }
      navigate("/success");
    } catch (err) {
      setError("Failed to submit form. Please try again.");
      console.error("Submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldTouch = (field: string) => {
    setTouchedFields(new Set(touchedFields).add(field));
  };

  const clearSavedProgress = () => {
    localStorage.removeItem(STORAGE_KEY);
    setShowRestoredMessage(false);
    // Reset form to clean state
    if (formData) {
      initializeEmptyForm(formData);
      setName("");
      setEmail("");
      setRole("");
      setCurrentSection(-1);
    }
  };

  // Check which sections have incomplete required questions
  const getSectionCompletionStatus = (sectionIndex: number): boolean => {
    if (!formData || !formData.sections) return false;
    const section = formData.sections[sectionIndex];
    if (!section) return false;

    return section.questions
      .filter((q) => q.is_required)
      .every((q) => {
        const answer = answers.get(q.id);
        if (!answer) return false;

        // Check based on question type
        if (q.question_type === "likert" || !q.question_type) {
          return answer.likert_value !== null;
        } else if (
          q.question_type === "text" ||
          q.question_type === "textarea"
        ) {
          return answer.text_value && answer.text_value.trim() !== "";
        } else if (
          q.question_type === "multiple_choice" ||
          q.question_type === "dropdown" ||
          q.question_type === "yes_no"
        ) {
          return !!answer.selected_option;
        } else if (q.question_type === "checkbox") {
          return answer.selected_options && answer.selected_options.length > 0;
        } else if (
          q.question_type === "number" ||
          q.question_type === "rating"
        ) {
          return (
            answer.number_value !== undefined && answer.number_value !== null
          );
        } else if (q.question_type === "datetime") {
          return !!answer.date_value;
        }
        return false;
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 flex items-center justify-center">
        <div className="text-lg text-gunmetal">Loading form...</div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 flex items-center justify-center">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  const totalSections = formData?.sections?.length || 0;
  const progressPercentage =
    currentSection === -1
      ? 0
      : ((currentSection + 1) / (totalSections + 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 py-4 sm:py-8 px-0 sm:px-4">
      <div className="max-w-4xl mx-auto">
        {showRestoredMessage && (
          <div className="mb-4 p-4 mx-4 sm:mx-0 bg-cambridge-blue/20 border border-cambridge-blue rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-cerulean"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-gunmetal">
                Your previous progress has been restored.
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowRestoredMessage(false)}
                className="text-sm px-3 py-1 bg-cerulean hover:bg-cerulean/90 text-white rounded-md transition-colors font-medium"
              >
                Continue
              </button>
              <button
                onClick={() => {
                  if (
                    confirm(
                      "Are you sure you want to start fresh? This will clear all your saved progress.",
                    )
                  ) {
                    clearSavedProgress();
                  }
                }}
                className="text-sm px-3 py-1 bg-rose-quartz/80 hover:bg-rose-quartz text-white rounded-md transition-colors"
              >
                Start Fresh
              </button>
            </div>
          </div>
        )}
        <div className="mb-4 sm:mb-6 px-4 sm:px-0">
          <div className="flex flex-col gap-2 mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gunmetal">
              {formData.title}
            </h1>
            {formData.description && (
              <p className="text-sm sm:text-base text-gunmetal/70">
                {formData.description}
              </p>
            )}
            <div className="flex items-center gap-4">
              {(isSaving || lastSaved) && (
                <span
                  className={`text-xs text-gunmetal/50 flex items-center gap-1 transition-all duration-300 ${
                    isSaving ? "opacity-100" : "opacity-70"
                  }`}
                >
                  {isSaving ? (
                    <>
                      <svg
                        className="w-3 h-3 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span className="animate-pulse">Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-3 h-3 text-cambridge-blue"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Saved</span>
                    </>
                  )}
                </span>
              )}
              <span className="text-sm text-gunmetal/70">
                {currentSection === -1
                  ? "Personal Information"
                  : formData?.sections?.[currentSection]
                    ? `Section ${currentSection + 1} of ${totalSections}`
                    : ""}
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

        <Card className="shadow-none sm:shadow-xl border-0 bg-white sm:bg-white/95 backdrop-blur rounded-none sm:rounded-lg">
          <CardHeader className="bg-gradient-to-r from-cerulean to-cambridge-blue text-white rounded-none sm:rounded-t-lg px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl">
              {currentSection === -1
                ? "Personal Information"
                : formData?.sections?.[currentSection]?.title || ""}
            </CardTitle>
            <CardDescription className="text-cream/90 mt-2 text-sm sm:text-base">
              {currentSection === -1
                ? "Please provide your contact information to begin the evaluation."
                : formData?.sections?.[currentSection]?.description ||
                  `Answer all questions in this section. Required questions are marked with a red asterisk (*).`}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 sm:pt-8 px-3 sm:px-6">
            {currentSection === -1 ? (
              <div className="space-y-6">
                {/* Welcome message */}
                {formData.welcome_message && (
                  <div className="bg-gradient-to-r from-cerulean/10 to-cambridge-blue/10 rounded-lg p-4 border border-cambridge-blue/20">
                    <div className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-cerulean mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                        />
                      </svg>
                      <div>
                        <h3 className="font-semibold text-gunmetal text-sm mb-2">
                          Welcome
                        </h3>
                        <p className="text-gunmetal/70 text-sm whitespace-pre-wrap">
                          {formData.welcome_message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Privacy notice with confidentiality info */}
                <div className="bg-cream/40 rounded-lg p-4 border border-cambridge-blue/20">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-cerulean mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <div>
                      <h3 className="font-semibold text-gunmetal text-sm mb-2">
                        Privacy Notice
                      </h3>
                      <p className="text-gunmetal/70 text-xs">
                        {formData.settings?.confidentialityNotice ||
                          `Your name and email are collected for verification purposes only to prevent duplicate submissions. 
                          Your form responses are separated from your identity and aggregated by role (Staff, Board, etc.) 
                          to ensure complete anonymity. Individual responses cannot be traced back to you and will not be 
                          shared with the person being evaluated.`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Instructions section with review period */}
                {(formData.instructions || formData.settings?.reviewPeriod) && (
                  <div className="bg-gradient-to-r from-cerulean/10 to-cambridge-blue/10 rounded-lg p-4 border border-cambridge-blue/20">
                    <div className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-cerulean mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <h3 className="font-semibold text-gunmetal text-sm mb-2">
                          Instructions
                        </h3>
                        {formData.settings?.reviewPeriod && (
                          <p className="text-gunmetal/70 text-sm mb-2">
                            <strong>Review Period:</strong>{" "}
                            {formData.settings.reviewPeriod}
                          </p>
                        )}
                        {formData.instructions && (
                          <p className="text-gunmetal/70 text-sm whitespace-pre-wrap">
                            {formData.instructions}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Time estimate section */}
                <div className="bg-gradient-to-r from-cambridge-blue/10 to-cerulean/10 rounded-lg p-4 border border-cambridge-blue/20">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-cerulean mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <h3 className="font-semibold text-gunmetal text-sm">
                        Estimated Time to Complete
                      </h3>
                      <p className="text-gunmetal/70 text-sm mt-1">
                        {formData.settings?.estimatedTime ||
                          `Approximately ${Math.ceil((formData.questions.length * 30) / 60)} minutes`}
                        <span className="text-xs ml-2 text-gunmetal/50">
                          ({formData.questions.length} questions)
                        </span>
                      </p>
                      <p className="text-xs text-gunmetal/50 mt-2">
                        Your progress is automatically saved as you go.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Name field - only show if not anonymous */}
                {!formData.settings?.allowAnonymous && (
                  <div>
                    <Label
                      htmlFor="name"
                      className="text-gunmetal font-semibold"
                    >
                      Name <span className="text-rose-quartz font-bold">*</span>
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        // Clear error if both fields are now valid
                        if (
                          error &&
                          e.target.value.trim() &&
                          email.trim() &&
                          email.includes("@")
                        ) {
                          setError("");
                        }
                      }}
                      onBlur={() => handleFieldTouch("name")}
                      required
                      className={`mt-2 border-2 transition-all bg-white/80 ${
                        touchedFields.has("name") && !name.trim()
                          ? "border-rose-quartz ring-2 ring-rose-quartz/30"
                          : "border-cambridge-blue/30 focus:border-cerulean focus:bg-white"
                      }`}
                      placeholder="Enter your full name"
                    />
                    {touchedFields.has("name") && !name.trim() && (
                      <p className="text-rose-quartz text-sm mt-1 font-medium">
                        Name is required
                      </p>
                    )}
                  </div>
                )}
                {/* Email field - only show if required by settings */}
                {formData.settings?.requireEmail !== false && (
                  <div>
                    <Label
                      htmlFor="email"
                      className="text-gunmetal font-semibold"
                    >
                      Email{" "}
                      <span className="text-rose-quartz font-bold">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        // Clear error if both fields are now valid
                        if (
                          error &&
                          name.trim() &&
                          e.target.value.trim() &&
                          e.target.value.includes("@")
                        ) {
                          setError("");
                        }
                      }}
                      onBlur={() => handleFieldTouch("email")}
                      required
                      className={`mt-2 border-2 transition-all bg-white/80 ${
                        touchedFields.has("email") &&
                        (!email.trim() || !email.includes("@"))
                          ? "border-rose-quartz ring-2 ring-rose-quartz/30"
                          : "border-cambridge-blue/30 focus:border-cerulean focus:bg-white"
                      }`}
                      placeholder="your.email@example.com"
                    />
                    {touchedFields.has("email") &&
                      (!email.trim() || !email.includes("@")) && (
                        <p className="text-rose-quartz text-sm mt-1 font-medium">
                          Valid email is required
                        </p>
                      )}
                  </div>
                )}

                {/* Role selection */}
                <div>
                  <Label className="text-gunmetal font-semibold">
                    Your Role{" "}
                    <span className="text-rose-quartz font-bold">*</span>
                  </Label>
                  <div className="mt-3 space-y-2">
                    {[
                      { value: "staff", label: "Staff Member" },
                      { value: "board", label: "Board Member" },
                      { value: "executive", label: "Executive Director" },
                      { value: "other", label: "Other" },
                    ].map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:bg-cambridge-blue/5 
                          ${role === option.value ? "border-cerulean bg-cerulean/10" : "border-cambridge-blue/30 bg-white/80"}`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={option.value}
                          checked={role === option.value}
                          onChange={(e) => {
                            setRole(e.target.value);
                            if (error && e.target.value) {
                              setError("");
                            }
                          }}
                          className="w-4 h-4 text-cerulean focus:ring-cerulean"
                        />
                        <span className="text-gunmetal">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {touchedFields.has("role") && !role && (
                    <p className="text-rose-quartz text-sm mt-2 font-medium">
                      Please select your role
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {formData.sections?.[currentSection]?.questions?.map(
                  (question: any, idx: number) => (
                    <div
                      key={`question-${currentSection}-${idx}-${question.id}`}
                      className={`p-3 sm:p-5 rounded-lg sm:rounded-xl transition-all ${
                        validationErrors.has(question.id)
                          ? "bg-rose-quartz/10 border-2 border-rose-quartz shadow-lg shadow-rose-quartz/20"
                          : "bg-gradient-to-r from-cream/30 to-cambridge-blue/10 border border-cambridge-blue/20"
                      }`}
                    >
                      <div className="space-y-3 sm:space-y-4">
                        {/* Question text with number - only show for basic types */}
                        {(!question.question_type ||
                          question.question_type === "likert" ||
                          question.question_type === "text" ||
                          question.question_type === "textarea") && (
                          <div className="flex items-start gap-2 sm:gap-3">
                            <span className="text-xs sm:text-sm font-bold text-white bg-cerulean rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <Label className="text-sm sm:text-base text-gunmetal leading-relaxed">
                                {question.question_text}
                                {question.is_required && (
                                  <span className="text-rose-quartz ml-1 font-bold">
                                    *
                                  </span>
                                )}
                              </Label>
                              {question.help_text && (
                                <p className="text-xs text-gunmetal/60 mt-1">
                                  {question.help_text}
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {validationErrors.has(question.id) && (
                          <div className="text-rose-quartz text-sm font-medium bg-rose-quartz/20 px-3 py-1 rounded-md inline-block mx-auto">
                            This question is required
                          </div>
                        )}

                        {/* Render based on question type */}
                        {question.question_type === "textarea" ? (
                          /* Textarea question */
                          <div className="w-full">
                            <Textarea
                              value={answers.get(question.id)?.text_value || ""}
                              onChange={(e) =>
                                handleTextChange(
                                  question.id,
                                  e.target.value,
                                  question.charLimit,
                                )
                              }
                              placeholder={
                                question.placeholder ||
                                "Enter your response here..."
                              }
                              className="w-full min-h-[120px] border-2 border-cambridge-blue/30 focus:border-cerulean"
                              rows={question.rows || 5}
                              maxLength={question.charLimit}
                            />
                            {question.charLimit && (
                              <span className="text-xs text-gunmetal/50 mt-1">
                                {answers.get(question.id)?.text_value?.length ||
                                  0}
                                /{question.charLimit} characters
                              </span>
                            )}
                          </div>
                        ) : question.question_type === "text" ? (
                          /* Text input question */
                          <div className="w-full">
                            <Input
                              type="text"
                              value={answers.get(question.id)?.text_value || ""}
                              onChange={(e) =>
                                handleTextChange(
                                  question.id,
                                  e.target.value,
                                  question.charLimit,
                                )
                              }
                              placeholder={
                                question.placeholder || "Enter your response"
                              }
                              className="w-full border-2 border-cambridge-blue/30 focus:border-cerulean"
                              maxLength={question.charLimit}
                            />
                            {question.charLimit && (
                              <span className="text-xs text-gunmetal/50 mt-1">
                                {answers.get(question.id)?.text_value?.length ||
                                  0}
                                /{question.charLimit} characters
                              </span>
                            )}
                          </div>
                        ) : question.question_type === "multiple_choice" ? (
                          /* Multiple choice question */
                          <MultipleChoice
                            questionId={question.id}
                            question={question.question_text}
                            options={question.options || []}
                            value={
                              answers.get(question.id)?.selected_option || ""
                            }
                            comment={answers.get(question.id)?.comment || ""}
                            allowComment={question.allow_comment}
                            isRequired={question.is_required}
                            onChange={(value) => {
                              const newAnswers = new Map(answers);
                              const current = newAnswers.get(question.id) || {
                                question_id: question.id,
                                comment: "",
                              };
                              newAnswers.set(question.id, {
                                ...current,
                                selected_option: value,
                              });
                              setAnswers(newAnswers);
                              if (validationErrors.has(question.id)) {
                                const newErrors = new Set(validationErrors);
                                newErrors.delete(question.id);
                                setValidationErrors(newErrors);
                              }
                            }}
                            onCommentChange={(comment) =>
                              handleCommentChange(question.id, comment)
                            }
                          />
                        ) : question.question_type === "checkbox" ? (
                          /* Checkbox group question */
                          <CheckboxGroup
                            questionId={question.id}
                            question={question.question_text}
                            options={question.options || []}
                            value={
                              answers.get(question.id)?.selected_options || []
                            }
                            comment={answers.get(question.id)?.comment || ""}
                            allowComment={question.allow_comment}
                            isRequired={question.is_required}
                            onChange={(values) => {
                              const newAnswers = new Map(answers);
                              const current = newAnswers.get(question.id) || {
                                question_id: question.id,
                                comment: "",
                              };
                              newAnswers.set(question.id, {
                                ...current,
                                selected_options: values,
                              });
                              setAnswers(newAnswers);
                              if (
                                values.length > 0 &&
                                validationErrors.has(question.id)
                              ) {
                                const newErrors = new Set(validationErrors);
                                newErrors.delete(question.id);
                                setValidationErrors(newErrors);
                              }
                            }}
                            onCommentChange={(comment) =>
                              handleCommentChange(question.id, comment)
                            }
                          />
                        ) : question.question_type === "dropdown" ? (
                          /* Dropdown select question */
                          <DropdownSelect
                            questionId={question.id}
                            question={question.question_text}
                            options={question.options || []}
                            value={
                              answers.get(question.id)?.selected_option || ""
                            }
                            isRequired={question.is_required}
                            onChange={(value) => {
                              const newAnswers = new Map(answers);
                              const current = newAnswers.get(question.id) || {
                                question_id: question.id,
                                comment: "",
                              };
                              newAnswers.set(question.id, {
                                ...current,
                                selected_option: value,
                              });
                              setAnswers(newAnswers);
                              if (validationErrors.has(question.id)) {
                                const newErrors = new Set(validationErrors);
                                newErrors.delete(question.id);
                                setValidationErrors(newErrors);
                              }
                            }}
                            placeholder={question.placeholder}
                          />
                        ) : question.question_type === "yes_no" ? (
                          /* Yes/No question */
                          <YesNoQuestion
                            questionId={question.id}
                            question={question.question_text}
                            value={
                              answers.get(question.id)?.selected_option || ""
                            }
                            comment={answers.get(question.id)?.comment || ""}
                            allowComment={question.allow_comment}
                            isRequired={question.is_required}
                            onChange={(value) => {
                              const newAnswers = new Map(answers);
                              const current = newAnswers.get(question.id) || {
                                question_id: question.id,
                                comment: "",
                              };
                              newAnswers.set(question.id, {
                                ...current,
                                selected_option: value,
                              });
                              setAnswers(newAnswers);
                              if (validationErrors.has(question.id)) {
                                const newErrors = new Set(validationErrors);
                                newErrors.delete(question.id);
                                setValidationErrors(newErrors);
                              }
                            }}
                            onCommentChange={(comment) =>
                              handleCommentChange(question.id, comment)
                            }
                          />
                        ) : question.question_type === "rating" ? (
                          /* Rating scale question */
                          <RatingScale
                            questionId={question.id}
                            question={question.question_text}
                            value={answers.get(question.id)?.number_value}
                            comment={answers.get(question.id)?.comment || ""}
                            allowComment={question.allow_comment}
                            isRequired={question.is_required}
                            min={question.min || 1}
                            max={question.max || 5}
                            ratingStyle={question.ratingStyle || "stars"}
                            onChange={(value) => {
                              const newAnswers = new Map(answers);
                              const current = newAnswers.get(question.id) || {
                                question_id: question.id,
                                comment: "",
                              };
                              newAnswers.set(question.id, {
                                ...current,
                                number_value: value,
                              });
                              setAnswers(newAnswers);
                              if (validationErrors.has(question.id)) {
                                const newErrors = new Set(validationErrors);
                                newErrors.delete(question.id);
                                setValidationErrors(newErrors);
                              }
                            }}
                            onCommentChange={(comment) =>
                              handleCommentChange(question.id, comment)
                            }
                          />
                        ) : question.question_type === "number" ? (
                          /* Number input question */
                          <NumberInput
                            questionId={question.id}
                            question={question.question_text}
                            value={answers.get(question.id)?.number_value}
                            isRequired={question.is_required}
                            onChange={(value) => {
                              const newAnswers = new Map(answers);
                              const current = newAnswers.get(question.id) || {
                                question_id: question.id,
                                comment: "",
                              };
                              newAnswers.set(question.id, {
                                ...current,
                                number_value: value,
                              });
                              setAnswers(newAnswers);
                              if (
                                value !== undefined &&
                                value !== null &&
                                validationErrors.has(question.id)
                              ) {
                                const newErrors = new Set(validationErrors);
                                newErrors.delete(question.id);
                                setValidationErrors(newErrors);
                              }
                            }}
                            min={question.min}
                            max={question.max}
                            step={question.step}
                            placeholder={question.placeholder}
                          />
                        ) : question.question_type === "datetime" ? (
                          /* Date/Time picker question */
                          <DateTimePicker
                            questionId={question.id}
                            question={question.question_text}
                            value={answers.get(question.id)?.date_value || ""}
                            isRequired={question.is_required}
                            type="datetime"
                            // TODO: Add format support to DateTimePicker component
                            // format={question.dateFormat}
                            onChange={(value) => {
                              const newAnswers = new Map(answers);
                              const current = newAnswers.get(question.id) || {
                                question_id: question.id,
                                comment: "",
                              };
                              newAnswers.set(question.id, {
                                ...current,
                                date_value: value,
                              });
                              setAnswers(newAnswers);
                              if (validationErrors.has(question.id)) {
                                const newErrors = new Set(validationErrors);
                                newErrors.delete(question.id);
                                setValidationErrors(newErrors);
                              }
                            }}
                          />
                        ) : (
                          /* Likert scale buttons - default */
                          <div className="flex justify-center w-full">
                            <div
                              className="flex flex-row sm:inline-flex sm:flex-row rounded-xl sm:rounded-2xl bg-cream/30 p-1.5 sm:p-2 shadow-inner w-full sm:w-auto select-none"
                              onMouseDown={(e) => {
                                e.currentTarget.getBoundingClientRect();
                                setDraggingQuestion(question.id);
                              }}
                              onMouseMove={(e) => {
                                if (
                                  draggingQuestion === question.id &&
                                  e.buttons === 1
                                ) {
                                  e.preventDefault();
                                  const rect =
                                    e.currentTarget.getBoundingClientRect();
                                  const x = e.clientX - rect.left;
                                  const width = rect.width;
                                  const position = Math.max(
                                    0,
                                    Math.min(1, x / width),
                                  );
                                  const optionIndex = Math.round(
                                    position * (likertOptions.length - 1),
                                  );
                                  const selectedValue =
                                    likertOptions[optionIndex].value;
                                  if (
                                    answers.get(question.id)?.likert_value !==
                                    selectedValue
                                  ) {
                                    handleLikertChange(
                                      question.id,
                                      selectedValue.toString(),
                                    );
                                  }
                                }
                              }}
                              onMouseUp={() => {
                                setDraggingQuestion(null);
                              }}
                              onMouseLeave={() => {
                                setDraggingQuestion(null);
                              }}
                              onTouchStart={(e) => {
                                e.touches[0];
                                setDraggingQuestion(question.id);
                              }}
                              onTouchMove={(e) => {
                                if (draggingQuestion === question.id) {
                                  e.preventDefault();
                                  const touch = e.touches[0];
                                  const rect =
                                    e.currentTarget.getBoundingClientRect();
                                  const x = touch.clientX - rect.left;
                                  const width = rect.width;
                                  const position = Math.max(
                                    0,
                                    Math.min(1, x / width),
                                  );
                                  const optionIndex = Math.round(
                                    position * (likertOptions.length - 1),
                                  );
                                  const selectedValue =
                                    likertOptions[optionIndex].value;
                                  if (
                                    answers.get(question.id)?.likert_value !==
                                    selectedValue
                                  ) {
                                    handleLikertChange(
                                      question.id,
                                      selectedValue.toString(),
                                    );
                                  }
                                }
                              }}
                              onTouchEnd={() => {
                                setDraggingQuestion(null);
                              }}
                              style={{
                                cursor:
                                  draggingQuestion === question.id
                                    ? "grabbing"
                                    : "grab",
                              }}
                            >
                              <div className="flex flex-row gap-0.5 sm:gap-1 overflow-visible pointer-events-none w-full justify-between">
                                {likertOptions.map((option, index) => {
                                  const isSelected =
                                    answers.get(question.id)?.likert_value ===
                                    option.value;
                                  const isDragging =
                                    draggingQuestion === question.id;

                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleLikertChange(
                                          question.id,
                                          option.value.toString(),
                                        );
                                      }}
                                      onMouseDown={(e) => e.stopPropagation()}
                                      className={`
                                    relative px-1.5 sm:px-4 lg:px-5 py-2 sm:py-3 lg:py-3.5 text-[9px] sm:text-sm lg:text-base font-medium flex-1 sm:flex-initial rounded-lg sm:rounded-xl
                                    transform transition-all ${isDragging ? "duration-100" : "duration-300"} ease-out pointer-events-auto
                                    ${
                                      isSelected
                                        ? "bg-gradient-to-r from-cerulean to-cambridge-blue text-white shadow-lg scale-105 sm:scale-110 z-10 animate-pop"
                                        : "bg-white/70 text-gunmetal/70 hover:bg-white hover:text-gunmetal hover:shadow-md hover:scale-105 scale-100"
                                    }
                                  `}
                                      style={{
                                        animation:
                                          isSelected && !isDragging
                                            ? "pop 0.3s ease-out"
                                            : undefined,
                                        minWidth:
                                          index === 0 || index === 4
                                            ? "52px"
                                            : "40px",
                                      }}
                                      aria-label={option.label}
                                      title={option.label}
                                    >
                                      <span className="block">
                                        <span className="hidden sm:inline whitespace-nowrap">
                                          {option.label}
                                        </span>
                                        <span className="sm:hidden flex flex-col items-center justify-center">
                                          {index === 0 ? (
                                            <>
                                              <span className="font-semibold leading-tight">
                                                Strongly
                                              </span>
                                              <span className="leading-tight">
                                                Disagree
                                              </span>
                                            </>
                                          ) : index === 4 ? (
                                            <>
                                              <span className="font-semibold leading-tight">
                                                Strongly
                                              </span>
                                              <span className="leading-tight">
                                                Agree
                                              </span>
                                            </>
                                          ) : index === 1 ? (
                                            <span className="font-medium">
                                              Disagree
                                            </span>
                                          ) : index === 2 ? (
                                            <span className="font-medium">
                                              Neutral
                                            </span>
                                          ) : (
                                            <span className="font-medium">
                                              Agree
                                            </span>
                                          )}
                                        </span>
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Comments section - full width (only for likert questions) */}
                        {question.allow_comment &&
                          (!question.question_type ||
                            question.question_type === "likert") && (
                            <div className="w-full">
                              <div className="flex items-center justify-between mb-2">
                                <Label
                                  htmlFor={`comment-${question.id}`}
                                  className="text-sm text-gunmetal/70 font-medium"
                                >
                                  Comments (optional)
                                </Label>
                                <span
                                  className={`text-xs ${
                                    (answers.get(question.id)?.comment
                                      ?.length || 0) >
                                    MAX_COMMENT_LENGTH * 0.9
                                      ? "text-rose-quartz font-semibold"
                                      : "text-gunmetal/50"
                                  }`}
                                >
                                  {answers.get(question.id)?.comment?.length ||
                                    0}
                                  /{MAX_COMMENT_LENGTH}
                                </span>
                              </div>
                              <Textarea
                                id={`comment-${question.id}`}
                                value={answers.get(question.id)?.comment || ""}
                                onChange={(e) =>
                                  handleCommentChange(
                                    question.id,
                                    e.target.value,
                                  )
                                }
                                placeholder="Add any additional context or feedback..."
                                className="mt-2 border-cambridge-blue/30 focus:border-cerulean bg-white/80"
                                rows={3}
                                maxLength={MAX_COMMENT_LENGTH}
                              />
                            </div>
                          )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}

            {error && (
              <div
                className={`mt-6 p-4 rounded-md ${
                  error.includes("already submitted")
                    ? "bg-amber-50 border-l-4 border-amber-500 text-amber-900"
                    : "bg-rose-quartz/10 border-l-4 border-rose-quartz text-gunmetal"
                }`}
              >
                {error.includes("already submitted") && (
                  <div className="flex items-start">
                    <svg
                      className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>{error}</div>
                  </div>
                )}
                {!error.includes("already submitted") && error}
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

              {currentSection < totalSections - 1 ? (
                <Button
                  onClick={handleNextSection}
                  disabled={checkingSubmission}
                  className="bg-gradient-to-r from-cerulean to-cambridge-blue hover:from-cerulean/90 hover:to-cambridge-blue/90 text-white px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkingSubmission ? "Checking..." : "Next Section →"}
                </Button>
              ) : currentSection === totalSections - 1 ? (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-gradient-to-r from-cambridge-blue to-cerulean hover:from-cambridge-blue/90 hover:to-cerulean/90 text-white font-bold px-8 py-3 rounded-lg transition-all shadow-xl"
                >
                  {submitting ? "Submitting..." : "Submit Review"}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleNextSection}
                  disabled={checkingSubmission}
                  className="bg-gradient-to-r from-cerulean to-cambridge-blue hover:from-cerulean/90 hover:to-cambridge-blue/90 text-white font-semibold px-6 py-3 rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkingSubmission ? "Checking..." : "Begin Evaluation →"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-center space-x-2">
          {[-1, ...Array.from({ length: totalSections }, (_, i) => i)].map(
            (sectionIdx) => {
              const isComplete =
                sectionIdx === -1
                  ? name.trim() !== "" &&
                    email.trim() !== "" &&
                    email.includes("@")
                  : getSectionCompletionStatus(sectionIdx);

              return (
                <button
                  key={sectionIdx}
                  onClick={() => {
                    if (
                      sectionIdx < currentSection ||
                      sectionIdx === currentSection
                    ) {
                      setCurrentSection(sectionIdx);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }
                  }}
                  disabled={sectionIdx > currentSection}
                  className={`relative rounded-full transition-all ${
                    sectionIdx === currentSection
                      ? "w-3 h-3 bg-gunmetal"
                      : sectionIdx < currentSection
                        ? "w-3 h-3 cursor-pointer hover:scale-110 " +
                          (isComplete
                            ? "bg-cerulean"
                            : "bg-rose-quartz/30 animate-pulse")
                        : "w-2 h-2 bg-rose-quartz/30"
                  }`}
                  aria-label={`Go to ${sectionIdx === -1 ? "Personal Information" : formData?.sections?.[sectionIdx]?.title || ""}`}
                  title={
                    sectionIdx < currentSection && !isComplete
                      ? "This section has incomplete required questions"
                      : ""
                  }
                >
                  {sectionIdx < currentSection && !isComplete && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-quartz rounded-full animate-ping" />
                  )}
                </button>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}
