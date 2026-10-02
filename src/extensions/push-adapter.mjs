export function createPushAdapter(pushService) {
  return {
    async send(subscription, payload) {
      if (!pushService || typeof pushService.sendNotification !== "function") {
        return {
          ok: false,
          reason: "permanent",
          error: new Error("Push service is not configured."),
        };
      }

      try {
        const result = await pushService.sendNotification(
          subscription,
          payload,
        );

        return result?.ok === false
          ? {
              ok: false,
              reason: this.classifyError(result),
              result,
            }
          : { ok: true };
      } catch (error) {
        return {
          ok: false,
          reason: this.classifyError(error),
          error,
        };
      }
    },

    classifyError(error) {
      if ([404, 410].includes(error?.statusCode)) {
        return "expired";
      }

      if (
        (Number.isFinite(error?.statusCode) && error.statusCode >= 500) ||
        ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"].includes(error?.code)
      ) {
        return "retryable";
      }

      return "permanent";
    },
  };
}
