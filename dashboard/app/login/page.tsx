import { Suspense } from "react";
import LoginForm from "./LoginForm";

// Suspense boundary is required because LoginForm reads useSearchParams()
// (the ?redirect= param) — Next 14 fails the static build without it.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
