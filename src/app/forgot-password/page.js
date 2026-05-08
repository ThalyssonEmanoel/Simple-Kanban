"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [verifyAttempts, setVerifyAttempts] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [resendNotice, setResendNotice] = useState("");
  const supabase = createClient();
  const router = useRouter();
  const maxVerifyAttempts = 5;
  const maxResendAttempts = 3;

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResendNotice("");
    setModalError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      setError("Não foi possível enviar o email. Tente novamente.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setVerifyAttempts(0);
    setResendAttempts(0);
    setIsModalOpen(true);
    setLoading(false);
  }

  async function handleVerifyAndUpdate(e) {
    e.preventDefault();
    setModalError("");
    setResendNotice("");

    if (verifyAttempts >= maxVerifyAttempts) {
      setModalError("Limite de tentativas atingido. Reenvie o código e tente novamente.");
      return;
    }

    if (!code.trim()) {
      setModalError("Informe o código enviado por email.");
      return;
    }

    if (newPassword.length < 8) {
      setModalError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setModalError("As senhas não coincidem.");
      return;
    }

    setModalLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: "recovery",
    });

    if (verifyError) {
      setVerifyAttempts((prev) => prev + 1);
      setModalError("Código inválido ou expirado.");
      setModalLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setModalError("Não foi possível atualizar a senha. Tente novamente.");
      setModalLoading(false);
      return;
    }

    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleResendCode() {
    if (resendAttempts >= maxResendAttempts) {
      setModalError("Limite de reenvios atingido. Tente novamente mais tarde.");
      return;
    }

    setResendLoading(true);
    setModalError("");
    setResendNotice("");

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      setModalError("Não foi possível reenviar o código. Tente novamente.");
      setResendLoading(false);
      return;
    }

    setResendAttempts((prev) => prev + 1);
    setVerifyAttempts(0);
    setResendNotice(
      "Se existir uma conta vinculada a este email, enviaremos um novo código."
    );
    setResendLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-white text-2xl font-bold">
            K
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Recuperar senha</h1>
          <p className="mt-2 text-gray-600">
            Informe o email da sua conta para receber o código de recuperação
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-lg">
          {success ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <svg className="h-7 w-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Email enviado!</h2>
              <p className="mt-2 text-sm text-gray-600">
                Se existir uma conta vinculada a <strong>{email}</strong>, enviaremos um código
                para redefinir a senha. Verifique sua caixa de entrada (e o spam).
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-primary px-5 py-2.5 text-primary font-medium hover:bg-primary/5 transition-colors"
                >
                  Já tenho o código
                </button>
                <Link
                  href="/login"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-white font-medium hover:bg-primary-hover transition-colors"
                >
                  Voltar ao login
                </Link>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="seu@email.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-primary px-4 py-2.5 text-white font-medium hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Enviando..." : "Enviar código de recuperação"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-600">
                Lembrou a senha?{" "}
                <Link href="/login" className="text-primary font-medium hover:underline">
                  Entrar
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Confirmar código</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1 text-gray-400 hover:text-gray-600"
                aria-label="Fechar"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {modalError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {modalError}
              </div>
            )}

            {resendNotice && (
              <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                {resendNotice}
              </div>
            )}

            <form onSubmit={handleVerifyAndUpdate} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                  Código
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Digite o código do email"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Nova senha
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmNewPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Confirmar nova senha
                </label>
                <input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Repita a nova senha"
                />
              </div>

              <button
                type="submit"
                disabled={modalLoading || verifyAttempts >= maxVerifyAttempts}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-white font-medium hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {modalLoading ? "Validando..." : "Validar código e atualizar senha"}
              </button>
            </form>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendLoading || resendAttempts >= maxResendAttempts}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendLoading ? "Reenviando..." : "Reenviar código"}
              </button>

              {verifyAttempts >= maxVerifyAttempts && (
                <p className="text-xs text-orange-600">
                  Limite de tentativas atingido. Reenvie o código ou tente mais tarde.
                </p>
              )}

              {resendAttempts >= maxResendAttempts && (
                <p className="text-xs text-orange-600">
                  Limite de reenvios atingido. Tente novamente mais tarde.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
