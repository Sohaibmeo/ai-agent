import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type {
  PlannerResponse,
  ReviewInstruction,
  ShoppingList,
  UserPreferences,
  UserProfile,
  UserState,
  WeeklyPlan
} from '../types';

const emptyIssues: string[] = [];

export const useMealPlanner = (userId: string) => {
  const [user, setUser] = useState<UserState>();
  const [plan, setPlan] = useState<WeeklyPlan>();
  const [shoppingList, setShoppingList] = useState<ShoppingList>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [validationIssues, setValidationIssues] = useState<string[]>(emptyIssues);
  const [lastInstruction, setLastInstruction] = useState<ReviewInstruction | null>(null);

  const applyPlannerResponse = (response: PlannerResponse) => {
    setPlan(response.plan);
    setShoppingList(response.shoppingList);
    setValidationIssues(response.validation.issues);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const data = await api.fetchUser(userId);
      setUser(data.user);
      if (data.latestPlan) {
        setPlan(data.latestPlan);
        if (data.shoppingList) {
          setShoppingList(data.shoppingList);
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const generateWeek = async () => {
    if (!user) return;
    setLoading(true);
    setError(undefined);
    try {
      const response = await api.generateWeek(user.id);
      applyPlannerResponse(response);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (profile: UserProfile) => {
    if (!user) return;
    setLoading(true);
    setError(undefined);
    try {
      const updatedProfile = await api.saveProfile(user.id, profile);
      setUser({ ...user, profile: updatedProfile });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (preferences: UserPreferences) => {
    if (!user) return;
    setLoading(true);
    setError(undefined);
    try {
      const updatedPrefs = await api.savePreferences(user.id, preferences);
      setUser({ ...user, preferences: updatedPrefs });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const applyInstruction = async (instruction: ReviewInstruction) => {
    if (!user) return;
    setLoading(true);
    setError(undefined);
    try {
      const response = await api.applyInstruction(user.id, instruction);
      applyPlannerResponse(response);
      setLastInstruction(instruction);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const interpretFeedback = async (feedback: string) => {
    const instruction = await api.interpretFeedback(feedback);
    setLastInstruction(instruction);
    return instruction;
  };

  return {
    user,
    plan,
    shoppingList,
    loading,
    error,
    validationIssues,
    lastInstruction,
    generateWeek,
    saveProfile,
    savePreferences,
    applyInstruction,
    interpretFeedback,
    reload: load
  };
};
