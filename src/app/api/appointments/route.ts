import "server-only";

import { bookPublicAppointment } from "@/lib/server/booking-db";
import { handleBookingPost } from "@/lib/server/booking-http";
import {
  checkBookingClientRateLimit,
  checkBookingPhoneRateLimit,
} from "@/lib/server/rate-limit";

// Next.js 16 Cache Components uses the default Node.js runtime; it does not
// support an explicit `runtime = 'nodejs'` segment export. This route imports
// node-postgres and is never configured for Edge Runtime.
export async function POST(request: Request): Promise<Response> {
  return handleBookingPost(request, {
    checkClientRateLimit: checkBookingClientRateLimit,
    checkPhoneRateLimit: checkBookingPhoneRateLimit,
    book: bookPublicAppointment,
    onDatabaseFailure: () => {
      // Deliberately omit exception objects, request data, and credentials.
      console.error("CLINICSYNC_BOOKING_DATABASE_FAILURE");
    },
  });
}
