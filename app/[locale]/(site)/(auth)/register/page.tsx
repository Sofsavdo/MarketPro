import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";

export default async function RegisterPage() {
  const t = await getTranslations("auth");

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-20">
      <Card>
        <CardHeader>
          <CardTitle>{t("registerTitle")}</CardTitle>
          <CardDescription>{t("registerSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="register" />
          <p className="mt-6 text-center text-sm text-slate-400">
            {t("haveAccount")}{" "}
            <Link href="/login" className="text-amber-400 hover:underline">
              {t("signIn")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
