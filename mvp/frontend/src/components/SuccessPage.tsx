import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SuccessPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Thank You!</CardTitle>
          <CardDescription className="text-center">
            Your response has been successfully submitted.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            We appreciate your feedback and will review your responses carefully.
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            Submit Another Response
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}