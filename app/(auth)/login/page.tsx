"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      },
    });

    setLoading(false);

    if (error) {
      toast.error("Hubo un problema. Verificá tu email e intentá de nuevo.");
      return;
    }

    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-primary/80 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-24 h-24 relative">
              <Image
                src="/govbidder-logo.png"
                alt="Govbidder"
                fill
                className="object-contain"
                priority
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center text-3xl font-bold text-primary">
                G
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Govbidder</CardTitle>
          <CardDescription className="text-base">
            Code Challenge — Acceso al dashboard
          </CardDescription>
        </CardHeader>

        <CardContent>
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <div className="text-5xl">📬</div>
              <p className="font-semibold text-lg">¡Revisá tu email!</p>
              <p className="text-muted-foreground">
                Te enviamos un link de acceso a{" "}
                <span className="font-medium text-foreground">{email}</span>.
                Hacé clic en el link para entrar al dashboard.
              </p>
              <p className="text-sm text-muted-foreground">
                Si no lo ves, revisá la carpeta de spam.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email con el que compraste el acceso</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? "Enviando..." : "Entrar con Magic Link"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Te enviaremos un link de acceso seguro. No necesitás contraseña.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
