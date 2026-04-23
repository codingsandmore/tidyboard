"use client";

import { useEffect, useState } from "react";
import { api } from "./client";

export interface Subscription {
  id: string;
  household_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: "active" | "trialing" | "past_due" | "canceled" | "incomplete";
  current_period_end: string | null;
}

interface SubscriptionResponse {
  subscription: Subscription | null;
}

interface UseSubscriptionResult {
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSubscription(): UseSubscriptionResult {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<SubscriptionResponse>("/v1/billing/subscription")
      .then((res) => {
        if (!cancelled) {
          setSubscription(res.subscription);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg =
            err && typeof err === "object" && "message" in err
              ? String((err as { message: string }).message)
              : "Failed to load subscription";
          setError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    subscription,
    loading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
}
