import React from "react";
import { Redirect } from "expo-router";
import AuthTabLayout from "@/app/(auth)/tablayout";
import { AuthStatusScreen, useAuth } from "@/contexts/AuthContext";

export default function Layout() {
  const { user, initializing, error } = useAuth();

  if (initializing || error) {
    return <AuthStatusScreen error={error} />;
  }
  if (!user) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return <AuthTabLayout />;
}
