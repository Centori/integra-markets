
# ConnectorCredentialRequest


## Properties

Name | Type
------------ | -------------
`authType` | string
`apiKey` | string
`bearerToken` | string
`apiKeyHeader` | string
`persistSecret` | boolean

## Example

```typescript
import type { ConnectorCredentialRequest } from '@integra-markets/sdk'

// TODO: Update the object below with actual values
const example = {
  "authType": null,
  "apiKey": null,
  "bearerToken": null,
  "apiKeyHeader": null,
  "persistSecret": null,
} satisfies ConnectorCredentialRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ConnectorCredentialRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


