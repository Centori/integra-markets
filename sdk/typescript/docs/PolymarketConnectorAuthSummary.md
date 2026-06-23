
# PolymarketConnectorAuthSummary


## Properties

Name | Type
------------ | -------------
`authType` | string
`apiKeyHeader` | string
`hasSecret` | boolean
`maskedSecret` | string
`persisted` | boolean

## Example

```typescript
import type { PolymarketConnectorAuthSummary } from '@integra-markets/sdk'

// TODO: Update the object below with actual values
const example = {
  "authType": null,
  "apiKeyHeader": null,
  "hasSecret": null,
  "maskedSecret": null,
  "persisted": null,
} satisfies PolymarketConnectorAuthSummary

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PolymarketConnectorAuthSummary
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


