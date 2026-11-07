import type { ComponentType } from 'react'
import type { Integration } from '@workspace/contracts'

import { SlackIntegrationActions } from './providers/slack/slack-integration-actions'
import { GooglePageSpeedIntegrationActions } from './providers/google-pagespeed/google-pagespeed-integration-actions'
import { GoogleSearchConsoleIntegrationActions } from './providers/google-search-console/google-search-console-integration-actions'

export type IntegrationProviderProps = {
  workspaceId: string
  projectId: string
  returnPath: string
  integration: Integration
}

export type IntegrationProvider = {
  Actions: ComponentType<IntegrationProviderProps>
}

export const integrationProviderRegistry: Record<string, IntegrationProvider> =
  {
    slack: {
      Actions: SlackIntegrationActions,
    },
    'pagespeed-insights': {
      Actions: GooglePageSpeedIntegrationActions,
    },
    'google-search-console': {
      Actions: GoogleSearchConsoleIntegrationActions,
    },
  }
