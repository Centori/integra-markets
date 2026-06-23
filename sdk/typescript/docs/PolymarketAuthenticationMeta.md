
# PolymarketAuthenticationMeta


## Properties

Name | Type
------------ | -------------
`validatedByApp` | boolean
`vendorAuthStillRequired` | boolean
`appManagesAuthReplay` | boolean
`message` | string

## Example

```typescript
import type { PolymarketAuthenticationMeta } from '@integra-markets/sdk'

// TODO: Update the object below with actual values
const example = {
  "validatedByApp": null,
  "vendorAuthStillRequired": null,
  "appManagesAuthReplay": null,
  "message": null,
} satisfies PolymarketAuthenticationMeta

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PolymarketAuthenticationMeta
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


