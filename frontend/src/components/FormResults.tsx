import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

interface Response {
  id: string;
  form_id: string;
  respondent_name?: string;
  respondent_email?: string;
  role?: string;
  answers: any; // Will be transformed to object keyed by question_id
  submitted_at: string;
  completed?: boolean; // Computed field
}

interface Question {
  id: number | string;
  form_id?: string;
  section_id?: string;
  position: number;
  question_type?: string;
  type?: string;
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
  const [respondents, setRespondents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [showRespondents, setShowRespondents] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/admin");
      return;
    }
    fetchFormData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, token]);

  const fetchFormData = async () => {
    try {
      setLoading(true);

      // Fetch form details with sections and questions
      const formRes = await fetch(`/api/forms/${formId}`);
      if (!formRes.ok) throw new Error("Failed to load form");
      const formData = await formRes.json();

      // Extract form, sections, and questions from the response
      setForm({
        id: formData.id,
        title: formData.title,
        description: formData.description,
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
            position: section.position,
          });

          if (section.questions) {
            section.questions.forEach((q: any) => {
              allQuestions.push({
                ...q,
                section_id: section.id,
                question_type: q.type,
              });
            });
          }
        });
      }

      console.log("Form data received:", formData);
      console.log("Sections extracted:", allSections);
      console.log("Questions extracted:", allQuestions);

      setSections(allSections.sort((a, b) => a.position - b.position));
      setQuestions(allQuestions.sort((a, b) => a.position - b.position));

      // Fetch responses
      const responsesRes = await fetch(
        `/api/admin/responses?token=${token}&form_id=${formId}`,
      );
      if (!responsesRes.ok) {
        if (responsesRes.status === 401) {
          navigate("/admin");
          return;
        }
        throw new Error("Failed to load responses");
      }
      const responsesData = await responsesRes.json();

      // Transform responses to have answers as an object keyed by question_id
      // and determine if response is completed based on whether all questions are answered
      const transformedResponses = responsesData.map((r: any) => {
        const answersObj: any = {};
        r.answers.forEach((a: any) => {
          answersObj[a.question_id] = {
            value: a.value,
            // Handle different answer types
            likert_value: typeof a.value === "number" ? a.value : undefined,
            text_value: typeof a.value === "string" ? a.value : undefined,
            comment: a.comment,
          };
        });

        // A response is completed when it has been submitted (all submitted responses are complete)
        const completed = true;

        return {
          ...r,
          answers: answersObj,
          completed,
        };
      });

      setResponses(transformedResponses);

      // Extract unique roles from responses
      const rolesList: string[] = transformedResponses
        .map((r: any) => r.role as string | undefined)
        .filter(
          (role: string | undefined): role is string =>
            !!role && role.trim() !== "",
        );
      const uniqueRoles: string[] = Array.from(new Set<string>(rolesList));
      setAvailableRoles(uniqueRoles.sort());

      // Fetch respondents list (with PII)
      const respondentsRes = await fetch(
        `/api/admin/forms/${formId}/respondents?token=${token}`,
      );
      if (respondentsRes.ok) {
        const respondentsData = await respondentsRes.json();
        setRespondents(respondentsData.respondents || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (filteredResponses.length === 0) return;

    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Helper function to get role-based statistics
    const getRoleBasedStats = (questionId: string | number, role?: string) => {
      const roleResponses = role
        ? filteredResponses.filter((r) => r.role === role)
        : filteredResponses;
      return roleResponses
        .map((r) => r.answers[String(questionId)])
        .filter(Boolean);
    };

    // 1. Enhanced Summary Sheet with Role-Based Analysis
    const summaryData = [];

    // Header and metadata
    summaryData.push(["FORM SUMMARY REPORT"]);
    summaryData.push(["=".repeat(80)]);
    summaryData.push([""]);
    summaryData.push(["Form Title:", form?.title || ""]);
    summaryData.push(["Description:", form?.description || ""]);
    summaryData.push(["Generated:", new Date().toLocaleString()]);
    summaryData.push([
      "Report Type:",
      selectedRole !== "all"
        ? `Filtered by Role: ${selectedRole}`
        : "All Responses",
    ]);
    summaryData.push([""]);

    // Overall Response Statistics
    summaryData.push(["RESPONSE STATISTICS"]);
    summaryData.push(["-".repeat(40)]);
    summaryData.push(["Total Responses:", filteredResponses.length]);
    summaryData.push([
      "Completed:",
      filteredResponses.filter((r) => r.completed).length,
    ]);
    summaryData.push([
      "In Progress:",
      filteredResponses.filter((r) => !r.completed).length,
    ]);
    summaryData.push([
      "Completion Rate:",
      `${filteredResponses.length > 0 ? Math.round((filteredResponses.filter((r) => r.completed).length / filteredResponses.length) * 100) : 0}%`,
    ]);
    summaryData.push([""]);

    // Response breakdown by role
    if (availableRoles.length > 0) {
      summaryData.push(["RESPONSES BY ROLE"]);
      summaryData.push(["-".repeat(40)]);
      summaryData.push([
        "Role",
        "Count",
        "Percentage",
        "Completed",
        "Completion Rate",
      ]);
      availableRoles.forEach((role) => {
        const roleResponses = responses.filter((r) => r.role === role);
        const completed = roleResponses.filter((r) => r.completed).length;
        summaryData.push([
          role,
          roleResponses.length,
          `${((roleResponses.length / responses.length) * 100).toFixed(1)}%`,
          completed,
          `${roleResponses.length > 0 ? ((completed / roleResponses.length) * 100).toFixed(1) : 0}%`,
        ]);
      });
      summaryData.push([""]);
    }

    // Detailed Question Analysis by Section
    summaryData.push(["QUESTION-BY-QUESTION ANALYSIS"]);
    summaryData.push(["=".repeat(80)]);
    summaryData.push([""]);

    sections.forEach((section) => {
      const sectionQuestions = questions.filter(
        (q) => q.section_id === section.id,
      );
      if (sectionQuestions.length === 0) return;

      summaryData.push([`SECTION: ${section.title}`]);
      summaryData.push(["-".repeat(60)]);
      summaryData.push([""]);

      sectionQuestions.forEach((question) => {
        const questionType = question.question_type || question.type;
        const allResponses = getRoleBasedStats(question.id);

        summaryData.push([`Question: ${question.title}`]);
        summaryData.push([`Type: ${questionType}`]);
        summaryData.push([`Total Responses: ${allResponses.length}`]);
        summaryData.push([""]);

        if (questionType === "likert") {
          // Likert scale analysis
          const values = allResponses
            .map((a) => a.likert_value)
            .filter((v) => v != null);
          const average =
            values.length > 0
              ? (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(
                  2,
                )
              : "N/A";

          summaryData.push(["Overall Average:", average]);
          summaryData.push([""]);
          summaryData.push([
            "Distribution:",
            "",
            "1 (SD)",
            "2 (D)",
            "3 (N)",
            "4 (A)",
            "5 (SA)",
          ]);

          const distribution = [1, 2, 3, 4, 5].map(
            (val) => values.filter((v) => v === val).length,
          );
          summaryData.push(["Count:", "", ...distribution]);
          summaryData.push([
            "Percentage:",
            "",
            ...distribution.map((d) =>
              values.length > 0
                ? `${((d / values.length) * 100).toFixed(1)}%`
                : "0%",
            ),
          ]);

          // Role-based breakdown for Likert
          if (availableRoles.length > 1) {
            summaryData.push([""]);
            summaryData.push([
              "By Role:",
              "Responses",
              "Average",
              "1",
              "2",
              "3",
              "4",
              "5",
            ]);
            availableRoles.forEach((role) => {
              const roleAnswers = getRoleBasedStats(question.id, role);
              const roleValues = roleAnswers
                .map((a) => a.likert_value)
                .filter((v) => v != null);
              if (roleValues.length > 0) {
                const roleAvg = (
                  roleValues.reduce((sum, v) => sum + v, 0) / roleValues.length
                ).toFixed(2);
                const roleDist = [1, 2, 3, 4, 5].map(
                  (val) => roleValues.filter((v) => v === val).length,
                );
                summaryData.push([
                  role,
                  roleValues.length,
                  roleAvg,
                  ...roleDist,
                ]);
              }
            });
          }
        } else if (questionType === "rating") {
          // Rating analysis
          const values = allResponses
            .map((a) => {
              const val = a.value || a.text_value;
              return typeof val === "number" ? val : parseInt(String(val));
            })
            .filter((v) => !isNaN(v));

          const features = question.features || {};
          const min = features.min || 1;
          const max = features.max || 5;

          if (values.length > 0) {
            const average = (
              values.reduce((sum, v) => sum + v, 0) / values.length
            ).toFixed(2);
            summaryData.push(["Average Rating:", average]);
            summaryData.push(["Range:", `${min} - ${max}`]);

            // Distribution
            summaryData.push([""]);
            const headers = [];
            const counts = [];
            const percentages = [];
            for (let i = min; i <= max; i++) {
              headers.push(i.toString());
              const count = values.filter((v) => v === i).length;
              counts.push(count);
              percentages.push(
                values.length > 0
                  ? `${((count / values.length) * 100).toFixed(1)}%`
                  : "0%",
              );
            }
            summaryData.push(["Rating:", ...headers]);
            summaryData.push(["Count:", ...counts]);
            summaryData.push(["Percentage:", ...percentages]);
          }
        } else if (
          questionType === "multiple_choice" ||
          questionType === "dropdown"
        ) {
          // Multiple choice/dropdown analysis
          const values = allResponses
            .map((a) => a.value || a.text_value)
            .filter(Boolean);
          const options = question.features?.options || [];

          summaryData.push(["Options:", "Count", "Percentage"]);
          options.forEach((option: string) => {
            const count = values.filter((v) => v === option).length;
            summaryData.push([
              option,
              count,
              values.length > 0
                ? `${((count / values.length) * 100).toFixed(1)}%`
                : "0%",
            ]);
          });
        } else if (questionType === "yes_no") {
          // Yes/No analysis
          const values = allResponses
            .map((a) => a.value || a.text_value)
            .filter(Boolean);
          const yesCount = values.filter(
            (v) => v === "yes" || v === "Yes" || v === true,
          ).length;
          const noCount = values.filter(
            (v) => v === "no" || v === "No" || v === false,
          ).length;

          summaryData.push([
            "Yes:",
            yesCount,
            `${values.length > 0 ? ((yesCount / values.length) * 100).toFixed(1) : 0}%`,
          ]);
          summaryData.push([
            "No:",
            noCount,
            `${values.length > 0 ? ((noCount / values.length) * 100).toFixed(1) : 0}%`,
          ]);
        } else if (questionType === "checkbox") {
          // Checkbox analysis (multiple selections)
          const allSelections = allResponses
            .map((a) => {
              const val = a.value || a.text_value;
              if (typeof val === "string") {
                try {
                  return JSON.parse(val);
                } catch {
                  return [val];
                }
              }
              return Array.isArray(val) ? val : [val];
            })
            .flat()
            .filter(Boolean);

          const options = question.features?.options || [];
          summaryData.push([
            "Options:",
            "Times Selected",
            "Percentage of Respondents",
          ]);
          options.forEach((option: string) => {
            const count = allSelections.filter((v) => v === option).length;
            summaryData.push([
              option,
              count,
              allResponses.length > 0
                ? `${((count / allResponses.length) * 100).toFixed(1)}%`
                : "0%",
            ]);
          });
        } else if (questionType === "number") {
          // Number analysis
          const values = allResponses
            .map((a) => {
              const val = a.value || a.text_value;
              return typeof val === "number" ? val : parseFloat(String(val));
            })
            .filter((v) => !isNaN(v));

          if (values.length > 0) {
            const average = (
              values.reduce((sum, v) => sum + v, 0) / values.length
            ).toFixed(2);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const median = values.sort((a, b) => a - b)[
              Math.floor(values.length / 2)
            ];

            summaryData.push(["Average:", average]);
            summaryData.push(["Median:", median]);
            summaryData.push(["Range:", `${min} - ${max}`]);
          }
        }

        summaryData.push([""]);
        summaryData.push(["-".repeat(40)]);
        summaryData.push([""]);
      });
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

    // Set column widths for summary sheet
    summarySheet["!cols"] = [
      { wch: 30 }, // Label column
      { wch: 12 }, // Count
      { wch: 12 }, // Percentage
      { wch: 10 }, // Additional columns
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
    ];

    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    // 3. Anonymized Responses Sheet (No PII)
    const responseHeaders = ["Respondent ID", "Role", "Submitted At", "Status"];

    // Add question headers with section grouping
    sections.forEach((section) => {
      const sectionQuestions = questions.filter(
        (q) => q.section_id === section.id,
      );
      sectionQuestions.forEach((q) => {
        responseHeaders.push(`[${section.title}] ${q.title}`);
      });
    });

    // Create anonymized response rows
    const responseRows = filteredResponses.map((response, index) => {
      const row: any[] = [
        `R${String(index + 1).padStart(4, "0")}`, // Anonymous ID matching Respondents sheet
        response.role || "Not specified",
        new Date(response.submitted_at).toLocaleString(),
        response.completed ? "Completed" : "In Progress",
      ];

      // Add answers for each question (excluding comments for main data)
      sections.forEach((section) => {
        const sectionQuestions = questions.filter(
          (q) => q.section_id === section.id,
        );
        sectionQuestions.forEach((q) => {
          const qType = q.question_type || q.type;
          const answer = response.answers[q.id];
          if (!answer) {
            row.push("");
          } else {
            if (qType === "likert") {
              row.push(answer.likert_value || "");
            } else if (qType === "rating" || qType === "number") {
              row.push(answer.value || answer.text_value || "");
            } else if (qType === "checkbox") {
              const val = answer.value || answer.text_value;
              if (typeof val === "string") {
                try {
                  const parsed = JSON.parse(val);
                  row.push(Array.isArray(parsed) ? parsed.join("; ") : val);
                } catch {
                  row.push(val);
                }
              } else if (Array.isArray(val)) {
                row.push(val.join("; "));
              } else {
                row.push(val || "");
              }
            } else {
              row.push(answer.value || answer.text_value || "");
            }
          }
        });
      });

      return row;
    });

    // Add header information
    const responseData = [
      ["ANONYMIZED RESPONSE DATA"],
      ["=".repeat(60)],
      [""],
      ["Note: Respondent IDs correspond to entries in the Respondents sheet"],
      ["Personal information has been removed from this sheet for privacy"],
      [""],
      responseHeaders,
      ...responseRows,
    ];

    const responseSheet = XLSX.utils.aoa_to_sheet(responseData);

    // Auto-size columns
    const maxLengths = responseHeaders.map((h, i) => {
      const headerLength = h.toString().length;
      const maxDataLength = Math.max(
        ...responseRows.map((r) => (r[i] ? String(r[i]).length : 0)),
      );
      return Math.min(Math.max(headerLength, maxDataLength, 10), 40);
    });

    responseSheet["!cols"] = maxLengths.map((w) => ({ wch: w }));

    XLSX.utils.book_append_sheet(wb, responseSheet, "Responses");

    // 4. Comments Sheet (All text responses and comments organized by question)
    const commentsData: any[][] = [
      ["COMMENTS AND TEXT RESPONSES"],
      ["=".repeat(60)],
      [""],
      [
        "This sheet contains all text responses and comments organized by question",
      ],
      [""],
    ];

    let hasComments = false;

    sections.forEach((section) => {
      const sectionQuestions = questions.filter(
        (q) => q.section_id === section.id,
      );
      if (sectionQuestions.length === 0) return;

      let sectionHasComments = false;
      const sectionComments: any[][] = [];

      sectionQuestions.forEach((question) => {
        const questionType = question.question_type || question.type;
        const questionComments: any[][] = [];

        // Collect text responses for text/textarea questions
        if (questionType === "text" || questionType === "textarea") {
          filteredResponses.forEach((r, index) => {
            const answer = r.answers[question.id];
            if (answer?.text_value || answer?.value) {
              questionComments.push([
                `R${String(index + 1).padStart(4, "0")}`,
                r.role || "Not specified",
                answer.text_value || answer.value,
              ]);
            }
          });
        }

        // Collect comments from questions that allow comments
        if (question.features?.allowComment) {
          filteredResponses.forEach((r, index) => {
            const answer = r.answers[question.id];
            if (answer?.comment) {
              questionComments.push([
                `R${String(index + 1).padStart(4, "0")}`,
                r.role || "Not specified",
                answer.comment,
              ]);
            }
          });
        }

        if (questionComments.length > 0) {
          if (!sectionHasComments) {
            sectionComments.push([`SECTION: ${section.title}`]);
            sectionComments.push(["-".repeat(40)]);
            sectionComments.push([""]);
            sectionHasComments = true;
          }

          sectionComments.push([`Question: ${question.title}`]);
          sectionComments.push([`Type: ${questionType}`]);
          sectionComments.push([
            `Total Comments/Responses: ${questionComments.length}`,
          ]);
          sectionComments.push([""]);
          sectionComments.push(["Respondent ID", "Role", "Response/Comment"]);
          sectionComments.push(...questionComments);
          sectionComments.push([""]);
          hasComments = true;
        }
      });

      if (sectionHasComments) {
        commentsData.push(...sectionComments);
      }
    });

    if (hasComments) {
      const commentsSheet = XLSX.utils.aoa_to_sheet(commentsData);
      commentsSheet["!cols"] = [
        { wch: 15 }, // Respondent ID
        { wch: 15 }, // Role
        { wch: 80 }, // Comment/Response
      ];

      XLSX.utils.book_append_sheet(wb, commentsSheet, "Comments");
    }

    // 2. Respondents Sheet (PII - Separated from responses for privacy)
    const respondentData: any[][] = [
      ["RESPONDENT INFORMATION (CONTAINS PII)"],
      ["=".repeat(60)],
      [""],
      ["⚠️ This sheet contains personally identifiable information (PII)"],
      ["Handle with care and in accordance with privacy regulations"],
      [""],
      ["Respondent ID", "Name", "Email", "Role", "Submitted At", "Status"],
    ];

    // Use respondents data if available, otherwise use response data
    if (respondents.length > 0) {
      respondents
        .filter((r) => selectedRole === "all" || r.role === selectedRole)
        .forEach((r, index) => {
          respondentData.push([
            `R${String(index + 1).padStart(4, "0")}`, // Generate anonymous ID
            r.name || "Anonymous",
            r.email || "Not provided",
            r.role || "Not specified",
            new Date(r.submitted_at).toLocaleString(),
            "Submitted",
          ]);
        });
    } else {
      // Fallback to response data if respondents not loaded
      filteredResponses.forEach((r, index) => {
        respondentData.push([
          `R${String(index + 1).padStart(4, "0")}`,
          "Name withheld", // Privacy protection
          "Email withheld",
          r.role || "Not specified",
          new Date(r.submitted_at).toLocaleString(),
          r.completed ? "Completed" : "In Progress",
        ]);
      });
    }

    const respondentSheet = XLSX.utils.aoa_to_sheet(respondentData);
    respondentSheet["!cols"] = [
      { wch: 15 }, // Respondent ID
      { wch: 25 }, // Name
      { wch: 35 }, // Email
      { wch: 15 }, // Role
      { wch: 20 }, // Submitted At
      { wch: 12 }, // Status
    ];

    XLSX.utils.book_append_sheet(wb, respondentSheet, "Respondents (PII)");

    // Generate and download the Excel file
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "binary" });

    // Convert to blob
    function s2ab(s: string) {
      const buf = new ArrayBuffer(s.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
      return buf;
    }

    const blob = new Blob([s2ab(wbout)], { type: "application/octet-stream" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${formId}-report-${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 flex items-center justify-center">
        <div className="text-lg text-gray-800">Loading results...</div>
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
              onClick={() => navigate("/admin")}
              className="mt-4 bg-gray-800 hover:bg-gray-700"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter responses by selected role
  const filteredResponses =
    selectedRole === "all"
      ? responses
      : responses.filter((r) => r.role === selectedRole);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin", { state: { token } })}
            className="mb-4 text-gray-800 hover:text-gray-800/80"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {form?.title}
              </h1>
              {form?.description && (
                <p className="text-gray-600 mt-2">{form.description}</p>
              )}
            </div>
            <div className="flex gap-4">
              {availableRoles.length > 0 && (
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-cerulean"
                >
                  <option value="all">All Roles</option>
                  {availableRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              )}
              <Button
                onClick={exportToExcel}
                disabled={filteredResponses.length === 0}
                className="bg-cerulean hover:bg-cerulean/90 text-white"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>
                Total Responses{selectedRole !== "all" && ` (${selectedRole})`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">
                {filteredResponses.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Completed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {filteredResponses.filter((r) => r.completed).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>In Progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {filteredResponses.filter((r) => !r.completed).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Completion Rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cambridge-blue">
                {filteredResponses.length > 0
                  ? `${Math.round((filteredResponses.filter((r) => r.completed).length / filteredResponses.length) * 100)}%`
                  : "0%"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Respondents List */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Respondents</CardTitle>
                <CardDescription>
                  List of people who have submitted responses
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRespondents(!showRespondents)}
                className="text-cerulean hover:text-cerulean/80"
              >
                {showRespondents ? "Hide" : "Show"} List
              </Button>
            </div>
          </CardHeader>
          {showRespondents && (
            <CardContent>
              {respondents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No respondents yet
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Submitted
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {respondents
                        .filter(
                          (r) =>
                            selectedRole === "all" || r.role === selectedRole,
                        )
                        .map((respondent, index) => (
                          <tr
                            key={respondent.id}
                            className={
                              index % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {respondent.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {respondent.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cambridge-blue/10 text-cambridge-blue">
                                {respondent.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(
                                respondent.submitted_at,
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Question Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Question Analysis</CardTitle>
            <CardDescription>
              Average responses and distribution for each question
              {selectedRole !== "all" && ` (${selectedRole} only)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sections.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No sections loaded
              </p>
            ) : questions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No questions loaded
              </p>
            ) : (
              sections.map((section) => {
                const sectionQuestions = questions.filter(
                  (q) => q.section_id === section.id,
                );
                if (sectionQuestions.length === 0) return null;

                return (
                  <div key={section.id} className="mb-8 last:mb-0">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      {section.title}
                    </h3>
                    <div className="space-y-4">
                      {sectionQuestions.map((question) => {
                        const questionResponses = filteredResponses
                          .map((r) => r.answers[question.id])
                          .filter(Boolean);
                        const questionType =
                          question.question_type || question.type;

                        if (questionType === "likert") {
                          const values = questionResponses
                            .map((a) => a.likert_value)
                            .filter((v) => v != null);
                          const averageNum =
                            values.length > 0
                              ? values.reduce((sum, v) => sum + v, 0) /
                                values.length
                              : 0;
                          const average =
                            values.length > 0 ? averageNum.toFixed(2) : "N/A";

                          const getLikertLabel = (value: number) => {
                            const labels = {
                              1: "Strongly Disagree",
                              2: "Disagree",
                              3: "Neutral",
                              4: "Agree",
                              5: "Strongly Agree",
                            };
                            return labels[value as keyof typeof labels] || "";
                          };

                          const getAverageLabel = (avg: number) => {
                            if (avg < 1.5) return "Strongly Disagree";
                            if (avg < 2.25)
                              return avg < 1.75
                                ? "Strongly Disagree+"
                                : "Disagree-";
                            if (avg < 2.75)
                              return avg < 2.5 ? "Disagree" : "Disagree+";
                            if (avg < 3.25)
                              return avg < 3 ? "Neutral-" : "Neutral";
                            if (avg < 3.75)
                              return avg < 3.5 ? "Neutral+" : "Agree-";
                            if (avg < 4.25) return avg < 4 ? "Agree" : "Agree+";
                            if (avg < 4.75)
                              return avg < 4.5
                                ? "Strongly Agree-"
                                : "Strongly Agree";
                            return "Strongly Agree";
                          };

                          const distribution = [1, 2, 3, 4, 5].map((val) => ({
                            value: val,
                            count: values.filter((v) => v === val).length,
                            label: getLikertLabel(val),
                            percentage:
                              values.length > 0
                                ? (values.filter((v) => v === val).length /
                                    values.length) *
                                  100
                                : 0,
                          }));

                          const maxCount = Math.max(
                            ...distribution.map((d) => d.count),
                            1,
                          );

                          return (
                            <div
                              key={question.id}
                              className="border-l-4 border-cambridge-blue/30 pl-2 sm:pl-4 pb-2"
                            >
                              <p className="font-medium text-gray-800 mb-2 text-sm sm:text-base">
                                {question.title}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm mb-3">
                                <div>
                                  <span className="text-gray-600">
                                    Average:{" "}
                                  </span>
                                  <span className="font-bold text-cambridge-blue">
                                    {average}
                                  </span>
                                  {values.length > 0 && (
                                    <span className="ml-2 px-2 py-0.5 bg-cambridge-blue/10 text-cambridge-blue rounded text-xs font-medium">
                                      {getAverageLabel(averageNum)}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    Responses:{" "}
                                  </span>
                                  <span className="font-bold">
                                    {values.length}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-1 sm:gap-2">
                                {distribution.map((d) => {
                                  const barHeight = (d.count / maxCount) * 100;
                                  const showAbove =
                                    barHeight < 20 && d.count > 0;

                                  return (
                                    <div
                                      key={d.value}
                                      className="flex-1 text-center"
                                    >
                                      <div className="relative h-12 sm:h-16 flex items-end">
                                        {showAbove && (
                                          <div className="absolute w-full bottom-full mb-1 text-xs font-semibold text-cambridge-blue">
                                            {d.count}
                                          </div>
                                        )}
                                        <div
                                          className="w-full bg-cambridge-blue/30 rounded-t transition-all hover:bg-cambridge-blue/40 relative"
                                          style={{
                                            height: `${Math.max(5, barHeight)}%`,
                                          }}
                                        >
                                          {!showAbove && d.count > 0 && (
                                            <div className="text-xs font-semibold pt-1 text-white">
                                              {d.count}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-xs mt-1 font-medium">
                                        {d.value}
                                      </div>
                                      <div className="text-xs text-gray-500 hidden sm:block">
                                        {d.label}
                                      </div>
                                      <div className="text-xs text-gray-500 sm:hidden">
                                        {d.value === 1
                                          ? "SD"
                                          : d.value === 2
                                            ? "D"
                                            : d.value === 3
                                              ? "N"
                                              : d.value === 4
                                                ? "A"
                                                : "SA"}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        } else if (questionType === "rating") {
                          const values = questionResponses
                            .map((a) => {
                              const val = a.value || a.text_value;
                              return typeof val === "number"
                                ? val
                                : parseInt(String(val));
                            })
                            .filter((v) => !isNaN(v));

                          const features = question.features || {};
                          const min = features.min || 1;
                          const max = features.max || 5;
                          const ratingStyle = features.ratingStyle || "stars";

                          const average =
                            values.length > 0
                              ? (
                                  values.reduce((sum, v) => sum + v, 0) /
                                  values.length
                                ).toFixed(1)
                              : "N/A";

                          const distribution = [];
                          for (let i = min; i <= max; i++) {
                            distribution.push({
                              value: i,
                              count: values.filter((v) => v === i).length,
                              percentage:
                                values.length > 0
                                  ? (
                                      (values.filter((v) => v === i).length /
                                        values.length) *
                                      100
                                    ).toFixed(1)
                                  : "0",
                            });
                          }

                          return (
                            <div
                              key={question.id}
                              className="border-l-4 border-amber-500/30 pl-2 sm:pl-4 pb-2"
                            >
                              <p className="font-medium text-gray-800 mb-2 text-sm sm:text-base">
                                {question.title}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm mb-3">
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <span className="text-gray-600">
                                    Average:{" "}
                                  </span>
                                  <span className="font-bold text-amber-600">
                                    {average}
                                  </span>
                                  {ratingStyle === "stars" &&
                                    average !== "N/A" && (
                                      <div className="flex text-xs sm:text-sm">
                                        {[...Array(max - min + 1)].map(
                                          (_, i) => (
                                            <span
                                              key={i}
                                              className={
                                                i <
                                                Math.round(
                                                  parseFloat(average) - min + 1,
                                                )
                                                  ? "text-amber-500"
                                                  : "text-gray-300"
                                              }
                                            >
                                              ★
                                            </span>
                                          ),
                                        )}
                                      </div>
                                    )}
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    Responses:{" "}
                                  </span>
                                  <span className="font-bold">
                                    {values.length}
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {distribution.map((d) => (
                                  <div
                                    key={d.value}
                                    className="flex items-center gap-1 sm:gap-2"
                                  >
                                    <div className="flex-shrink-0 flex items-center text-xs sm:text-sm">
                                      {ratingStyle === "stars" ? (
                                        <div className="flex">
                                          <span className="text-amber-500">
                                            {[...Array(d.value)]
                                              .map(() => "★")
                                              .join("")}
                                          </span>
                                          <span className="text-gray-300">
                                            {[...Array(max - d.value)]
                                              .map(() => "★")
                                              .join("")}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="font-medium w-8 text-center">
                                          {d.value}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex-1 bg-gray-200 rounded-full h-5 sm:h-6 relative min-w-0">
                                      <div
                                        className="bg-amber-500/60 h-5 sm:h-6 rounded-full transition-all flex items-center justify-end pr-1 sm:pr-2"
                                        style={{ width: `${d.percentage}%` }}
                                      >
                                        {d.count > 0 &&
                                          parseFloat(d.percentage) > 15 && (
                                            <span className="text-xs text-white font-medium">
                                              {d.count}
                                            </span>
                                          )}
                                      </div>
                                    </div>
                                    <span className="text-xs text-gray-600 w-10 sm:w-12 text-right flex-shrink-0">
                                      {d.percentage}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        } else if (
                          questionType === "multiple_choice" ||
                          questionType === "dropdown"
                        ) {
                          const values = questionResponses
                            .map((a) => a.value || a.text_value)
                            .filter(Boolean);
                          const options = question.features?.options || [];

                          const distribution = options.map(
                            (option: string) => ({
                              option,
                              count: values.filter((v: any) => v === option)
                                .length,
                              percentage:
                                values.length > 0
                                  ? (
                                      (values.filter((v: any) => v === option)
                                        .length /
                                        values.length) *
                                      100
                                    ).toFixed(1)
                                  : 0,
                            }),
                          );

                          return (
                            <div
                              key={question.id}
                              className="border-l-4 border-purple-500/30 pl-4 pb-2"
                            >
                              <p className="font-medium text-gray-800 mb-2">
                                {question.title}
                              </p>
                              <div className="text-sm mb-3">
                                <span className="text-gray-600">
                                  Responses:{" "}
                                </span>
                                <span className="font-bold">
                                  {values.length}
                                </span>
                                <span className="text-gray-500 ml-2">
                                  (
                                  {questionType === "dropdown"
                                    ? "dropdown"
                                    : "multiple choice"}
                                  )
                                </span>
                              </div>
                              <div className="space-y-2">
                                {distribution.map((d: any) => (
                                  <div
                                    key={d.option}
                                    className="flex items-center gap-2"
                                  >
                                    <div
                                      className="w-32 text-sm truncate"
                                      title={d.option}
                                    >
                                      {d.option}
                                    </div>
                                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                                      <div
                                        className="bg-purple-500/60 h-6 rounded-full transition-all flex items-center justify-end pr-2"
                                        style={{ width: `${d.percentage}%` }}
                                      >
                                        {d.count > 0 && (
                                          <span className="text-xs text-white font-medium">
                                            {d.count}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-xs text-gray-600 w-12 text-right">
                                      {d.percentage}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        } else if (questionType === "checkbox") {
                          const allSelections = questionResponses
                            .map((a) => {
                              const val = a.value || a.text_value;
                              if (typeof val === "string") {
                                try {
                                  return JSON.parse(val);
                                } catch {
                                  return [val];
                                }
                              }
                              return Array.isArray(val) ? val : [val];
                            })
                            .flat()
                            .filter(Boolean);

                          const options = question.features?.options || [];
                          const distribution = options.map(
                            (option: string) => ({
                              option,
                              count: allSelections.filter(
                                (v: any) => v === option,
                              ).length,
                              percentage:
                                questionResponses.length > 0
                                  ? (
                                      (allSelections.filter(
                                        (v: any) => v === option,
                                      ).length /
                                        questionResponses.length) *
                                      100
                                    ).toFixed(1)
                                  : 0,
                            }),
                          );

                          return (
                            <div
                              key={question.id}
                              className="border-l-4 border-indigo-500/30 pl-4 pb-2"
                            >
                              <p className="font-medium text-gray-800 mb-2">
                                {question.title}
                              </p>
                              <div className="text-sm mb-3">
                                <span className="text-gray-600">
                                  Responses:{" "}
                                </span>
                                <span className="font-bold">
                                  {questionResponses.length}
                                </span>
                                <span className="text-gray-500 ml-2">
                                  (checkbox - multiple selections)
                                </span>
                              </div>
                              <div className="space-y-2">
                                {distribution.map((d: any) => (
                                  <div
                                    key={d.option}
                                    className="flex items-center gap-2"
                                  >
                                    <div
                                      className="w-32 text-sm truncate"
                                      title={d.option}
                                    >
                                      {d.option}
                                    </div>
                                    <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                                      <div
                                        className="bg-indigo-500/60 h-6 rounded-full transition-all flex items-center justify-end pr-2"
                                        style={{
                                          width: `${Math.min(100, parseFloat(d.percentage))}%`,
                                        }}
                                      >
                                        {d.count > 0 && (
                                          <span className="text-xs text-white font-medium">
                                            {d.count}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-xs text-gray-600 w-12 text-right">
                                      {d.percentage}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        } else if (questionType === "yes_no") {
                          const values = questionResponses
                            .map((a) => a.value || a.text_value)
                            .filter(Boolean);
                          const yesCount = values.filter(
                            (v) => v === "yes" || v === "Yes" || v === true,
                          ).length;
                          const noCount = values.filter(
                            (v) => v === "no" || v === "No" || v === false,
                          ).length;
                          const total = yesCount + noCount;
                          const yesPercentage =
                            total > 0 ? (yesCount / total) * 100 : 0;
                          const noPercentage =
                            total > 0 ? (noCount / total) * 100 : 0;

                          return (
                            <div
                              key={question.id}
                              className="border-l-4 border-green-500/30 pl-4 pb-2"
                            >
                              <p className="font-medium text-gray-800 mb-2">
                                {question.title}
                              </p>
                              <div className="text-sm mb-3">
                                <span className="text-gray-600">
                                  Responses:{" "}
                                </span>
                                <span className="font-bold">{total}</span>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-4">
                                    <span className="font-medium text-green-600">
                                      Yes: {yesCount} (
                                      {yesPercentage.toFixed(0)}%)
                                    </span>
                                    <span className="font-medium text-red-600">
                                      No: {noCount} ({noPercentage.toFixed(0)}%)
                                    </span>
                                  </div>
                                </div>
                                <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                                  {total > 0 && (
                                    <>
                                      <div
                                        className="absolute left-0 top-0 h-8 bg-green-500/60 transition-all flex items-center justify-center"
                                        style={{ width: `${yesPercentage}%` }}
                                      >
                                        {yesCount > 0 && yesPercentage > 10 && (
                                          <span className="text-xs text-white font-bold">
                                            Yes
                                          </span>
                                        )}
                                      </div>
                                      <div
                                        className="absolute right-0 top-0 h-8 bg-red-500/60 transition-all flex items-center justify-center"
                                        style={{ width: `${noPercentage}%` }}
                                      >
                                        {noCount > 0 && noPercentage > 10 && (
                                          <span className="text-xs text-white font-bold">
                                            No
                                          </span>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        } else if (questionType === "number") {
                          const values = questionResponses
                            .map((a) => {
                              const val = a.value || a.text_value;
                              return typeof val === "number"
                                ? val
                                : parseFloat(String(val));
                            })
                            .filter((v) => !isNaN(v));

                          const average =
                            values.length > 0
                              ? (
                                  values.reduce((sum, v) => sum + v, 0) /
                                  values.length
                                ).toFixed(1)
                              : "N/A";
                          const min =
                            values.length > 0 ? Math.min(...values) : "N/A";
                          const max =
                            values.length > 0 ? Math.max(...values) : "N/A";
                          const median =
                            values.length > 0
                              ? values.sort((a, b) => a - b)[
                                  Math.floor(values.length / 2)
                                ]
                              : "N/A";

                          return (
                            <div
                              key={question.id}
                              className="border-l-4 border-teal-500/30 pl-4 pb-2"
                            >
                              <p className="font-medium text-gray-800 mb-2">
                                {question.title}
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-600">
                                    Responses:{" "}
                                  </span>
                                  <span className="font-bold">
                                    {values.length}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    Average:{" "}
                                  </span>
                                  <span className="font-bold text-teal-600">
                                    {average}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Range: </span>
                                  <span className="font-bold">
                                    {min} - {max}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">
                                    Median:{" "}
                                  </span>
                                  <span className="font-bold">{median}</span>
                                </div>
                              </div>
                            </div>
                          );
                        } else if (
                          questionType === "datetime" ||
                          questionType === "date" ||
                          questionType === "time"
                        ) {
                          const values = questionResponses
                            .map((a) => a.value || a.text_value || a.date_value)
                            .filter(Boolean);

                          const formatDateTime = (value: string) => {
                            try {
                              if (questionType === "time") {
                                return value;
                              } else if (questionType === "date") {
                                return new Date(value).toLocaleDateString();
                              } else {
                                return new Date(value).toLocaleString();
                              }
                            } catch {
                              return value;
                            }
                          };

                          return (
                            <div
                              key={question.id}
                              className="border-l-4 border-blue-500/30 pl-4 pb-2"
                            >
                              <p className="font-medium text-gray-800 mb-2">
                                {question.title}
                              </p>
                              <div className="text-sm mb-2">
                                <span className="text-gray-600">
                                  Responses:{" "}
                                </span>
                                <span className="font-bold">
                                  {values.length}
                                </span>
                                <span className="text-gray-500 ml-2">
                                  ({questionType})
                                </span>
                              </div>
                              {values.length > 0 && (
                                <details className="text-xs text-gray-600">
                                  <summary className="cursor-pointer hover:text-gray-800 font-medium">
                                    View all {values.length} response
                                    {values.length !== 1 ? "s" : ""}
                                  </summary>
                                  <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
                                    {values.map((v, i) => (
                                      <div
                                        key={i}
                                        className="bg-gray-50 px-2 py-1 rounded border border-gray-200"
                                      >
                                        {formatDateTime(v)}
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </div>
                          );
                        } else if (
                          questionType === "text" ||
                          questionType === "textarea"
                        ) {
                          const values = questionResponses
                            .map((a) => a.value || a.text_value)
                            .filter(Boolean);

                          return (
                            <div
                              key={question.id}
                              className="border-l-4 border-gray-400/30 pl-4 pb-2"
                            >
                              <p className="font-medium text-gray-800 mb-2">
                                {question.title}
                              </p>
                              <div className="text-sm mb-2">
                                <span className="text-gray-600">
                                  Responses:{" "}
                                </span>
                                <span className="font-bold">
                                  {values.length}
                                </span>
                                <span className="text-gray-500 ml-2">
                                  ({questionType})
                                </span>
                              </div>
                              {values.length > 0 && (
                                <details className="text-xs text-gray-600">
                                  <summary className="cursor-pointer hover:text-gray-800 font-medium">
                                    View all {values.length} response
                                    {values.length !== 1 ? "s" : ""}
                                  </summary>
                                  <div className="mt-2 space-y-2 max-h-96 overflow-y-auto">
                                    {values.map((v, i) => (
                                      <div
                                        key={i}
                                        className="bg-gray-50 px-3 py-2 rounded border border-gray-200"
                                      >
                                        <div className="text-xs text-gray-500 mb-1">
                                          Response {i + 1}
                                        </div>
                                        <div className="text-sm text-gray-800 whitespace-pre-wrap">
                                          {v}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </div>
                          );
                        } else {
                          const textResponses = questionResponses.filter(
                            (a) => a.text_value || a.value,
                          );
                          return (
                            <div
                              key={question.id}
                              className="border-l-4 border-gray-300/30 pl-4 pb-2"
                            >
                              <p className="font-medium text-gray-800 mb-2">
                                {question.title}
                              </p>
                              <div className="text-sm">
                                <span className="text-gray-600">
                                  Responses:{" "}
                                </span>
                                <span className="font-bold">
                                  {textResponses.length}
                                </span>
                                <span className="text-gray-500 ml-2">
                                  ({questionType})
                                </span>
                              </div>
                            </div>
                          );
                        }
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
