'use client';

import { useEffect, useRef, useState } from 'react';
import { signIn } from '@/lib/auth-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Smartphone, Loader2, CircleAlert, DollarSign, ShieldCheck, ArrowLeftRight } from 'lucide-react';
import { useStoreSettings } from '@/hooks/use-store-settings';

export default function SignInPage() {
  const { storeName, logoUrl } = useStoreSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (window.matchMedia?.('(pointer: fine)').matches) {
      emailRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn.email({ email: email.trim(), password, callbackURL: '/' });
      if (result.error) {
        setError(result.error.message || 'No pudimos iniciar sesión con esos datos. Revisá email y contraseña.');
        setIsLoading(false);
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.href = '/';
    } catch {
      setError('No pudimos iniciar sesión. Revisá tu conexión e intentá de nuevo.');
      setIsLoading(false);
    }
  };

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-2">
      <section aria-label="Presentación" className="relative hidden overflow-hidden border-r border-border bg-muted p-10 text-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-[2] flex items-center gap-3">
          {logoUrl ? (
            // dataURL local del usuario: next/image no optimiza dataURLs.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={`Logo de ${storeName}`} width={48} height={48} className="h-12 w-12 shrink-0 rounded-2xl bg-card object-cover ring-1 ring-border" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground" aria-hidden="true">
              <Smartphone className="h-6 w-6" strokeWidth={2.5} />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Tienda · Argentina</p>
            <p className="truncate text-2xl font-bold tracking-tight">{storeName}</p>
          </div>
        </div>
        <div className="relative z-[2] max-w-md">
          <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-balance">
            Tu tienda, en orden.
          </h1>
          <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground text-pretty">
            Stock por IMEI, dólar Blue y Oficial en vivo, plan canje y garantías. Todo en un solo lugar.
          </p>
          <ul className="mt-8 grid grid-cols-2 gap-2.5 text-sm font-semibold">
            {[
              { icon: Smartphone, label: "Stock por IMEI" },
              { icon: DollarSign, label: "Dólar en vivo" },
              { icon: ArrowLeftRight, label: "Plan canje" },
              { icon: ShieldCheck, label: "Garantías" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2.5">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 truncate">{label}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-[2] text-xs tabular-nums text-muted-foreground">Sistema privado de tu tienda · Hecho para vender más rápido</p>
      </section>

      <main className="flex items-center justify-center overflow-y-auto bg-background px-4 py-10 pb-safe sm:px-8">
        <div className="w-full max-w-md animate-rise">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            {logoUrl ? (
              // dataURL local del usuario: next/image no optimiza dataURLs.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={`Logo de ${storeName}`} width={44} height={44} className="h-11 w-11 shrink-0 rounded-2xl bg-card object-cover ring-1 ring-border" />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground" aria-hidden="true">
                <Smartphone className="h-6 w-6" strokeWidth={2.5} />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Tu tienda</p>
              <p className="truncate text-2xl font-bold tracking-tight text-foreground">{storeName}</p>
            </div>
          </div>

          <Card className="rounded-[2rem] border-border">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-[26px] font-bold tracking-tight text-foreground">Bienvenido de nuevo</h2>
              <p className="mt-1 text-sm text-muted-foreground">Entrá con tu cuenta de la tienda para continuar.</p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    ref={emailRef}
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    spellCheck={false}
                    aria-invalid={Boolean(error)}
                    placeholder="tu@email.com…"
                    className="h-12 rounded-2xl text-[16px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? 'signin-error' : undefined}
                      placeholder="Tu contraseña…"
                      className="h-12 rounded-2xl pr-12 text-[16px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      aria-pressed={showPassword}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 touch-manipulation rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p ref={errorRef} id="signin-error" role="alert" tabIndex={-1} className="flex items-start gap-2 rounded-2xl bg-destructive px-3.5 py-3 text-sm font-bold text-white outline-none">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 break-words">{error}</span>
                  </p>
                )}

                <Button type="submit" size="lg" disabled={isLoading} aria-busy={isLoading} className="h-12 w-full rounded-2xl text-base">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Iniciando sesión…
                    </>
                  ) : (
                    'Iniciar sesión'
                  )}
                </Button>
              </form>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-muted-foreground" aria-label="Módulos incluidos">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                  <Smartphone className="h-3.5 w-3.5" aria-hidden="true" /> Stock
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                  <DollarSign className="h-3.5 w-3.5" aria-hidden="true" /> Dólar
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                  <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" /> Canje
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Garantía
                </span>
              </div>
            </CardContent>
          </Card>

          <p className="mt-5 text-center text-xs text-muted-foreground">Sistema privado de tu tienda · Desarrollado por <span className="font-bold" translate="no">Lumen</span></p>
        </div>
      </main>
    </div>
  );
}
