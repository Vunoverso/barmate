
"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from 'react';
import { Package } from 'lucide-react'; // Using Package as a generic icon

export default function HomePage() {
  const [barName, setBarName] = useState('BarMate');
  const [isMounted, setIsMounted] = useState(false);
  const version = "v1.2.1"; // Version number

  useEffect(() => {
    setIsMounted(true);
    const storedName = localStorage.getItem('barName');
    if (storedName) {
      setBarName(storedName);
    }
    // Listen for changes to barName from other tabs/windows or settings page
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'barName' && event.newValue) {
        setBarName(event.newValue);
      }
    };
    // Listen for custom event dispatched from settings page
    const handleBarNameCustomEvent = () => {
      const newName = localStorage.getItem('barName');
      if (newName) {
        setBarName(newName);
      }
    }

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('barNameChanged', handleBarNameCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('barNameChanged', handleBarNameCustomEvent);
    };
  }, []);

  if (!isMounted) {
    // Render a placeholder or null to avoid hydration mismatch during server rendering
    // and before localStorage is accessible on the client.
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Card className="w-full max-w-md text-center shadow-xl">
          <CardHeader className="items-center">
            <Package className="h-12 w-12 text-primary mb-4" />
            <CardTitle className="text-3xl font-bold">Carregando...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Aguarde um momento.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md text-center shadow-xl">
        <CardHeader className="items-center">
          {/* You can replace Package with a more relevant icon for a welcome page if desired */}
          <Package className="h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold">
            Bem-vindo ao {barName}!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Utilize o menu lateral para navegar pelas funcionalidades do sistema.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center p-4">
            <span className="text-xs text-muted-foreground">{version}</span>
        </CardFooter>
      </Card>
    </div>
  );
}
