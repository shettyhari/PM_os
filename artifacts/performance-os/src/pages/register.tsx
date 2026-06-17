import { useEffect } from "react";
import { useAuth } from "@/context/auth-context";

export default function Register() {
  const { login } = useAuth();

  useEffect(() => {
    login();
  }, [login]);

  return null;
}
