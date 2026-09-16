export interface OperatingHour {
  id: string;
  restaurantId: string;
  dayOfWeek: number;
  opensAt: string | null;
  closesAt: string | null;
  active: boolean;
}

export type OperatingHourInput = Omit<OperatingHour, "id" | "restaurantId">;

export interface OperatingHoursRepository {
  findByRestaurantId(restaurantId: string): Promise<OperatingHour[]>;
  replaceWeek(restaurantId: string, days: OperatingHourInput[]): Promise<OperatingHour[]>;
}
