// Turns a Postgres/PostgREST failure into something a user can act on, and
// something we can diagnose without a reproduction. Form actions used to
// collapse every possible cause into a single "Failed to submit request."
// string, which made real user reports impossible to investigate.
//
// The raw database message is deliberately never shown, since it leaks schema
// detail. The error code is, because it is not sensitive and it identifies the
// class of failure immediately.
export function describeDbError(
  error: { code?: string; message?: string },
  fallback: string,
): string {
  switch (error.code) {
    case '23514': return 'One of the selected values is not accepted. Pick a different option and try again.'
    case '23502': return 'A required field was missing. Fill in every required field and try again.'
    case '23503': return 'Your account could not be matched. Sign out and back in, then try again.'
    case '23505': return 'You have already submitted this. Check your existing items.'
    case '42501': return 'You do not have permission to do this. Sign out and back in, then try again.'
    case 'PGRST301':
    case 'PGRST302': return 'Your session has expired. Sign in again and retry.'
    default: return error.code ? `${fallback} (ref: ${error.code})` : fallback
  }
}
