/**
 * Type-safe error message extractor adhering to ts-strict-engineering zero-any policy.
 */
export function getErrorMessage(err: unknown, defaultMessage = 'Có lỗi xảy ra'): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const resp = (err as { response?: { data?: { message?: string | string[] } } }).response;
    if (resp?.data?.message) {
      if (Array.isArray(resp.data.message)) {
        return resp.data.message.join(', ');
      }
      return resp.data.message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  return defaultMessage;
}
