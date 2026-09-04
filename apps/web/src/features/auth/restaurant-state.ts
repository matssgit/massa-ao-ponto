import { createContext, useContext } from "react";
import type { Membership, RestaurantSummary } from "./auth-service";

export const isOwner = (membership: Membership | null): boolean =>
  membership?.role === "OWNER";

interface RestaurantContextValue {
  membership: Membership | null;
  restaurantId: string | null;
  restaurants: RestaurantSummary[];
  selectRestaurant: (id: string) => void;
  updateRestaurantName: (id: string, name: string) => void;
}

export const RestaurantContext = createContext<RestaurantContextValue | null>(
  null,
);

export function useRestaurant(): RestaurantContextValue {
  const context = useContext(RestaurantContext);
  if (!context) throw new Error("useRestaurant requer RestaurantProvider.");
  return context;
}
