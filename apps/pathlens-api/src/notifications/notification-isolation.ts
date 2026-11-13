export function getNotificationSmokeIntegrationId() {
  const mode = process.env.PATHLENS_NOTIFICATION_SMOKE_TEST;
  if (mode !== undefined && mode !== "true" && mode !== "false") {
    throw new Error("PATHLENS_NOTIFICATION_SMOKE_TEST must be true or false.");
  }
  if (mode !== "true") return undefined;
  const id = process.env.PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID?.trim();
  if (!id)
    throw new Error(
      "PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID is required in smoke-test mode."
    );
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id
    )
  ) {
    throw new Error(
      "PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID must be a valid UUID."
    );
  }
  return id;
}

export function assertNotificationIntegrationScope(integrationId: string) {
  const fixtureId = getNotificationSmokeIntegrationId();
  if (fixtureId && integrationId !== fixtureId)
    throw new Error("Integration is outside smoke-test scope.");
}
