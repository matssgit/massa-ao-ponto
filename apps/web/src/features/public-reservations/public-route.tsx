import { useParams } from "react-router";
import { PublicReservationService } from "./service";
import { PublicRestaurantPage } from "./public-restaurant-page";
import { PublicReservationPage } from "./public-reservation-page";
import { PublicReservationDetailsPage } from "./public-reservation-details-page";
export function PublicRoute({ service, page }: { service: PublicReservationService; page: "restaurant" | "reserve" | "details" }) {
  const { slug = "", token = "" } = useParams();
  if (page === "details") return <PublicReservationDetailsPage key={token} service={service} token={token} />;
  if (page === "reserve") return <PublicReservationPage key={slug} service={service} slug={slug} />;
  return <PublicRestaurantPage key={slug} service={service} slug={slug} />;
}
