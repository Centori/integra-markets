
# PolymarketConnectorRequest


## Properties

Name | Type
------------ | -------------
`userId` | string
`name` | string
`sourceMode` | string
`baseUrl` | string
`eventUrl` | string
`eventSlug` | string
`websiteUrls` | Array&lt;string&gt;
`customHeaders` | { [key: string]: string; }
`usePersonalSubscription` | boolean
`bypassSharedLimits` | boolean
`rateLimitPerMinute` | number
`cacheTtlSeconds` | number
`credentials` | [ConnectorCredentialRequest](ConnectorCredentialRequest.md)

## Example

```typescript
import type { PolymarketConnectorRequest } from '@integra-markets/sdk'

// TODO: Update the object below with actual values
const example = {
  "userId": null,
  "name": null,
  "sourceMode": null,
  "baseUrl": null,
  "eventUrl": null,
  "eventSlug": null,
  "websiteUrls": null,
  "customHeaders": null,
  "usePersonalSubscription": null,
  "bypassSharedLimits": null,
  "rateLimitPerMinute": null,
  "cacheTtlSeconds": null,
  "credentials": null,
} satisfies PolymarketConnectorRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PolymarketConnectorRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


