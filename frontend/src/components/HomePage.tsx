import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, FileText } from "lucide-react";

interface Form {
  id: string;
  title: string;
  description?: string;
  status: string;
  settings?: any;
  created_at: string;
  updated_at: string;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await fetch("/api/forms");
      if (!response.ok) throw new Error("Failed to load forms");
      const data = await response.json();

      // Only show published forms
      const publishedForms = data.filter(
        (form: Form) => form.status === "published",
      );
      setForms(publishedForms);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load forms");
    } finally {
      setLoading(false);
    }
  };

  const startForm = (formId: string) => {
    navigate(`/form/${formId}`);
  };

  const getEstimatedTime = (settings: any) => {
    return settings?.estimatedTime || "15-20 minutes";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 flex items-center justify-center">
        <div className="text-lg text-gray-800">Loading available forms...</div>
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
              onClick={() => window.location.reload()}
              className="mt-4 bg-gray-800 hover:bg-gray-700"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Available Forms
          </h1>
          <p className="text-lg text-gray-600">
            {forms.length > 0
              ? "Select a form below to get started"
              : "There are no forms available to fill out at this time. Please check back later."}
          </p>
        </div>

        {/* Forms Grid or Empty State */}
        {forms.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-6">
            {forms.map((form) => (
              <Card
                key={form.id}
                className="hover:shadow-xl transition-all hover:scale-105 cursor-pointer w-full max-w-md flex-shrink-0"
                onClick={() => startForm(form.id)}
              >
                <CardHeader className="bg-gradient-to-r from-cambridge-blue/10 to-cerulean/10">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <FileText className="w-5 h-5 text-cambridge-blue" />
                    {form.title}
                  </CardTitle>
                  {form.description && (
                    <CardDescription className="mt-2">
                      {form.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {form.settings?.reviewPeriod && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium mr-2">Review Period:</span>
                        <span>{form.settings.reviewPeriod}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>
                        Estimated time: {getEstimatedTime(form.settings)}
                      </span>
                    </div>
                    {form.settings?.confidentialityNotice && (
                      <div className="text-xs text-gray-500 italic pt-2 border-t">
                        {form.settings.confidentialityNotice}
                      </div>
                    )}
                  </div>
                  <Button
                    className="w-full mt-6 bg-gradient-to-r from-cerulean to-cambridge-blue hover:from-cerulean/90 hover:to-cambridge-blue/90 text-white group"
                    onClick={(e) => {
                      e.stopPropagation();
                      startForm(form.id);
                    }}
                  >
                    Start Form
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  No forms are currently available.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Admin Link */}
        <div className="text-center mt-12">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin")}
            className="text-gray-500 hover:text-gray-800"
          >
            Admin Access →
          </Button>
        </div>
      </div>
    </div>
  );
}
