export type BookingDatabaseOutcome = {
  outcome: string;
  appointmentId: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  expiresAt: Date | null;
};
