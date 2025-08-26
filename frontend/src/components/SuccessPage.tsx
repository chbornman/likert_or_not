import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SuccessPage() {
  const navigate = useNavigate();
  const [closingMessage, setClosingMessage] = useState<string | null>(null);

  useEffect(() => {
    // Retrieve closing message from sessionStorage
    const message = sessionStorage.getItem('form_closing_message');
    if (message) {
      setClosingMessage(message);
      // Clean up after retrieving
      sessionStorage.removeItem('form_closing_message');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-cerulean/50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full shadow-2xl border-0 bg-white/95 backdrop-blur overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-cambridge-blue to-cerulean text-white">
          <CardTitle className="text-3xl text-center font-bold">Thank You!</CardTitle>
          <CardDescription className="text-center text-stone-100/90 text-base mt-2">
            Your response has been successfully submitted.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6 pt-8 pb-8">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-cambridge-blue to-cerulean rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-gray-800/80 text-lg whitespace-pre-wrap">
            {closingMessage || 'We appreciate your feedback and will review your responses carefully.'}
          </p>
          <Button 
            onClick={() => navigate('/')} 
            className="bg-gradient-to-r from-cerulean to-cambridge-blue hover:from-cerulean/90 hover:to-cambridge-blue/90 text-white font-semibold px-6 py-3 rounded-lg transition-all shadow-lg"
          >
            Submit Another Response
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}