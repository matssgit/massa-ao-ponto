import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./auth-state";
import type { RestaurantSummary } from "./auth-service";
import { RestaurantContext } from "./restaurant-state";

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const { memberships, service } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const membership =
    memberships.find((item) => item.restaurantId === selected) ??
    (memberships.length === 1 ? memberships[0] : null);

  useEffect(() => {
    let active = true;
    void service
      .restaurants()
      .then((items) => {
        if (active) setRestaurants(items);
      })
      .catch(() => {
        if (active) setRestaurants([]);
      });
    return () => {
      active = false;
    };
  }, [service]);

  function selectRestaurant(id: string) {
    if (!memberships.some((item) => item.restaurantId === id)) return;
    setSelected(id);
  }

  return (
    <RestaurantContext.Provider
      value={{
        membership,
        restaurantId: membership?.restaurantId ?? null,
        restaurants: restaurants.filter((restaurant) =>
          memberships.some((item) => item.restaurantId === restaurant.id),
        ),
        selectRestaurant,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}
