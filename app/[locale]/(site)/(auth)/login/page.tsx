import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";

export default async function LoginPage() {
  const t = await getTranslations("auth");

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-20">
      <Card>
        <CardHeader>
          <CardTitle>{t("loginTitle")}</CardTitle>
          <CardDescription>{t("loginSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthForm mode="login" />
          <p className="mt-6 text-center text-sm text-slate-400">
            {t("noAccount")}{" "}
            <Link href="/register" className="text-amber-400 hover:underline">
              {t("createOne")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
