import "server-only";

import { Pool } from "pg";
import type { BookingInput } from "@/lib/server/booking-validation";
import type { BookingDatabaseOutcome } from "@/lib/server/booking-types";

const DATABASE_NAME = "postgres";
const DATABASE_USER = "booking_api.xqwdvjceelmzoxuuqyhm";
const DATABASE_PORT = 5432;
const BOOK_FUNCTION_SQL = `
  SELECT
    outcome,
    appointment_id AS "appointmentId",
    starts_at AS "startsAt",
    ends_at AS "endsAt",
    expires_at AS "expiresAt"
  FROM private.book_public_appointment(
    $1::uuid,
    $2::text,
    $3::text,
    $4::timestamptz
  )
`;

export class BookingDatabaseConfigurationError extends Error {
  constructor() {
    super("ClinicSync booking database configuration is incomplete or invalid.");
    this.name = "BookingDatabaseConfigurationError";
  }
}

function getPool(): Pool {
  if (globalThis.__clinicSyncBookingPool) return globalThis.__clinicSyncBookingPool;

  const host = process.env.CLINICSYNC_POOLER_HOST?.trim();
  const password = process.env.CLINICSYNC_DB_PASSWORD;
  const ca = process.env.CLINICSYNC_DB_SSL_CA?.replace(/\\n/gu, "\n").trim();

  // The exact shared-pooler host and CA come from the target project's Dashboard.
  // Do not derive or silently fall back to a direct database endpoint.
  const validPoolerHost =
    host !== undefined &&
    host.length <= 253 &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.pooler\.supabase\.com$/iu.test(host);
  if (
    !validPoolerHost ||
    !password ||
    !ca?.includes("-----BEGIN CERTIFICATE-----")
  ) {
    throw new BookingDatabaseConfigurationError();
  }

  const pool = new Pool({
    host,
    port: DATABASE_PORT,
    database: DATABASE_NAME,
    user: DATABASE_USER,
    password,
    max: 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    allowExitOnIdle: true,
    keepAlive: true,
    application_name: "clinicsync-booking-api",
    // Node verifies the certificate chain and the pooler hostname. No insecure
    // TLS fallback is allowed if the dashboard CA or hostname is incorrect.
    ssl: {
      ca,
      rejectUnauthorized: true,
      servername: host,
    },
  });

  pool.on("error", () => {
    // Never log driver error objects: they may contain connection details.
    console.error("CLINICSYNC_IDLE_DATABASE_CONNECTION_ERROR");
  });

  globalThis.__clinicSyncBookingPool = pool;
  return pool;
}

export async function bookPublicAppointment(
  input: BookingInput,
): Promise<BookingDatabaseOutcome> {
  const client = await getPool().connect();
  let discardClient = false;

  try {
    // Keep request-scoped timeouts and the booking call in one transaction.
    // SET LOCAL automatically clears the timeout settings before pool reuse.
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '8000ms'");
    await client.query("SET LOCAL lock_timeout = '4000ms'");

    // Intentionally omit node-postgres' `name` property; the query does not
    // depend on server-side prepared-statement state.
    const result = await client.query<BookingDatabaseOutcome>({
      text: BOOK_FUNCTION_SQL,
      values: [input.doctorId, input.fullName, input.phoneE164, input.startsAt],
    });

    if (result.rows.length !== 1) {
      throw new Error("Booking function returned an unexpected row count.");
    }

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      discardClient = true;
    }
    throw error;
  } finally {
    client.release(discardClient);
  }
}

declare global {
  var __clinicSyncBookingPool: Pool | undefined;
}
