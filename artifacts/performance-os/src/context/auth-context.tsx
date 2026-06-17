export { useAuth } from "@workspace/replit-auth-web";
export type { AuthUser } from "@workspace/replit-auth-web";

import { ReactNode } from "react";

export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
